# ST Packs — SillyTavern expression packs (admin-only beta)

One character in, a SillyTavern *Character Expressions* sprite pack out: a flat
ZIP of animated, transparent WebP files named after ST's 28 emotion labels
(`joy.webp`, `anger.webp`, …). Each file is a subtle, seamlessly looping idle
(breathing, blinking, a little hair sway) on a transparent background, the
character identical across all expressions.

The tool is internal: admin only (`ADMIN` / `OWNER`), behind a server flag,
charges no credits and touches no pricing, Stripe or auth code.

## Enable it locally

```
ST_PACKS_ENABLED=true
```

in `.env.local`, then `npm run dev` and open `/st-packs` as an admin. The
sidebar shows "ST Packs" with a BETA badge. With the flag off the page and every
`/api/st-packs/*` route answer 404 for everyone, admins included.

The tables must exist (see *Production checklist* — the same SQL works on a
dev database).

## Testing cheaply

Real generation spends real money. The cheap loop:

1. Source → *Describe character* → "Generate base" with count 2 (two Nano
   Banana stills, ≈ $0.14), or upload a picture (free).
2. Expression set → *Custom* → tick `joy` only (`neutral` is always in).
3. Generate. Two expressions ≈ $0.24:

| step | model | per expression |
|---|---|---|
| expression edit | Nano Banana 2 (`google:4@3`, 896×1200) | $0.07 (neutral: $0, it is the base) |
| idle clip, 4 s | Vidu Q2 Turbo (`vidu:3@2`, 720×1280 padded, small movement) — default | $0.0825 |
| idle clip, 4 s | LTX-2.3 Fast (`lightricks:ltx@2.3-fast`, 768×1024, 24 fps) — `ST_PACKS_VIDEO_MODEL` | $0.12 |
| matte | colour key (default) | $0 |
| matte | Runware per frame (`ST_PACKS_MATTE_MODE=runware`) | ≈ $0.20 (≈100 frames × $0.002) |

Default 8 ≈ $1.15, all 28 ≈ $4.2 (key matte, Vidu). The page shows the estimate
before you start and the reported cost as it runs. Caps:
`ST_PACKS_MAX_USD_PER_JOB` (10) and `ST_PACKS_MAX_USD_PER_EXPRESSION` (1.5)
stop retries at the limit.

A full 8-pack only when Przemek says so.

## Pipeline

```
base still ──┐
             ├─ (1) expression edit ── align to base ──┐
             │      Nano Banana, identity-locked        │
             │                                          ▼
             │                    (2) idle clip, first = last frame = the still
             │                        Vidu Q2 Turbo (or LTX-2.3 Fast), async, polled
             │                                          │
             │                                          ▼
             │   (3) decode (ffmpeg-static) → matte → temporal median → defringe
             │       → stabilise (lower-torso centroid, circular smoothing)
             │       → seamless loop (premultiplied crossfade, ping-pong fallback
             │         for calm labels only) → 16 fps → resize → animated WebP
             │       → QA
             └─ (4) pack.zip (+ static PNG zip, GIF zip, preview grid)
```

Parameters (`src/config/st-packs.ts`, from the validated Python prototype):

- video models (`ST_VIDEO_MODELS`): both take a first AND a last frame.
  Vidu's frame mode only accepts 720×1280, so the 3:4 still is padded on its
  own background colour and the decoded frames are cropped back; its
  `movementAmplitude: small` is what makes the idle subtle. LTX takes a true
  3:4 canvas but moves more (its prompt enhancer is off; it still drifted
  3 px with a pop on the test still vs 0.006 px for Vidu)
- working canvas 1.5× the output; output 504×672 (3:4) by default
- duplicate closing frame dropped when mean |last − first| < 0.02
- key: background = median of the four 24×24 corner patches; smoothstep key
  between RGB distance 18 and 60; temporal median on alpha (radius 1,
  circular); un-mix `C = (I − (1−a)·B)/a` for 0.05 < a < 1; erode 1 px; blur
  σ≈0.6; alpha < 8 → 0
- stabiliser: band rows 80–97 %, moving average window 5, x always, y when
  |dy| > 0.5; shifts over 24 px are flagged instead of warped
- loop: crossfade K = 8 frames at 24 fps (≈ 0.33 s), tail dropped
- WebP: quality 78/alpha 50 → 75 → 72 → 70/45 → 66, effort 6, target ≤ 1.48 MB,
  hard cap 1.5 MB

