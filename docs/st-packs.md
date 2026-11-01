# ST Packs — SillyTavern expression packs (admin-only beta)

One character in, a SillyTavern *Character Expressions* sprite pack out: a flat
ZIP of animated, transparent WebP files named after ST's 28 emotion labels
(`joy.webp`, `anger.webp`, …). Each file is a subtle, seamlessly looping idle
(gentle breathing, a little hair movement, the head held still and centred, at
most one blink) on a transparent background, the character identical across
all expressions.

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
             │       → seamless loop (cut where the pose matches the start, else
             │         premultiplied crossfade, then ping-pong if the seam
             │         is still open) → 16 fps → animated WebP
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
- output is the native cropped frame (Vidu 720×960, LTX 768×1024). The clip
  is decoded at that size; there is no 1.5× working canvas
- a closing frame that copies the first is dropped only when the frame
  before it still closes the loop; dropping a pinned frame after a jump
  reopens the seam
- key: per frame, a colour plane fitted to the outer 8 px border (subject
  pixels on that border are outliers and dropped); 4-connected flood from
  border pixels on the plane, stepping at most 18 levels and never more than
  48 from the plane, so a gradient or soft shadow is background and the
  character edge stops the flood; the largest foreground component is kept
  (enclosed skin, face and light clothing stay opaque). A narrow backdrop
  pocket between a limb and the torso is cleared from a mask decided on
  frame 0 and shifted with the body; a light shirt is not, even when it
  matches the ground. Other components
  are dropped when they are specks or still the backdrop colour; partial
  alpha only in a 3 px band on that outer edge; temporal median on alpha
  (radius 1, circular); un-mix `C = (I − (1−a)·B)/a` for 0.05 < a < 1;
  erode 1 px; blur σ≈0.6; alpha < 8 → 0
- stabiliser: band rows 80–97 %, moving average window 5, x always, y when
  |dy| > 0.5; shifts over 24 px are flagged instead of warped
- loop: the clip is decoded at 16 fps. The longest prefix whose last frame
  already matches the first (seam ≤ 6 and ≤ 2× a normal step) is the loop, so
  a pinned last frame is kept when dropping it would open the cut. Otherwise
  crossfade K = 8 × 16/24 ≈ 5 frames (≈ 0.33 s), tail dropped, then
  ping-pong when the seam is still open (every label, including joy). A
  one-frame snap onto a pinned still is reversed the same way, so the join
  is one ordinary step. The idle prompt forbids head sway; Vidu still gets the same
  still as first and last frame inside the one $0.0825 clip
- WebP: one encode, quality 90, alpha quality 100, effort 4, hard cap 6 MB.
  Lossless is optional on the job (default off) and is also a single encode

### Orchestration

A full job takes 10–15 minutes, so nothing runs in one request. Jobs and
expressions are rows (`st_pack_jobs`, `st_pack_expressions`) with statuses:

- job: `draft → base_ready → running → done | partial | failed | cancelled`
- expression: `queued → editing → edited → video_submitted → video_ready → processing → done | failed` (+ `flagged`)

`POST …/advance` (and a poll, only when no background worker can be started)
runs a *tick*: expired locks are recovered, the next steps are claimed with
`UPDATE … WHERE status = … AND lock expired` (so two callers never run the same
step), and the claimed steps run in `after()` after the response, each well
under the 300 s function limit. Each step is retried once; the Runware task id
is written before the clip is submitted, so a crash never submits twice.
Concurrency: `ST_PACKS_CONCURRENCY` busy expressions (default 8, so a default pack edits and submits together),
`ST_PACKS_POST_CONCURRENCY` (default 2) post-processes inside that one worker,
`ST_PACKS_VIDEO_CONCURRENCY` (default 8) open video tasks — a full default set
in one Vidu round.

### Background worker

Creating a job (and every regenerate / advance) kicks `POST /api/st-packs/worker`
— an internal route authenticated with `QUEUE_SECRET` (the `/api/queue`
pattern). It answers 202 at once and loops in `after()`: tick → run the claimed
steps → 3 s pause → … for up to 240 s, then hands its lease to a fresh
invocation, until the job ends. Before a tick claims another step, the loop
hands off when less than 90 s remain of the 240 s budget or of the 300 s
function limit. 90 s covers native post-processing, the slowest step. The tick that marks the job finished also queues `pack.zip` and the
preview GIF; that work runs before the lease is released. One job has one worker. The kick
compare-and-swaps `st_pack_jobs.worker_lease_until` (60 s, renewed every loop,
taken over by the successor — never cleared in between, so a poll cannot slip
in). The page only reads snapshots. It kicks a worker only when that lease has
expired **and** no expression holds an active `locked_until`. A Vidu render does
not touch the row, so "no row changed" is not a dead worker. Without
`QUEUE_SECRET` the routes fall back to advancing on the page's polls.
Steps chain inside one invocation: an edited still is submitted as a clip at
once (while fewer than 8 clips are already open), a finished clip is
post-processed at once (two at a time per invocation —
`ST_PACKS_POST_CONCURRENCY` — sharing the 3 GB function). The per-expression
step writes the WebP and a still PNG. The GIF pack is encoded when it is
downloaded. A job still marked running with an expired lease and no row
change for 30 minutes is closed the next time the studio loads or polls.
A regenerate runs the step `tick()` just claimed and then kicks; it does not
drop that claim when the kick is accepted.

### Memory

The first production run was killed for memory at 608×810 (1.5× working
frames at 24 fps, six stages alive at once). PR #28 decodes straight at 16 fps,
cuts ffmpeg's output into whole frames as it streams, reassigns one `frames`
variable per stage so the previous one can be collected, and gives the
`/api/st-packs/*` functions 3 GB (`vercel.json`). That one clip peaked near
1506 MB at 912×1215. Native 720×960 is about 0.62× the pixels, so two posts
in the same worker stay near 1.5 GB.

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
| `drift_px` lower-band centroid x range | > 4 px |
| `head_x_range` | informative only |
| `seam` vs `cons_med` | seam > 2 × median consecutive diff, or > 6 absolute |
| `cons_max` | > 4 × median and > 10 absolute (pop / cut; a blink on a still loop is not one) |
| `alpha_coverage` | outside 8–75 % |
| `edge_touch` | subject touches the left/right edge |
| `corner_opaque` | > 2 % opaque pixels in the corner patches |
| `halo` | edge luminance − luminance of the interior within 3 px > 100 (line-art outlines sit at the edge, so only a gross fringe trips it) |
| `bytes` | > 6 MB |

A flagged tile still ships (with a warning on the ZIP button); the admin
regenerates it (whole expression, or "video only" to re-roll the motion).
"Retry" on a failed tile restarts from the last step that has material:
post-processing only (free) when the clip exists, a new clip when only the
edit exists, else the whole expression.

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
   Then run `prisma/migrations/20261031180000_st_pack_worker_lease/migration.sql`
   (additive: nullable `worker_lease_until` on `st_pack_jobs`, no backfill).
   The lease column has to exist before the worker code is deployed — apply it
   before merging that change. This repo does not use `prisma migrate deploy`
   in production; do **not** run `prisma db push` for this.
2. Vercel → Production env: `ST_PACKS_ENABLED=true` (and any tunables above).
   Everything else reuses `RUNWARE_API_KEY` and the R2 variables.
3. Owner approval for the spend: the 28-label set is ≈ $4 per character.
4. Deploy through the usual route; check `/st-packs` as an admin and that a
   normal account gets 404.

## Known limitations

- The worker chain needs `QUEUE_SECRET` (already set for the generation queue); without it progress needs the page open.
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
