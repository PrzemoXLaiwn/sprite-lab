-- Downloads and thumbs, per generation.
-- Additive. No backfill. user_id is the only identity stored (no email, no prompt).
-- Apply in the Supabase SQL editor BEFORE the code that writes this table
-- is deployed. Safe to run twice. Do not run `prisma db push`.

CREATE TABLE IF NOT EXISTS "asset_signals" (
  "id" TEXT NOT NULL,
  "generation_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "asset_signals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "asset_signals_generation_id_kind_idx" ON "asset_signals"("generation_id", "kind");
CREATE INDEX IF NOT EXISTS "asset_signals_user_id_created_at_idx" ON "asset_signals"("user_id", "created_at");

DO $$ BEGIN
  ALTER TABLE "asset_signals"
    ADD CONSTRAINT "asset_signals_generation_id_fkey"
    FOREIGN KEY ("generation_id") REFERENCES "generations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "asset_signals"
    ADD CONSTRAINT "asset_signals_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
