# Free credits and quests

Numbers below are taken from the code on this branch. The signup grant is `SIGNUP_CREDITS` in `src/config/signup.ts` (20). Credit prices for generations are `CREDIT_COSTS` in `src/lib/services/generation.ts` and `animationCredits()` in `src/config/animations.ts`.

There is no quest, achievement, streak, or daily-login system that pays credits. "Quest Items" is only a sprite category (`src/lib/categories.ts`).

## What a new account can actually receive

| Source | Condition | Reward | Limit | Repeats? | File |
|---|---|---|---|---|---|
| Signup grant | Account row is created (email, Google, Discord, or any path that calls `getOrCreateUser` / the auth callback) | **20** | Once, at insert | No | `src/config/signup.ts`, `src/lib/signup-grant.ts`, `src/app/auth/callback/route.ts`, `src/lib/db/users.ts`, `prisma/schema.prisma` `@default(20)` |
| Relaunch, new-user bonus | Account created on or after 7 Oct 2026, campaign still active (through 31 Dec 2026), and the row was **not** stamped with `signupCredits` / `relaunchBonusAt` | **+10** | Once | No | `src/config/relaunch.ts` `NEW_USER_BONUS`, `src/lib/relaunch.ts` |
| Relaunch, welcome-back | Account created **before** 7 Oct 2026, first app open while the campaign is active, not yet claimed | **+15** | Once | No | `src/config/relaunch.ts` `RETURNING_BONUS` |
| Referral | The referred account makes its **first paid purchase**. Credits go to the referrer, not to the new account | **10** | Once per referred paying user | Referrer can earn it again for each new paying referee. No cap in code | `src/app/api/stripe/_lib/fulfillment.ts` `REFERRAL_REWARD_CREDITS`, `src/app/api/referral/route.ts`, `src/components/dashboard/ReferralCard.tsx` |
| Daily reminder email | User opted in, was active in the last 30 days, and has at least one generation | **0** | Email only. `streakBonus` is never passed, so the template's "+N bonus credits" line does not fire | Daily email, no credits | `src/app/api/cron/daily-reminder/route.ts`, `src/lib/email/templates/DailyReminderEmail.tsx` |
| Login streak fields | `loginStreak` and `lastLoginBonusAt` exist on `users` | **0** | Nothing reads them to grant credits | — | `prisma/schema.prisma` |
| Badges | `users.badges` is a JSON string | **0** | No badge payout | — | `prisma/schema.prisma` |
| Guest generator | Unauthenticated `POST /api/generate-guest` | **0 credits**. Up to 3 image calls per IP per hour, and 200 per hour across all guests | Rate limit, not a balance | While the route stays enabled | `src/app/api/generate-guest/route.ts`, `src/lib/rate-limit.ts` |
| Lifetime monthly grant | User bought a lifetime deal | 250 / 500 / 1,200 per month | Paid product, not a free signup | Monthly | `src/app/api/cron/lifetime-credits/route.ts` |
| Credit-pack launch bonus | Buying Ember / Blaze / Inferno / Supernova while the pack promo is on | +5 / +15 / +50 / +150 | Paid | Per purchase | `src/lib/stripe.ts` `CREDIT_PACKS` |

New accounts created by this branch are inserted with 20 credits **and** `emailPreferences.relaunchBonusAt` plus `signupCredits: 20`. The claim query and an extra check in `claimRelaunchBonus` both refuse to add `NEW_USER_BONUS` on top, so a new account does not become 30. Accounts created before 7 Oct 2026 are not inserted by this path, so their one-time +15 is unchanged.

The guest route is still in the codebase. The site no longer promises "3 free tries". Whether to disable the route is a separate decision (see the pull request).

## Pool for a brand-new person

| | Credits | Notes |
|---|---|---|
| One-time, no one else pays | **20** | The signup grant only |
| One-time, if they signed up during the old campaign and have not opened the app yet | **10 already in the database, plus 10 on first visit = 20** | Only rows that were inserted with the old default and have no stamp. New inserts skip this |
| Welcome-back +15 | **Not for a new account** | Only `createdAt` before 7 Oct 2026 |
| Per month, forever, with no purchases and no referrals | **0** | Nothing refreshes a free balance |
| Referral, if friends later pay | **+10 per paying friend** | Unbounded. This is not a self-serve quest; it requires someone else's purchase |

