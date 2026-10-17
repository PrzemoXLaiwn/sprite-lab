// =============================================================================
// Replicate calls in the cost ledger
// =============================================================================
// Replicate doesn't report a price per prediction, so every row carries our
// list-price estimate (cost_usd stays null). Rules match logRunware():
//   • rejected before it ran (HTTP 4xx from the API) → error, $0;
//   • timeout / abort → timeout at full price (the prediction may have run);
//   • any other failure → error at full price (GPU time is billed even when a
//     prediction fails — the safe side for the budget).
// A call that would cross the operation's cost cap is refused before it runs.
// =============================================================================

import { canSpend, recordProviderCall, type Outcome } from "./ledger";

export const COST_CAP_ERROR = "COST_CAP: operation cost cap reached";

const rejectedBeforeRun = (msg: string) => /failed with status 4\d\d/i.test(msg) && !/status 408/.test(msg);
const isTimeout = (msg: string) => /abort|timed? ?out|ECONNRESET|socket hang up/i.test(msg);

export function logReplicate(o: { model: string; task: string; estCostUsd: number; started: number; outcome?: Outcome; err?: unknown; predictionId?: string }): void {
  const msg = o.err === undefined ? undefined : o.err instanceof Error ? o.err.message : String(o.err);
  const outcome: Outcome = o.outcome ?? (!msg ? "ok" : isTimeout(msg) ? "timeout" : "error");
  recordProviderCall({
    provider: "replicate",
    model: o.model,
    task: o.task,
    outcome,
    costUsd: null,
    estCostUsd: msg && outcome === "error" && rejectedBeforeRun(msg) ? 0 : o.estCostUsd,
    latencyMs: Date.now() - o.started,
    providerTaskId: o.predictionId,
    error: msg,
  });
}

/** Runs one Replicate call and records it. Throws COST_CAP_ERROR instead of starting a call the operation can't afford. */
export async function replicateCall<T>(o: { model: string; task: string; estCostUsd: number }, fn: () => Promise<T>): Promise<T> {
  if (!canSpend(o.estCostUsd)) throw new Error(COST_CAP_ERROR);
  const started = Date.now();
  try {
    const out = await fn();
    logReplicate({ ...o, started });
    return out;
  } catch (err) {
    logReplicate({ ...o, started, err });
    throw err;
  }
}
