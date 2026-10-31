# Generation and animation quality — findings

Measured in this workspace on 31 Oct 2026. No provider was called. Spend: **$0**. `RUNWARE_API_KEY` and `ANTHROPIC_API_KEY` were unset, so there is no side-by-side model output and no new invoice. Prices below are the list prices already in the repo (`PRICE`, `FEATURE_COSTS`, `claudeCostUsd`), not a fresh measurement of the 19-day bill.

Flags added here default **off**. With them unset, `postprocessSprite`, `assembleAnimation`, `makeRotation` and `suggestMotions` keep today's behaviour.

## What changed, and why

Three prototypes, each behind an env flag, plus an offline harness.

1. **Motion suggestions can use Haiku and a database cache** (`SPRITELAB_SUGGEST_HAIKU`). The live path is still Opus with an in-memory `Map`. That map dies with the serverless instance, and the system prompt is not marked for Anthropic prompt caching, so repeat views of the same sprite pay Opus again. The route already requires a logged-in user and a 60/hour limiter. The ledger row is still written with no user id, because `trackClaude("suggest", response)` omits the user and the call is outside a paid operation. See "Needs owner approval".

2. **Direction sheets can pass a real side profile** (`SPRITELAB_ROTATION_QA`). A 4-direction sheet is rejected when a side view is under 35% of the median width. The median is a front or back view, so a slim profile is treated as a broken sliver, the route refunds, and the Nano Banana sheet is already paid. An 8-direction sheet is a 3×3 with one empty cell; `slice(0, 8)` drops the last view and can keep a speck in that cell. The flagged check uses an 18% width floor and drops the smallest extra frame. Sliced figures still fail. Walk cycles are unchanged.

3. **Frame cleanup can run after the current assembler** (`SPRITELAB_FRAME_NORMALIZE`). It removes a light grey rim on a darker body, pulls content height toward the median by at most 12% while keeping the foot line, and merges near-duplicate pixel colours. It does not change credits, models, or prompts.

## How it was proved

```bash
npm ci
npx vitest run src/lib/image/frame-normalize.test.ts src/lib/image/rotation-qa.test.ts src/lib/animation-suggest.test.ts src/lib/benchmark/pipeline-flow.test.ts src/lib/benchmark/suggest-bench.test.ts src/lib/benchmark/live-run.test.ts
npx tsx scripts/benchmark/run.ts scripts/benchmark/out
npx tsx scripts/benchmark/suggest.ts scripts/benchmark/out
```

`pipeline-flow.test.ts` calls `postprocessSprite` and `buildAnimation` (the functions the sprite and animation services call) with the flag on and off. It is not a test of the helper in isolation.

Synthetic sprite, flag off → on:

| | halo pixels | green speck pixels | colours |
| --- | ---: | ---: | ---: |
| production | 580 | 4 | 40 |
| flag on | 0 | 0 | 1 |

Synthetic 4-frame sheet (same feet, different body heights, near-duplicate reds), flag off → on:

| | halo pixels | content-height std dev | colours | canvas |
| --- | ---: | ---: | ---: | --- |
| production | 974 | 23.45 px | 14 | 128×128, four frames |
| flag on | 0 | 16.45 px | 1 | 128×128, four frames |
| foot line | 0 px spread | 0 px spread | | |

The colour count falls to 1 because the fixture is a flat red rectangle. The merge is doing what it should on that fixture. A shaded sprite would keep shades that sit further apart than the merge distance (900 in the weighted RGB metric, about 21 levels of red). The height lock is capped at ±12% so a crouch is not flattened; 23.45 → 16.45 is that cap, not a full equalisation.

Contact sheet: `scripts/benchmark/out/contact-sheet.png`.

Rotation unit test, no model call: widths 160 / 40 / 160 / 40 fail `productionFramesLookRight` and pass `directionViewsLookRight`. A cutter-sliced frame still fails. Nine frames with an 8×8 speck in the middle keep the last full view and drop the speck.

Suggestion unit test: with the flag on, an injected Haiku response is parsed once, stored in the injected cache, and the second sprite does not call the model. The route is not switched. Opus remains the default.

