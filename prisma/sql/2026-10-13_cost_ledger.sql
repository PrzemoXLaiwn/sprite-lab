-- Cost ledger (additive only). Safe to run more than once; touches no existing table.
-- Apply on a non-production database first. Production: owner approval required.

CREATE TABLE IF NOT EXISTS operations (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL,
  feature             TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'RUNNING',
  credits_charged     INTEGER NOT NULL,
  credits_refunded    INTEGER NOT NULL DEFAULT 0,
  est_cost_usd        DOUBLE PRECISION NOT NULL,
  cost_cap_usd        DOUBLE PRECISION NOT NULL,
  input_hash          TEXT,
  ip_hash             TEXT,
  plan                TEXT,
  error_code          TEXT,
  generation_id       TEXT,
  cost_log_incomplete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at         TIMESTAMP(3),
  CONSTRAINT operations_refund_le_charge CHECK (credits_refunded >= 0 AND credits_refunded <= credits_charged)
);
CREATE INDEX IF NOT EXISTS operations_user_id_created_at_idx ON operations (user_id, created_at);
CREATE INDEX IF NOT EXISTS operations_status_created_at_idx ON operations (status, created_at);
CREATE INDEX IF NOT EXISTS operations_created_at_idx ON operations (created_at);
CREATE INDEX IF NOT EXISTS operations_ip_hash_created_at_idx ON operations (ip_hash, created_at);

CREATE TABLE IF NOT EXISTS provider_calls (
  id               TEXT PRIMARY KEY,
  operation_id     TEXT,
  user_id          TEXT,
  provider         TEXT NOT NULL,
  model            TEXT NOT NULL,
  task             TEXT NOT NULL,
  size             TEXT,
  attempt          INTEGER NOT NULL DEFAULT 1,
  outcome          TEXT NOT NULL,
  cost_usd         DOUBLE PRECISION,
  est_cost_usd     DOUBLE PRECISION NOT NULL,
  input_tokens     INTEGER,
  output_tokens    INTEGER,
  latency_ms       INTEGER,
  provider_task_id TEXT,
  error            TEXT,
  created_at       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS provider_calls_operation_id_idx ON provider_calls (operation_id);
CREATE INDEX IF NOT EXISTS provider_calls_provider_created_at_idx ON provider_calls (provider, created_at);
CREATE INDEX IF NOT EXISTS provider_calls_created_at_idx ON provider_calls (created_at);

CREATE TABLE IF NOT EXISTS cost_reconciliations (
  id                 TEXT PRIMARY KEY,
  provider           TEXT NOT NULL,
  checked_at         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reported_total_usd DOUBLE PRECISION NOT NULL,
  reported_delta_usd DOUBLE PRECISION,
  logged_delta_usd   DOUBLE PRECISION,
  gap_usd            DOUBLE PRECISION,
  since_at           TIMESTAMP(3),
  note               TEXT
);
CREATE INDEX IF NOT EXISTS cost_reconciliations_provider_checked_at_idx ON cost_reconciliations (provider, checked_at);
