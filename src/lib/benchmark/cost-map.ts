// =============================================================================
// Provider cost vs credit refunds — derived from the same constants the
// routes use. List prices, not a new invoice. See scripts/benchmark/REPORT.md.
// =============================================================================

import { ANIMATION_FRAME_OPTIONS, RIG_CREDITS, ROTATIONS, animationCredits } from "@/config/animations";
import { FEATURE_COSTS } from "@/config/provider-costs";
import { MODELS_3D } from "@/config/styles/styles-3d";
import { EDIT_CREDITS, REMOVE_BG_CREDITS, STYLE_MATCH_CREDITS, VARIATION_CREDITS, upscaleCredits } from "@/config/tool-prices";
import { FEATURES, PRICE } from "@/lib/billing/features";
import { CREDIT_COSTS } from "@/lib/services/generation";

const INTERPRET = FEATURE_COSTS.sprite.claudeUsd;

export interface MoneyRange {
  min: number;
  max: number;
}

export interface CostScenario {
  id: string;
  operation: string;
  /** Credits taken before the call. 0 = nothing was charged. */
  creditsCharged: number;
  /** Credits given back. Equal to charged means a full refund. */
  creditsRefunded: number;
  /**
   * Provider USD that can already have been billed when the refund (or the
   * decision not to refund) happens. min is the explicit-API-error path
   * (Runware logs estCost 0). max includes timeouts, which keep the list price
   * because the task may have run.
   */
  providerUsd: MoneyRange;
  /** True when provider USD can be > 0 even though the user got credits back. */
  providerCostSurvivesRefund: boolean;
  where: string;
}

const range = (min: number, max: number): MoneyRange => ({ min, max });

const anim4 = ANIMATION_FRAME_OPTIONS[0];
const anim6 = ANIMATION_FRAME_OPTIONS[1];
const anim9 = ANIMATION_FRAME_OPTIONS[2];
const rotate4 = ROTATIONS[0];
const rotate8 = ROTATIONS[1];
const walk4 = ROTATIONS[2];

/**
 * Every row is a real branch in the current code. Amounts are list prices
 * from PRICE / FEATURE_COSTS / the credit constants — not re-measured here.
 */
