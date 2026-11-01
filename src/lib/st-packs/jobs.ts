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
  ST_EDIT_MODEL, estimateExpressionUsd, estimateJobUsd, stPacksSettings, videoModelSpec,
  type StExpressionStatus, type StFraming, type StJobStatus, type StMatteMode,
} from "@/config/st-packs";
import { alignToBase } from "./align";
import { encodeGifFallback, encodePreviewGrid, stillPng } from "./encode";
import { fitPng, padToCanvas, pngFrame, type CropFraction } from "./frames";
import { gifPackKey, packFlags, pngPackKey, withPackFlags } from "./downloads";
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
    videoSeconds: Number.isFinite(seconds) && seconds >= 3 && seconds <= 5 ? Math.round(seconds) : settings.videoSeconds,
    lossless: o.lossless === true,
  };
}

type Timings = StepTimings & { attempts?: Partial<Record<"edit" | "video" | "post", number>>; videoStartedAt?: number; align?: { dx: number; dy: number; scale: number; shifted: boolean }; loop?: string; crop?: CropFraction; videoModel?: string };
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
}

export async function createJob(input: CreateJobInput): Promise<string> {
  const spec = videoModelSpec(stPacksSettings().videoModel);
  const estCostUsd = estimateJobUsd(input.labels, { videoSeconds: input.options.videoSeconds, matteMode: input.options.matteMode, usdPerSecond: spec.usdPerSecond });
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
      options: input.options as unknown as Prisma.InputJsonValue,
      baseKey: input.baseKey,
      estCostUsd,
      startedAt: new Date(),
      expressions: { create: input.labels.map((label) => ({ label, status: "queued" })) },
    },
    select: { id: true },
  });
  return job.id;
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
  const spec = videoModelSpec(settings.videoModel);
  const options = normaliseOptions(job.options, settings);
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
    const est = estimateExpressionUsd(e.label as StExpressionLabel, { videoSeconds: options.videoSeconds, matteMode: options.matteMode, usdPerSecond: spec.usdPerSecond });
    if (est > capLeft()) { await failExpression(e.id, "Job spend cap reached"); continue; }
    if (await claim(e.id, "queued", "editing", LOCK_MS.edit)) { busy++; work.push(() => runEdit(e.id)); }
  }
  for (const e of exprs) {
    if (e.status !== "edited" || openVideos >= settings.videoConcurrency) continue;
    if (spec.usdPerSecond * options.videoSeconds > capLeft()) { await failExpression(e.id, "Job spend cap reached"); continue; }
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
  const exhausted = moderated || attempts >= MAX_ATTEMPTS;
  console.warn(`[st-packs] ${e.label} ${step} failed (attempt ${attempts}): ${message}`);
  await prisma.stPackExpression.update({
    where: { id: e.id },
    data: {
      status: exhausted ? "failed" : backTo,
      lockedUntil: null,
      error: moderated ? "Blocked by provider moderation" : message.slice(0, 500),
      timings: { ...t, attempts: { ...t.attempts, [step]: attempts } } as unknown as Prisma.InputJsonValue,
    },
  });
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
  try {
    const base = await mustRead(job.baseKey, "Base image");
    let editKey: string;
    const t = timingsOf(e);
    if (e.label === "neutral") {
      editKey = job.baseKey!; // the base is the neutral still
    } else {
      const ctx = operationContext(e, settings.maxUsdPerExpression - e.costUsd);
      const { image } = await runInOperation(ctx, () => generateStImage({
        prompt: editPrompt(e.label as StExpressionLabel, job.styleNotes),
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

// ── Step 2: idle clip (submit, then poll) ────────────────────────────────────
async function runSubmit(exprId: string): Promise<void> {
  const loaded = await loadExpr(exprId);
  if (!loaded || loaded.e.status !== "video_submitted") return;
  const { e, job } = loaded;
  const settings = stPacksSettings();
  const options = normaliseOptions(job.options, settings);
  const spec = videoModelSpec(settings.videoModel);
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
      prompt: videoPrompt(e.label as StExpressionLabel),
      still,
      width: spec.width,
      height: spec.height,
      seconds: options.videoSeconds,
      fps: spec.fps,
      extra: spec.body,
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
  const listPrice = spec.usdPerSecond * options.videoSeconds;
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
    }));
    await addCost(e, ctx.spentUsd);
    const webpKey = await put(result.webp.webp, exprKey(job.id, e.label, "loop.webp"), "image/webp");
    const pngKey = await put(await stillPng(result.frames[0]), exprKey(job.id, e.label, "still.png"), "image/png");
    // GIF is built when someone downloads the GIF pack. Encoding 60 frames at
    // 720×960 with a full palette (effort 10, no frame reuse) was the bulk of
    // the 2–3 min post time.
    const gifKey = null;
    const t = timingsOf(e);
    t.post = Date.now() - started;
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
export async function buildArtifacts(jobId: string): Promise<{ zipKey: string; gridKey: string | null }> {
  const job = await getJob(jobId);
  if (!job) throw new Error("Job not found");
  const options = normaliseOptions(job.options);
  const done = job.expressions.filter((e) => e.status === "done" && e.webpKey);
  if (done.length === 0) throw new Error("No finished expressions");

  let zipKey = job.zipKey;
  if (!zipKey) {
    const entries = await Promise.all(done.map(async (e) => ({ label: e.label, data: await mustRead(e.webpKey, `${e.label}.webp`) })));
    zipKey = await put(await buildMainZip(entries, { readme: options.readme }), `st-packs/${job.id}/pack.zip`, "application/zip");
  }

  let gridKey: string | null = job.gridKey;
  if (options.grid && !gridKey) {
    const order = new Map(ST_EXPRESSION_LABELS.map((l, i) => [l, i]));
    const items: Array<{ label: string; frames: Frame[] }> = [];
    for (const e of [...done].sort((a, b) => (order.get(a.label as StExpressionLabel) ?? 99) - (order.get(b.label as StExpressionLabel) ?? 99)).slice(0, 8)) {
      items.push({ label: e.label, frames: await webpFrames(await mustRead(e.webpKey, e.label)) });
    }
    gridKey = await put(await encodePreviewGrid(items, 16), `st-packs/${job.id}/preview.gif`, "image/gif");
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
