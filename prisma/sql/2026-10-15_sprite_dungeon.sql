-- Sprite Dungeon (additive only). Safe to run more than once.
-- Three new tables; nothing existing is touched. No foreign keys (like the
-- cost ledger): rows of deleted users are simply ignored by the queries.
-- Must run BEFORE the matching code is deployed (/play and /api/play/* query
-- these tables). Apply on a non-production database first. Production: owner approval required.

-- The party each user picked: up to 4 generation ids, in slot order.
CREATE TABLE IF NOT EXISTS dungeon_parties (
  user_id    TEXT PRIMARY KEY,
  slots      JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- One row per expedition. The unique (user_id, run_day, run_index) key is what
-- makes the 5-runs-per-day limit race-safe: two parallel requests can't both
-- store the same run index, and the code never uses an index above 5.
CREATE TABLE IF NOT EXISTS dungeon_runs (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  week       TEXT NOT NULL,              -- ISO week, e.g. '2026-W42'
  run_day    DATE NOT NULL,              -- UTC day
  run_index  INTEGER NOT NULL,           -- 1..5 within the day
  floor      INTEGER NOT NULL,           -- deepest floor reached
  seed       TEXT NOT NULL,
  party      JSONB NOT NULL,             -- stats snapshot used for the run
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT dungeon_runs_run_index_positive CHECK (run_index >= 1)
);
-- Also serves the (user_id, run_day) lookups (leftmost prefix).
CREATE UNIQUE INDEX IF NOT EXISTS dungeon_runs_user_id_run_day_run_index_key ON dungeon_runs (user_id, run_day, run_index);
CREATE INDEX IF NOT EXISTS dungeon_runs_week_floor_created_at_idx ON dungeon_runs (week, floor DESC, created_at);

-- Weekly prizes, written once by /api/cron/dungeon-prizes. Both unique keys
-- make the payout idempotent: a week can't pay a rank or a user twice.
CREATE TABLE IF NOT EXISTS dungeon_prizes (
  week     TEXT NOT NULL,
  rank     INTEGER NOT NULL,
  user_id  TEXT NOT NULL,
  floor    INTEGER NOT NULL,
  credits  INTEGER NOT NULL DEFAULT 0,
  badge    TEXT NOT NULL,                -- gold | silver | bronze | top10
  paid_at  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT dungeon_prizes_pkey PRIMARY KEY (week, rank),
  CONSTRAINT dungeon_prizes_credits_non_negative CHECK (credits >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS dungeon_prizes_week_user_id_key ON dungeon_prizes (week, user_id);
CREATE INDEX IF NOT EXISTS dungeon_prizes_user_id_idx ON dungeon_prizes (user_id);
