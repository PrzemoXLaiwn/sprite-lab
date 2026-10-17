# Free credits and quests

Numbers below are taken from the code after rebasing onto the production sync (`origin/main` at the merge of PR #3). The signup grant is `SIGNUP_CREDITS` in `src/config/signup.ts` (20). `RELAUNCH.SIGNUP_CREDITS` is that same constant. Credit prices are `CREDIT_COSTS` in `src/lib/services/generation.ts`, `animationCredits()` / `RIG_CREDITS` / `ROTATIONS` in `src/config/animations.ts`, and `src/config/tool-prices.ts`.

## What a new account can actually receive

| Source | Condition | Reward | Limit | Repeats? | File |
|---|---|---|---|---|---|
| Signup grant | Account row is created (email, Google, Discord, One Tap — `syncAuthUser` — or `getOrCreateUser`) | **20** | Once, at insert | No | `src/config/signup.ts`, `src/lib/signup-grant.ts`, `src/lib/auth/sync-user.ts`, `src/lib/db/users.ts`, `prisma/schema.prisma` `@default(20)` |
| Relaunch, new-user bonus | Account created on or after 7 Oct 2026, campaign still active (through 31 Dec 2026), and the row was **not** stamped with `signupCredits` / `relaunchBonusAt` | **+10** | Once | No | `src/config/relaunch.ts` `NEW_USER_BONUS`, `src/lib/relaunch.ts` |
| Relaunch, welcome-back | Account created **before** 7 Oct 2026, first app open while the campaign is active, not yet claimed | **+20** | Once | No | `src/config/relaunch.ts` `RETURNING_BONUS` |
| Welcome-back top-up | Same accounts, but they already received the old **15** (`relaunchBonusAt` set, `relaunchBonusAmount` missing or 15, no `returningTopUpAt`) | **+5** | Once | No | `src/lib/relaunch.ts`, stamp `returningTopUpAt` plus a `credit_transactions` row "Relaunch: welcome-back top-up" |
| Onboarding quests | Real activity: 1 sprite, 1 animation, 1 sprite in a project, 1 public share, a username | **2 + 3 + 1 + 1 + 1 = 8** | Once each | No | `src/lib/quests/definitions.ts` |
| Weekly quests | This ISO week: 10 sprites, 2 animations, creating on 3 different days. Progress is counted from paid, delivered operations | **2 + 2 + 1 = 5** | Once per ISO week | Yes, every week the goals are met | same |
| Milestones | 10 / 50 / 250 / 1,000 sprites (1 / 3 / 5 / 10), 10 / 50 animations (3 / 5), 10 / 100 likes received (2 / 5) | **34** if every milestone is ever finished | Once each | No | same |
| Referral | The referred account makes its **first paid purchase**. Credits go to the referrer, not to the new account | **10** | Once per referred paying user | Referrer can earn it again for each new paying referee. No cap in code | `src/app/api/stripe/_lib/fulfillment.ts` `REFERRAL_REWARD_CREDITS` |
| Daily reminder email | User opted in and was active recently | **0** | Email only. `streakBonus` is never passed | Daily email, no credits | `src/app/api/cron/daily-reminder/route.ts` |
| Login streak fields | `loginStreak` and `lastLoginBonusAt` exist on `users` | **0** | Nothing reads them to grant credits | — | `prisma/schema.prisma` |
| Gift link | An operator creates a one-time link for a specific user | Whatever amount was stored | Once per gift id | No | `src/lib/gifts.ts` |
| Guest generator | Unauthenticated `POST /api/generate-guest` | **0 credits** | Rate limit, not a balance | While the route stays enabled | `src/app/api/generate-guest/route.ts` |
| Lifetime monthly grant | User bought a lifetime deal | Paid product | Not a free signup | Monthly | `src/app/api/cron/lifetime-credits/route.ts` |
| Credit-pack launch bonus | Buying a pack while the pack promo is on | Paid | Per purchase | `src/lib/stripe.ts` `CREDIT_PACKS` |

New accounts are inserted with 20 credits **and** `emailPreferences.relaunchBonusAt` plus `signupCredits: 20`. The claim refuses to add `NEW_USER_BONUS` on top, so a new account does not become 30. The welcome email sends `SIGNUP_CREDITS` only.

The +5 top-up is a single conditional `UPDATE` that stamps `returningTopUpAt` only while that key is missing, and it writes a credit-transaction row. A second visit does not pay again. No email is sent for it.

The guest route is still in the codebase. The site no longer promises "3 free tries". Whether to disable the route is a separate decision.

## Pool for a brand-new person

| | Credits | Notes |
|---|---|---|
| One-time, no one else pays, before any quest | **20** | The signup grant only |
| One-time quests they can finish by spending that grant | **up to 8** | Onboarding. A standard sprite is 1 credit and a rigged idle is 3, so the first sprite and first animation are affordable. Username, share and project do not cost credits |
| Welcome-back +20 / +5 | **Not for a new account** | Only `createdAt` before 7 Oct 2026 |
| Per week, if they keep spending | **up to 5** | Weekly quests. The sprite goal needs 10 delivered sprites that week and the animation goal needs 2, so the reward is a rebate on spend, not a free refill. Cap is locked by `src/lib/quests/quests.test.ts` |
| Milestones | **up to 34 over the life of the account** | Needs hundreds of generations (1,000 sprites alone is 10 credits). Not a day-one pool |
| Per month, forever, with no purchases, no referrals and no weekly quests | **0** | Nothing refreshes a free balance by itself |
| Referral, if friends later pay | **+10 per paying friend** | Unbounded. Not a self-serve quest |

There is no separate "earn more by completing quests" line on the Free card. Quests exist in the app (`/quests` progress is measured from real rows) and pay the amounts above.

## What 20 credits buy

Costs are what the server charges. Defaults are the UI's initial state.

| Generation | Credits | How many fit in 20 | Default? | Where the cost is set |
|---|---|---|---|---|
| Standard sprite | 1 | **20** | Yes. Quality state starts at `"normal"` | `CREDIT_COSTS.normal` / `draft` = 1. `GenerateWorkspace` `useState("normal")` |
| HD sprite | 3 | **6** (2 left) | No | `CREDIT_COSTS.hd` = 3 |
| Style match | 5 | **4** | No | `STYLE_MATCH_CREDITS` |
| Variation | 3 | **6** (2 left) | No | `VARIATION_CREDITS` |
| Edit a sprite | 5 | **4** | No | price list in `src/data/product-guide.ts` |
| Rigged idle (24 frames) | 3 | **6** (2 left) | Yes for a character idle. The first character preset is idle, and `rigMotionFor` turns idle into a breathe rig | `RIG_CREDITS`. Smooth does not change this price |
| AI animation, 4 key poses | 7 | **2** (6 left) | Frame-count default is `DEFAULT_ANIMATION_FRAMES` = 4, but a character idle does not use this price | `ANIMATION_FRAME_OPTIONS` |
| AI animation, 4 key poses, smooth on | 12 | **1** (8 left) | Smooth starts **on** (`useState(true)`). It applies when the motion is not a rig | `animationCredits(4, true)` = 7 + 5 |
| AI animation, 6 key poses | 11 | **1** (9 left) | Walk / run style presets can recommend 6 | same, smooth extra 7 |
| AI animation, 6 key poses, smooth on | 18 | **1** (2 left) | | `animationCredits(6, true)` |
| AI animation, 9 key poses | 12 | **1** (8 left) | | smooth extra 7 |
| AI animation, 9 key poses, smooth on | 19 | **1** (1 left) | | `animationCredits(9, true)` |
| 4 directions | 6 | **3** (2 left) | No | `ROTATIONS` `rotate4` |
| 8 directions | 10 | **2** | No. This is a real product on this tree (a static turnaround, not an 8-direction walk) | `rotate8` |
| 4-direction walk | 12 | **1** (8 left) | No | `walk4dir` |

The comment in `src/config/animations.ts` prices a 1024 grid at about $0.07 and a 2048 grid at about $0.10, plus about $0.02 for the pose planner, and says each option keeps at least a 35% margin at the cheapest credit sold (~$0.024).

## API cost of spending the 20

Current sprite models (`src/lib/runware.ts` `SPRITE_MODELS`):

| Spend the 20 on | Provider images | Approx. USD in code |
|---|---|---|
| 20× Standard | 20× FLUX.2 klein | 20 × **$0.0008 = $0.016** |
| 6× HD (18 credits; 2 left) | 6× GPT Image Mini | 6 × **$0.036 = $0.216** |
| 6× rigged idle (18 credits; 2 left) | No image model. One planner/joints call, price not stored | image cost **$0** |
| 1× smooth 4-frame AI animation (12 credits) | 1024 grid plus the smooth pass | about **$0.07 × 2 = $0.14**, plus the planner |

`ANIMATION_MODEL.approxCostUsd` is **$0.07** per grid. There is no GBP conversion for these models in the repo, so this note stays in USD.

A guest generation, if the route is left on, uses the standard sprite model and is not deducted from the 20.
