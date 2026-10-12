/**
 * Minimal structured logger for the module-2 generation pipeline.
 *
 * Emits one JSON line per entry — `console.log` for debug/info,
 * `console.error` for warn/error (Vercel/Supabase both surface these
 * correctly in their respective log streams).
 *
 * Respects `LOG_LEVEL` env var (debug | info | warn | error). Default is
 * "info" in production, "debug" elsewhere. Unrecognised values fall back
 * to the default.
 *
 * Designed to be swapped for pino/winston later without touching call
 * sites: the surface is four methods (debug/info/warn/error), each taking
 * a message plus an optional context object. `Error` instances in the
 * context are auto-serialised to `{ name, message, stack }`.
 *
 * For pipeline-scoped tracing use `childLogger({ requestId, userId, ... })`
 * — every call on the returned logger merges those bindings into the
 * emitted entry's context.
 */

type LogLevel = "debug" | "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info:  20,
  warn:  30,
  error: 40,
};

const DEFAULT_LEVEL: LogLevel =
  process.env.NODE_ENV === "production" ? "info" : "debug";

const envLevel = process.env.LOG_LEVEL;
const CONFIGURED_LEVEL: LogLevel =
  envLevel && envLevel in LEVEL_PRIORITY
    ? (envLevel as LogLevel)
    : DEFAULT_LEVEL;

function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  }
  return { value: String(err) };
}

function normalizeContext(context?: LogContext): LogContext | undefined {
  if (!context) return undefined;
  const keys = Object.keys(context);
  if (keys.length === 0) return undefined;
  const out: LogContext = {};
  for (const key of keys) {
    const value = context[key];
    out[key] = value instanceof Error ? serializeError(value) : value;
  }
  return out;
}

function emit(level: LogLevel, message: string, context?: LogContext): void {
  if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[CONFIGURED_LEVEL]) return;

  const normalized = normalizeContext(context);
  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    message,
  };
  if (normalized) entry.context = normalized;

  const line = JSON.stringify(entry);
  if (level === "warn" || level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message:  string, context?: LogContext): void;
  warn(message:  string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

export const logger: Logger = {
  debug: (msg, ctx) => emit("debug", msg, ctx),
  info:  (msg, ctx) => emit("info",  msg, ctx),
  warn:  (msg, ctx) => emit("warn",  msg, ctx),
  error: (msg, ctx) => emit("error", msg, ctx),
};

/**
 * Returns a logger whose every entry is merged with the given bindings.
 * Per-call `context` keys override bindings on collision.
 *
 * @example
 *   const log = childLogger({ requestId, userId });
 *   log.info("step 4 done", { durationMs: 1234 });
 *   // → entry.context = { requestId, userId, durationMs }
 */
export function childLogger(bindings: LogContext): Logger {
  return {
    debug: (msg, ctx) => emit("debug", msg, { ...bindings, ...ctx }),
    info:  (msg, ctx) => emit("info",  msg, { ...bindings, ...ctx }),
    warn:  (msg, ctx) => emit("warn",  msg, { ...bindings, ...ctx }),
    error: (msg, ctx) => emit("error", msg, { ...bindings, ...ctx }),
  };
}
