// =============================================================================
// Sprite Dungeon — SQL (kept as strings so the PGlite tests run the exact text)
// =============================================================================
// Tables: prisma/sql/2026-10-15_sprite_dungeon.sql
// =============================================================================

import { BADGE_RANKS, PRIZE_CREDITS, PRIZE_MIN_PAID_GENERATIONS, badgeFor } from "./config";

/**
 * The user's original sprites with the facts stats are derived from.
 * Originals = not animations and not tool outputs (prompts starting "[").
 * $1 = user id, $2 = ids to restrict to (NULL = all), $3 = limit.
 */
export const SPRITES_SQL = `
  SELECT g.id, g.category_id, g.style_id, g.image_url, g.prompt,
    EXISTS (
      SELECT 1 FROM generations a
      WHERE a.source_generation_id = g.id AND a.user_id = g.user_id AND a.subcategory_id = 'ANIMATION'
    ) AS animated,
    EXISTS (
      SELECT 1 FROM operations o
      WHERE o.user_id = g.user_id AND o.generation_id = g.id AND o.feature = 'sprite_hd' AND o.status IN ('SUCCEEDED', 'PARTIAL')
    ) AS hd
  FROM generations g
  WHERE g.user_id = $1
    AND g.subcategory_id <> 'ANIMATION'
    AND g.prompt NOT LIKE '[%'
    AND ($2::text[] IS NULL OR g.id = ANY($2::text[]))
  ORDER BY g.created_at DESC
  LIMIT $3`;

/** $1 = user id. */
export const PARTY_GET_SQL = `SELECT slots FROM dungeon_parties WHERE user_id = $1`;

/** $1 = user id, $2 = slots (json array of generation ids). */
export const PARTY_SAVE_SQL = `
  INSERT INTO dungeon_parties (user_id, slots, updated_at) VALUES ($1, $2::jsonb, now())
  ON CONFLICT (user_id) DO UPDATE SET slots = EXCLUDED.slots, updated_at = now()`;

/** Run indices already used on a UTC day. $1 = user id, $2 = day ('YYYY-MM-DD'). */
export const RUNS_TODAY_SQL = `
  SELECT run_index FROM dungeon_runs WHERE user_id = $1 AND run_day = $2::date ORDER BY run_index`;

/**
 * Stores a finished run under a run index. The unique (user_id, run_day,
 * run_index) key means two parallel requests can't both take the same index:
 * the loser gets no row back and retries with the next index (or hits the limit).
 * $1 id, $2 user id, $3 week, $4 day, $5 run index, $6 floor, $7 seed, $8 party json.
 */
export const INSERT_RUN_SQL = `
  INSERT INTO dungeon_runs (id, user_id, week, run_day, run_index, floor, seed, party, created_at)
  VALUES ($1, $2, $3, $4::date, $5, $6, $7, $8::jsonb, now())
  ON CONFLICT (user_id, run_day, run_index) DO NOTHING
  RETURNING id`;

/** Best floor per user in a week; ties → whoever got there first. */
const RANKED_CTE = `
  best AS (
    SELECT DISTINCT ON (r.user_id) r.user_id, r.floor, r.created_at
    FROM dungeon_runs r
    WHERE r.week = $1
    ORDER BY r.user_id, r.floor DESC, r.created_at ASC
  ),
  ranked AS (
    SELECT user_id, floor, created_at,
      row_number() OVER (ORDER BY floor DESC, created_at ASC, user_id ASC)::int AS rank,
      count(*) OVER ()::int AS players
    FROM best
  )`;

/** $1 = week, $2 = top N, $3 = caller's user id (their row is always included). */
export const LEADERBOARD_SQL = `
  WITH ${RANKED_CTE}
  SELECT k.rank, k.user_id, k.floor, k.players, u.username
  FROM ranked k LEFT JOIN users u ON u.id = k.user_id
  WHERE k.rank <= $2 OR k.user_id = $3
  ORDER BY k.rank`;

/**
 * Pays a finished week's prizes in ONE statement (atomic): ranks the week,
 * writes dungeon_prizes rows for the top N, and for every row it actually
 * inserted adds the credits and logs a BONUS credit transaction.
 * unique (week, rank) + unique (week, user_id) + ON CONFLICT DO NOTHING mean
 * a second run inserts nothing and therefore pays nothing.
 * Credits only go to players with ≥ $6 paid generations (SUCCEEDED / PARTIAL
 * operations) inside the week; others still get their badge.
 * $1 week, $2 week start, $3 week end (exclusive), $4 badge ranks (N),
 * $5 credits by rank (int[]), $6 min paid generations, $7 badges by rank (text[]).
 */
export const PAY_PRIZES_SQL = `
  WITH ${RANKED_CTE},
  top AS (
    SELECT k.rank, k.user_id, k.floor FROM ranked k JOIN users u ON u.id = k.user_id WHERE k.rank <= $4
  ),
  paid AS (
    SELECT o.user_id, count(*)::int AS n FROM operations o
    WHERE o.status IN ('SUCCEEDED', 'PARTIAL') AND o.created_at >= $2 AND o.created_at < $3
      AND o.user_id IN (SELECT user_id FROM top)
    GROUP BY o.user_id
  ),
  winners AS (
    SELECT t.rank, t.user_id, t.floor,
      CASE WHEN coalesce(p.n, 0) >= $6 THEN coalesce(($5::int[])[t.rank], 0) ELSE 0 END AS credits,
      ($7::text[])[t.rank] AS badge
    FROM top t LEFT JOIN paid p ON p.user_id = t.user_id
  ),
  ins AS (
    INSERT INTO dungeon_prizes (week, rank, user_id, floor, credits, badge, paid_at)
    SELECT $1, rank, user_id, floor, credits, badge, now() FROM winners
    ON CONFLICT DO NOTHING
    RETURNING rank, user_id, credits
  ),
  upd AS (
    UPDATE users u
    SET credits = u.credits + i.credits,
        total_bonus_credits = u.total_bonus_credits + i.credits,
        updated_at = now()
    FROM ins i
    WHERE u.id = i.user_id AND i.credits > 0
    RETURNING u.id
  ),
  tx AS (
    INSERT INTO credit_transactions (id, user_id, amount, type, description, created_at)
    SELECT 'dungeon_' || $1 || '_' || i.rank, i.user_id, i.credits, 'BONUS',
      'Sprite Dungeon: week ' || $1 || ' rank ' || i.rank, now()
    FROM ins i WHERE i.credits > 0
    RETURNING id
  )
  SELECT i.rank, i.user_id, i.credits,
    (SELECT count(*) FROM upd)::int AS credited,
    (SELECT count(*) FROM tx)::int AS logged
  FROM ins i ORDER BY i.rank`;

/** Arguments of PAY_PRIZES_SQL for a week [start, end). */
export function prizeParams(week: string, start: Date, end: Date): unknown[] {
  const badges = Array.from({ length: BADGE_RANKS }, (_, i) => badgeFor(i + 1));
  return [week, start, end, BADGE_RANKS, [...PRIZE_CREDITS], PRIZE_MIN_PAID_GENERATIONS, badges];
}

/** $1 = user id. */
export const TROPHIES_SQL = `
  SELECT week, rank, credits, badge FROM dungeon_prizes WHERE user_id = $1 ORDER BY week DESC LIMIT 20`;
