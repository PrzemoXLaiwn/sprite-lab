# Training a custom SpriteLab LoRA — playbook

This is the end-to-end guide for taking generations the platform has
already produced and turning them into a SpriteLab-branded LoRA hosted on
Runware. Each LoRA is small (~80–200 MB), cheap to train ($15–50), and
plugs into the live pipeline by editing one file.

The pipeline is wired for LoRA already (see `src/config/loras.ts` and
the `loras` parameter in `src/lib/runware.ts` → `imageInference`). Only
the dataset and the training run are manual.

---

## When to train a LoRA

Train a LoRA when **prompt engineering hits its ceiling for a specific
style or motif**. Symptoms we hit during testing:

- A user picks "Pixel Art 16-bit" → output looks pixelated but isn't on
  a real grid → we patch by post-processing in sharp. A 16-bit LoRA
  trained on real SNES sprites would produce native pixel art directly,
  no post-process needed.
- A user picks "Top-Down" for a character → FLUX's prior overrides the
  selector → we patch with `(())` emphasis + negatives. A top-down LoRA
  trained on Zelda / Pokemon / Stardew sprites would hit the
  convention 100% of the time.

Train one LoRA per "style + use case" combo. Don't try to make one LoRA
do everything — they over-fit and you lose the base FLUX flexibility.

---

## Step 1 — Curate a dataset

Aim for **80–200 images per LoRA**. Quality matters more than quantity:
50 hand-picked images out-perform 500 random ones.

### Option A: harvest from existing SpriteLab generations

Every successful generation persists to the `Generation` table with
`prompt`, `fullPrompt`, `imageUrl`, `styleId`, `categoryId`, `seed`, and
`likes` count. Export the best ones:

```bash
# Export top 200 community-liked Pixel Art 16-bit characters
npx tsx scripts/export-training-data.ts \
  --style PIXEL_ART_16 \
  --category CHARACTERS \
  --limit 200 \
  --min-likes 1 \
  --output ./training-data/spritelab-pixel-character.jsonl
```

The script writes JSONL with `{ image, caption, meta }` lines. `caption`
defaults to `fullPrompt` (what FLUX actually saw) so the LoRA learns the
whole framing recipe — A-pose, view, style anchors, etc.

### Option B: external reference set

Sometimes there isn't enough internal data yet — bootstrap from CC0
sources:

- **OpenGameArt.org** — filter by license `CC0`, download sprite packs.
- **Itch.io free assets** — filter by `Free` and check each pack's
  license (most are CC0 or CC-BY).
- **Kenney.nl** — entire library is CC0.

Convert to JSONL by hand (or quick script) — same shape:

```jsonl
{"image": "https://cdn.example/pixel-knight-001.png", "caption": "16-bit pixel art knight sprite, full body, A-pose, transparent background"}
{"image": "https://cdn.example/pixel-knight-002.png", "caption": "16-bit pixel art warrior sprite, side view walking, transparent background"}
```

### Quality checklist

For each image in the set, verify:

- [ ] Transparent background (or alpha-mask trivial to apply)
- [ ] Single isolated subject
- [ ] Caption describes the subject AND the style/framing tags you want
      the LoRA to learn (e.g. "pixel art", "top-down", "A-pose")
- [ ] No watermarks, signatures, UI overlays
- [ ] Resolution ≥ 512×512 (Runware downsamples; 1024×1024 ideal)

---

## Step 2 — Upload the dataset to Runware

Runware's training endpoint accepts a JSONL file referencing publicly
fetchable image URLs, OR a zip of images + a `metadata.csv`.

### JSONL route (recommended, matches our exporter)

1. Upload `spritelab-pixel-character.jsonl` to a public bucket (R2 works).
2. Note the public URL.

### Zip route

```bash
zip -r spritelab-pixel-character.zip ./training-data/spritelab-pixel-character/
# upload the zip somewhere fetchable
```

---

## Step 3 — Submit the training job

Runware Training is a separate API surface from inference. Use the REST
endpoint or the dashboard.

