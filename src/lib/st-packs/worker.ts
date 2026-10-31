// =============================================================================
// ST Packs — background worker
// =============================================================================
// A job must keep going after the admin closes the tab. The same pattern as
// /api/queue: an internal route, authenticated with QUEUE_SECRET, is "kicked"
// with a fire-and-forget request. It answers at once and then loops in
// after(): tick → run the claimed steps → short pause → tick … until the job
// ends or its own time budget runs out, at which point it kicks a fresh
// invocation. Claims are atomic, so a second worker (or the page's own
// polling) never runs a step twice.
// =============================================================================
import { runWork, tick } from "./jobs";
import type { JobSnapshot } from "./types";

export const WORKER_HEADER = "x-queue-secret";
/** How long one invocation keeps looping (the route allows 300 s). */
export const WORKER_BUDGET_MS = 240_000;
/** Pause between ticks when nothing was ready to run (video still rendering). */
export const WORKER_IDLE_MS = 3_000;
/** A running job whose rows have not moved for this long gets a fresh worker from the page. */
export const STALL_MS = 45_000;

function baseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/**
 * Start (or restart) the worker for a job. Returns false when QUEUE_SECRET is
 * missing — the job then only advances while the page polls.
 */
export async function kickWorker(jobId: string): Promise<boolean> {
  const secret = process.env.QUEUE_SECRET;
  if (!secret) {
    console.error("[st-packs] QUEUE_SECRET is not set — background worker unavailable");
    return false;
  }
  try {
    const res = await fetch(`${baseUrl()}/api/st-packs/worker`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [WORKER_HEADER]: secret,
        // Preview deployments sit behind Vercel's SSO; the bypass secret is set by Vercel when enabled
        ...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET ? { "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET } : {}),
      },
      body: JSON.stringify({ jobId }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) console.error(`[st-packs] worker kick for ${jobId} answered ${res.status}`);
    return res.ok;
  } catch (err) {
    console.error(`[st-packs] worker kick for ${jobId} failed:`, err instanceof Error ? err.message : err);
    return false;
  }
}

/**
 * The loop one invocation runs. Returns the last snapshot; `continueNeeded`
 * tells the route to kick the next invocation.
 */
export async function workerLoop(jobId: string, budgetMs = WORKER_BUDGET_MS): Promise<{ snapshot: JobSnapshot | null; continueNeeded: boolean }> {
  const deadline = Date.now() + budgetMs;
  let snapshot: JobSnapshot | null = null;
  while (Date.now() < deadline) {
    const t = await tick(jobId);
    snapshot = t.snapshot;
    if (!snapshot || snapshot.status !== "running") return { snapshot, continueNeeded: false };
    if (t.work.length) {
      await runWork(t.work);
    } else {
      await new Promise((r) => setTimeout(r, WORKER_IDLE_MS));
    }
  }
  return { snapshot, continueNeeded: true };
}

/** True when a running job has not changed for STALL_MS (its worker chain died). */
export function isStalled(snapshot: JobSnapshot, now = Date.now()): boolean {
  if (snapshot.status !== "running") return false;
  const last = Math.max(
    new Date(snapshot.startedAt ?? snapshot.createdAt).getTime(),
    ...snapshot.expressions.map((e) => new Date(e.updatedAt).getTime()),
  );
  return now - last > STALL_MS;
}
