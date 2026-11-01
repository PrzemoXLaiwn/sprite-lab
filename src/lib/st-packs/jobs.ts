// =============================================================================
// ST Packs — job state machine (DB) and the worker steps
// =============================================================================
// A full 8-expression job takes 10–15 minutes, far past one Vercel request,
// so the work is split into bounded steps that live in the database:
//
//   job:        draft → base_ready → running → done | partial | failed | cancelled
//   expression: queued → editing → edited → video_submitted → video_ready
//               → processing → done | failed      (+ flagged from QA)
//
// `tick(jobId)` runs inside the background worker (and on /advance, and on a
// poll only when that worker cannot be kicked). It recovers expired locks,
// claims the next steps atomically (UPDATE … WHERE status = … AND lock
// expired) and returns them as closures the caller runs. Each step is
// idempotent and is retried once; the Runware task id is stored before the
// clip is submitted, so a crash never submits twice.
// Costs are logged to the provider ledger under operation ids
// `stpack_<expressionId>` (no operations row: nobody is charged credits) and
// accumulated on the expression and job rows.
// =============================================================================
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { runInOperation, type OperationContext } from "@/lib/billing/ledger";
import { getR2ObjectBuffer, uploadBufferToR2 } from "@/lib/r2";
import { generateStImage, pollStVideo, ProviderModerationError, removeBackgroundBuffer, submitStVideo } from "@/lib/runware";
import { ST_EXPRESSION_LABELS, isExpressionLabel, type StExpressionLabel, type StExpressionSet } from "@/config/st-expressions";
import {
  ST_DEFAULT_VIDEO_MODEL, ST_EDIT_MODEL, clipListUsd, estimateExpressionUsd, estimateJobUsd, isSelectableVideoModel, isVideoSeconds, stPacksSettings, videoModelSpec,
  type StExpressionStatus, type StFraming, type StJobStatus, type StMatteMode,
} from "@/config/st-packs";
import { PROVIDER_BALANCE_MESSAGE, isProviderBalanceMessage } from "@/lib/provider-balance";
import { chromaHex, parseChromaHex, type Rgb } from "./chroma";
import { isUsableReference, neutralReference, prepareStill, type PreparedStill } from "./still";
import { findReusableNeutral, planNeutral, skippedEstimateLabels, type ReusableNeutral } from "./neutral-reuse";
import { videoProviderExtra } from "./video-task";
import { alignToBase } from "./align";
import { encodeGifFallback, encodePreviewGrid, stillPng } from "./encode";
import { fitPng, padToCanvas, pngFrame, type CropFraction } from "./frames";
import { ZIP_PREPARE_MS, gifPackKey, packFlags, pngPackKey, withPackFlags } from "./downloads";
import { buildExtraZip, buildMainZip, packSlug } from "./package";
import { processClip } from "./pipeline";
import { FAMILY_FRIENDLY_PREFIX, editPrompt, videoPrompt } from "./prompts";
import type { ExpressionSnapshot, Frame, JobListItem, JobOptions, JobSnapshot, QaResult, StepTimings } from "./types";

type JobRow = Prisma.StPackJobGetPayload<{ include: { expressions: true } }>;
type ExprRow = Prisma.StPackExpressionGetPayload<object>;

const LOCK_MS = { edit: 170_000, submit: 90_000, post: 280_000 } as const;
const MAX_ATTEMPTS = 2;
const TERMINAL: ReadonlySet<string> = new Set(["done", "failed"]);

export const baseKeyFor = (baseId: string) => `st-packs/bases/${baseId}.png`;
const exprKey = (jobId: string, label: string, file: string) => `st-packs/${jobId}/${label}/${file}`;

// ── Options / timings stored as JSON ─────────────────────────────────────────
export function normaliseOptions(raw: unknown, settings = stPacksSettings()): JobOptions {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const seconds = Number(o.videoSeconds);
  return {
    gif: o.gif === true,
    png: o.png === true,
    grid: o.grid === true,
    readme: o.readme !== false,
    matteMode: o.matteMode === "runware" ? "runware" : o.matteMode === "key" ? "key" : settings.matteMode,
    videoSeconds: Number.isFinite(seconds) && isVideoSeconds(Math.round(seconds)) ? Math.round(seconds) as 3 | 4 | 5 | 6 | 8 : settings.videoSeconds,
    motion: o.motion === "expressive" ? "expressive" : "subtle",
    videoModel: typeof o.videoModel === "string" && isSelectableVideoModel(o.videoModel) ? o.videoModel : ST_DEFAULT_VIDEO_MODEL,
    keyColour: (() => { const rgb = parseChromaHex(o.keyColour); return rgb ? chromaHex(rgb) : null; })(),
    lossless: o.lossless === true,
    baseHash: typeof o.baseHash === "string" && /^[0-9a-f]{64}$/i.test(o.baseHash) ? o.baseHash.toLowerCase() : null,
  };
}

type Timings = StepTimings & { attempts?: Partial<Record<"edit" | "video" | "post", number>>; videoStartedAt?: number; align?: { dx: number; dy: number; scale: number; shifted: boolean }; loop?: string; crop?: CropFraction; videoModel?: string; fetch?: number; reusedFrom?: string; still?: { ring: number; editAttempts: number; scale?: number; moved?: boolean; alignFailed?: boolean; referenceUsable?: boolean; segmented?: boolean; dx?: number; dy?: number; cropped?: boolean } };
const timingsOf = (row: ExprRow): Timings => ((row.timings && typeof row.timings === "object" ? row.timings : {}) as Timings);

// ── Create / list / snapshot ─────────────────────────────────────────────────
export interface CreateJobInput {
  userId: string;
  baseKey: string;
  source: "upload" | "prompt";
  prompt: string | null;
  styleNotes: string | null;
  framing: StFraming;
  expressionSet: StExpressionSet;
  labels: StExpressionLabel[];
  width: number;
  height: number;
  options: JobOptions;
  /** sha256 of the base PNG. Used to copy a neutral clip from an earlier job. */
  baseHash: string | null;
}

