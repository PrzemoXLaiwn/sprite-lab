"use client";

import { useEffect } from "react";

/**
 * Keeps a referral code from the URL (?ref=CODE) for the sign-up page, which
 * reads it back from sessionStorage. Lets the home page stay static.
 */
export function RefCapture() {
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref && /^[A-Za-z0-9_-]{1,32}$/.test(ref)) sessionStorage.setItem("referralCode", ref.toUpperCase());
    } catch {
      // Storage blocked (private mode): the link still works, just without the referral
    }
  }, []);
  return null;
}
