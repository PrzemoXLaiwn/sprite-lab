# Cost guards, cost ledger, Lifetime pause — rollout

Branch `stage2/cost-guards`. Nothing here is deployed or applied to any database yet. Each step below needs the owner's go-ahead.

## Order matters
The new code writes to three new tables and reads a new column on `generations` (`source_generation_id`). **If the code ships before the SQL runs, paid features return 503 "paused" and every query on `generations` fails** — so the order is strictly: SQL first, then code.

1. **Non-production database.** Apply `prisma/sql/2026-10-13_cost_ledger.sql`, then:
   - run `npm test` and `npm run economics` against it;
   - smoke-test one paid request with `DATABASE_URL` pointing at it.
   The SQL only creates tables and indexes, uses `IF NOT EXISTS`, and touches no existing table.
2. **Production database (owner approval).** Run the same SQL in the Supabase SQL editor. It is safe to run twice. Check that `operations`, `provider_calls` and `cost_reconciliations` exist.
3. **Optional environment variables (Vercel).** The defaults apply when these are unset:
   - `DAILY_SPEND_LIMIT_USD`: default 20;
   - `FREE_DAILY_SPEND_LIMIT_USD`: default 4;
   - leave `LIFETIME_SALES_ENABLED` unset. Lifetime stays paused.
4. **Deploy (owner approval).**
5. **Smoke checks after deploy:**
   - a 1-credit sprite: one `operations` row (SUCCEEDED) and one `provider_calls` row;
   - a forced failure, e.g. a bad sprite id after the charge: status FAILED, `credits_refunded = credits_charged`, exactly one REFUND transaction;
   - `/pricing`: no Lifetime tab;
   - `POST /api/stripe/create-lifetime-intent` returns 410;
   - call `/api/cron/reconcile-costs` once with the cron secret. The first snapshot has `note = first snapshot`.

## Rollback
Redeploy the previous build. The new tables can stay; nothing else reads them.

## Behaviour when things break
| Situation | Behaviour |
|---|---|
| No Upstash | The per-user rate limit counts charges in the database (shared by all instances). If the database is down, it falls back to a per-instance memory limiter. |
| Database down when a paid request starts | Expensive features: 503, nothing charged. Cheap sprites: the rate guard is skipped, but charging still needs the database. |
| Ledger write fails | The request continues and the operation is flagged `cost_log_incomplete`. The spend guard counts that operation at its worst-case estimate. |
| Provider timeout | Recorded as `timeout` at full list price (it may have run). Retries happen only within the operation's cost cap. |
| Refund write fails | The operation stays FAILED with credits still due. The reconcile cron refunds the remainder. The conditional UPDATE makes it impossible to refund twice. |
| Daily budget reached | Expensive features return a friendly 503. Free tier has its own lower cap. |
| Parallel requests at the budget edge | The budget check and reservation run under one Postgres advisory lock. |
| Duplicate or late Lifetime webhook | Paid intents are fulfilled once (unique PaymentIntent id). Abandoned intents are never fulfilled. |

## Not covered yet
- remove-bg, upscale, variations, queue/submit and 3D use the old charge plus a now-transactional refund and the DB-backed rate limit. They do not use operations or the ledger yet.
- Claude errors (as opposed to successful calls) are not written to the ledger.
- The migration and the exact spend / guard / refund SQL are tested against a real Postgres engine (PGlite, in memory: `src/lib/billing/sql.pglite.test.ts`). PGlite has a single connection, so lock contention between two servers is only covered by the in-memory model test.