export function costScenarios(): CostScenario[] {
  const model3dCredits = MODELS_3D.map((m) => m.credits);
  return [
    {
      id: "guard_refuse",
      operation: "any expensive feature",
      creditsCharged: 0,
      creditsRefunded: 0,
      providerUsd: range(0, 0),
      providerCostSurvivesRefund: false,
      where: "startOperation returns before store.open when a guard refuses (operations.ts)",
    },
    {
      id: "sprite_fail_explicit",
      operation: "sprite standard",
      creditsCharged: CREDIT_COSTS.normal,
      creditsRefunded: CREDIT_COSTS.normal,
      // Interpret runs before the image call. An explicit Runware error logs
      // estCost 0 for the image; a timeout logs the list price.
      providerUsd: range(INTERPRET, INTERPRET + PRICE.standard),
      providerCostSurvivesRefund: true,
      where: "generateSingle2D throws, generateSingle pipeline op.fail (generation.ts)",
    },
    {
      id: "sprite_hd_timeout_then_standard",
      operation: "sprite HD downgraded to standard",
      creditsCharged: CREDIT_COSTS.hd,
      creditsRefunded: CREDIT_COSTS.hd - CREDIT_COSTS.normal,
      providerUsd: range(INTERPRET + PRICE.hd + PRICE.standard, INTERPRET + PRICE.hd + PRICE.standard),
      providerCostSurvivesRefund: true,
      where: "generateSpriteImage HD timeout (list price kept) then standard retry; op.refund of the difference",
    },
    {
      id: "sprite_hd_both_fail",
      operation: "sprite HD",
      creditsCharged: CREDIT_COSTS.hd,
      creditsRefunded: CREDIT_COSTS.hd,
      providerUsd: range(INTERPRET, INTERPRET + PRICE.hd + PRICE.standard),
      providerCostSurvivesRefund: true,
      where: "both provider attempts throw; op.fail refunds 3. Timeouts bill both list prices",
    },
    {
      id: "style_match_fail_then_standard",
      operation: "style match",
      creditsCharged: STYLE_MATCH_CREDITS,
      creditsRefunded: STYLE_MATCH_CREDITS - CREDIT_COSTS.normal,
      providerUsd: range(PRICE.standard, PRICE.grid1024 * 2 + PRICE.standard),
      providerCostSurvivesRefund: true,
      where: "generateAnimationGrid throws (moderation retry may already have spent a second grid) then standard sprite; extra credits refunded",
    },
    {
      id: "upload_fail_after_image",
      operation: "sprite (any model)",
      creditsCharged: CREDIT_COSTS.hd,
      creditsRefunded: CREDIT_COSTS.hd,
      providerUsd: range(PRICE.hd, PRICE.hd + PRICE.removeBg),
      providerCostSurvivesRefund: true,
      where: "uploadGenerationBufferToR2 throws inside generateSingle2D, which is inside the try that calls op.fail. The case-C comment above that try does not cover upload",
    },
    {
      id: "db_save_fail",
      operation: "sprite",
      creditsCharged: CREDIT_COSTS.normal,
      creditsRefunded: 0,
      providerUsd: range(PRICE.standard, PRICE.standard + PRICE.removeBg),
      providerCostSurvivesRefund: false,
      where: "saveGeneratedAssets swallows DB errors and does not refund. User keeps the charge; gallery row may be missing",
    },
    {
      id: "bg_fallback_on_success",
      operation: "sprite whose keying failed",
      creditsCharged: CREDIT_COSTS.normal,
      creditsRefunded: 0,
      providerUsd: range(PRICE.standard + PRICE.removeBg, PRICE.standard + PRICE.removeBg),
      providerCostSurvivesRefund: false,
      where: "removeBackgroundFromBuffer inside generateSingle2D. Extra provider call, no extra credits, no refund",
    },
    {
      id: "cloudflare_after_runware_timeout",
      operation: "sprite standard via Cloudflare fallback",
      creditsCharged: CREDIT_COSTS.normal,
      creditsRefunded: 0,
      providerUsd: range(PRICE.standard, PRICE.standard),
      providerCostSurvivesRefund: false,
      where: "generateSpriteImage catches Runware (timeout logged at list price) and returns a $0 Cloudflare image. User pays 1 credit",
    },
    {
      id: "guest_sprite",
      operation: "guest sprite",
      creditsCharged: 0,
      creditsRefunded: 0,
      providerUsd: range(0, PRICE.standard),
      providerCostSurvivesRefund: false,
      where: "generateGuestAsset charges nothing. Runware klein list price, or $0 if Cloudflare served it",
    },
    {
      id: "anim4_fail_after_grid",
      operation: "animation 4 frames",
      creditsCharged: anim4.credits,
      creditsRefunded: anim4.credits,
      providerUsd: range(0, PRICE.claudePlan + PRICE.grid1024 * 2),
      providerCostSurvivesRefund: true,
      where: "makeAnimation throws; animate route op.fail. Cap is 2 grids (redraw) plus planner. Moderation retry is inside each grid call",
    },
    {
      id: "anim6_fail",
      operation: "animation 6 frames",
      creditsCharged: anim6.credits,
      creditsRefunded: anim6.credits,
      providerUsd: range(0, PRICE.claudePlan + PRICE.grid2048 * 2),
      providerCostSurvivesRefund: true,
      where: "same as 4 frames, 2048 sheet",
    },
    {
      id: "anim9_fail",
      operation: "animation 9 frames",
      creditsCharged: anim9.credits,
      creditsRefunded: anim9.credits,
      providerUsd: range(0, PRICE.claudePlan + PRICE.grid2048 * 2),
      providerCostSurvivesRefund: true,
      where: "same as 6 frames",
    },
    {
      id: "anim_smooth4_partial",
      operation: "animation 4 frames smooth skipped",
      creditsCharged: animationCredits(4, true),
      creditsRefunded: animationCredits(4, true) - anim4.credits,
      providerUsd: range(PRICE.grid1024, PRICE.claudePlan + PRICE.grid1024 * 3),
      providerCostSurvivesRefund: true,
      where: "in-between grid was paid (or the cap/time skip refunds without a second grid — min is one key grid). op.refund(smoothExtra)",
    },
    {
      id: "anim_smooth6_partial",
      operation: "animation 6 frames smooth skipped",
      creditsCharged: animationCredits(6, true),
      creditsRefunded: animationCredits(6, true) - anim6.credits,
      providerUsd: range(PRICE.grid2048, PRICE.claudePlan + PRICE.grid2048 * 3),
      providerCostSurvivesRefund: true,
      where: "key sheet is 2048; in-between reference is 1024 but the model pass uses gridFor(6) which is 2048. Max counts planner + 2 key attempts + in-between",
    },
    {
      id: "anim_bad_frames_shipped",
      operation: "animation key frames that failed QA",
      creditsCharged: anim6.credits,
      creditsRefunded: 0,
      providerUsd: range(PRICE.grid2048, PRICE.claudePlan + PRICE.grid2048 * 2),
      providerCostSurvivesRefund: false,
      where: "makeAnimation assembles anyway when framesLookRight stays false. Unlike rotations, this does not throw and does not refund",
    },
    {
      id: "rotate4_fail",
      operation: "4 directions",
      creditsCharged: rotate4.credits,
      creditsRefunded: rotate4.credits,
      providerUsd: range(0, PRICE.grid1024 * 2),
      providerCostSurvivesRefund: true,
      where: "makeRotation throws if views are short or sliced; route op.fail",
    },
    {
      id: "rotate8_fail",
      operation: "8 directions",
      creditsCharged: rotate8.credits,
      creditsRefunded: rotate8.credits,
      providerUsd: range(0, PRICE.grid2048 * 2),
      providerCostSurvivesRefund: true,
      where: "2048 sheet, one redraw allowed inside the cap",
    },
    {
      id: "walk4_delivered_with_redraw",
      operation: "4-direction walk",
      creditsCharged: walk4.credits,
      creditsRefunded: 0,
      providerUsd: range(PRICE.grid2048, PRICE.grid2048 * 2 + PRICE.grid1024 * 2),
      providerCostSurvivesRefund: false,
      where: "frozen rows are redrawn at 1024 and the stiff row is kept if the redraw loses. User pays the full 12 either way. Left row is a mirror, not a fourth model pass",
    },
    {
      id: "walk4_fail",
      operation: "4-direction walk",
      creditsCharged: walk4.credits,
      creditsRefunded: walk4.credits,
      providerUsd: range(0, PRICE.grid2048 * 2 + PRICE.grid1024 * 2),
      providerCostSurvivesRefund: true,
      where: "throw before assemble (short or sliced sheet); redraws that already returned are still billed",
    },
    {
      id: "rig_fail",
      operation: "rig",
      creditsCharged: RIG_CREDITS,
      creditsRefunded: RIG_CREDITS,
      providerUsd: range(0, PRICE.claudeRig),
      providerCostSurvivesRefund: true,
      where: "findRigPoints runs before a throw; route op.fail. No Runware image",
    },
    {
      id: "rig_cancel_then_ai_walk",
      operation: "pixel walk rig fallback",
      creditsCharged: RIG_CREDITS,
      creditsRefunded: RIG_CREDITS,
      providerUsd: range(0, PRICE.claudeRig),
      providerCostSurvivesRefund: true,
      where: "makeSkeletonAnimation can call Claude and return null. op.cancel refunds the rig. A second operation then charges animation credits and calls Nano Banana",
    },
    {
      id: "edit_fail",
      operation: "brush edit",
      creditsCharged: EDIT_CREDITS,
      creditsRefunded: EDIT_CREDITS,
      providerUsd: range(0, PRICE.grid1024 * 2),
      providerCostSurvivesRefund: true,
      where: "editSprite uses generateAnimationGrid (moderation retry can double it). Route op.fail",
    },
    {
      id: "remove_bg_fail",
      operation: "remove background",
      creditsCharged: REMOVE_BG_CREDITS,
      creditsRefunded: REMOVE_BG_CREDITS,
      providerUsd: range(0, PRICE.removeBg),
      providerCostSurvivesRefund: true,
      where: "timeout logs list price; explicit error logs 0. op.fail",
    },
    {
      id: "upscale_fail",
      operation: "AI upscale 4x",
      creditsCharged: upscaleCredits(4),
      creditsRefunded: upscaleCredits(4),
      providerUsd: range(0, PRICE.upscale),
      providerCostSurvivesRefund: true,
      where: "pixel nearest-neighbour upscale is 0 credits and does not call Runware. AI path op.fail",
    },
    {
      id: "variation_partial",
      operation: "variations",
      creditsCharged: VARIATION_CREDITS * 4,
      creditsRefunded: VARIATION_CREDITS,
      providerUsd: range(0, PRICE.fluxPro * 4),
      providerCostSurvivesRefund: true,
      where: "Replicate flux-1.1-pro. Undelivered images are refunded per image; a cancelled prediction may already have been billed",
    },
    {
      id: "model_3d_fail",
      operation: "image to 3D",
      creditsCharged: Math.max(...model3dCredits),
      creditsRefunded: Math.max(...model3dCredits),
      providerUsd: range(0, (PRICE.replicateRef + PRICE.replicate3d) * 2),
      providerCostSurvivesRefund: true,
      where: "reference image plus mesh, one retry of each inside the cap. Credits are 4 or 5 by model (MODELS_3D). Refund on failure does not unwind Replicate",
    },
    {
      id: "hard_timeout_no_catch",
      operation: "animation route maxDuration 300s",
      creditsCharged: animationCredits(6, true),
      creditsRefunded: 0,
      providerUsd: range(PRICE.grid2048, FEATURES.anim_smooth_6.capUsd),
      providerCostSurvivesRefund: false,
      where: "If the function is killed before op.fail, credits stay charged and the provider calls already made are billed. The redraw budget exists to avoid this; it is not a guarantee",
    },
  ];
}