export async function createJob(input: CreateJobInput): Promise<string> {
  const spec = videoModelSpec(input.options.videoModel);
  const baseHash = input.baseHash;
  const options: JobOptions = { ...input.options, baseHash };
  const costOpts = { videoSeconds: options.videoSeconds, matteMode: options.matteMode, model: spec.air };
  const reusable = input.labels.includes("neutral") && baseHash ? await findReusableNeutral(input.userId, baseHash) : null;
  const plan = planNeutral(input.labels.includes("neutral"), !!reusable);
  const estCostUsd = estimateJobUsd(input.labels, costOpts, skippedEstimateLabels(plan));
  const job = await prisma.stPackJob.create({
    data: {
      userId: input.userId,
      status: "running",
      source: input.source,
      prompt: input.prompt,
      styleNotes: input.styleNotes,
      framing: input.framing,
      expressionSet: input.expressionSet,
      labels: input.labels,
      width: input.width,
      height: input.height,
      options: options as unknown as Prisma.InputJsonValue,
      baseKey: input.baseKey,
      estCostUsd,
      startedAt: new Date(),
      expressions: { create: input.labels.map((label) => ({ label, status: "queued" })) },
    },
    select: { id: true },
  });
  if (plan === "reuse" && reusable && !(await adoptNeutral(job.id, reusable))) {
    await prisma.stPackJob.update({ where: { id: job.id }, data: { estCostUsd: estimateJobUsd(input.labels, costOpts) } });
  }
  return job.id;
}

/** Copy a finished neutral onto this job. False when the webp is missing, so the clip is generated instead. */
async function adoptNeutral(jobId: string, src: ReusableNeutral): Promise<boolean> {
  const files: Array<["webpKey" | "pngKey" | "gifKey" | "editKey" | "videoKey", string, string]> = [
    ["webpKey", "loop.webp", "image/webp"],
    ["pngKey", "still.png", "image/png"],
    ["gifKey", "loop.gif", "image/gif"],
    ["editKey", "edit.png", "image/png"],
    ["videoKey", "clip.mp4", "video/mp4"],
  ];
  const stored: Partial<Record<"webpKey" | "pngKey" | "gifKey" | "editKey" | "videoKey", string>> = {};
  for (const [field, name, type] of files) {
    const from = src[field];
    if (typeof from !== "string" || !from) continue;
    const buf = await getR2ObjectBuffer(from);
    if (!buf) {
      if (field === "webpKey") return false;
      continue;
    }
    stored[field] = await put(buf, exprKey(jobId, "neutral", name), type);
  }
  if (!stored.webpKey) return false;
  await prisma.stPackExpression.update({
    where: { jobId_label: { jobId, label: "neutral" } },
    data: {
      status: "done",
      lockedUntil: null,
      error: null,
      webpKey: stored.webpKey,
      pngKey: stored.pngKey ?? null,
      gifKey: stored.gifKey ?? null,
      editKey: stored.editKey ?? null,
      videoKey: stored.videoKey ?? null,
      videoUrl: src.videoUrl,
      qa: src.qa ?? undefined,
      frames: src.frames,
      bytes: src.bytes,
      flagged: src.flagged,
      costUsd: 0,
      timings: { reusedFrom: src.jobId } as unknown as Prisma.InputJsonValue,
    },
  });
  return true;
}

export async function listJobs(limit = 20): Promise<JobListItem[]> {
  await reapStaleJobs().catch((err) => console.error("[st-packs] stale reap failed:", err instanceof Error ? err.message : err));
  const rows = await prisma.stPackJob.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, status: true, labels: true, costUsd: true, estCostUsd: true, createdAt: true, prompt: true, baseKey: true },
  });
  return rows.map((r) => ({
    id: r.id, status: r.status as StJobStatus, labels: r.labels.length, costUsd: r.costUsd, estCostUsd: r.estCostUsd,
    createdAt: r.createdAt.toISOString(), prompt: r.prompt, hasBase: !!r.baseKey,
  }));
}

function exprSnapshot(e: ExprRow): ExpressionSnapshot {
  const t = timingsOf(e);
  return {
    id: e.id,
    label: e.label as StExpressionLabel,
    status: e.status as StExpressionStatus,
    attempt: e.attempt,
    flagged: e.flagged,
    qa: (e.qa as unknown as QaResult | null) ?? null,
    costUsd: e.costUsd,
    timings: { edit: t.edit, video: t.video, post: t.post },
    error: e.error,
    frames: e.frames,
    bytes: e.bytes,
    has: { edit: !!e.editKey, video: !!e.videoUrl, webp: !!e.webpKey, gif: !!e.gifKey, png: !!e.pngKey },
    reused: typeof t.reusedFrom === "string",
    updatedAt: e.updatedAt.toISOString(),
    lockedUntil: e.lockedUntil?.toISOString() ?? null,
  };
}

function jobSnapshot(job: JobRow): JobSnapshot {
  const order = new Map(ST_EXPRESSION_LABELS.map((l, i) => [l, i]));
  const expressions = [...job.expressions].sort((a, b) => (order.get(a.label as StExpressionLabel) ?? 99) - (order.get(b.label as StExpressionLabel) ?? 99)).map(exprSnapshot);
  const timings = expressions.reduce((acc, e) => ({ edit: acc.edit + (e.timings.edit ?? 0), video: acc.video + (e.timings.video ?? 0), post: acc.post + (e.timings.post ?? 0) }), { edit: 0, video: 0, post: 0 });
  return {
    id: job.id,
    status: job.status as StJobStatus,
    source: job.source as "upload" | "prompt",
    prompt: job.prompt,
    styleNotes: job.styleNotes,
    framing: job.framing as StFraming,
    expressionSet: job.expressionSet as StExpressionSet,
    labels: job.labels.filter(isExpressionLabel),
    width: job.width,
    height: job.height,
    options: normaliseOptions(job.options),
    estCostUsd: job.estCostUsd,
    costUsd: job.costUsd,
    error: job.error,
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt?.toISOString() ?? null,
    finishedAt: job.finishedAt?.toISOString() ?? null,
    workerLeaseUntil: job.workerLeaseUntil?.toISOString() ?? null,
    has: { base: !!job.baseKey, zip: !!job.zipKey, grid: !!job.gridKey },
    timings,
    expressions,
  };
}

