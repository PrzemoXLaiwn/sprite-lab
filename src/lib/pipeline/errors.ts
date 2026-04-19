/**
 * Pipeline error hierarchy.
 *
 * Every pipeline step throws exactly one subclass of PipelineError so the
 * orchestrator's catch block can:
 *   - Log with structured context (step, recoverable, cause, step-specific context)
 *   - Decide credit refund behaviour (recoverable ? refund : skip)
 *   - Map error → HTTP status in the API layer
 *
 * Step string ↔ spec step-number mapping:
 *   "validation"          → step 1
 *   "prompt_composition"  → step 2
 *   "credit_reservation"  → step 3
 *   "raw_generation"      → step 4
 *   "background_removal"  → step 5
 *   "image_processing"    → steps 6–7 (pixelate + palette quantize)
 *   "tileability"         → step 8
 *   "storage"             → step 11  (R2 upload)
 *   "persistence"         → step 12  (DB insert)
 * Steps 9, 10, 13 intentionally have no dedicated subclass:
 *   step 9  (normal map)        deferred; uses ImageProcessingError if enabled later
 *   step 10 (display upscale)   uses ImageProcessingError (same sharp code path)
 *   step 13 (response)          pure serialization, cannot fail
 *
 * Design:
 *   - Class hierarchy over discriminated-union-of-objects: `instanceof` is
 *     natural in catch blocks and TS narrows the type without a tag check.
 *   - Each subclass fixes its step and default recoverability at the type
 *     level (readonly + literal-const), so the orchestrator doesn't need
 *     to remember step numbers when throwing.
 *   - `cause` uses ES2022 `Error.cause` (supported by Node ≥ 16.9 / Vercel
 *     runtime). The current tsconfig's `lib: ["esnext"]` exposes the type.
 *   - `context` is free-form for step-specific detail (Runware taskUUID,
 *     R2 key, palette size, etc.).
 *   - `toLogContext(err)` flattens into a record the existing logger emits
 *     cleanly; no logger modification required.
 */

export type PipelineStep =
  | "validation"
  | "prompt_composition"
  | "credit_reservation"
  | "raw_generation"
  | "background_removal"
  | "image_processing"
  | "tileability"
  | "storage"
  | "persistence";

export interface PipelineErrorOptions {
  /** Underlying error being wrapped. Accessible via `err.cause`. */
  cause?: unknown;
  /** Step-specific detail (e.g. `{ taskUUID, modelId }` for Runware). */
  context?: Record<string, unknown>;
}

/**
 * Base class. Abstract — never thrown directly; use a typed subclass.
 *
 * - `step`        — which pipeline step failed
 * - `recoverable` — were credits already deducted? If `true`, orchestrator
 *                   must refund. If `false`, no refund needed (either the
 *                   deduction never happened, or it failed).
 */
export abstract class PipelineError extends Error {
  abstract readonly step: PipelineStep;
  abstract readonly recoverable: boolean;
  readonly context?: Record<string, unknown>;

  constructor(message: string, options: PipelineErrorOptions = {}) {
    super(
      message,
      options.cause !== undefined ? { cause: options.cause } : undefined
    );
    this.context = options.context;
    // Use the concrete subclass name in stack traces + logger output.
    this.name = new.target.name;
  }
}

// ─── Step 1 ────────────────────────────────────────────────────────────────
export class ValidationError extends PipelineError {
  override readonly step = "validation" as const;
  override readonly recoverable = false as const; // no credits touched yet
}

// ─── Step 2 ────────────────────────────────────────────────────────────────
export class PromptCompositionError extends PipelineError {
  override readonly step = "prompt_composition" as const;
  override readonly recoverable = false as const; // no credits touched yet
}

// ─── Step 3 ────────────────────────────────────────────────────────────────
/**
 * User's balance was below the required cost; no deduction was ever attempted.
 * Throw this BEFORE calling the deduct helper. Safe to return without refund.
 */