### Dashboard (easiest first time)

1. Sign in at https://my.runware.ai
2. **Models → Train new LoRA**
3. Base model: `runware:101@1` (FLUX-dev) — same base as our inference
4. Dataset: paste the JSONL URL
5. LoRA name: `spritelab-pixel-character-v1`
6. Training params (defaults are good for first runs):
   - Steps: `1500`
   - Learning rate: `1e-4`
   - Network rank: `16` (smaller LoRA, faster, less overfit)
   - Resolution: `1024`
7. Click **Train**. ~20–60 minutes wait. Cost shown upfront.

### REST API (for automation)

```bash
curl -X POST https://api.runware.ai/v1/training/lora \
  -H "Authorization: Bearer $RUNWARE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "baseModel": "runware:101@1",
    "datasetUrl": "https://r2.example.com/spritelab-pixel-character.jsonl",
    "name": "spritelab-pixel-character-v1",
    "steps": 1500,
    "learningRate": 0.0001,
    "rank": 16,
    "resolution": 1024
  }'
```

The response includes a job ID. Poll the job endpoint until status is
`completed`. The trained LoRA's AIR identifier looks like
`runware:<your_user_id>/spritelab-pixel-character-v1@1`.

---

## Step 4 — Wire the LoRA into SpriteLab

Open `src/config/loras.ts` and add the AIR you got back:

```ts
export const STYLE_LORA_MAP: Record<string, SpriteLabLora[]> = {
  PIXEL_ART_16: [
    {
      model: "runware:USER_ID/spritelab-pixel-character-v1@1",
      weight: 0.85,
      note: "Trained on 200 community-liked SpriteLab pixel-art-16 chars (round 1)",
    },
  ],
  // …
};
```

Save, push, deploy. Every generation that picks `PIXEL_ART_16` now
applies that LoRA on top of FLUX. Adjust `weight` between 0.5 and 1.0
to taste — higher = more LoRA influence, lower = more FLUX flexibility.

For a category-specific LoRA (e.g. "weapons-only" trained on RPG weapon
references), use `CATEGORY_LORA_MAP` in the same file. Style and
category LoRAs stack at inference time (Runware allows up to ~5).

---

## Step 5 — Iterate

Train the **v2** when:

- A new common prompt pattern produces bad output (collect 30+ failure
  examples → re-train with corrections)
- You want to tighten the style further (lower learning rate, more steps)
- You want to add a new motif (don't train one giant LoRA — train a
  sibling: `spritelab-pixel-weapons-v1` next to `-character-v1`)

Bump the version suffix (`@2`) and update `loras.ts`. Old assets keep
working because they reference the AIR by version — no breakage.

---

## Cost & time table

| Step | Time | $ |
|---|---|---|
| Curate 200 images | 2–5 hours one-off | 0 |
| Upload dataset to R2 | 5 min | ~0 (within free tier) |
| Runware LoRA training | 20–60 min | ~$15–25 |
| Wire into `loras.ts` + deploy | 5 min | 0 |
| **Total per LoRA** | **3–6 hours** | **~$15–25** |

Realistic SpriteLab roadmap:

- **Phase 1** (week 1): `spritelab-pixel-character-v1` + `spritelab-pixel-weapons-v1`
- **Phase 2** (week 2): `spritelab-topdown-v1`, `spritelab-isometric-v1`
- **Phase 3** (month 2): per-subcategory LoRAs (`-bosses`, `-creatures`, …)

After Phase 2 the platform has its own visual identity that prompt
engineering alone cannot replicate.

---

## Why not full fine-tuning?

A full fine-tune (modifying every weight of FLUX-dev) costs $200–2000
per run, takes 1–3 days, and you have to re-do it every time you want
to change anything. LoRAs are 99% of the quality at 1% of the cost,
and you can swap them at runtime.

A full fine-tune makes sense once you have ~10 working LoRAs and want
to consolidate the lessons into a single `spritelab-flux-base-v2`.
That's a separate playbook — open an issue when we get there.