export async function getJob(jobId: string): Promise<JobRow | null> {
  return prisma.stPackJob.findUnique({ where: { id: jobId }, include: { expressions: true } });
}

export async function getSnapshot(jobId: string): Promise<JobSnapshot | null> {
  await reapStaleJobs().catch((err) => console.error("[st-packs] stale reap failed:", err instanceof Error ? err.message : err));
  const job = await getJob(jobId);
  return job ? jobSnapshot(job) : null;
}

// ── Claims ───────────────────────────────────────────────────────────────────
async function claim(exprId: string, from: StExpressionStatus, to: StExpressionStatus, lockMs: number): Promise<boolean> {
  const now = new Date();
  const r = await prisma.stPackExpression.updateMany({
    where: { id: exprId, status: from, OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }] },
    data: { status: to, lockedUntil: new Date(now.getTime() + lockMs), attempt: { increment: 1 } },
  });
  return r.count === 1;
}

/** A step whose lock expired without finishing (crash, timeout) goes back to its start status. */
async function recoverExpired(job: JobRow): Promise<void> {
  const now = new Date();
  const back: Record<string, StExpressionStatus> = { editing: "queued", processing: "video_ready" };
  for (const e of job.expressions) {
    const to = back[e.status];
    if (!to || !e.lockedUntil || e.lockedUntil >= now) continue;
    const t = timingsOf(e);
    const step = e.status === "editing" ? "edit" : "post";
    const attempts = (t.attempts?.[step] ?? 0) + 1;
    const exhausted = attempts >= MAX_ATTEMPTS;
    await prisma.stPackExpression.updateMany({
      where: { id: e.id, status: e.status, lockedUntil: e.lockedUntil },
      data: {
        status: exhausted ? "failed" : to,
        lockedUntil: null,
        error: exhausted ? `Step "${step}" did not finish twice (timed out)` : e.error,
        timings: { ...t, attempts: { ...t.attempts, [step]: attempts } } as unknown as Prisma.InputJsonValue,
      },
    });
  }
}

// ── Tick ─────────────────────────────────────────────────────────────────────
export type Work = () => Promise<void>;

export async function tick(jobId: string): Promise<{ snapshot: JobSnapshot | null; work: Work[] }> {
  let job = await getJob(jobId);
  if (!job) return { snapshot: null, work: [] };
  if (job.status !== "running") return { snapshot: jobSnapshot(job), work: [] };

  await recoverExpired(job);
  job = (await getJob(jobId))!;
  const settings = stPacksSettings();
  const options = normaliseOptions(job.options, settings);
  const spec = videoModelSpec(options.videoModel);
  const work: Work[] = [];
  const order = new Map(ST_EXPRESSION_LABELS.map((l, i) => [l, i]));
  const exprs = [...job.expressions].sort((a, b) => (order.get(a.label as StExpressionLabel) ?? 99) - (order.get(b.label as StExpressionLabel) ?? 99));

  let busy = exprs.filter((e) => e.status === "editing" || e.status === "processing").length;
  let posting = exprs.filter((e) => e.status === "processing").length;
  let openVideos = exprs.filter((e) => e.status === "video_submitted").length;
  const capLeft = () => settings.maxUsdPerJob - job!.costUsd;

  for (const e of exprs) {
    if (e.status === "video_submitted") work.push(() => pollVideo(e.id));
  }
  for (const e of exprs) {
    if (e.status !== "queued" || busy >= settings.concurrency) continue;
    const est = estimateExpressionUsd(e.label as StExpressionLabel, { videoSeconds: options.videoSeconds, matteMode: options.matteMode, model: spec.air });
    if (est > capLeft()) { await failExpression(e.id, "Job spend cap reached"); continue; }
    if (await claim(e.id, "queued", "editing", LOCK_MS.edit)) { busy++; work.push(() => runEdit(e.id)); }
  }
  for (const e of exprs) {
    if (e.status !== "edited" || openVideos >= settings.videoConcurrency) continue;
    if (clipListUsd(spec.air, options.videoSeconds) > capLeft()) { await failExpression(e.id, "Job spend cap reached"); continue; }
    if (await claim(e.id, "edited", "video_submitted", LOCK_MS.submit)) { openVideos++; work.push(() => runSubmit(e.id)); }
  }
  for (const e of exprs) {
    if (e.status !== "video_ready" || busy >= settings.concurrency || posting >= settings.postConcurrency) continue;
    if (await claim(e.id, "video_ready", "processing", LOCK_MS.post)) { busy++; posting++; work.push(() => runPost(e.id)); }
  }

  job = (await getJob(jobId))!;
  if (job.expressions.every((e) => TERMINAL.has(e.status))) {
    const done = job.expressions.filter((e) => e.status === "done").length;
    const final: StJobStatus = done === job.expressions.length ? "done" : done > 0 ? "partial" : "failed";
    const r = await prisma.stPackJob.updateMany({ where: { id: jobId, status: "running" }, data: { status: final, finishedAt: new Date() } });
    if (r.count === 1 && done > 0) work.push(() => finalize(jobId));
    job = (await getJob(jobId))!;
  }
  return { snapshot: jobSnapshot(job), work };
}

/** Run the claimed steps; each guards its own errors so after() never throws. */
export async function runWork(work: Work[]): Promise<void> {
  await Promise.all(work.map((w) => w().catch((err) => console.error("[st-packs] step failed:", err instanceof Error ? err.message : err))));
}

