# Generation benchmark

Isolated from the app. Nothing here is imported by a route.

## Offline (no API key, no spend)

```bash
npx tsx scripts/benchmark/run.ts scripts/benchmark/out
npx tsx scripts/benchmark/suggest.ts scripts/benchmark/out
npx vitest run src/lib/benchmark src/lib/image/frame-normalize.test.ts src/lib/image/rotation-qa.test.ts src/lib/animation-suggest.test.ts
```

`run.ts` drives `postprocessSprite` and `buildAnimation` on synthetic images, once with the post-process flag off and once on. It writes `metrics.json` and `contact-sheet.png`.

`suggest.ts` writes the Haiku vs Opus price ratio from `src/lib/claude-usage.ts`. It does not call Anthropic unless you pass `--live`.

## Flags (all default off)

| Env | Effect |
| --- | --- |
| `SPRITELAB_FRAME_NORMALIZE=1` | Halo cleanup, content-height lock (±12%), pixel palette merge inside `postprocessSprite` and `assembleAnimation` |
| `SPRITELAB_ROTATION_QA=1` | Direction sheets accept a slim side profile and drop an empty-cell speck by area |
| `SPRITELAB_SUGGEST_HAIKU=1` | Motion suggestions use Haiku and a `generation_events` row (`suggest_cache`) instead of Opus and the in-memory map |

## Live calls

Only with `--live` and a key. Each script stops at a $3 list-price cap. This environment had no `RUNWARE_API_KEY` and no `ANTHROPIC_API_KEY`, so the recorded run spent $0.

```bash
npx tsx --env-file=.env.local scripts/benchmark/run.ts --live scripts/benchmark/out
npx tsx --env-file=.env.local scripts/benchmark/suggest.ts --live scripts/benchmark/out
```

The suggest live path sends a blank 64×64 placeholder, not a real sprite. A pass on that placeholder is not a quality verdict for production art.