export class InsufficientCreditsError extends PipelineError {
  override readonly step = "credit_reservation" as const;
  override readonly recoverable = false as const;
}

/**
 * The deduction call itself failed (DB transaction abort, connection drop,
 * race condition, etc.) — the debit may be partially or fully applied.
 * Throw this AFTER calling the deduct helper. Orchestrator refunds defensively
 * to protect the user against silent credit loss (billing-correctness bug,
 * worst kind). It's cheaper to occasionally over-refund (refund cost: one
 * ledger row) than to ever under-refund.
 */
export class CreditDeductionError extends PipelineError {
  override readonly step = "credit_reservation" as const;
  override readonly recoverable = true as const;
}

// ─── Step 4 ────────────────────────────────────────────────────────────────
export class RunwareError extends PipelineError {
  override readonly step = "raw_generation" as const;
  override readonly recoverable = true as const; // credits deducted → refund on failure
}

// ─── Step 5 ────────────────────────────────────────────────────────────────
export class BackgroundRemovalError extends PipelineError {
  override readonly step = "background_removal" as const;
  override readonly recoverable = true as const;
}

// ─── Steps 6–7 (+ 10) ──────────────────────────────────────────────────────
export class ImageProcessingError extends PipelineError {
  override readonly step = "image_processing" as const;
  override readonly recoverable = true as const;
}

// ─── Step 8 ────────────────────────────────────────────────────────────────
export class TileabilityError extends PipelineError {
  override readonly step = "tileability" as const;
  override readonly recoverable = true as const;
}

// ─── Step 11 ───────────────────────────────────────────────────────────────
export class StorageError extends PipelineError {
  override readonly step = "storage" as const;
  override readonly recoverable = true as const;
}

// ─── Step 12 ───────────────────────────────────────────────────────────────
/**
 * DB insert failed after R2 upload succeeded. The image exists in storage
 * without a row pointing to it — an orphan.
 *
 * When throwing PersistenceError, the caller MUST set `context.imageKey`
 * (and `context.displayKey` / `context.normalMapKey` if applicable) to the
 * R2 keys of the uploaded-but-orphaned images. The orphan-cleanup cron
 * (future module) uses these to reclaim storage. Missing these keys =
 * permanent R2 orphans, indistinguishable from valid data.
 */
export class PersistenceError extends PipelineError {
  override readonly step = "persistence" as const;
  override readonly recoverable = true as const;
}

// ─── Type guard ────────────────────────────────────────────────────────────
/** Narrows `unknown` → `PipelineError` for the orchestrator catch block. */
export function isPipelineError(err: unknown): err is PipelineError {
  return err instanceof PipelineError;
}

// ─── Log serialisation helper ──────────────────────────────────────────────
/**
 * Flatten a PipelineError into a log context ready for the current logger:
 *
 *   logger.error("pipeline failure", toLogContext(err));
 *
 * The returned object spreads the error's `context` first, then overlays
 * the typed fields (`step`, `recoverable`, `err`, `cause`) — so our
 * pipeline-defined fields cannot be shadowed by caller-supplied context.
 *
 * `err` is included as-is; the logger's `Error` serialiser turns it into
 * `{ name, message, stack }`. One level of `cause` is unwrapped inline —
 * no recursion (we don't expect nested PipelineErrors in practice; deeper
 * chains stringify to the top message only, which is fine for triage).
 */
export function toLogContext(err: PipelineError): Record<string, unknown> {
  const out: Record<string, unknown> = { ...(err.context ?? {}) };
  out.step = err.step;
  out.recoverable = err.recoverable;
  out.err = err; // serialised by logger → { name, message, stack }

  if (err.cause instanceof Error) {
    out.cause = {
      name: err.cause.name,
      message: err.cause.message,
      stack: err.cause.stack,
    };
  } else if (err.cause !== undefined) {
    out.cause = String(err.cause);
  }

  return out;
}
