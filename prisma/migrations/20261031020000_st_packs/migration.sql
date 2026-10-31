-- ST Packs (admin-only beta): SillyTavern expression pack jobs and their
-- per-expression rows. Additive only — no existing table changes.
--
-- RLS: every public table has row level security on. This migration enables
-- it on the new tables and adds no policies, so the Supabase Data API roles
-- (anon, authenticated) cannot read or write these rows. The app connects as
-- the postgres role through Prisma, and that role bypasses RLS. Do not
-- FORCE ROW LEVEL SECURITY — that would block the table owner.

CREATE TABLE "st_pack_jobs" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "source" TEXT NOT NULL,
  "prompt" TEXT,
  "style_notes" TEXT,
  "framing" TEXT NOT NULL DEFAULT 'waist',
  "expression_set" TEXT NOT NULL,
  "labels" TEXT[],
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "options" JSONB NOT NULL DEFAULT '{}',
  "base_key" TEXT,
  "zip_key" TEXT,
  "grid_key" TEXT,
  "est_cost_usd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "cost_usd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "started_at" TIMESTAMP(3),
  "finished_at" TIMESTAMP(3),

  CONSTRAINT "st_pack_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "st_pack_jobs_user_id_created_at_idx" ON "st_pack_jobs"("user_id", "created_at");
CREATE INDEX "st_pack_jobs_status_idx" ON "st_pack_jobs"("status");

CREATE TABLE "st_pack_expressions" (
  "id" TEXT NOT NULL,
  "job_id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "attempt" INTEGER NOT NULL DEFAULT 0,
  "locked_until" TIMESTAMP(3),
  "edit_key" TEXT,
  "video_task_uuid" TEXT,
  "video_url" TEXT,
  "video_key" TEXT,
  "webp_key" TEXT,
  "gif_key" TEXT,
  "png_key" TEXT,
  "frames" INTEGER,
  "bytes" INTEGER,
  "qa" JSONB,
  "flagged" BOOLEAN NOT NULL DEFAULT false,
  "cost_usd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "timings" JSONB NOT NULL DEFAULT '{}',
  "error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "st_pack_expressions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "st_pack_expressions_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "st_pack_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "st_pack_expressions_job_id_label_key" ON "st_pack_expressions"("job_id", "label");
CREATE INDEX "st_pack_expressions_status_locked_until_idx" ON "st_pack_expressions"("status", "locked_until");

ALTER TABLE "st_pack_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "st_pack_expressions" ENABLE ROW LEVEL SECURITY;
