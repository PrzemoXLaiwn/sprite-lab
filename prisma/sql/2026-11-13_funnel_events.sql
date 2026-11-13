-- Conversion funnel events. Additive. No foreign key.
CREATE TABLE IF NOT EXISTS funnel_events (
  id text PRIMARY KEY,
  user_id text,
  name text NOT NULL,
  props jsonb,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS funnel_events_name_created_at_idx ON funnel_events (name, created_at);
CREATE INDEX IF NOT EXISTS funnel_events_user_id_created_at_idx ON funnel_events (user_id, created_at);

-- subscription_cancellations already exists. This index matches the Prisma model.
CREATE INDEX IF NOT EXISTS subscription_cancellations_user_id_created_at_idx
  ON subscription_cancellations (user_id, created_at);
