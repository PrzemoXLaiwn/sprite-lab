// =============================================================================
// Quests — database side: measure progress, claim rewards exactly once
// =============================================================================
// Progress is recomputed from real rows on every read and on every claim:
//   - all-time counters (milestones, onboarding) from generations / assets,
//   - this week's counters from the cost ledger (operations), which only
//     holds paid, delivered work (SUCCEEDED / PARTIAL).
// A claim is one conditional UPDATE that adds the credits and stamps
// users.email_preferences.quests.<key> only while the key is still missing
// (the same jsonb pattern as gifts and the relaunch bonus), so double clicks,
// parallel tabs or replayed requests can't pay twice.
// =============================================================================

import { prisma } from "@/lib/prisma";
import { QUEST_BY_ID, type QuestStats } from "./definitions";
import { claimKey, questStates, weekStart } from "./progress";
import { NOT_UPLOADED_SQL } from "@/lib/upload-marker";

/** All-time counters. $1 = user id. Uploaded sprites are free and not our work: never counted. */
export const STATS_ALL_SQL = `
  SELECT
    count(*) FILTER (WHERE subcategory_id <> 'ANIMATION' AND (prompt NOT LIKE '[%' OR prompt LIKE '[No BG]%'))::int AS sprites,
    count(*) FILTER (WHERE subcategory_id = 'ANIMATION')::int AS animations,
    count(*) FILTER (WHERE is_public)::int AS shared,
    count(*) FILTER (WHERE project_id IS NOT NULL)::int AS in_projects
  FROM generations WHERE user_id = $1 AND ${NOT_UPLOADED_SQL}`;

/** This week's paid, delivered work. $1 = user id, $2 = week start, $3 = sprite features, $4 = animation features. */
export const STATS_WEEK_SQL = `
  SELECT
    count(*) FILTER (WHERE feature = ANY($3::text[]))::int AS sprites,
    count(*) FILTER (WHERE feature = ANY($4::text[]))::int AS animations,
    count(DISTINCT date_trunc('day', created_at))::int AS days
  FROM operations
  WHERE user_id = $1 AND status IN ('SUCCEEDED', 'PARTIAL') AND created_at >= $2`;

/**
 * Pays a reward once: adds the credits and stamps quests.<key> only while the
 * key is missing. $1 = user id, $2 = reward, $3 = claim key. No row = already claimed.
 */
export const CLAIM_SQL = `
  UPDATE users
  SET credits = credits + $2,
      total_bonus_credits = total_bonus_credits + $2,
      email_preferences = jsonb_set(
        jsonb_set(COALESCE(email_preferences::jsonb, '{}'::jsonb), '{quests}', COALESCE(email_preferences::jsonb->'quests', '{}'::jsonb)),
        ARRAY['quests', $3::text],
        to_jsonb(now()::text)
      ),
      updated_at = now()
  WHERE id = $1
    AND (email_preferences IS NULL OR email_preferences::jsonb->'quests'->>$3::text IS NULL)
  RETURNING credits`;

export const SPRITE_FEATURES = ["sprite", "sprite_hd", "style_match"];
export const ANIMATION_FEATURES = ["anim_4", "anim_6", "anim_9", "anim_smooth_4", "anim_smooth_6", "anim_smooth_9", "walk4dir", "tile_anim", "rig"];

export async function loadQuestStats(userId: string, now = new Date()): Promise<QuestStats> {
  const since = weekStart(now);
  const [all, week, user] = await Promise.all([
    prisma.$queryRawUnsafe<{ sprites: number; animations: number; shared: number; in_projects: number }[]>(STATS_ALL_SQL, userId),
    prisma.$queryRawUnsafe<{ sprites: number; animations: number; days: number }[]>(STATS_WEEK_SQL, userId, since, SPRITE_FEATURES, ANIMATION_FEATURES),
    prisma.user.findUnique({ where: { id: userId }, select: { username: true, totalLikesReceived: true } }),
  ]);
  const a = all[0], w = week[0];
  return {
    sprites: a?.sprites ?? 0,
    animations: a?.animations ?? 0,
    shared: a?.shared ?? 0,
    inProjects: a?.in_projects ?? 0,
    likesReceived: user?.totalLikesReceived ?? 0,
    hasUsername: Boolean(user?.username),
    weekSprites: w?.sprites ?? 0,
    weekAnimations: w?.animations ?? 0,
    weekActiveDays: w?.days ?? 0,
  };
}

export async function loadQuestClaims(userId: string): Promise<Record<string, unknown>> {
  const rows = await prisma.$queryRaw<{ quests: Record<string, unknown> | null }[]>`
    SELECT email_preferences::jsonb->'quests' AS quests FROM users WHERE id = ${userId}`;
  return rows[0]?.quests ?? {};
}

export type QuestClaim =
  | { ok: true; reward: number; credits: number }
  | { ok: false; reason: "unknown" | "incomplete" | "claimed" };

export async function claimQuest(userId: string, questId: string, now = new Date()): Promise<QuestClaim> {
  const def = QUEST_BY_ID[questId];
  if (!def) return { ok: false, reason: "unknown" };
  const [stats, claims] = await Promise.all([loadQuestStats(userId, now), loadQuestClaims(userId)]);
  const state = questStates(stats, claims, now).find((s) => s.id === questId);
  if (!state?.complete) return { ok: false, reason: "incomplete" };
  if (state.claimed) return { ok: false, reason: "claimed" };

  const key = claimKey(def, now);
  const rows = await prisma.$queryRawUnsafe<{ credits: number }[]>(CLAIM_SQL, userId, def.reward, key);
  if (rows.length === 0) return { ok: false, reason: "claimed" };

  await prisma.creditTransaction
    .create({ data: { userId, amount: def.reward, type: "BONUS", description: `Quest: ${def.title}` } })
    .catch((err) => console.error("[Quests] Failed to log transaction:", err));
  return { ok: true, reward: def.reward, credits: rows[0].credits };
}
