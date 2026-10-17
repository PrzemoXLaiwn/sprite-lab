# Cost guards, cost ledger, Lifetime pause — rollout

Branch `integration/all` (stage 2 + animation fixes + auto-settings + resume work). Nothing here is deployed or applied to any database yet. Each step below needs the owner's go-ahead.

## Order matters
The new code writes to three new tables and reads a new column on `generations` (`source_generation_id`). **If the code ships before the SQL runs, paid features return 503 "paused" and every query on `generations` fails** — so the order is strictly: SQL first, then code.

1. **Non-production database.** Apply `prisma/sql/2026-10-13_cost_ledger.sql`, then:
   - run `npm test` and `npm run economics` against it;
   - smoke-test one paid request with `DATABASE_URL` pointing at it.
   The SQL creates tables and indexes and adds one nullable column to `generations` (no existing data changes). Everything uses `IF NOT EXISTS`.
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

## Tools on operations (feat/costs-everywhere)
- `remove-bg` (`remove_bg`), `upscale` (AI only; pixel-perfect stays free), `variations` and the two 3D routes (`model_3d`) now charge through `startOperation`, refund with `op.fail` on every failure path, and count as delivered only once the result is stored (a re-host failure now refunds instead of saving a temporary provider URL).
- Their provider calls are in `provider_calls`: Runware upscale / background removal / legacy imageInference send `includeCost`, Replicate calls carry our list-price estimate (Replicate reports no price).
- Their prices in `src/lib/billing/features.ts` are estimates until the ledger has data. **Variations lose money at 1 credit per $0.04 Replicate image** (listed in `economics-known.ts`); that needs a price decision.
- Claude calls that throw (planner, rig joints, suggest, translate, enhance) are written as `error` / `timeout` rows with $0.
- The admin usage panel shows the ledger (spend per day, operations per feature, the latest Runware gap, stuck operations and pending refunds) and an empty state before the migration runs.

## Not covered yet
- `queue/submit` + `queue/process` keep the old charge/refund: the charge and the work happen in two invocations and `queue/status` refunds cancelled jobs on its own, so moving them needs the operation id stored on the job (a schema change). Nothing in the UI submits to the queue; retiring it is the simpler fix. Its provider calls are logged (outside any operation).
- The migration and the exact spend / guard / refund SQL are tested against a real Postgres engine (PGlite, in memory: `src/lib/billing/sql.pglite.test.ts`). PGlite has a single connection, so lock contention between two servers is only covered by the in-memory model test.
