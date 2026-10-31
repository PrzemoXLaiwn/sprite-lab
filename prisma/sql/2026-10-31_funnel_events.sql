-- First-party funnel events. Run by hand against the database.
-- This file is not executed by `next build` or by this pull request.
-- The same text is exported from src/lib/funnel/sql.ts and run in PGlite tests.

CREATE TABLE IF NOT EXISTS funnel_events (
  id TEXT PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  user_id TEXT,
  name TEXT NOT NULL,
  path TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  dedupe_key TEXT,
  props JSONB,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS funnel_events_dedupe_key_key ON funnel_events (dedupe_key);
CREATE INDEX IF NOT EXISTS funnel_events_visitor_created_idx ON funnel_events (visitor_id, created_at);
CREATE INDEX IF NOT EXISTS funnel_events_user_created_idx ON funnel_events (user_id, created_at);
