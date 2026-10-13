"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export const ADSENSE_CLIENT = "ca-pub-3053243391231414";
const SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;

/**
 * Loads Google AdSense (Auto ads) — only for signed-out visitors and only on
 * the pages that render this component: long-form guide articles
 * (guides/[slug]) and comparisons (compare layout). Tool landing pages, the
 * guides index, the homepage, pricing, legal pages and the app stay ad-free —
 * ads belong next to substantial original text, never on thin or transactional
 * pages (docs/adsense-content-audit.md). Members never see ads.
 */
export function AdSense() {
  useEffect(() => {
    let cancelled = false;
    createClient().auth.getSession().then(({ data }) => {
      if (cancelled || data.session) return;
      if (document.querySelector(`script[src^="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]`)) return;
      const s = document.createElement("script");
      s.async = true;
      s.src = SRC;
      s.crossOrigin = "anonymous";
      document.head.appendChild(s);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  return null;
}
