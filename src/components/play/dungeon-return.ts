// A player who leaves the Dungeon for a SpriteLab tool (animate a hero, make
// a weapon) gets a way back. Per tab and short-lived: it's a convenience, not
// state anything depends on.

const KEY = "sl:dungeon-return";
export const DUNGEON_RETURN_TTL_MS = 45 * 60_000;

/** Remember that the player left the Dungeon for `kind` (an upgrade or tip). */
export function markDungeonReturn(kind: string): void {
  try { sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now(), kind })); } catch { /* storage blocked */ }
}

/** The stored value as-is (a stable string for useSyncExternalStore). */
export function rawDungeonReturn(): string | null {
  try { return sessionStorage.getItem(KEY); } catch { return null; }
}

/** The pending return, or null when there is none or it has expired. */
export function pendingDungeonReturn(raw = rawDungeonReturn(), now = Date.now()): { kind: string } | null {
  try {
    if (!raw) return null;
    const v = JSON.parse(raw) as { at?: unknown; kind?: unknown };
    if (typeof v.at !== "number" || now - v.at > DUNGEON_RETURN_TTL_MS) { sessionStorage.removeItem(KEY); return null; }
    return { kind: typeof v.kind === "string" ? v.kind : "unknown" };
  } catch {
    return null;
  }
}

export function clearDungeonReturn(): void {
  try { sessionStorage.removeItem(KEY); } catch { /* storage blocked */ }
}
