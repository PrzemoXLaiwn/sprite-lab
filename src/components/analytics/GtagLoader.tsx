"use client";

import { useEffect } from "react";
import { scheduleAfterPaint } from "@/lib/schedule-after-paint";

/** Downloads gtag.js after a gesture or a few seconds, so it is not on the LCP path. */
export function GtagLoader({ measurementId }: { measurementId: string }) {
  useEffect(() => scheduleAfterPaint(() => {
    const src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    if (document.querySelector(`script[src="${src}"]`)) return;
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    document.body.appendChild(script);
  }), [measurementId]);

  return null;
}