// ── Failure handling ─────────────────────────────────────────────────────────
async function failExpression(exprId: string, error: string): Promise<void> {
  await prisma.stPackExpression.update({ where: { id: exprId }, data: { status: "failed", lockedUntil: null, error: error.slice(0, 500) } });
}

/** Retry once from the step's start status, then fail. Moderation blocks fail at once. */
async function stepFailed(e: ExprRow, step: "edit" | "video" | "post", err: unknown, backTo: StExpressionStatus): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  const t = timingsOf(e);
  const attempts = (t.attempts?.[step] ?? 0) + 1;
  const moderated = err instanceof ProviderModerationError;
  const balance = isProviderBalanceMessage(message);
  const exhausted = moderated || balance || attempts >= MAX_ATTEMPTS;
  console.warn(`[st-packs] ${e.label} ${step} failed (attempt ${attempts}): ${message}`);
  await prisma.stPackExpression.update({
    where: { id: e.id },
    data: {
      status: exhausted ? "failed" : backTo,
      lockedUntil: null,
      error: balance ? PROVIDER_BALANCE_MESSAGE : moderated ? "Blocked by provider moderation" : message.slice(0, 500),
      timings: { ...t, attempts: { ...t.attempts, [step]: attempts } } as unknown as Prisma.InputJsonValue,
    },
  });
  if (balance) {
    await prisma.stPackJob.update({ where: { id: e.jobId }, data: { error: PROVIDER_BALANCE_MESSAGE } });
  }
}

function operationContext(e: ExprRow, capUsd: number): OperationContext {
  return { operationId: `stpack_${e.id}`, userId: "", capUsd: Math.max(0, capUsd), spentUsd: 0, calls: 0, incomplete: false, pending: [] };
}

async function addCost(e: ExprRow, usd: number): Promise<void> {
  if (!(usd > 0)) return;
  await prisma.$transaction([
    prisma.stPackExpression.update({ where: { id: e.id }, data: { costUsd: { increment: usd } } }),
    prisma.stPackJob.update({ where: { id: e.jobId }, data: { costUsd: { increment: usd } } }),
  ]);
}

async function loadExpr(exprId: string): Promise<{ e: ExprRow; job: JobRow } | null> {
  const e = await prisma.stPackExpression.findUnique({ where: { id: exprId } });
  if (!e) return null;
  const job = await getJob(e.jobId);
  return job ? { e, job } : null;
}

async function mustRead(key: string | null, what: string): Promise<Buffer> {
  const buf = key ? await getR2ObjectBuffer(key) : null;
  if (!buf) throw new Error(`${what} is missing from storage`);
  return buf;
}

async function put(buffer: Buffer, key: string, contentType: string): Promise<string> {
  const r = await uploadBufferToR2(buffer, key, contentType);
  if (!r.success) throw new Error(`Storage upload failed: ${r.error ?? "unknown"}`);
  return key;
}

// ── Step 1: expression edit ──────────────────────────────────────────────────
async function runEdit(exprId: string): Promise<void> {
  const loaded = await loadExpr(exprId);
  if (!loaded || loaded.e.status !== "editing") return;
  const { e, job } = loaded;
  const started = Date.now();
  const settings = stPacksSettings();
  const options = normaliseOptions(job.options, settings);
  try {
    const base = await mustRead(job.baseKey, "Base image");
    let editKey: string;
    const t = timingsOf(e);
    const rgb = parseChromaHex(options.keyColour);
    if (rgb) {
      // Every still goes to the clip the same way: backdrop repainted as the
      // pure key colour (bands, dark or purple uploads included) and, for an
      // edit, the framing matched to the neutral so the sprite does not jump
      // between expressions in SillyTavern.
      const neutral = await neutralStill(e, job, base, rgb, settings.maxUsdPerExpression - e.costUsd);
      let editAttempts = 0;
      const prepared = e.label === "neutral"
        ? neutral.prepared
        : await editUntilClean(e, job, options, base, rgb, neutral.usable ? neutral.prepared.frame : null, settings.maxUsdPerExpression - e.costUsd, (n) => { editAttempts = n; });
      t.still = {
        ring: round2(prepared.ringRatio), editAttempts,
        scale: prepared.align ? round2(prepared.align.scale) : undefined,
        dx: prepared.align ? round2(prepared.align.dx) : undefined,
        dy: prepared.align ? round2(prepared.align.dy) : undefined,
        moved: prepared.align?.moved, alignFailed: prepared.align?.failed, cropped: prepared.cropped,
        referenceUsable: neutral.usable, segmented: neutral.segmented,
      };
      console.log(`[st-packs] ${job.id} ${e.label} still: ring ${(prepared.ringRatio * 100).toFixed(1)}%, scale ${t.still.scale ?? 1}, offset ${t.still.dx ?? 0},${t.still.dy ?? 0}, attempts ${editAttempts}, reference ${neutral.usable ? (neutral.segmented ? "segmented" : "flood") : "unusable"}`);
      editKey = await put(await stillPng(prepared.frame), exprKey(job.id, e.label, "edit.png"), "image/png");
    } else if (e.label === "neutral") {
      editKey = job.baseKey!;
    } else {
      const ctx = operationContext(e, settings.maxUsdPerExpression - e.costUsd);
      const { image } = await runInOperation(ctx, () => generateStImage({
        prompt: editPrompt(e.label as StExpressionLabel, job.styleNotes, { motion: options.motion, framing: job.framing as StFraming, keyColour: options.keyColour }),
        reference: base,
        width: ST_EDIT_MODEL.width,
        height: ST_EDIT_MODEL.height,
        task: "st_expression",
        listPrice: ST_EDIT_MODEL.approxCostUsd,
        moderationRetryPrefix: FAMILY_FRIENDLY_PREFIX,
      }));
      await addCost(e, ctx.spentUsd);
      const edited = await fitPng(image, ST_EDIT_MODEL.width, ST_EDIT_MODEL.height);
      const aligned = alignToBase(await pngFrame(base), await pngFrame(edited));
      t.align = { dx: round2(aligned.dx), dy: round2(aligned.dy), scale: round2(aligned.scale), shifted: aligned.shifted };
      const out = aligned.shifted ? await stillPng(aligned.frame) : edited;
      editKey = await put(out, exprKey(job.id, e.label, "edit.png"), "image/png");
    }
    t.edit = Date.now() - started;
    const r = await prisma.stPackExpression.updateMany({
      where: { id: e.id, status: "editing" },
      data: { status: "edited", lockedUntil: null, editKey, error: null, timings: t as unknown as Prisma.InputJsonValue },
    });
    // Straight on to the clip, while the open-video cap still has room.
    // Past the cap the row stays `edited` and the next tick submits it.
    if (r.count === 1) {
      const open = await prisma.stPackExpression.count({ where: { jobId: e.jobId, status: "video_submitted" } });
      if (open < settings.videoConcurrency && await claim(e.id, "edited", "video_submitted", LOCK_MS.submit)) await runSubmit(e.id);
    }
  } catch (err) {
    await stepFailed(e, "edit", err, "queued");
  }
}

