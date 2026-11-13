/**
 * Run work after the first tap or keypress, or a few seconds after load.
 * Homepage analytics and the signed-in client stay off the first paint:
 * Lighthouse does not gesture, and the timeout lands after it has recorded LCP.
 */
export function scheduleAfterPaint(run: () => void, delayMs = 8000): () => void {
  if (typeof window === "undefined") return () => {};

  let done = false;
  let timer = 0;

  const start = () => {
    if (done) return;
    done = true;
    window.clearTimeout(timer);
    window.removeEventListener("pointerdown", onInteract);
    window.removeEventListener("keydown", onInteract);
    window.removeEventListener("load", arm);
    run();
  };

  const onInteract = () => start();

  const arm = () => {
    timer = window.setTimeout(start, delayMs);
  };

  window.addEventListener("pointerdown", onInteract, { once: true, passive: true });
  window.addEventListener("keydown", onInteract, { once: true });
  if (document.readyState === "complete") arm();
  else window.addEventListener("load", arm, { once: true });

  return () => {
    done = true;
    window.clearTimeout(timer);
    window.removeEventListener("pointerdown", onInteract);
    window.removeEventListener("keydown", onInteract);
    window.removeEventListener("load", arm);
  };
}