/** Scenarios where a refund can leave us paying the provider. */
export function refundsThatStillCost(): CostScenario[] {
  return costScenarios().filter((s) => s.creditsRefunded > 0 && s.providerCostSurvivesRefund && s.providerUsd.max > 0);
}

export interface LiveCall {
  id: string;
  model: string;
  listUsd: number;
}

/** One cheap sprite and one 1024 animation grid. Together about $0.07. */
export function defaultLiveCatalog(): LiveCall[] {
  return [
    { id: "sprite-klein", model: "runware:400@2", listUsd: PRICE.standard },
    { id: "grid-1024", model: "google:4@3", listUsd: PRICE.grid1024 },
  ];
}

export const LIVE_SPEND_CAP_USD = 3;

export function selectUnderCap(calls: LiveCall[], capUsd = LIVE_SPEND_CAP_USD): { selected: LiveCall[]; skipped: LiveCall[]; totalUsd: number } {
  const selected: LiveCall[] = [];
  const skipped: LiveCall[] = [];
  let totalUsd = 0;
  for (const call of calls) {
    if (call.listUsd < 0 || !Number.isFinite(call.listUsd)) {
      skipped.push(call);
      continue;
    }
    if (totalUsd + call.listUsd <= capUsd + 1e-9) {
      selected.push(call);
      totalUsd += call.listUsd;
    } else {
      skipped.push(call);
    }
  }
  return { selected, skipped, totalUsd };
}
