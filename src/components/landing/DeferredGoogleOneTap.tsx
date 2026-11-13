"use client";

import { useEffect, useState } from "react";
import { scheduleAfterPaint } from "@/lib/schedule-after-paint";

const SMALL_SCREEN_QUERY = "(max-width: 767px)";

/**
 * Loads the One Tap module (and its Supabase client) off the first paint.
 * Phones wait for a gesture, matching the prompt itself. Wider screens arm it
 * a few seconds after load.
 */
export function DeferredGoogleOneTap() {
  const [OneTap, setOneTap] = useState<typeof import("./GoogleOneTap").GoogleOneTap | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void import("./GoogleOneTap").then((mod) => {
        if (!cancelled) setOneTap(() => mod.GoogleOneTap);
      });
    };
    const small = window.matchMedia(SMALL_SCREEN_QUERY).matches;
    if (small) {
      const onInteract = () => load();
      window.addEventListener("pointerdown", onInteract, { once: true, passive: true });
      window.addEventListener("keydown", onInteract, { once: true });
      return () => {
        cancelled = true;
        window.removeEventListener("pointerdown", onInteract);
        window.removeEventListener("keydown", onInteract);
      };
    }
    return scheduleAfterPaint(load);
  }, []);

  if (!OneTap) return null;
  return <OneTap loadNow />;
}
