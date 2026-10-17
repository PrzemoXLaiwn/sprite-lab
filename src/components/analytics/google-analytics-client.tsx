"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

let lastTrackedPath: string | null = null;

/**
 * GA4 page views for the first load and for App Router navigations.
 * `send_page_view` is false on config, so this is the only page_view.
 * Calls queue on the consent stub if gtag.js has not downloaded yet.
 */
export function GoogleAnalyticsPageViews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    const pagePath = query ? `${pathname}?${query}` : pathname;
    let attempts = 0;
    let timer = 0;

    const send = () => {
      if (lastTrackedPath === pagePath) return;
      // The consent stub defines gtag before hydration. Retry briefly in case
      // this effect runs first; the call queues until gtag.js loads on idle.
      if (typeof window.gtag !== "function") {
        if (attempts < 20) {
          attempts += 1;
          timer = window.setTimeout(send, 100);
        }
        return;
      }
      lastTrackedPath = pagePath;
      window.gtag("event", "page_view", {
        page_path: pagePath,
        page_location: window.location.href,
        page_title: document.title,
      });
    };

    send();
    return () => window.clearTimeout(timer);
  }, [pathname, searchParams]);

  return null;
}
