import { afterEach, describe, expect, it, vi } from "vitest";
import { scheduleAfterPaint } from "./schedule-after-paint";

type Listener = (event?: unknown) => void;

function installWindow(readyState: DocumentReadyState) {
  const listeners = new Map<string, Set<Listener>>();
  const win = {
    document: { readyState },
    setTimeout: (fn: () => void, ms: number) => globalThis.setTimeout(fn, ms) as unknown as number,
    clearTimeout: (id: number) => globalThis.clearTimeout(id),
    addEventListener(type: string, fn: Listener) {
      const set = listeners.get(type) ?? new Set();
      set.add(fn);
      listeners.set(type, set);
    },
    removeEventListener(type: string, fn: Listener) {
      listeners.get(type)?.delete(fn);
    },
    fire(type: string) {
      for (const fn of [...(listeners.get(type) ?? [])]) fn();
    },
  };
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", win.document);
  return win;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("scheduleAfterPaint", () => {
  it("waits out the delay when nobody gestures", () => {
    vi.useFakeTimers();
    const win = installWindow("complete");
    const run = vi.fn();
    scheduleAfterPaint(run, 8000);
    vi.advanceTimersByTime(7999);
    expect(run).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(run).toHaveBeenCalledOnce();
    expect(win.document.readyState).toBe("complete");
  });

  it("runs on the first gesture and does not run again when the timer fires", () => {
    vi.useFakeTimers();
    const win = installWindow("complete");
    const run = vi.fn();
    scheduleAfterPaint(run, 8000);
    win.fire("pointerdown");
    vi.advanceTimersByTime(8000);
    expect(run).toHaveBeenCalledOnce();
  });

  it("does not run after cleanup", () => {
    vi.useFakeTimers();
    installWindow("loading");
    const run = vi.fn();
    const cancel = scheduleAfterPaint(run, 1000);
    cancel();
    vi.advanceTimersByTime(5000);
    expect(run).not.toHaveBeenCalled();
  });
});