Illustrative price only, **not measured tokens** (2,000 in / 400 out, both models, `claudeCostUsd`):

| | USD |
| --- | ---: |
| Opus | 0.020 |
| Haiku | 0.004 |
| ratio | 0.20 |

Haiku's published rates in `src/lib/claude-usage.ts` are $1 / $5 per million tokens against Opus at $5 / $25, so the same token counts cost one fifth. A cache hit costs nothing. The $12.45 / 19 days figure was supplied; this run did not re-sum the ledger. Twenty prompt fixtures are in `SUGGEST_BENCH_PROMPTS`. They were scored against hand-written JSON, not against Haiku or Opus, because the API key was absent.

## Pipeline map (current production)

| Operation | Model | Credits | Provider list price | Refund if the user gets nothing |
| --- | --- | ---: | ---: | --- |
| Sprite standard / draft | `runware:400@2` FLUX.2 klein, else Cloudflare `@cf/black-forest-labs/flux-2-klein-4b` at $0 | 1 | $0.0008 | full, via `op.fail` |
| Sprite HD | `openai:1@2` GPT Image Mini, else klein | 3, or 1 after downgrade | $0.036 | difference refunded when klein delivers; full if both fail |
| Style match | `google:4@3` Nano Banana 1024 | 5, or 1 if it falls back | $0.0692, up to 2× on a moderation retry | difference refunded |
| Edit | same grid model | 5 | up to 2 × $0.0692 | full |
| Remove background | Runware `removeBackground` | 1 | $0.002 reserved | full |
| AI upscale 2× / 4× | Runware upscale | 1 / 2 | $0.01 reserved | full |
| Pixel upscale | sharp nearest-neighbour | 0 | $0 | n/a |
| Variation | Replicate `flux-1.1-pro` | 3 each | $0.04 | per image not delivered |
| 3D | Replicate reference + mesh | 4 or 5 | up to 2 × ($0.025 + $0.40) | full |
| Animation 4 / 6 / 9 | Claude Opus planner + Nano Banana 1024 / 2048 / 2048 | 7 / 11 / 12 | cap is planner + 2 grids | full |
| Smooth (extra) | second grid | +5 / +7 / +7 | one more grid | `smoothExtra` refunded when the pass is skipped, even if that grid was paid |
| 4 directions | Nano Banana 1024 | 6 | up to 2 × $0.0692 | full |
| 8 directions | Nano Banana 2048 | 10 | up to 2 × $0.1029 | full |
| 4-direction walk | 2048 sheet, up to two 1024 row redraws, left row mirrored | 12 | up to 2×$0.1029 + 2×$0.0692 | full only if the sheet is rejected |
| Rig | Claude joints, no image model | 3 | up to ~$0.07 | full, including when the rig returns null and an AI walk is started afterwards |
| Guest sprite | klein, no operation row | 0 | $0.0008 | nothing was charged |
| Motion suggestions | `claude-opus-5-5`, no operation row | 0 | vision + long system prompt | nothing was charged |

Prompt construction for a sprite is `buildSpritePrompt` (short instruction, white or magenta key, no negative prompt). Pixel grid, palette and transparency are applied afterwards by `postprocessSprite`. Animations are white-keyed in `extractFrames` (`flatGaps` off), then `assembleAnimation` (shared canvas, body align, `matchColours`, 32-colour palette for pixel).

### Provider cost that survives a refund

`refundsThatStillCost()` in `src/lib/benchmark/cost-map.ts` lists these. The user is made whole; the provider may already have billed.

- Sprite timeout after Haiku interpret: interpret (~$0.0014) plus the klein list price on a timeout. An explicit Runware error is logged at $0 for the image.
- HD timeout, then a successful klein retry: the $0.036 is spent and 2 of the 3 credits are returned.
- Style-match moderation retry (second full grid) then a klein fallback: up to 2 × $0.0692 plus $0.0008, and 4 of the 5 credits are returned.
- Upload failure after a successful image: `generateSingle2D` throws inside the `try` that calls `op.fail`, so the credit is refunded and the image was paid. The comment above that `try` says not to refund after provider success; the upload throw does not honour it.
- Animation / rotation / edit failure after one or two grids, including a moderation retry inside `generateAnimationGrid`.
- Smooth pass whose in-betweens are discarded: the extra credits are refunded and the second grid can already have been paid.
- Rig that calls Claude and then returns null (`op.cancel`): the rig credits are refunded and a second operation starts the paid walk.
- Remove-bg, upscale and variation failures on a timeout: list price kept, credits refunded.
- 3D failure after the reference image or the mesh call.

