"use client";

import { useEffect } from "react";
import { flushHeldPurchases } from "@/lib/analytics/purchase";

/** Retry a confirmed receipt if gtag was not ready on the first call. */
export function useFlushHeldPurchases() {
  useEffect(() => {
    let attempts = 0;
    const run = () => {
      attempts += 1;
      flushHeldPurchases();
    };
    run();
    const timer = window.setInterval(() => {
      if (attempts >= 10) {
        window.clearInterval(timer);
        return;
      }
      run();
    }, 500);
    return () => window.clearInterval(timer);
  }, []);
}
