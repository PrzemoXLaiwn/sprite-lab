# Sprite quality benchmark

Fixed set of 8 prompts (character, item, tile, effect). The pictures are synthetic stand-ins for what the image model hands back: a subject on white, a 3px rim of `rgb(228,228,228)`, and frames that do not share a pixel. No provider was called, so this run cost $0.

```
npx tsx scripts/quality-benchmark.ts docs/quality-benchmark/before   # pipeline before this change
npx tsx scripts/quality-benchmark.ts docs/quality-benchmark/after    # pipeline after
```

`extractedLightEdgeRatio` is the share of edge pixels that are still near-white after the sheet is cut into frames. `1` means the whole outline is a halo.

| Prompt | Case | Before | After |
| --- | --- | --- | --- |
| side-view knight, walk cycle | character-knight | halo, edge ratio 1 | no halo, edge ratio 0 |
| four-frame sword slash | effect-slash | halo, edge ratio 1 | no halo, edge ratio 0 |
| green slime, front view | character-slime | edge ratio 0.038, centred | unchanged |
| red health potion | item-potion | edge ratio 0.038, centred | unchanged |
| steel longsword | item-sword | edge ratio 0.038, centred | unchanged |
| fireball | effect-fireball | edge ratio 0.038, centred | unchanged |
| stone floor tile | tile-stone | 256², no holes | unchanged |
| water tile | tile-water | 256², no holes | unchanged |

Single sprites and tiles already ran the matte repair and the seam heal. The hole was animation sheets: two fringe passes leave the third pixel of a pale rim, and that rim never went through `repairMatte`.

Walk frames on this set were already on one vertical line (`jitterPx` 0 before and after). A sub-pixel foot measurement is covered by `snapFrameAnchors` in `src/lib/image/frame-align.test.ts`: 10.4 and 10.6 land on the same pixel, a 2.8px step is kept.

Knight, before (grey rim) and after (rim recoloured to the body):

![Knight frame before](before/character-knight-extracted.png)
![Knight frame after](after/character-knight-extracted.png)

Slash, before and after:

![Slash frame before](before/effect-slash-extracted.png)
![Slash frame after](after/effect-slash-extracted.png)

## Cost

A generation that succeeds on the first try makes the same provider calls as before.

| Path | Before | After |
| --- | --- | --- |
| Sprite, standard (FLUX.2 klein) | ~$0.0008 | ~$0.0008 |
| Sprite, HD (GPT Image Mini) | ~$0.036 | ~$0.036 |
| Animation sheet, 1024 | ~$0.0692 | ~$0.0692 |
| Background removal, success | ~$0.0006–$0.002 | same |
| Background removal, timeout / dropped connection | fail, credit refunded | one retry, only if the operation cap still has the $0.002 it already reserved (`remove_bg` cap is 2×). Invalid images and moderation blocks are not retried |
| Google moderation on a sheet | one retry with a prefix, then refund | the same one retry, with the blocked words rewritten (`slime` → jelly, `acid` → green liquid). No third call |

Last 24h was 287 provider calls: 283 ok, 2 Google moderation rejects, 1 background-removal error, 1 background-removal timeout. The retry can add at most one $0.002 remove-bg call on a timeout, and only inside the existing cap. It does not add a call to a generation that already succeeded.
