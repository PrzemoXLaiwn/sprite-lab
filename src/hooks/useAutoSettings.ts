"use client";

// =============================================================================
// Auto-settings for the Generate panel: reads the prompt (debounced) and sets
// asset type, style, camera view, palette and pose to match it.
//
// Rules:
//   • A control the user changed by hand (or that a link / example / history
//     restore set) is never overridden in this session. Changes are detected by
//     comparing values with what this hook last saw or applied, so the panel's
//     own handlers don't need to report anything.
//   • Every auto change is undoable (undo → previous value, and the control
//     then counts as the user's choice).
//   • Turning the switch off stops changes; turning it back on hands every
//     control back to auto.
// =============================================================================

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { detectIntent, POSE_APPLIES_TO, VIEW_APPLIES_TO } from "@/lib/prompt-intent";

export type AutoControl = "type" | "style" | "view" | "palette" | "pose";

export interface AutoValues {
  /** Picker group (GENERATE_CATEGORIES id). */
  groupId: string;
  subcategoryId: string;
  styleId: string;
  view: string;
  palette: string;
  pose: string;
}

export interface AutoChange {
  control: AutoControl;
  /** Value(s) the hook set. */
  value: Partial<AutoValues>;
  /** Value(s) before the hook touched the control — restored by undo. */
  prev: Partial<AutoValues>;
  /** Prompt words that triggered it. */
  reason?: string;
}

const KEYS: Record<AutoControl, (keyof AutoValues)[]> = {
  type: ["groupId", "subcategoryId"],
  style: ["styleId"],
  view: ["view"],
  palette: ["palette"],
  pose: ["pose"],
};
const CONTROLS = Object.keys(KEYS) as AutoControl[];
const STORAGE_KEY = "spritelab_auto_settings";
const FLASH_MS = 1600;

