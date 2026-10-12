"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export const ADSENSE_CLIENT = "ca-pub-3053243391231414";
const SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;

/**
 * Loads Google AdSense (Auto ads) — only for signed-out visitors and only on
 * the pages that render this component (guides, comparisons, tool landing
 * pages). The homepage, pricing and the app stay ad-free so ads never get in
 * the way of trying or buying, and members never see ads.
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