/**
 * One edit, prepared for the clip. When the outer ring is still not the key
 * colour (a white or grey frame the repaint could not reach) or the framing
 * cannot be measured, the edit is drawn once more (~$0.07) instead of paying
 * for a clip of a broken still. The cleaner of the two is kept.
 */
async function editUntilClean(
  e: ExprRow, job: JobRow, options: JobOptions, base: Buffer, rgb: Rgb, reference: Frame | null, capUsd: number,
  onAttempt: (n: number) => void,
): Promise<PreparedStill> {
  const ctx = operationContext(e, capUsd);
  let best: PreparedStill | null = null;
  try {
    for (let attempt = 1; attempt <= 2; attempt++) {
      if (attempt > 1 && !canSpendIn(ctx, ST_EDIT_MODEL.approxCostUsd)) break;
      onAttempt(attempt);
      const { image } = await runInOperation(ctx, () => generateStImage({
        prompt: editPrompt(e.label as StExpressionLabel, job.styleNotes, { motion: options.motion, framing: job.framing as StFraming, keyColour: options.keyColour }),
        reference: base,
        width: ST_EDIT_MODEL.width,
        height: ST_EDIT_MODEL.height,
        task: "st_expression",
        listPrice: ST_EDIT_MODEL.approxCostUsd,
        moderationRetryPrefix: FAMILY_FRIENDLY_PREFIX,
      }));
      const edited = await fitPng(image, ST_EDIT_MODEL.width, ST_EDIT_MODEL.height);
      const prepared = prepareStill(await pngFrame(edited), rgb, reference);
      if (!best || (prepared.ok && !best.ok) || (prepared.ok === best.ok && prepared.ringRatio > best.ringRatio)) best = prepared;
      if (prepared.ok) break;
      // Redraw only when the edit itself is at fault. A framing that cannot be
      // measured against a good reference is; a reference that is not a
      // character is not the edit's fault and a second edit would not help.
      const ringBad = prepared.ringRatio < 0.97;
      const editUnmeasurable = !!reference && !isUsableReference(prepared.frame, rgb);
      if (!ringBad && !editUnmeasurable && !prepared.cropped) break;
      console.warn(`[st-packs] ${e.label} edit ${attempt}: ring ${prepared.ringRatio.toFixed(3)}, align ${prepared.align?.failed ? "failed" : "ok"}, cropped ${!!prepared.cropped}`);
    }
  } finally {
    await addCost(e, ctx.spentUsd);
  }
  return best!;
}

const NEUTRAL_REF_FILE = "neutral-ref.png";

/**
 * The neutral still on the key colour, also the reference every edit is
 * aligned to. Built once per job (segmentation, ~$0.002) and stored; later
 * edits read it back. An unusable reference only disables the alignment.
 */
async function neutralStill(e: ExprRow, job: JobRow, base: Buffer, rgb: Rgb, capUsd: number): Promise<{ prepared: PreparedStill; usable: boolean; segmented: boolean }> {
  const key = `st-packs/${job.id}/${NEUTRAL_REF_FILE}`;
  const cached = await getR2ObjectBuffer(key).catch(() => null);
  if (cached) {
    const frame = await pngFrame(cached);
    const prepared = prepareStill(frame, rgb);
    return { prepared, usable: isUsableReference(prepared.frame, rgb), segmented: true };
  }
  const ctx = operationContext(e, capUsd);
  try {
    const baseFrame = await pngFrame(base);
    const ref = await runInOperation(ctx, () => neutralReference(
      // The base was normalised onto a grey canvas; the model sees exactly that still
      baseFrame,
      rgb,
      async (f) => {
        const png = await removeBackgroundBuffer(await stillPng(f));
        if (!png) return null;
        const cut = await pngFrame(png);
        return cut.width === f.width && cut.height === f.height ? cut : pngFrame(await fitPng(png, f.width, f.height));
      },
    ));
    if (ref.usable) await put(await stillPng(ref.frame), key, "image/png");
    return { prepared: ref, usable: ref.usable, segmented: ref.segmented };
  } finally {
    await addCost(e, ctx.spentUsd);
  }
}

/** Same rule as canSpend(), on a context that is not the active one. */
function canSpendIn(ctx: OperationContext, usd: number): boolean {
  return ctx.spentUsd + usd <= ctx.capUsd + 1e-9;
}

