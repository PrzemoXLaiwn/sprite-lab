# Reading the funnel

Events live in `funnel_events`. The table is created by `prisma/sql/2026-10-31_funnel_events.sql`. That file is not run by the build. Until it is applied, event writes log and continue; sign-in and payments do not depend on them.

First-touch attribution is also stored on the user, in `users.email_preferences.firstTouch` (`source`, `medium`, `campaign`, `content`, `term`, `referrer`, `at`). It is written once, on signup, and does not replace `signupCredits` or other keys. The referrer has no query string.

A stable visitor id is the `sl_vid` cookie. After signup, rows for that visitor get `user_id`. A purchase recorded from the Stripe webhook has `user_id` and `name = 'purchase'` even though Stripe does not send the cookie. Trace them together:

```sql
SELECT created_at, name, path, utm_source, utm_campaign, referrer, user_id
FROM funnel_events
WHERE visitor_id = 'PASTE_VISITOR_ID'
   OR user_id = (
     SELECT user_id FROM funnel_events
     WHERE visitor_id = 'PASTE_VISITOR_ID' AND user_id IS NOT NULL
     LIMIT 1
   )
ORDER BY created_at;
```

Google OAuth and email confirmation both call `recordSignupFromRequest` (`/auth/callback`, and One Tap via `/api/auth/sync`). The homepage beacon sends `landing_view` with `utm_*` and the referrer. Other product events go through `track()` in `src/lib/analytics.ts`, which also forwards to `POST /api/analytics/funnel`. `purchase` is rejected from that endpoint. It is inserted only from the Stripe webhook after a subscription invoice is granted or a pack/lifetime PaymentIntent is fulfilled, and a second delivery of the same invoice does not insert again.

When Google Analytics is loaded, the signed-in account id is passed as `user_id`. The email is not.

## Experiments

`EXPERIMENTS` in `src/lib/funnel/experiments.ts` is empty. Nothing is assigned and no exposure is recorded until an entry is added. Assignment is a hash of the visitor id, so it stays put.

Do not read a winner from a small sample. `experimentDecision` returns `keep_collecting` until both variants have `requiredSampleSizePerVariant` visitors (default alpha 0.05, power 0.8, using the baseline rate and the smallest lift you care about). Only then does it return `variant`, `control`, or `no_difference`. A p-value is not even calculated for the call until that threshold is met.

Example for the current ~1.5% purchase rate and a 1 percentage-point lift: each variant needs a few thousand visitors. Check with `requiredSampleSizePerVariant({ baselineRate: 0.0148, mde: 0.01 })`.
