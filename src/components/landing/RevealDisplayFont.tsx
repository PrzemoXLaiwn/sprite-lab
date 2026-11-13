"use client";

import { useEffect } from "react";
import { scheduleAfterPaint } from "@/lib/schedule-after-paint";

/**
 * The homepage headline is the LCP element. Tektur is applied after first
 * paint so a slow font file cannot hold that paint. Other pages use it
 * immediately; they are not the measured path.
 */
export function RevealDisplayFont() {
  useEffect(() => scheduleAfterPaint(() => {
    document.querySelector("main.sl-plain-display")?.classList.add("sl-display-font");
  }), []);
  return null;
}
