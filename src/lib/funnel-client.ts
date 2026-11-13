"use client";

import { track } from "@/lib/analytics";
import { isFunnelEventName, type FunnelEventName } from "@/lib/funnel-events";

/** Browser funnel hit: Vercel Analytics plus a row in funnel_events. */
export function recordFunnel(name: FunnelEventName, props?: Record<string, string | number | boolean | null>): void {
  if (!isFunnelEventName(name)) return;
  track(name, props);
  if (typeof window === "undefined") return;
  void fetch("/api/analytics/funnel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, props }),
    keepalive: true,
  }).catch(() => {});
}
