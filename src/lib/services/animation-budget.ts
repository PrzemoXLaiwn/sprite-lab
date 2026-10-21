// =============================================================================
// Time budget for one /api/animate request
// =============================================================================
// The route has maxDuration 300 s. If the platform kills the function, the
// operation never reaches fail()/refund() and stays RUNNING until the stale
// cron closes it 15+ minutes later — the user waits, gets no answer and sees
// the refund much later. So every image pass is planned against one deadline
// measured from the start of the request:
//   - the work (planner + image passes) must end FINISH_RESERVE_MS before the
//     route limit, leaving time to assemble, upload, save and refund;
//   - each pass gets a timeout that can't run past that point;
//   - an optional pass (redraw, in-betweens, moderation retry) only starts when
//     a realistic pass still fits; otherwise it is skipped (and, for smooth,
//     the smooth part is refunded by the route).
// =============================================================================

/** The /api/animate maxDuration. */
export const ROUTE_LIMIT_MS = 300_000;
/** Assemble + two R2 uploads (each capped) + save + operation writes. */
export const FINISH_RESERVE_MS = 50_000;
/** One image call never waits longer than this, whatever the deadline. */
export const MAX_PASS_MS = 150_000;
/**
 * Shortest time an optional pass needs to be worth starting. Production
 * latencies (Nano Banana, 30 days): 1024 sheets ≤17 s, 2048 sheets ≤30 s;
 * this is about twice the worst seen.
 */
export const MIN_OPTIONAL_PASS_MS: Record<1024 | 2048, number> = { 1024: 35_000, 2048: 60_000 };
/** Below this a required pass can't realistically succeed: fail fast and refund. */
export const MIN_REQUIRED_PASS_MS = 20_000;

/** Point in time (epoch ms) by which all image work must be done. */
export function workDeadline(requestStartedAt: number): number {
  return requestStartedAt + ROUTE_LIMIT_MS - FINISH_RESERVE_MS;
}

/** Time left for image work (never negative). */
export function remainingMs(deadline: number, now = Date.now()): number {
  return Math.max(0, deadline - now);
}

/** Timeout for the next image pass: up to MAX_PASS_MS, never past the deadline. */
export function passTimeoutMs(deadline: number, now = Date.now()): number {
  return Math.min(MAX_PASS_MS, remainingMs(deadline, now));
}

/** Whether an optional pass (redraw, in-betweens, retry) at this size still fits. */
export function canStartOptionalPass(deadline: number, size: number, now = Date.now()): boolean {
  return remainingMs(deadline, now) >= MIN_OPTIONAL_PASS_MS[size > 1024 ? 2048 : 1024];
}

/** Whether the required pass may start at all (otherwise fail fast, refund). */
export function canStartRequiredPass(deadline: number, now = Date.now()): boolean {
  return remainingMs(deadline, now) >= MIN_REQUIRED_PASS_MS;
}

/**
 * Whether a failure was the time budget running out (our deadline, or an
 * image call aborted by its timeout) rather than a bad result from the model.
 */
export function isOutOfTime(err: unknown): boolean {
  if (err instanceof AnimationTimeBudgetError) return true;
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return /AbortError|aborted|timed out|timeout/i.test(msg);
}

/** Thrown when there's no time left for a required pass — the caller refunds. */
export class AnimationTimeBudgetError extends Error {
  constructor(stage: string) {
    super(`out of time before the ${stage} pass`);
    this.name = "AnimationTimeBudgetError";
  }
}