### Orchestration

A full job takes 10–15 minutes, so nothing runs in one request. Jobs and
expressions are rows (`st_pack_jobs`, `st_pack_expressions`) with statuses:

- job: `draft → base_ready → running → done | partial | failed | cancelled`
- expression: `queued → editing → edited → video_submitted → video_ready → processing → done | failed` (+ `flagged`)

Every `GET /api/st-packs/jobs/[id]` (the page polls every 4 s) and
`POST …/advance` runs a *tick*: expired locks are recovered, the next steps are
claimed with `UPDATE … WHERE status = … AND lock expired` (so two polls never
run the same step), and the claimed steps run in `after()` after the response,
each well under the 300 s function limit. Each step is retried once; the
Runware task id is written before the clip is submitted, so a crash never
submits twice. Concurrency: `ST_PACKS_CONCURRENCY` busy expressions,
`ST_PACKS_VIDEO_CONCURRENCY` open video tasks.

**Known limitation:** the job only advances while an admin has the page open
(or calls `/advance`). No cron was added.

### Cost logging

Every provider call goes through the normal ledger (`provider_calls`, provider
`runware`, tasks `st_base`, `st_expression`, `st_video`, `remove_bg`) under
operation ids `stpack_<expressionId>` / `stpack_base_<uuid>`. There is no
`operations` row and no credit charge; `ledger-report`'s per-feature view joins
from `operations`, so ST costs stay out of the user-facing margins and only show
in the raw provider totals. Costs also accumulate on the expression and job rows
(reported when Runware returns it, else the list price).

## QA metrics (per expression, `qa` JSONB)

| metric | fail when |
|---|---|
| `drift_px` lower-band centroid x range | > 0.5 px |
| `head_x_range` | informative only |
| `seam` vs `cons_med` | seam > 2 × median consecutive diff, or > 6 absolute |
| `cons_max` | > 4 × median (pop / cut) |
| `alpha_coverage` | outside 8–75 % |
| `edge_touch` | subject touches the left/right edge |
| `corner_opaque` | > 2 % opaque pixels in the corner patches |
| `halo` | edge luminance − luminance of the interior within 3 px > 100 (line-art outlines sit at the edge, so only a gross fringe trips it) |
| `bytes` | > 1.5 MB |

A flagged tile still ships (with a warning on the ZIP button); the admin
regenerates it (whole expression, or "video only" to re-roll the motion).

## Installing a pack in SillyTavern

1. SillyTavern → Extensions → Character Expressions.
2. Open the character → "Upload sprite pack (ZIP)" → choose `<name>_st_pack.zip`.
3. Set the fallback expression to `neutral`.
4. Classifier: local or LLM.
5. Waist-up packs look best in Visual Novel mode.

ST keeps only `image/*` entries from the zip and flattens folders, so
README.txt rides along harmlessly. Static PNGs and GIFs are separate archives
on purpose: `neutral.png` next to `neutral.webp` would register as two sprites
for one label. Validated on ST 1.19.0.

## Production checklist

1. Run `prisma/migrations/20261031020000_st_packs/migration.sql` in the
   Supabase SQL editor (additive: two new tables with RLS on, no policies).
   This repo does not use `prisma migrate deploy` in production; do **not**
   run `prisma db push` for this.
2. Vercel → Production env: `ST_PACKS_ENABLED=true` (and any tunables above).
   Everything else reuses `RUNWARE_API_KEY` and the R2 variables.
3. Owner approval for the spend: the 28-label set is ≈ $4 per character.
4. Deploy through the usual route; check `/st-packs` as an admin and that a
   normal account gets 404.

## Known limitations

- Progress needs the page open (no worker/cron).
- Two video models (Vidu Q2 Turbo, LTX-2.3 Fast); the other Runware video
  models lack a last frame. Nano Banana 2 draws fixed sizes, so the edit
  canvas is 896×1200, scaled to the output.
- Each step is bounded by the 300 s function limit; a 5 s clip at 24 fps
  (120 frames) processes in well under that, but very busy backgrounds can
  make the colour key leave fringes — switch that job to the Runware matte.
- Busy hair against a similar background is the weak point of the key matte.
- 28 expressions: ≈ $4 and 20–30 minutes with default concurrency.
- `.env.example` could not be edited from the session (the tooling protects
  `.env*` files); the variables above are the reference.
