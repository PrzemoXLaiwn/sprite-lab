// =============================================================================
// Paid features — what one operation may cost us (worst case) and may spend
// =============================================================================
// estCostUsd  reservation counted by the daily spend guard while the operation
//             runs, and its cost when the ledger has no rows for it (a missing
//             row never means "free").
// capUsd      provider spend allowed inside one operation: redraws and extra
//             passes stop when the next call would cross it.
// expensive   gated by the daily budget, the failure cap and the free-tier cap.
//
// Per-call prices are list prices seen in Runware responses (Oct 2026):
// Nano Banana 1024 $0.0692, 2048 $0.1029, GPT Image Mini $0.036, FLUX.2 klein
// $0.0008; Claude planner/rig ≈ $0.02–0.07 (estimate until the ledger has data).
// =============================================================================

export const PRICE = {
  grid1024: 0.0692,
  grid2048: 0.1029,
  hd: 0.036,
  standard: 0.0008,
  claudePlan: 0.05,
  claudeRig: 0.07,
} as const;

export interface FeatureSpec {
  estCostUsd: number;
  capUsd: number;
  expensive: boolean;
}

const spec = (estCostUsd: number, capUsd: number, expensive = true): FeatureSpec => ({ estCostUsd, capUsd, expensive });

export const FEATURES = {
  sprite: spec(0.002, 0.01, false),
  sprite_hd: spec(PRICE.hd * 2, PRICE.hd * 2),
  style_match: spec(PRICE.grid1024 * 2, PRICE.grid1024 * 2),
  edit: spec(PRICE.grid1024 * 2, PRICE.grid1024 * 2),
  rig: spec(PRICE.claudeRig, PRICE.claudeRig * 1.5),
  // key frames: one pass + one redraw; smooth adds the in-between pass
  anim_4: spec(PRICE.grid1024 * 2 + PRICE.claudePlan, PRICE.grid1024 * 2 + PRICE.claudePlan),
  anim_6: spec(PRICE.grid2048 * 2 + PRICE.claudePlan, PRICE.grid2048 * 2 + PRICE.claudePlan),
  anim_9: spec(PRICE.grid2048 * 2 + PRICE.claudePlan, PRICE.grid2048 * 2 + PRICE.claudePlan),
  anim_smooth_4: spec(PRICE.grid1024 * 3 + PRICE.claudePlan, PRICE.grid1024 * 3 + PRICE.claudePlan),
  anim_smooth_6: spec(PRICE.grid2048 * 3 + PRICE.claudePlan, PRICE.grid2048 * 3 + PRICE.claudePlan),
  anim_smooth_9: spec(PRICE.grid2048 * 3 + PRICE.claudePlan, PRICE.grid2048 * 3 + PRICE.claudePlan),
  tile_anim: spec(PRICE.grid2048, PRICE.grid2048),
  rotate4: spec(PRICE.grid1024 * 2, PRICE.grid1024 * 2),
  rotate8: spec(PRICE.grid2048 * 2, PRICE.grid2048 * 2),
  // main sheet (+1 redraw) and up to two frozen rows redrawn
  walk4dir: spec(PRICE.grid2048 * 2 + PRICE.grid1024 * 2, PRICE.grid2048 * 2 + PRICE.grid1024 * 2),
} satisfies Record<string, FeatureSpec>;

export type FeatureKey = keyof typeof FEATURES;

export function animationFeature(frames: number, smooth: boolean): FeatureKey {
  const n = frames >= 9 ? 9 : frames >= 6 ? 6 : 4;
  return (smooth ? `anim_smooth_${n}` : `anim_${n}`) as FeatureKey;
}

/** Spend guard limits (USD per UTC day). Defaults are deliberately low; override with env. */
export function spendLimits() {
  const num = (v: string | undefined, d: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : d;
  };
  return {
    daily: num(process.env.DAILY_SPEND_LIMIT_USD, 20),
    freeDaily: num(process.env.FREE_DAILY_SPEND_LIMIT_USD, 4),
  };
}

/** Per-user / per-network limits (rolling hour). */
export const LIMITS = {
  opsPerHour: 30,
  failedPerHour: 3,
  sameInputFailures: 2,
  failedPerIpPerHour: 6,
} as const;
