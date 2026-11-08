"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AD_IGNORE_SELECTOR, adsAllowed, countWords, isAdPath } from "@/lib/ads-policy";
import { MEASUREMENT_CHOICE_CHANGED, MEASUREMENT_CHOICE_KEY, mayLoadAds, parseMeasurementChoice, readCountryCookie } from "@/lib/analytics/consent";

export const ADSENSE_CLIENT = "ca-pub-3053243391231414";
const SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;

/** Words of the page's main text: <main> without nav, footer, CTAs and link lists. */
function mainTextWords(): number {
  const main = document.querySelector("main");
  if (!main) return 0;
  const copy = main.cloneNode(true) as HTMLElement;
  copy.querySelectorAll(AD_IGNORE_SELECTOR).forEach((el) => el.remove());
  return countWords(copy.textContent ?? "");
}

/**
 * Loads Google AdSense (Auto ads). Rendered by the guides and compare
 * layouts; it loads the script only when all three rules in
 * src/lib/ads-policy.ts hold: the page is a guide article or a comparison,
 * the visitor is signed out, and the main text is at least 800 words. Tool
 * landing pages, the guides index, the homepage, pricing, community, legal
 * pages and the app never load it (docs/adsense-content-audit.md).
 */
export function AdSense() {
  const pathname = usePathname();
  const [choiceTick, setChoiceTick] = useState(0);

  useEffect(() => {
    const onChoice = () => setChoiceTick((n) => n + 1);
    window.addEventListener(MEASUREMENT_CHOICE_CHANGED, onChoice);
    return () => window.removeEventListener(MEASUREMENT_CHOICE_CHANGED, onChoice);
  }, []);

  useEffect(() => {
    if (!isAdPath(pathname)) return;
    let cancelled = false;
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        if (cancelled) return;
        const country = readCountryCookie(document.cookie);
        const choice = parseMeasurementChoice(localStorage.getItem(MEASUREMENT_CHOICE_KEY));
        if (!mayLoadAds({
          adsSlotAllowed: adsAllowed({ pathname, signedIn: Boolean(data.session), mainWords: mainTextWords() }),
          choice,
          country,
        })) return;
        if (document.querySelector(`script[src^="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]`)) return;
        const s = document.createElement("script");
        s.async = true;
        s.src = SRC;
        s.crossOrigin = "anonymous";
        document.head.appendChild(s);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname, choiceTick]);

  return null;
}