// ── Step 2: idle clip (submit, then poll) ────────────────────────────────────
async function runSubmit(exprId: string): Promise<void> {
  const loaded = await loadExpr(exprId);
  if (!loaded || loaded.e.status !== "video_submitted") return;
  const { e, job } = loaded;
  const settings = stPacksSettings();
  const options = normaliseOptions(job.options, settings);
  const spec = videoModelSpec(options.videoModel);
  try {
    const edit = await mustRead(e.editKey, "Edited still");
    const { png: still, crop } = await padToCanvas(edit, spec.width, spec.height);
    const taskUUID = crypto.randomUUID();
    const t = timingsOf(e);
    t.videoStartedAt = Date.now();
    t.crop = crop;
    t.videoModel = spec.air;
    // The task id is on the row before the request goes out: a crash here never submits twice
    await prisma.stPackExpression.update({ where: { id: e.id }, data: { videoTaskUuid: taskUUID, timings: t as unknown as Prisma.InputJsonValue } });
    await submitStVideo({
      taskUUID,
      model: spec.air,
      prompt: videoPrompt(e.label as StExpressionLabel, options.motion, options.keyColour),
      still,
      width: spec.width,
      height: spec.height,
      seconds: options.videoSeconds,
      fps: spec.fps,
      extra: videoProviderExtra(spec.air, options.motion, spec.body),
    });
    // The submit lock is released: polling takes over
    await prisma.stPackExpression.updateMany({ where: { id: e.id, status: "video_submitted" }, data: { lockedUntil: null } });
  } catch (err) {
    await stepFailed(e, "video", err, "edited");
  }
}

async function pollVideo(exprId: string): Promise<void> {
  const loaded = await loadExpr(exprId);
  if (!loaded || loaded.e.status !== "video_submitted" || !loaded.e.videoTaskUuid) return;
  const { e, job } = loaded;
  const settings = stPacksSettings();
  const options = normaliseOptions(job.options, settings);
  const t = timingsOf(e);
  const spec = videoModelSpec(t.videoModel ?? settings.videoModel);
  const startedAt = t.videoStartedAt ?? e.updatedAt.getTime();
  const listPrice = clipListUsd(spec.air, options.videoSeconds);
  try {
    const ctx = operationContext(e, settings.maxUsdPerExpression - e.costUsd);
    const result = await runInOperation(ctx, () => pollStVideo({
      taskUUID: e.videoTaskUuid!, model: spec.air, size: `${spec.width}x${spec.height}x${options.videoSeconds}s`, listPrice, startedAt,
    }));
    if (result.status === "processing") {
      if (Date.now() - startedAt > 15 * 60_000) throw new Error("Video task did not finish within 15 minutes");
      return;
    }
    if (result.status === "error") throw result.moderated ? new ProviderModerationError() : new Error(result.message);
    t.video = Date.now() - startedAt;
    const r = await prisma.stPackExpression.updateMany({
      where: { id: e.id, status: "video_submitted" },
      data: { status: "video_ready", lockedUntil: null, videoUrl: result.videoURL, error: null, timings: t as unknown as Prisma.InputJsonValue },
    });
    if (r.count === 1) {
      await addCost(e, result.cost ?? listPrice);
      const posting = await prisma.stPackExpression.count({ where: { jobId: e.jobId, status: "processing" } });
      if (posting < settings.postConcurrency && await claim(e.id, "video_ready", "processing", LOCK_MS.post)) await runPost(e.id);
    }
  } catch (err) {
    await stepFailed(e, "video", err, "edited");
  }
}

// ── Step 3: post-processing ──────────────────────────────────────────────────
const VIDEO_MAX_BYTES = 60 * 1024 * 1024;

async function fetchVideo(url: string): Promise<Buffer> {
  const u = new URL(url);
  if (u.protocol !== "https:" || !(u.hostname === "runware.ai" || u.hostname.endsWith(".runware.ai"))) throw new Error("Video URL is not a Runware host");
  const res = await fetch(url, { signal: AbortSignal.timeout(90_000), cache: "no-store" });
  if (!res.ok) throw new Error(`Video download failed (${res.status})`);
  const declared = Number(res.headers.get("content-length") || 0);
  if (declared > VIDEO_MAX_BYTES) throw new Error("Video is too large");
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > VIDEO_MAX_BYTES) throw new Error("Video is too large");
  return buf;
}

