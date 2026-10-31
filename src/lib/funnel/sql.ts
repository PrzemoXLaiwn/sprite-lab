// SQL for the funnel tables. Applied by hand (see docs/funnel-analytics.md).
// Tests run this text on PGlite. Production inserts go through the same statements.

export const FUNNEL_SCHEMA_SQL = `
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
`;

export const INSERT_FUNNEL_SQL = `
INSERT INTO funnel_events (
  id, visitor_id, user_id, name, path, referrer,
  utm_source, utm_medium, utm_campaign, utm_content, utm_term,
  dedupe_key, props
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb)
ON CONFLICT (dedupe_key) DO NOTHING
`;

export const LINK_VISITOR_SQL = `
UPDATE funnel_events SET user_id = $2 WHERE visitor_id = $1 AND user_id IS NULL
`;

export const TRACE_USER_SQL = `
SELECT user_id FROM funnel_events
WHERE visitor_id = $1 AND user_id IS NOT NULL
ORDER BY created_at ASC, id ASC
LIMIT 1
`;

export const TRACE_SQL = `
SELECT id, visitor_id, user_id, name, path, referrer,
       utm_source, utm_medium, utm_campaign, utm_content, utm_term, created_at
FROM funnel_events
WHERE visitor_id = $1 OR ($2::text IS NOT NULL AND user_id = $2)
ORDER BY created_at ASC, id ASC
`;

/** Same jsonb merge as mergeEmailPreferences, and it will not replace an existing firstTouch. */
export const STAMP_FIRST_TOUCH_SQL = `
UPDATE users
SET email_preferences = COALESCE(email_preferences::jsonb, '{}'::jsonb) || $1::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $2
  AND (email_preferences IS NULL OR NOT (email_preferences::jsonb ? 'firstTouch'))
`;
