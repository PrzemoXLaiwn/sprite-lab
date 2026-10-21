"use client";

import { useEffect } from "react";
import { FIRST_TOUCH_KEY, classifyFirstTouch, parseStoredFirstTouch } from "@/lib/attribution";

/**
 * Remembers where this browser first came from (source bucket, UTM medium /
 * campaign, referrer host, landing path) so the sign-up can be attributed.
 * The first touch is kept for 30 days and never overwritten inside that time.
 */
export function FirstTouch() {
  useEffect(() => {
    try {
      if (parseStoredFirstTouch(window.localStorage.getItem(FIRST_TOUCH_KEY))) return;
      const touch = classifyFirstTouch({
        search: window.location.search,
        referrer: document.referrer,
        pathname: window.location.pathname,
        ownHost: window.location.hostname,
      });
      window.localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify({ at: Date.now(), ...touch }));
    } catch { /* storage blocked: no attribution, nothing else changes */ }
  }, []);
  return null;
}

/** The stored first touch, or null (blocked storage, expired, none). */
export function readFirstTouch() {
  try { return parseStoredFirstTouch(window.localStorage.getItem(FIRST_TOUCH_KEY)); } catch { return null; }
}
