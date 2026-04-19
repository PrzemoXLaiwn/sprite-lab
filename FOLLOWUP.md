# Follow-up tracking

Deferred concerns captured during the v2 rebuild. Each entry states the
current state, the risk, the plan, and why it's deferred — so nothing slips.

---

## Legacy UI contracts

Contracts every consumer of `src/config/legacy/redirect-maps.ts` must honor
from day one. Enforced by code review until the first UI consumer lands in
Module 11 (gallery + projects UI).

### `resolveLegacyStyleId()` / `resolveLegacyCategoryId()` null contract

- Both helpers return `string | null`.
- `null` means the old ID is **retired** (mapped to `LEGACY_ONLY`) OR
  **unknown** (not in the frozen audit set — shouldn't happen for rows
  migrated from `generations`, but defensive against drift).
- Callers **MUST** null-check. On `null`:
  - Render the asset's style/category with the fallback label
    `"Legacy / Unknown"`.
  - Disable regenerate and variation actions for that asset.
  - Do **not** pass `null` through to the new-system style/category picker —
    it will throw (see `getStyleConfig()` in `style-configs.ts`).
- Non-null returns are safe to hand to the new-system config lookups.

### Surfaces that consume these helpers (plan)

Module 11 will wire these into:

1. Gallery card (asset thumbnail + label).
2. Asset detail page.
3. Project asset list.
4. Community post render (when a post references a legacy asset).
5. Search / filter pickers — legacy rows must not appear in new-ID filters
   that would otherwise hide them silently.

Any non-Module-11 code that reads `Asset.styleId` or `Asset.categoryId` of a
row with `legacy = true` is subject to the same contract.

---

## 1. Row Level Security (RLS) on `assets`, `projects`, `project_folders`

**Current state.** User isolation is enforced at the application layer only —
API routes filter by `session.user.id`. No Postgres RLS policies exist on any
table.

**Risk.** Any missed filter in a server handler, service function, or Prisma
query = cross-user data leak. No defense in depth.

**Plan.** Dedicated hardening pass before paid-tier launch:
  - Enable RLS on `users`, `projects`, `project_folders`, `assets`,
    `credit_transactions`, and the community tables.
  - Policies follow the standard pattern: `user_id = auth.uid()` for all
    owner-scoped rows; `is_public = true` for community-gallery reads.
  - Verify Supabase service-role bypass is correct for the server-side Prisma
    client (we use the service-role key server-side, which bypasses RLS by
    design).

**Why later.** The existing 28 tables have no RLS. Adding it to a subset
piecemeal creates inconsistency and a false sense of security. Do it once,
comprehensively, coupled with the Prisma-migrate adoption below so the
policies land as reviewed DDL.

---

## 2. Adopt `prisma migrate` instead of push-mode

**Current state.** The schema is managed with `prisma db push`. There is no
migration history; DDL changes are implicit.

**Risk.** Production DDL is fragile:
  - No rollback path.
  - No record of when/what changed.
  - Raw SQL constraints (e.g. `assets_image_location_check`) must be
    re-applied manually every time the DB is rebuilt from schema.
  - Impossible to review DDL as part of a PR diff.

**Plan.** Same hardening pass as RLS:
  1. Initialize `prisma migrate` with a baseline from the current schema.
  2. Commit the baseline and all RLS policies as the first reviewed migration.
  3. Encode the `assets_image_location_check` constraint and any future CHECK
     constraints as SQL inside migrations.

**Why later.** Velocity over theoretical DDL safety at current scale. Flip
the switch before paid-tier launch, not mid-rebuild.

---

## 3. Raw SQL constraint to re-apply after every schema push

