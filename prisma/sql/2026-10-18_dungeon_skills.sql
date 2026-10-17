-- Sprite Dungeon: skills (additive only). Safe to run more than once.
-- A cache of each attack animation's spectacle score, measured once from its
-- sheet (frames, motion, reach, new effect colours; no AI). Rows can be
-- deleted at any time: they are recomputed on the next page load.
-- Run BEFORE deploying the matching code. Apply on a non-production database first.

CREATE TABLE IF NOT EXISTS dungeon_skill_scores (
  generation_id TEXT PRIMARY KEY,                 -- the animation (generations.id)
  score         INTEGER NOT NULL,                 -- 0..100
  tier          TEXT NOT NULL,                    -- common | rare | epic | legendary
  metrics       JSONB NOT NULL DEFAULT '{}'::jsonb,
  failed        BOOLEAN NOT NULL DEFAULT FALSE,   -- analysis failed: neutral Common, retried after an hour
  computed_at   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT dungeon_skill_scores_score_range CHECK (score BETWEEN 0 AND 100)
);
