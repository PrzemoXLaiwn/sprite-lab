-- Self-serve cancellation records, plus the subscription flags the webhook
-- keeps in sync (cancel at period end, pause collection, one-time retention
-- discount). Existing rows default to "not cancelling" and "discount unused".
--
-- RLS: every public table has row level security on. This migration enables
-- it on the new table and adds no policies, so the Supabase Data API roles
-- (anon, authenticated) cannot read or write these rows. The app connects as
-- the postgres role through Prisma, and that role bypasses RLS. Do not
-- FORCE ROW LEVEL SECURITY — that would block the table owner.

ALTER TABLE "users" ADD COLUMN "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "billing_paused" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "subscription_pause_resumes_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "retention_discount_used_at" TIMESTAMP(3);

CREATE TABLE "subscription_cancellations" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "reason" TEXT,
  "note" TEXT,
  "offer_shown" TEXT,
  "offer_accepted" BOOLEAN NOT NULL DEFAULT false,
  "outcome" TEXT NOT NULL DEFAULT 'in_progress',
  "plan" TEXT NOT NULL,
  "stripe_coupon_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "subscription_cancellations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "subscription_cancellations_user_id_idx" ON "subscription_cancellations"("user_id");
CREATE INDEX "subscription_cancellations_created_at_idx" ON "subscription_cancellations"("created_at");
CREATE INDEX "subscription_cancellations_reason_idx" ON "subscription_cancellations"("reason");
CREATE INDEX "subscription_cancellations_outcome_idx" ON "subscription_cancellations"("outcome");

ALTER TABLE "subscription_cancellations"
  ADD CONSTRAINT "subscription_cancellations_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subscription_cancellations" ENABLE ROW LEVEL SECURITY;
