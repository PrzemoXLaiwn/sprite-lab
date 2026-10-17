# Roadmap — product gaps found through search

Gaps that search data and the SEO content work (Oct 2026) exposed. **Not scheduled, not implemented.** Each entry says what people search for, what we have today, and where the site currently says "not yet", so the copy can be updated when the feature ships.

Source: Google Search Console export, 15 Jul – 14 Oct 2026 (3 months). Impressions and positions are from that export. Non-brand queries had 0 clicks in that period.

## 1. Animate your own sprite (upload)

**Today:** animations start from a sprite generated in SpriteLab. There is no way to upload an existing sprite or character and animate it.

**Search demand (GSC, cluster "sprite sheet / animation", ~95 impressions together):**

| Query | Impressions | Position |
|---|---|---|
| sprite sheet generator | 23 | 14.7 |
| sprite atlas generator | 45 | 54 |
| sprite map generator | 12 | 71 |
| 2d sprite animation generator, ai sprite sheet generator, sprite sheet builder, sprite sheet creator ai, ai sprite animator | small, each | 44–97 |

Many of these searchers already have art (their own character, an asset pack) and want frames from it. "Animator" and "sheet builder" phrasing especially points to bringing your own sprite.

**Where the site says "not yet":** `/sprite-sheet-generator` FAQ "Can I upload my own sprite and turn it into a sheet?" says no.

**Open questions before building:**
- Cost guard and pricing: the same animation price, or more because of unknown input quality?
- Moderation of uploaded images (copyrighted characters, NSFW) before they reach the image model.
- Pixel art input: detect the grid and keep it, or re-snap to ours?
- Background removal on uploads that aren't transparent.

## 2. 8-direction walk cycle

**Today:** "8 directions" draws a static 8-view turnaround (10 credits); "4-direction walk" animates down, right, up and left with 4 steps each (12 credits; left is mirrored). There is no 8-direction animation.

**Search demand:** no 8-direction query showed up in the 3-month export yet. Related demand sits in cluster 4 (engines / RPG): "rpg sprite maker online", "free sprites for game maker", and the top-down/isometric use cases. Competitors list more directional output (views, not necessarily walks): Retro Diffusion ("Rotate" to seven more directions) and PixelLab (4 and 8 directional views), see `/compare`.

**Where the site says "not yet":**
- `/guides/how-to-make-an-8-direction-walk-cycle`, section "What SpriteLab can and can't do here" and the last FAQ.
- `/compare/best-ai-sprite-generators-2026` and `src/data/compare.ts` (`SL.turnaround`: "no 8-direction animations").

**Open questions before building:**
- Diagonal walks are where generation is weakest (legs crossing in three-quarter view). Prove quality on a few characters before pricing it.
- Five drawn directions + three mirrored, or all eight drawn (asymmetric characters)?
- Engine pack: eight animations `walk_s` … `walk_se` and the row order documented in the guide.

## When one of these ships

Update the "not yet" places listed above in the same change, and add the feature to `SPRITELAB_SUMMARY` / `SL` in `src/data/compare.ts`.
