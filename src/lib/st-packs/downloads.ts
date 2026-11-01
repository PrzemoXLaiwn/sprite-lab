// When the ZIP (and the cheap extra packs) are ready to download.
// The job row flips to done before pack.zip is stored, so the studio has to
// tell "finished" from "the file is in storage". No schema change: extra
// packs use a stable R2 key plus a flag inside the existing options JSON.

export type ZipButtonState = "idle" | "preparing" | "ready" | "fallback";

/** Idle while the job is still running or nothing finished. Preparing until the zip key exists. A stored error means the click builds it (the download fallback). */
export function zipButtonState(input: {
  status: string;
  hasZip: boolean;
  doneCount: number;
  error: string | null;
}): ZipButtonState {
  const finished = input.status === "done" || input.status === "partial";
  if (!finished) return "idle";
  if (input.hasZip) return "ready";
  if (input.doneCount <= 0) return "idle";
  if (input.error) return "fallback";
  return "preparing";
}

export function packFlags(raw: unknown): { png: boolean; gif: boolean } {
  const base = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const packs = base.packs && typeof base.packs === "object" && !Array.isArray(base.packs) ? (base.packs as Record<string, unknown>) : {};
  return { png: packs.png === true, gif: packs.gif === true };
}

/** Merge pack readiness into options. Leaves gif/png/grid and the rest of the object alone. */
export function withPackFlags(raw: unknown, flags: { png: boolean; gif: boolean }): Record<string, unknown> {
  const base = raw && typeof raw === "object" && !Array.isArray(raw) ? { ...(raw as Record<string, unknown>) } : {};
  const prev = base.packs && typeof base.packs === "object" && !Array.isArray(base.packs) ? { ...(base.packs as Record<string, unknown>) } : {};
  base.packs = { ...prev, png: flags.png, gif: flags.gif };
  return base;
}

export const pngPackKey = (jobId: string) => `st-packs/${jobId}/static.png.zip`;
export const gifPackKey = (jobId: string) => `st-packs/${jobId}/gif.zip`;