async function runPost(exprId: string): Promise<void> {
  const loaded = await loadExpr(exprId);
  if (!loaded || loaded.e.status !== "processing") return;
  const { e, job } = loaded;
  const settings = stPacksSettings();
  const options = normaliseOptions(job.options, settings);
  const started = Date.now();
  try {
    if (!e.videoUrl) throw new Error("No video to process");
    const mp4 = await fetchVideo(e.videoUrl);
    const fetched = Date.now();
    let videoKey: string | null = null;
    if (settings.keepVideo) videoKey = await put(mp4, exprKey(job.id, e.label, "clip.mp4"), "video/mp4");
    const ctx = operationContext(e, settings.maxUsdPerExpression - e.costUsd);
    const result = await runInOperation(ctx, () => processClip(mp4, {
      label: e.label as StExpressionLabel,
      width: job.width,
      height: job.height,
      matteMode: options.matteMode,
      removeBackground: options.matteMode === "runware" ? (png) => removeBackgroundBuffer(png) : undefined,
      concurrency: 4,
      crop: timingsOf(e).crop,
      lossless: options.lossless,
      motion: options.motion,
      keyColour: parseChromaHex(options.keyColour),
    }));
    await addCost(e, ctx.spentUsd);
    const webpKey = await put(result.webp.webp, exprKey(job.id, e.label, "loop.webp"), "image/webp");
    const pngKey = await put(await stillPng(result.frames[0]), exprKey(job.id, e.label, "still.png"), "image/png");
    // GIF is built when someone downloads the GIF pack. Encoding 60 frames at
    // 720×960 with a full palette (effort 10, no frame reuse) was the bulk of
    // the 2–3 min post time.
    const gifKey = null;
    const t = timingsOf(e);
    t.fetch = fetched - started;
    t.post = Date.now() - fetched;
    t.loop = result.loopMethod;
    await prisma.stPackExpression.updateMany({
      where: { id: e.id, status: "processing" },
      data: {
        status: "done", lockedUntil: null, error: null,
        webpKey, pngKey, gifKey, videoKey,
        frames: result.webp.frames, bytes: result.webp.bytes,
        qa: result.qa as unknown as Prisma.InputJsonValue, flagged: result.qa.flagged,
        timings: t as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    await stepFailed(e, "post", err, "video_ready");
  }
}

// ── Finalise: the ZIP (and the preview grid, plus cheap extra packs) ─────────
async function finalize(jobId: string): Promise<void> {
  try {
    await buildArtifacts(jobId);
  } catch (err) {
    console.error("[st-packs] packaging failed:", err instanceof Error ? err.message : err);
    await prisma.stPackJob.update({ where: { id: jobId }, data: { error: `Packaging failed: ${err instanceof Error ? err.message : String(err)}`.slice(0, 500) } });
  }
}

/**
 * Builds pack.zip, the preview GIF, and the extra packs that are cheap to
 * assemble from files already in storage. Called by the worker the moment
 * the last expression finishes, and again by the download route when the
 * object is missing. A zip key already on the row is not rebuilt: that
 * re-download is the 45–70 s wait. GIF frames are encoded only on download
 * unless every expression already has a GIF file.
 */
export async function buildArtifacts(jobId: string, opts: { grid?: boolean } = {}): Promise<{ zipKey: string; gridKey: string | null }> {
  const job = await getJob(jobId);
  if (!job) throw new Error("Job not found");
  const options = normaliseOptions(job.options);
  const done = job.expressions.filter((e) => e.status === "done" && e.webpKey);
  if (done.length === 0) throw new Error("No finished expressions");

  let zipKey = job.zipKey;
  if (!zipKey) {
    const entries = await Promise.all(done.map(async (e) => ({ label: e.label, data: await mustRead(e.webpKey, `${e.label}.webp`) })));
    zipKey = await put(await buildMainZip(entries, { readme: options.readme }), `st-packs/${job.id}/pack.zip`, "application/zip");
    // The preview grid decodes every frame and has been killed at the 120 s
    // limit, which used to throw away this upload. The key is stored first.
    await prisma.stPackJob.update({ where: { id: jobId }, data: { zipKey } });
  }

  let gridKey: string | null = job.gridKey;
  if (opts.grid !== false && options.grid && !gridKey) {
    try {
      const order = new Map(ST_EXPRESSION_LABELS.map((l, i) => [l, i]));
      const items: Array<{ label: string; frames: Frame[] }> = [];
      for (const e of [...done].sort((a, b) => (order.get(a.label as StExpressionLabel) ?? 99) - (order.get(b.label as StExpressionLabel) ?? 99)).slice(0, 8)) {
        items.push({ label: e.label, frames: await webpFrames(await mustRead(e.webpKey, e.label)) });
      }
      gridKey = await put(await encodePreviewGrid(items, 16), `st-packs/${job.id}/preview.gif`, "image/gif");
    } catch (err) {
      console.error("[st-packs] preview grid failed:", err instanceof Error ? err.message : err);
    }
  }

  const flags = packFlags(job.options);
  let pngReady = flags.png;
  if (options.png && !pngReady) {
    const pngRows = done.filter((e) => e.pngKey);
    if (pngRows.length === done.length) {
      try {
        const pngEntries = await Promise.all(pngRows.map(async (e) => ({ label: e.label, data: await mustRead(e.pngKey, `${e.label}.png`) })));
        await put(await buildExtraZip(pngEntries, "png"), pngPackKey(job.id), "application/zip");
        pngReady = true;
      } catch (err) {
        console.error("[st-packs] png pack failed:", err instanceof Error ? err.message : err);
      }
    }
  }

  let gifReady = flags.gif;
  // Encoding GIF frames from the WebP is the old multi-minute post. Only zip GIFs that already exist.
  if (options.gif && !gifReady && done.every((e) => e.gifKey)) {
    try {
      const gifEntries = await Promise.all(done.map(async (e) => ({ label: e.label, data: await mustRead(e.gifKey, `${e.label}.gif`) })));
      await put(await buildExtraZip(gifEntries, "gif"), gifPackKey(job.id), "application/zip");
      gifReady = true;
    } catch (err) {
      console.error("[st-packs] gif pack failed:", err instanceof Error ? err.message : err);
    }
  }

  if (zipKey !== job.zipKey || gridKey !== job.gridKey || pngReady !== flags.png || gifReady !== flags.gif) {
    await prisma.stPackJob.update({
      where: { id: jobId },
      data: {
        zipKey,
        gridKey,
        options: withPackFlags(job.options, { png: pngReady, gif: gifReady }) as Prisma.InputJsonValue,
      },
    });
  }
  return { zipKey, gridKey };
}

/**
 * One poll retries a pack that the worker never stored. The lease stops a
 * second poll from starting another build. The zip itself is committed before
 * the preview grid, so a killed grid still leaves a downloadable file.
 */
export async function repairPack(jobId: string, now = new Date()): Promise<boolean> {
  const until = new Date(now.getTime() + 60_000);
  const cutoff = new Date(now.getTime() - ZIP_PREPARE_MS);
  const claimed = await prisma.stPackJob.updateMany({
    where: {
      id: jobId,
      status: { in: ["done", "partial"] },
      zipKey: null,
      finishedAt: { lt: cutoff },
      OR: [{ workerLeaseUntil: null }, { workerLeaseUntil: { lt: now } }],
    },
    data: { workerLeaseUntil: until },
  });
  if (claimed.count !== 1) return false;
  try {
    await buildArtifacts(jobId, { grid: false });
    await prisma.stPackJob.updateMany({ where: { id: jobId, workerLeaseUntil: until }, data: { workerLeaseUntil: null } });
    return true;
  } catch (err) {
    console.error("[st-packs] pack repair failed:", err instanceof Error ? err.message : err);
    await prisma.stPackJob.update({
      where: { id: jobId },
      data: { error: `Packaging failed: ${err instanceof Error ? err.message : String(err)}`.slice(0, 500) },
    });
    return false;
  }
}

async function webpFrames(webp: Buffer): Promise<Frame[]> {
  const sharp = (await import("sharp")).default;
  const meta = await sharp(webp, { animated: true }).metadata();
  const pages = meta.pages ?? 1;
  const frames: Frame[] = [];
  for (let p = 0; p < pages; p++) {
    const { data, info } = await sharp(webp, { page: p }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    frames.push({ data, width: info.width, height: info.height });
  }
  return frames;
}

/** Static PNG or GIF archive built on demand. GIFs are encoded from the WebP here, not during post. */
export async function buildExtraArchive(jobId: string, kind: "png" | "gif"): Promise<Buffer | null> {
  const job = await getJob(jobId);
  if (!job) return null;
  const rows = job.expressions.filter((e) => e.status === "done" && (kind === "png" ? e.pngKey : e.webpKey));
  if (rows.length === 0) return null;
  const entries = await Promise.all(rows.map(async (e) => {
    if (kind === "png") return { label: e.label, data: await mustRead(e.pngKey, e.label) };
    if (e.gifKey) return { label: e.label, data: await mustRead(e.gifKey, e.label) };
    const frames = await webpFrames(await mustRead(e.webpKey, e.label));
    return { label: e.label, data: await encodeGifFallback(frames, 16) };
  }));
  return buildExtraZip(entries, kind);
}

/** A running job with an expired lease and no step lock or row change for this long is finished. */
export const STALE_JOB_MS = 30 * 60 * 1000;

/**
 * Fail or close jobs that are still "running" long after the worker lease
 * died and nothing has moved. Opening the studio or polling a job runs this.
 * No schema change.
 */
export async function reapStaleJobs(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - STALE_JOB_MS);
  const stale = await prisma.stPackJob.findMany({
    where: {
      status: "running",
      startedAt: { lt: cutoff },
      OR: [{ workerLeaseUntil: null }, { workerLeaseUntil: { lt: cutoff } }],
    },
    include: { expressions: true },
  });
  let closed = 0;
  for (const job of stale) {
    const locked = job.expressions.some((e) => e.lockedUntil && e.lockedUntil > now);
    const moved = job.expressions.some((e) => e.updatedAt > cutoff);
    if (locked || moved) continue;
    const done = job.expressions.filter((e) => e.status === "done").length;
    const status: StJobStatus = done === job.expressions.length ? "done" : done > 0 ? "partial" : "failed";
    const reason = "Stopped: no progress for 30 minutes and the worker lease had expired";
    const r = await prisma.stPackJob.updateMany({
      where: { id: job.id, status: "running" },
      data: { status, finishedAt: now, error: reason },
    });
    if (r.count !== 1) continue;
    await prisma.stPackExpression.updateMany({
      where: { jobId: job.id, status: { notIn: ["done", "failed"] } },
      data: { status: "failed", lockedUntil: null, error: reason },
    });
    closed++;
  }
  return closed;
}

export function jobSlug(job: { prompt: string | null; id: string }): string {
  return packSlug(job.prompt?.split(/[,.]/)[0] ?? job.id.slice(-6));
}

// ── Admin actions ────────────────────────────────────────────────────────────
/** "post" re-runs only the post-processing of the clip already rendered (no provider cost). */
export async function regenerateExpression(jobId: string, label: string, from: "edit" | "video" | "post"): Promise<boolean> {
  const e = await prisma.stPackExpression.findUnique({ where: { jobId_label: { jobId, label } } });
  if (!e) return false;
  if (from === "video" && !e.editKey) return false;
  if (from === "post" && !(e.editKey && e.videoUrl)) return false;
  const t = timingsOf(e);
  const jobRow = await prisma.stPackJob.findUnique({ where: { id: jobId }, select: { options: true } });
  await prisma.$transaction([
    prisma.stPackExpression.update({
      where: { id: e.id },
      data: {
        status: from === "edit" ? "queued" : from === "video" ? "edited" : "video_ready",
        lockedUntil: null, error: null, qa: Prisma.DbNull, flagged: false,
        webpKey: null, gifKey: null, pngKey: null, frames: null, bytes: null,
        ...(from === "edit" ? { editKey: null } : {}),
        ...(from !== "post" ? { videoTaskUuid: null, videoUrl: null, videoKey: null } : {}),
        timings: {
          attempts: {},
          ...(from !== "edit" ? { edit: t.edit, align: t.align } : {}),
          ...(from === "post" ? { video: t.video, videoStartedAt: t.videoStartedAt, crop: t.crop, videoModel: t.videoModel } : {}),
        } as unknown as Prisma.InputJsonValue,
      },
    }),
    prisma.stPackJob.update({
      where: { id: jobId },
      data: {
        status: "running",
        finishedAt: null,
        zipKey: null,
        gridKey: null,
        error: null,
        // The previous PNG/GIF objects are stale as soon as one expression is rebuilt.
        ...(jobRow ? { options: withPackFlags(jobRow.options, { png: false, gif: false }) as Prisma.InputJsonValue } : {}),
      },
    }),
  ]);
  return true;
}

export async function cancelJob(jobId: string): Promise<void> {
  await prisma.$transaction([
    prisma.stPackJob.updateMany({ where: { id: jobId, status: "running" }, data: { status: "cancelled", finishedAt: new Date() } }),
    prisma.stPackExpression.updateMany({ where: { jobId, status: { notIn: ["done", "failed"] } }, data: { status: "failed", lockedUntil: null, error: "Cancelled" } }),
  ]);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Shape of `options` accepted from the API, validated there; re-exported for the route. */
export type { JobOptions };
export type { StMatteMode };
