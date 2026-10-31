"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const SESSION_KEY = "sl:landing-view";

/** One landing_view per browser session, with utm and referrer, on the homepage. */
export function FunnelBeacon() {
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    if (pathname !== "/") return;
    try {
      if (window.sessionStorage.getItem(SESSION_KEY)) return;
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* storage blocked — still send once from this effect */
    }
    const query = search.toString();
    void fetch("/api/analytics/funnel", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        name: "landing_view",
        path: "/",
        referrer: document.referrer,
        search: query ? `?${query}` : "",
      }),
    }).catch(() => undefined);
  }, [pathname, search]);

  return null;
}
