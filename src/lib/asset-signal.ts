// =============================================================================
// Asset signals — downloads and thumbs, nothing else
// =============================================================================
// One row per download, one current vote per user per generation. The user id
// is the only identity stored; no prompt text, no email. Logging never blocks
// the download: the client fires it and ignores failure.
// =============================================================================

export const SIGNAL_KINDS = ["download", "up", "down", "clear"] as const;
export type SignalKind = (typeof SIGNAL_KINDS)[number];

export function parseSignalKind(value: unknown): SignalKind | null {
  return typeof value === "string" && (SIGNAL_KINDS as readonly string[]).includes(value)
    ? value as SignalKind
    : null;
}

/** Fire-and-forget. Safe to call from the browser only. */
export function logAssetSignal(generationId: string | null | undefined, kind: SignalKind): void {
  if (typeof window === "undefined" || !generationId) return;
  void fetch("/api/assets/signal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ generationId, kind }),
    keepalive: true,
  }).catch(() => {});
}
