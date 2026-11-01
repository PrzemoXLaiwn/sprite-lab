// When the ZIP (and the cheap extra packs) are ready to download.
// The job row flips to done before pack.zip is stored, so the studio has to
// tell "finished" from "the file is in storage". No schema change: extra
// packs use a stable R2 key plus a flag inside the existing options JSON.

export type ZipButtonState = "idle" | "preparing" | "ready" | "fallback";

/** How long the studio waits for the worker's pack.zip before the button builds it on click. */
export const ZIP_PREPARE_MS = 20_000;

/** Idle while the job is still running or nothing finished. Preparing for a few seconds after done. Then the click builds the file. */
export function zipButtonState(input: {
  status: string;
  hasZip: boolean;
  doneCount: number;
  error: string | null;
  finishedAt?: string | null;
  now?: number;
}): ZipButtonState {
  const finished = input.status === "done" || input.status === "partial";
  if (!finished) return "idle";
  if (input.hasZip) return "ready";
  if (input.doneCount <= 0) return "idle";
  if (input.error) return "fallback";
  if (packRepairDue(input)) return "fallback";
  return "preparing";
}

/** A finished job whose zip was never stored. The poll may retry the prebuild; the button must not stay disabled. */
export function packRepairDue(input: { status: string; hasZip: boolean; finishedAt?: string | null; now?: number }): boolean {
  if (input.hasZip) return false;
  if (input.status !== "done" && input.status !== "partial") return false;
  if (!input.finishedAt) return false;
  const t = new Date(input.finishedAt).getTime();
  if (!Number.isFinite(t)) return false;
  return (input.now ?? Date.now()) - t >= ZIP_PREPARE_MS;
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