// The on/off switch is remembered per browser. Kept in memory too, so it still
// works when storage is blocked (private mode, previews).
let enabledInMemory: boolean | null = null;
const switchListeners = new Set<() => void>();
function readEnabled(): boolean {
  if (enabledInMemory !== null) return enabledInMemory;
  try { return window.localStorage.getItem(STORAGE_KEY) !== "off"; } catch { return true; }
}
function writeEnabled(on: boolean) {
  enabledInMemory = on;
  try { window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off"); } catch { /* storage blocked */ }
  switchListeners.forEach((l) => l());
}
function subscribeEnabled(l: () => void) {
  switchListeners.add(l);
  return () => { switchListeners.delete(l); };
}

const pick = (v: AutoValues, c: AutoControl): Partial<AutoValues> =>
  Object.fromEntries(KEYS[c].map((k) => [k, v[k]])) as Partial<AutoValues>;
const same = (a: Partial<AutoValues>, b: Partial<AutoValues>) =>
  (Object.keys(a) as (keyof AutoValues)[]).every((k) => a[k] === b[k]);

/**
 * Decide what auto-settings changes for a prompt. Pure (unit-tested): returns
 * the values to set, the auto changes in effect afterwards and what to flash.
 */
export function planAutoChanges(
  text: string,
  cur: AutoValues,
  current: Partial<Record<AutoControl, AutoChange>>,
  userSet: ReadonlySet<AutoControl>,
): { patch: Partial<AutoValues>; next: Partial<Record<AutoControl, AutoChange>>; flash: AutoControl[] } {
  const intent = detectIntent(text, { currentStyleId: cur.styleId });
  const patch: Partial<AutoValues> = {};
  const next = { ...current };
  const flash: AutoControl[] = [];
  const free = (c: AutoControl) => !userSet.has(c);

  const set = (c: AutoControl, value: Partial<AutoValues>, reason?: string) => {
    const before = pick(cur, c);
    if (same(value, before)) return;
    Object.assign(patch, value);
    if (next[c] && same(value, next[c]!.prev)) { delete next[c]; return; } // back where the user had it
    next[c] = { control: c, value, prev: next[c]?.prev ?? before, reason };
    flash.push(c);
  };
  /** The prompt no longer asks for it — put back what was there before auto. */
  const revert = (c: AutoControl) => {
    const ch = next[c];
    if (!ch) return;
    Object.assign(patch, ch.prev);
    delete next[c];
  };

  // Asset type
  if (intent.categoryId && intent.subcategoryId && intent.confidence >= 0.5 && free("type")) {
    set("type", { groupId: intent.categoryId, subcategoryId: intent.subcategoryId }, intent.reasons.category);
  }
  const target = { ...cur, ...patch };
  // Floor / wall tiles sit in the Environment picker but are TILESETS assets (no camera view)
  const assetCategory = target.subcategoryId === "GROUND" || target.subcategoryId === "WALLS" ? "TILESETS" : target.groupId;

  // Style
  if (free("style")) {
    if (intent.styleId) set("style", { styleId: intent.styleId }, intent.reasons.style);
    else revert("style");
  }
  // Camera view — only where the panel shows it
  if (free("view")) {
    if (intent.view && VIEW_APPLIES_TO.has(assetCategory)) set("view", { view: intent.view }, intent.reasons.view);
    else revert("view");
  }
  if (free("palette")) {
    if (intent.palette) set("palette", { palette: intent.palette }, intent.reasons.palette);
    else revert("palette");
  }
  if (free("pose")) {
    if (intent.pose && POSE_APPLIES_TO.has(target.groupId)) set("pose", { pose: intent.pose }, intent.reasons.pose);
    else revert("pose");
  }

  return { patch, next, flash };
}

export function useAutoSettings({
  prompt,
  values,
  apply,
  initiallyUserSet = [],
  delayMs = 350,
}: {
  prompt: string;
  values: AutoValues;
  /** Sets the given panel values (one batched update). */
  apply: (patch: Partial<AutoValues>) => void;
  /** Controls that start as the user's choice (e.g. settings from a shared link). */
  initiallyUserSet?: AutoControl[];
  delayMs?: number;
}) {
  const enabled = useSyncExternalStore(subscribeEnabled, readEnabled, () => true);
  const [changes, setChanges] = useState<Partial<Record<AutoControl, AutoChange>>>({});
  const [flashing, setFlashing] = useState<Set<AutoControl>>(() => new Set());

  const known = useRef<AutoValues>(values);
  const latest = useRef<AutoValues>(values);
  const userSet = useRef<Set<AutoControl>>(new Set(initiallyUserSet));
  const changesRef = useRef(changes);
  const applyRef = useRef(apply);
  const lastPrompt = useRef(prompt);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Latest values for the debounced callbacks (synced before the effects below run)
  useLayoutEffect(() => {
    latest.current = values;
    changesRef.current = changes;
    applyRef.current = apply;
  });

  // Changes that didn't come from this hook are the user's (or a link's) choice
  const { groupId, subcategoryId, styleId, view, palette, pose } = values;
  useEffect(() => {
    const prev = known.current;
    const now = latest.current;
    const changed = CONTROLS.filter((c) => !same(pick(prev, c), pick(now, c)));
    if (!changed.length) return;
    const groupChanged = prev.groupId !== now.groupId;
    for (const c of changed) {
      // Picking another asset group resets the camera view — that's a side effect, not a choice
      if (c === "view" && groupChanged) continue;
      userSet.current.add(c);
    }
    known.current = now;
    setChanges((cur) => {
      const next = { ...cur };
      for (const c of changed) delete next[c];
      return next;
    });
  }, [groupId, subcategoryId, styleId, view, palette, pose]);

  const commit = useCallback((patch: Partial<AutoValues>, nextChanges: Partial<Record<AutoControl, AutoChange>>, flash: AutoControl[]) => {
    known.current = { ...latest.current, ...patch };
    setChanges(nextChanges);
    if (Object.keys(patch).length) applyRef.current(patch);
    if (flash.length) {
      setFlashing(new Set(flash));
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlashing(new Set()), FLASH_MS);
    }
  }, []);

  const run = useCallback((text: string) => {
    const { patch, next, flash } = planAutoChanges(text, latest.current, changesRef.current, userSet.current);
    commit(patch, next, flash);
  }, [commit]);

  // Debounced run after typing stops. The prompt the page opened with (link,
  // first-run example) is left alone until the user edits it.
  useEffect(() => {
    if (!enabled || prompt === lastPrompt.current) return;
    const t = setTimeout(() => {
      lastPrompt.current = prompt;
      run(prompt);
    }, delayMs);
    return () => clearTimeout(t);
  }, [prompt, enabled, delayMs, run]);

  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);

  const undo = useCallback((c: AutoControl) => {
    const ch = changesRef.current[c];
    if (!ch) return;
    userSet.current.add(c); // undo is a choice: auto leaves this control alone now
    const next = { ...changesRef.current };
    delete next[c];
    commit(ch.prev, next, []);
  }, [commit]);

  const setEnabled = useCallback((on: boolean) => {
    writeEnabled(on);
    if (!on) setChanges({});
    else {
      // Back on: auto may manage every control again, starting with the current prompt
      userSet.current.clear();
      lastPrompt.current = "\u0000";
    }
  }, []);

  return {
    enabled,
    setEnabled,
    /** Auto changes still in effect, in panel order. */
    changes: CONTROLS.map((c) => changes[c]).filter((x): x is AutoChange => !!x),
    isAuto: (c: AutoControl) => !!changes[c],
    isFlashing: (c: AutoControl) => flashing.has(c),
    undo,
  };
}
