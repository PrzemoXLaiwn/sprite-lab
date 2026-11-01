-- ST Packs: one background worker per job.
-- Additive only — a nullable column on st_pack_jobs. Existing rows stay NULL
-- (no worker holds a lease), so the next poll may start exactly one.
-- No backfill, no rewrite, no other table.
--
-- Apply this in the Supabase SQL editor BEFORE the code that reads the column
-- is deployed. A deploy without the column fails every job read. Safe to run
-- twice. Do not remove the column and do not run `prisma db push`.

ALTER TABLE "st_pack_jobs" ADD COLUMN IF NOT EXISTS "worker_lease_until" TIMESTAMP(3);
