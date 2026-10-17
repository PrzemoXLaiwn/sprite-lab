"use client";

import { useEffect, useState } from "react";

/**
 * Number of quest rewards ready to claim, for the nav dot. Refreshes when
 * credits change (a finished generation can complete a quest) and after a claim.
 */
export function useQuestClaimable(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = () => {
      fetch("/api/quests", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (alive && d && typeof d.claimable === "number") setCount(d.claimable); })
        .catch(() => { /* the dot is optional */ });
    };
    load();
    window.addEventListener("credits-updated", load);
    window.addEventListener("quests-updated", load);
    return () => {
      alive = false;
      window.removeEventListener("credits-updated", load);
      window.removeEventListener("quests-updated", load);
    };
  }, []);
  return count;
}
