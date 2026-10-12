// =============================================================================
// Provider costs per feature — the single source for the economics report
// =============================================================================
// status: "measured"  = average of real Runware-reported costs (n samples)
//         "derived"   = no samples for this feature; built from measured
//                       per-pass prices of the same model and size
//         "estimate"  = not measured (Claude planner / rig joints)
// Window: generations since 2026-10-09 (one Runware account). Update after the
// cost ledger has ≥14 days of data (provider_calls).
// =============================================================================

export type CostStatus = "measured" | "derived" | "estimate";

export interface FeatureCost {
  /** Mean Runware cost of a successful request, USD (retries included). */
  runwareUsd: number;
  /** Highest Runware cost the code can incur for one request, USD. */
  runwareMaxUsd: number;
  n: number;
  status: CostStatus;
  /** Claude per request, USD (estimate until the ledger has data). */
  claudeUsd: number;
  claudeMaxUsd: number;
}

const P1024 = 0.0692, P2048 = 0.1029; // measured per-pass prices (Nano Banana)

export const FEATURE_COSTS: Record<string, FeatureCost> = {
  sprite: { runwareUsd: 0.0008, runwareMaxUsd: 0.0008, n: 94, status: "measured", claudeUsd: 0, claudeMaxUsd: 0 },
  sprite_hd: { runwareUsd: 0.036, runwareMaxUsd: 0.036, n: 31, status: "measured", claudeUsd: 0, claudeMaxUsd: 0 },
  style_match: { runwareUsd: P1024, runwareMaxUsd: 2 * P1024, n: 0, status: "derived", claudeUsd: 0, claudeMaxUsd: 0 },
  edit: { runwareUsd: P1024, runwareMaxUsd: 2 * P1024, n: 0, status: "derived", claudeUsd: 0, claudeMaxUsd: 0 },
  rig: { runwareUsd: 0, runwareMaxUsd: 0, n: 9, status: "estimate", claudeUsd: 0.04, claudeMaxUsd: 0.07 },
  anim_4: { runwareUsd: 0.0692, runwareMaxUsd: 2 * P1024, n: 3, status: "measured", claudeUsd: 0.035, claudeMaxUsd: 0.05 },
  anim_6: { runwareUsd: 0.1186, runwareMaxUsd: 2 * P2048, n: 13, status: "measured", claudeUsd: 0.035, claudeMaxUsd: 0.05 },
  anim_9: { runwareUsd: P2048, runwareMaxUsd: 2 * P2048, n: 0, status: "derived", claudeUsd: 0.035, claudeMaxUsd: 0.05 },
  anim_smooth_4: { runwareUsd: 0.1419, runwareMaxUsd: 3 * P1024, n: 20, status: "measured", claudeUsd: 0.035, claudeMaxUsd: 0.05 },
  anim_smooth_6: { runwareUsd: 0.2057, runwareMaxUsd: 3 * P2048, n: 7, status: "measured", claudeUsd: 0.035, claudeMaxUsd: 0.05 },
  anim_smooth_9: { runwareUsd: 0.2057, runwareMaxUsd: 3 * P2048, n: 5, status: "measured", claudeUsd: 0.035, claudeMaxUsd: 0.05 },
  rotate4: { runwareUsd: 0.0692, runwareMaxUsd: 2 * P1024, n: 1, status: "measured", claudeUsd: 0, claudeMaxUsd: 0 },
  rotate8: { runwareUsd: P2048, runwareMaxUsd: 2 * P2048, n: 0, status: "derived", claudeUsd: 0, claudeMaxUsd: 0 },
  walk4dir: { runwareUsd: P2048 + P1024 * 0.5, runwareMaxUsd: 2 * P2048 + 2 * P1024, n: 2, status: "derived", claudeUsd: 0, claudeMaxUsd: 0 },
};

/** Share of extra spend on failed / refunded attempts (not in the success averages). */
export const FAILURE_OVERHEAD = { central: 0.15, high: 0.3 } as const;