There is nothing to phrase as "earn more by completing quests".

## What 20 credits buy

Costs are what the server charges. Defaults are the UI's initial state, not a guess about popularity (the repo has no usage ranking).

| Generation | Credits | How many fit in 20 | Default? | Where the cost is set |
|---|---|---|---|---|
| Standard sprite | 1 | **20** | Yes. Quality state starts at `"normal"`. Style starts at `PIXEL_ART_16` | `CREDIT_COSTS.normal` / `draft` = 1. `GenerateWorkspace` `useState("normal")` |
| HD sprite | 3 | **6** (2 credits left) | No | `CREDIT_COSTS.hd` = 3 |
| Idle, smooth on | 8 | **2** (4 left) | Yes for animation. Idle is the first character preset (4 key poses) and smooth starts **on** | `animationCredits(4, true)` = 8. `animate/page.tsx` `useState(true)` for smooth. Idle preset `frames: 4` |
| Idle, smooth off | 4 | **5** | Only if the user turns smooth off | `animationCredits(4, false)` = 4 |
| Key poses, 4 frames | 4 | **5** | Frame-count default before a preset recommendation is `DEFAULT_ANIMATION_FRAMES` = 4 | `ANIMATION_FRAME_OPTIONS` |
| Key poses, 6 frames | 6 | **3** (2 left) | Walk / run / attack presets recommend 6, applied until the user picks a count | same |
| Key poses, 9 frames | 9 | **2** (2 left) | No preset uses 9 as its recommendation | same |
| Smooth, 4 key poses → 8 frames | 8 | **2** (4 left) | Smooth doubles frames and credits | `animationCredits(frames, true)` |
| Smooth, 6 key poses → 12 frames | 12 | **1** (8 left) | | same |
| Smooth, 9 key poses → 18 frames | 18 | **1** (2 left) | | same |
| 4-direction set | — | — | **Not sold.** A turnaround is one 4-frame animation (front, right, back, left): 4 credits, or 8 with smooth on. That is 5 or 2 from a balance of 20 | `src/config/animations.ts` preset `turnaround` |
| 8-direction set | — | — | **Not implemented.** `llms.txt` and the compare data say SpriteLab does not output 8-direction movement sets | `src/app/llms.txt/route.ts`, `src/data/compare.ts` |

Smooth is a second image pass. If that pass does not line up, the route refunds the extra half (`src/app/api/animate/route.ts`).

The older marketing line "idle 3, key-pose 7–12, directions 6/10" does not match this code. Those figures are not used on the site.

## API cost of spending the 20

Current sprite models (`src/lib/runware.ts` `SPRITE_MODELS`):

| Spend the 20 on | Provider images | Approx. USD in code |
|---|---|---|
| 20× Standard | 20× FLUX.2 klein | 20 × **$0.0008 = $0.016** |
| 6× HD (18 credits; 2 left) | 6× GPT Image Mini | 6 × **$0.036 = $0.216** |
| 2× default idle (smooth on) | 2 key-frame grids + 2 in-between grids | 4 × **$0.07 = $0.28**, plus the planner |

Animation grids use `ANIMATION_MODEL.approxCostUsd` (**$0.07** per grid). The pose planner calls `claude-opus-5-5` (`src/lib/animation-planner.ts`) and the repo does not store a price for that call, so the animation totals above are image-only.

`src/lib/stripe.ts` still comments an older mix (flux-schnell ~$0.003, flux-dev ~$0.01, and £ margins on the paid plans). Those comments were not used to price the free grant. There is no GBP conversion for FLUX.2 klein or GPT Image Mini in the repo, so this note stays in USD.

A guest generation, if the route is left on, uses the standard sprite model (~$0.0008) and is not deducted from the 20.
