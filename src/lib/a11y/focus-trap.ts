/** Next index when Tab wraps inside a dialog. Count is the number of focusable controls. */
export function trapIndex(current: number, count: number, shift: boolean): number {
  if (count <= 1) return 0;
  if (shift) return current <= 0 ? count - 1 : current - 1;
  return current >= count - 1 ? 0 : current + 1;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Keep Tab inside `root`. No-op for other keys. */
export function trapTabKey(root: HTMLElement, event: { key: string; shiftKey: boolean; preventDefault: () => void }): void {
  if (event.key !== "Tab") return;
  const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
  if (items.length === 0) return;
  const index = items.indexOf(document.activeElement as HTMLElement);
  const next = items[trapIndex(index, items.length, event.shiftKey)];
  if (!next || (index >= 0 && next === items[index] && items.length === 1)) {
    event.preventDefault();
    items[0]?.focus();
    return;
  }
  // Only wrap at the ends. A Tab in the middle is the browser's job.
  const atStart = index <= 0 && event.shiftKey;
  const atEnd = index === items.length - 1 && !event.shiftKey;
  const outside = index === -1;
  if (atStart || atEnd || outside) {
    event.preventDefault();
    next.focus();
  }
}