Until Prisma migrate is adopted (see #2), this must be re-run manually
whenever the DB is rebuilt from schema:

```sql
ALTER TABLE assets
  ADD CONSTRAINT assets_image_location_check
  CHECK ((image_key IS NOT NULL) != (legacy_image_url IS NOT NULL));
```

The migration script (`scripts/migrate-generations-to-assets.ts`, landing in
Module 1b) will document this command in its header comment so nobody forgets.

---

## 4. Community posts still reference legacy `generations.id`

**Current state.** `community_posts.generationId` FKs the legacy
`generations` table. Legacy community posts remain valid. New posts will
need to reference `assets.id` once we wire up sharing in Module 11.

**Plan.** Add a nullable `assetId` column to `community_posts`, keep
`generationId` for legacy, enforce exactly-one at insert time. Same pattern
applies to `post_likes`, `reports`, etc. Revisit in Module 11 (Gallery +
Projects UI) when the community share flow is rebuilt.

**Why later.** Gallery/community UI is module 11. No urgency until then.

---

## 5. Testing framework not installed

**Current state.** No `vitest` / `jest` / etc. in `devDependencies`. The
redirect-map drift check is implemented as a compile-time `Record<…>`
exhaustiveness plus a runtime self-check at module load — not a unit test.

**Risk.** Low for now (the compile-time check catches the primary drift
case). Runtime check only fires when the module is imported.

**Plan.** Install `vitest` in a dedicated testing-setup pass. Convert the
redirect self-check into a proper test. Add tests for the pipeline
post-processing utilities (pixelation, palette quantization) in Module 2 —
these are pure functions and high-leverage to test.

**Why later.** Module 2 is where tests become genuinely useful (post-processing
is the first non-trivial pure-function surface). Installing vitest now, for
one test, is churn.

---

## Performance / bandwidth

### `upscaleForDisplay` PNG compression level

**File.** `src/lib/image/pixelate.ts` — the `upscaleForDisplay()` function only.

**Current state.** Output is PNG-encoded at sharp's default compression level
(`compressionLevel: 6`).

**Opportunity.** Bumping to level 9 saves ~10–15% on pixel-art PNGs — small
palettes are highly compressible, and level 9 exploits that at the cost of
a few extra ms of CPU. On a single 1024² display sprite the saving is
negligible; aggregated across the 1113 legacy + ongoing new gens served
from R2, it's a few MB/month of bandwidth saved for free.

**Action.** One-line change: `.png({ compressionLevel: 9 })` inside
`upscaleForDisplay()` only. Keep `pixelate()` at default — 32² PNGs are
already tiny and the CPU cost doesn't pay for itself.

**Priority.** Low. Do as a "while you're in there" cleanup next time
`pixelate.ts` is touched for another reason.

---

## Color / quantization

### LAB precompute for fixed palettes

**File.** `src/lib/image/quantize.ts` — `quantizeForced()`.

**Current state.** `paletteLab` is rebuilt on every call (hex → RGB → Lab).
For the three fixed palettes — Game Boy DMG (4 entries), PICO-8 (16), DB16
(16) — this is the same arithmetic every request.

**Action.** When Module 3 wires `src/config/styles/style-configs.ts`, move
the Lab precomputation into the style config module so fixed-palette Lab
tables are computed once at module load. `quantizeForced` grows a second
arg (the precomputed Lab) or checks for a sibling table, whichever is
cleaner at the call site.

**Priority.** Low — microseconds per call. Do when touching
`style-configs.ts` for another reason.

### ΔE2000 upgrade path

**File.** `src/lib/image/quantize.ts` — `deltaE76Sq()`.

**Current state.** Colour distance is ΔE76 (plain Euclidean in Lab).
Adequate for most inputs; perceptually non-uniform for saturated colours.

**Symptom that would trigger this.** Forced-palette output starts looking
wrong (e.g. PICO-8 skin tones mapping to magenta, Game Boy DMG highlights
landing on the wrong green).

**Action.** Replace `deltaE76Sq` with a `deltaE2000Sq` implementation. The
file boundary is unchanged — distance is a pure function, the hot loop in
`quantizeForced` just calls the new one. ΔE2000 is ~3× the arithmetic;
still dominated by Lab conversion, not distance.

**Priority.** Low until a visual complaint surfaces.

---

## Prompt composition

### `STYLE_ID_SET` drift risk

**File.** `src/lib/prompts/compose.ts`.

**Current state.** `STYLE_ID_SET` is a hardcoded `new Set([...])` mirroring
the `StyleId` union. Adding a new style to the union in
`src/config/styles/style-configs.ts` without updating the set survives
compile (type-guard accepts the original string, runtime check returns
false for the new id) and fails at first real request with
`PromptCompositionError: unknown styleId`.

**Action.** In Module 3, once `style-configs.ts` exports `STYLE_IDS` as
a const tuple (`as const satisfies readonly StyleId[]`), replace the
hardcoded set in `compose.ts` with `const STYLE_ID_SET = new Set(STYLE_IDS)`.
Single source of truth.

**Priority.** Medium — do as part of the Module 3 style-config fill-in
pass, not a standalone cleanup.

### Anthropic client instantiation per call

**File.** `src/lib/prompts/compose.ts`.

**Current state.** `new Anthropic({ apiKey })` is constructed on every
translate and every enhance call — two allocations per `composePrompt`
call if both fire.

**Impact.** Negligible at low volume (the SDK instance is lightweight —
no connection pool, no background work). At 100+ requests/minute GC
pressure from short-lived SDK objects becomes measurable.

**Action.** Module-level lazy singleton (same pattern as
`getRunwareClient()` in `src/lib/runware.ts` — memoize on first call,
reset helper for error recovery).

**Priority.** Low. Revisit once post-relaunch traffic shows real
numbers; don't pre-optimize.

---

## Audit / observability

### Persist Runware `taskUUID` on Asset for DB-queryable correlation

**Files.** `prisma/schema.prisma` + `src/lib/pipeline/generate.ts` (step 12).

**Current state.** The pipeline's step-4 Runware inference returns a
`taskUUID`. It's logged at step 12 via
`logger.info("step 12 done", { assetId, taskUUID })` so ops can grep
structured logs, but it is NOT persisted on the Asset row.

**Opportunity.** DB-queryable correlation between an Asset and its
Runware task enables:
  - Ops diagnostics ("which Runware task produced this broken asset?")
    without reaching for log storage.
  - Refund-correlation reports (cross-reference failed Runware tasks
    against our credit_transactions).
  - Audit trails that survive log retention (logs rotate; DB doesn't).

**Action.**
  1. Schema: add `taskUUID String? @map("task_uuid")` to Asset,
     nullable (legacy rows have none). Optional index on it if audit
     queries land.
  2. Pipeline: pass `taskUUID: firstImage.taskUUID` in the step-12
     `prisma.asset.create` data block.
  3. Remove the log-only correlation note from generate.ts once wired.

**Priority.** Low — log correlation is sufficient for module-2 MVP.
Do once audit/ops actually needs it.