Not a refund, but the user is charged and the output is poor: animation key frames that fail `framesLookRight` are still assembled and not refunded. Rotations do the opposite: they throw and refund. A walk row that stays frozen after a failed redraw is delivered at the full 12 credits. A hard kill at the route's 300s limit can happen before `op.fail`, so the credits stay charged and the provider calls stand.

A successful sprite whose keying fails calls `removeBackground` again (~$0.002) with no extra credit. Guest generation and motion suggestions write `provider_calls` with `operationId` null.

## Needs owner approval

No auth rule was changed.

**Anonymous rows.** These writers create `provider_calls` with `operationId` null (and `userId` null):

- `POST /api/generate-guest` — on purpose. No session, no credits, 3/hour/IP and 200/hour globally, fail-closed in production. Not a bypass of `POST /api/generate`, which requires a session and `startOperation`.
- `GET /api/animate/suggest`, prompt translate and prompt enhance — authenticated or internal, but not wrapped in an operation, so the ledger cannot see the user.
- `POST /api/queue/process` — secret-gated. `generateImage` and `removeBackground` run there without `runInOperation`, so a drained queue looks like an anonymous batch. Nothing in this repo calls `/api/queue/submit` anymore; an old client still could.

A burst of 39 calls in 34 minutes fits the guest global cap (200/hour) if it is spread across IPs (3/hour each), or a worker/script. It does not fit one guest IP. This environment has no database credentials, so those exact rows (31 Oct 01:08–01:42 UTC, and the 30 on 19 Oct) were **not** re-queried. Fix, if you want it: pass `userId` into the ledger from the suggest route and from the queue worker, and keep guest rows explicitly tagged `task: "sprite"` plus a non-null `ip` hash. That is a billing change. Do not close guest generation without a product decision; it is the logged-out demo.

**Suggest user id.** `src/app/api/animate/suggest/route.ts` already returns 401 when logged out and calls `rateLimitAiHelper` (60/hour, fail-closed to an in-memory cap in production). One line would pass `user.id` into `suggestMotions`. `recordProviderCall` still stores `userId` from the operation context only, so the `provider_calls.userId` column stays null until the ledger accepts an explicit user id. Both edits are outside this change.

**Remove background and upscale.** Both paid routes call `startOperation` (`remove_bg`, `upscale`) and the provider helpers log `task: "remove_bg"` and `task: "upscale"` through `recordProviderCall`, the same function sprites use. Pixel-perfect upscale charges 0 and does not call Runware, so it correctly has no provider row. Zero ledger rows for those task names means the paid tools did not run in the window, or the report looked for a different task string. Re-query `provider_calls.task in ('remove_bg','upscale')` before treating the tools as unlogged. The queue worker's background removal uses the same task name and a null operation id, which a join onto `operations` would hide.

## Ranked next steps

1. Turn on `SPRITELAB_SUGGEST_HAIKU` only after a live 20-prompt run with real sprites (`scripts/benchmark/suggest.ts --live`). Wire `user.id` in the suggest route. Expected saving if tokens match the table: about 80% of the Opus suggest bill, and ~100% of repeat views once the database cache hits.
2. Turn on `SPRITELAB_ROTATION_QA` after checking a handful of real failed direction sheets. It should stop refunding sheets whose only fault is a narrow side view. It will not fix a sheet the model actually sliced.
3. Keep `SPRITELAB_FRAME_NORMALIZE` off until it is tried on shaded and pixel sprites. The synthetic run shows the halo and the height lock working; it also shows a flat fixture collapsing to one colour.
4. Do not add paid redraws to animations that fail QA. That spends another grid. Refund or ship, as rotations already refund.
