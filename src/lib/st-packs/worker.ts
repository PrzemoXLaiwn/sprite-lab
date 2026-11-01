// =============================================================================
// ST Packs — background worker
// =============================================================================
// A job must keep going after the admin closes the tab. The same pattern as
// /api/queue: an internal route, authenticated with QUEUE_SECRET, is "kicked"
// with a fire-and-forget request. It answers at once and then loops in
// after(): tick → run the claimed steps → short pause → tick … until the job
// ends or its own time budget runs out, at which point it hands its lease to
// a fresh invocation. One job has one lease, so the page poll cannot start a
// second 240 s function while a render or a post-process is quiet.
// =============================================================================
import { internalBaseUrl } from "@/lib/internal-base-url";
import { runWork, tick } from "./jobs";
import type { JobSnapshot } from "./types";
import { claimWorkerLease, releaseWorkerLease, renewWorkerLease, takeOverWorkerLease } from "./worker-lease";

export const WORKER_HEADER = "x-queue-secret";
/** How long one invocation keeps looping. The route's maxDuration is 300 s. */
export const WORKER_BUDGET_MS = 240_000;
/** Platform kill for this route. Keep equal to `maxDuration` in the worker route. */
export const WORKER_MAX_MS = 300_000;
/**
 * Worst case of the longest step. Native 720×960 plus one WebP encode is well
 * under a minute; 90 s still clears the 300 s kill if a post starts late in
 * the 240 s budget. The loop hands off before tick when less than this remains,
 * and the successor keeps the same lease.
 */
export const WORKER_STEP_WORST_MS = 90_000;
/** Pause between ticks when nothing was ready to run (video still rendering). */
export const WORKER_IDLE_MS = 3_000;

/** @see internalBaseUrl — re-exported so callers and tests share one host rule. */
export function workerBaseUrl(env: Record<string, string | undefined> = process.env): string {
  return internalBaseUrl(env);
}

/**
 * Start the worker for a job, or hand an existing lease to the next
 * invocation (`handoffFrom`). Returns false only when no worker is running
 * and this call could not start one — the caller then does the work itself.
 * A lease already held by a live worker returns true and does not fetch.
 */
export async function kickWorker(jobId: string, opts?: { handoffFrom?: Date }): Promise<boolean> {
  const secret = process.env.QUEUE_SECRET;
  if (!secret) {
    console.error("[st-packs] QUEUE_SECRET is not set — background worker unavailable");
    return false;
  }
  let held: Date | null = null;
  try {
    held = opts?.handoffFrom
      ? await takeOverWorkerLease(jobId, opts.handoffFrom)
      : await claimWorkerLease(jobId);
    // Someone else owns the job (or the hand-off lost the race). Do not start a second function.
    if (!held) return true;
    const res = await fetch(`${workerBaseUrl()}/api/st-packs/worker`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "SpriteLab-STPacks-Worker",
        [WORKER_HEADER]: secret,
        // Preview deployments sit behind Vercel's SSO; the bypass secret is set by Vercel when enabled
        ...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET ? { "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET } : {}),
      },
      body: JSON.stringify({ jobId, leaseUntil: held.toISOString() }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      // Do not run the 240 s loop here. This function is also called from the
      // page poll; a full loop would hold that request until the platform kills it.
      // The caller does one tick when this returns false.
      console.error(`[st-packs] worker kick ${res.url} answered ${res.status}`);
      await releaseWorkerLease(jobId, held);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[st-packs] worker kick for ${jobId} failed:`, err instanceof Error ? err.message : err);
    if (held) {
      await releaseWorkerLease(jobId, held).catch((releaseErr) => {
        console.error(`[st-packs] worker lease release for ${jobId} failed:`, releaseErr instanceof Error ? releaseErr.message : releaseErr);
      });
    }
    return false;
  }
}

/**
 * The loop one invocation runs. `leaseUntil` is the timestamp the kick wrote;
 * the loop renews that exact value and stops if it loses the race. When the
 * budget ends with the job still running, `handoffFrom` is the timestamp the
 * successor must take over — the lease stays held across the hand-off.
 */
export async function workerLoop(
  jobId: string,
  opts: { budgetMs?: number; leaseUntil?: Date | null; stepWorstMs?: number; maxDurationMs?: number } = {},
): Promise<{ snapshot: JobSnapshot | null; continueNeeded: boolean; handoffFrom: Date | null }> {
  const budgetMs = opts.budgetMs ?? WORKER_BUDGET_MS;
  const stepWorstMs = opts.stepWorstMs ?? WORKER_STEP_WORST_MS;
  const maxDurationMs = opts.maxDurationMs ?? WORKER_MAX_MS;
  let held = opts.leaseUntil ?? null;
  if (!held) {
    held = await claimWorkerLease(jobId);
    if (!held) return { snapshot: null, continueNeeded: false, handoffFrom: null };
  }
  const started = Date.now();
  const budgetDeadline = started + budgetMs;
  const killAt = started + maxDurationMs;
  let snapshot: JobSnapshot | null = null;
  const remaining = () => Math.min(budgetDeadline, killAt) - Date.now();
  while (Date.now() < budgetDeadline && Date.now() < killAt) {
    const renewed = await renewWorkerLease(jobId, held);
    if (!renewed) return { snapshot, continueNeeded: false, handoffFrom: null };
    held = renewed;
    // tick() claims the next step. Hand off first when that step cannot finish
    // before the budget or the platform kill.
    if (remaining() < stepWorstMs) return { snapshot, continueNeeded: true, handoffFrom: held };
    const t = await tick(jobId);
    snapshot = t.snapshot;
    if (!snapshot || snapshot.status !== "running") {
      // The finishing tick marks the job done and queues pack.zip (plus the
      // preview GIF and the static PNG zip). Run that before dropping the lease.
      // The page offers the download anyway 20 s after done, so a killed pack never blocks it.
      if (t.work.length) await runWork(t.work);
      await releaseWorkerLease(jobId, held);
      return { snapshot, continueNeeded: false, handoffFrom: null };
    }
    // A long step (edit, submit, post) holds the expression lock, so a poll
    // will not start another worker while this iteration cannot renew.
    if (t.work.length) {
      await runWork(t.work);
    } else {
      await new Promise((r) => setTimeout(r, WORKER_IDLE_MS));
    }
  }
  return { snapshot, continueNeeded: true, handoffFrom: held };
}

/**
 * True when a running job has no live worker and nothing is mid-step.
 * Quiet rows (a clip rendering, a poll waiting) are not a stall: the lease
 * is what proves the worker is alive, and an expression lock (`lockedUntil`
 * still in the future) means a step is in flight even if the worker died.
 */
export function isStalled(snapshot: JobSnapshot, now = Date.now()): boolean {
  if (snapshot.status !== "running") return false;
  if (snapshot.workerLeaseUntil) {
    const lease = new Date(snapshot.workerLeaseUntil).getTime();
    if (lease > now) return false;
  }
  const locked = snapshot.expressions.some((e) => {
    if (!e.lockedUntil) return false;
    return new Date(e.lockedUntil).getTime() > now;
  });
  return !locked;
}
