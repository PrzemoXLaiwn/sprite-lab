// =============================================================================
// Uptime alerts — when to email the owner (pure, unit-tested)
// =============================================================================
// The health cron runs every 5 minutes. An email goes out when something
// starts failing, again every REMIND_MS while it keeps failing, and once when
// everything is back. State lives outside the database (R2), because the
// database is one of the things being checked.
// =============================================================================

export interface HealthState {
  /** Names of the checks failing at the last run (empty = all fine). */
  failing: string[];
  /** When the current outage started (ISO), null when healthy. */
  since: string | null;
  /** Last alert email (ISO). */
  lastAlertAt: string | null;
}

export const HEALTHY: HealthState = { failing: [], since: null, lastAlertAt: null };

export const REMIND_MS = 6 * 60 * 60 * 1000;

export type AlertKind = "down" | "still-down" | "recovered" | null;

export function nextHealthState(prev: HealthState, failing: string[], now: Date): { state: HealthState; alert: AlertKind } {
  const iso = now.toISOString();
  if (failing.length === 0) {
    if (prev.failing.length === 0) return { state: HEALTHY, alert: null };
    return { state: HEALTHY, alert: prev.lastAlertAt ? "recovered" : null };
  }
  const since = prev.failing.length ? prev.since ?? iso : iso;
  const changed = failing.some((f) => !prev.failing.includes(f));
  if (!prev.lastAlertAt || prev.failing.length === 0 || changed) {
    return { state: { failing, since, lastAlertAt: iso }, alert: "down" };
  }
  if (now.getTime() - new Date(prev.lastAlertAt).getTime() >= REMIND_MS) {
    return { state: { failing, since, lastAlertAt: iso }, alert: "still-down" };
  }
  return { state: { failing, since, lastAlertAt: prev.lastAlertAt }, alert: null };
}

/** True when the page looks like the real home page (not an error shell). */
export function homeLooksHealthy(status: number, html: string): boolean {
  return status === 200 && /<h1[\s>]/i.test(html);
}
