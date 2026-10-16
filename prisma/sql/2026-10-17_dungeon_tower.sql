-- Sprite Dungeon: the Tower (additive only). Safe to run more than once.
-- Runs become stepwise (a blessing choice every 3 floors), so a run row now
-- keeps its state on the server. Existing rows are finished runs: the
-- defaults below ('done', step 0, no state) describe them exactly, and their
-- floor / created_at keep ranking them as before.
-- Run BEFORE deploying the matching code (the new queries select these columns).
-- Apply on a non-production database first. Production: owner approval required.

ALTER TABLE dungeon_runs ADD COLUMN IF NOT EXISTS status     TEXT NOT NULL DEFAULT 'done';   -- 'choosing' | 'done'
ALTER TABLE dungeon_runs ADD COLUMN IF NOT EXISTS step       INTEGER NOT NULL DEFAULT 0;     -- optimistic lock for choices
ALTER TABLE dungeon_runs ADD COLUMN IF NOT EXISTS state      JSONB;                          -- rng position, HP, blessings, offer
ALTER TABLE dungeon_runs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE dungeon_runs ADD COLUMN IF NOT EXISTS floor_at   TIMESTAMP(3);                   -- when the run reached its floor (tie-break)

-- At most a handful of unfinished runs exist at any time: a tiny partial index.
CREATE INDEX IF NOT EXISTS dungeon_runs_active_idx ON dungeon_runs (user_id) WHERE status <> 'done';
