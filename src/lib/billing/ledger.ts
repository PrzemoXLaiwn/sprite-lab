// =============================================================================
// Provider-call ledger — one row per call to an AI provider, inside or outside
// a paid operation, including errors, timeouts and moderation blocks.
// =============================================================================
// Rules:
//   • recordProviderCall never throws and never retries anything: a failed
//     write only marks the operation's cost log as incomplete.
//   • Every row carries our estimate; the provider's reported cost is stored
//     separately (null when not reported). Budgets use reported ?? estimate.
//   • The operation context (AsyncLocalStorage) carries the per-operation
//     cost cap, so deep code (Runware grid, Claude planner) can ask
//     canSpend() before an optional extra pass without threading arguments.
// =============================================================================

import { AsyncLocalStorage } from "node:async_hooks";

export type Outcome = "ok" | "error" | "timeout" | "moderated" | "discarded";

export interface ProviderCallInput {
  provider: "runware" | "anthropic" | "cloudflare";
  model: string;
  task: string;
  size?: string;
  outcome: Outcome;
  /** As reported by the provider; leave undefined when it didn't say. */
  costUsd?: number | null;
  /** Our list-price estimate for this call. Always required. */
  estCostUsd: number;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  providerTaskId?: string;
  error?: string;
}

export interface OperationContext {
  operationId: string;
  userId: string;
  capUsd: number;
  spentUsd: number;
  calls: number;
  incomplete: boolean;
  pending: Promise<unknown>[];
}

export interface LedgerRow extends ProviderCallInput {
  operationId: string | null;
  userId: string | null;
  attempt: number;
}

type Sink = (row: LedgerRow) => Promise<unknown>;

const als = new AsyncLocalStorage<OperationContext>();

let sink: Sink = async (row) => {
  const { prisma } = await import("@/lib/prisma");
  return prisma.providerCall.create({
    data: {
      operationId: row.operationId,
      userId: row.userId,
      provider: row.provider,
      model: row.model.slice(0, 120),
      task: row.task,
      size: row.size ?? null,
      attempt: row.attempt,
      outcome: row.outcome,
      costUsd: row.costUsd ?? null,
      estCostUsd: row.estCostUsd,
      inputTokens: row.inputTokens ?? null,
      outputTokens: row.outputTokens ?? null,
      latencyMs: row.latencyMs ?? null,
      providerTaskId: row.providerTaskId ?? null,
      error: row.error?.slice(0, 500) ?? null,
    },
  });
};

/** Tests swap the database writer. */
export function setLedgerSink(fn: Sink) {
  sink = fn;
}

export function runInOperation<T>(ctx: OperationContext, fn: () => Promise<T>): Promise<T> {
  return als.run(ctx, fn);
}

export function currentOperation(): OperationContext | undefined {
  return als.getStore();
}

/**
 * True when one more call costing `estUsd` stays within the operation's cap.
 * Outside an operation (guest flows, scripts) there is no cap.
 */
export function canSpend(estUsd: number): boolean {
  const ctx = als.getStore();
  if (!ctx) return true;
  return ctx.spentUsd + estUsd <= ctx.capUsd + 1e-9;
}

/** Cost that counts for budgets: reported when known, otherwise our estimate. */
export const effectiveCost = (c: { costUsd?: number | null; estCostUsd: number }) =>
  typeof c.costUsd === "number" && Number.isFinite(c.costUsd) ? c.costUsd : c.estCostUsd;

export function recordProviderCall(input: ProviderCallInput): void {
  const ctx = als.getStore();
  if (ctx) {
    ctx.spentUsd += effectiveCost(input);
    ctx.calls += 1;
  }
  const row: LedgerRow = { ...input, operationId: ctx?.operationId ?? null, userId: ctx?.userId ?? null, attempt: ctx?.calls ?? 1 };
  let write: Promise<unknown>;
  try {
    write = Promise.resolve(sink(row)).catch((err) => {
      if (ctx) ctx.incomplete = true;
      console.error("[ledger] could not record provider call:", err instanceof Error ? err.message : err);
    });
  } catch (err) {
    if (ctx) ctx.incomplete = true;
    console.error("[ledger] could not record provider call:", err instanceof Error ? err.message : err);
    return;
  }
  ctx?.pending.push(write);
}

/** Waits (bounded) for this operation's ledger writes; true when all landed. */
export async function flushOperation(ctx: OperationContext, timeoutMs = 3000): Promise<boolean> {
  let settled = false;
  const all = Promise.allSettled(ctx.pending).then(() => { settled = true; });
  await Promise.race([all, new Promise((r) => setTimeout(r, timeoutMs))]);
  if (!settled) ctx.incomplete = true; // still writing → can't claim the log is complete
  return !ctx.incomplete;
}
