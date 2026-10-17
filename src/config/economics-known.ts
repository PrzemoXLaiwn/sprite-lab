// Margin violations that exist today. They are NOT accepted:
// `npm run economics` lists them as KNOWN_FAILURE and exits non-zero until the
// prices are fixed. The unit test only blocks NEW violations (regressions).
// Feature credit prices stay frozen.
//
// 2026-10-13: first audit, after the price change.
// 2026-10-17: Pro 650 and Studio 1,500 (prices unchanged). There is no ≥35%
// assertion to lower. The central bar stays at 15%. The new Pro/Studio rows
// are recorded here instead of raising feature credit prices. Shelf Studio
// is about $0.022 per credit against an expensive credit of about $0.015
// (~20% on a tight reading). The provider-cost model, especially its worst
// case, does not clear 20% on these rows.
export const KNOWN_MARGIN_VIOLATIONS: readonly string[] = [
  "style_match@STARTER",
  "style_match@STARTER+VAT",
  "edit@STARTER",
  "edit@STARTER+VAT",
  "anim_4@STARTER",
  "anim_4@STARTER+VAT",
  "anim_4@UNLIMITED+VAT",
  "anim_smooth_4@STARTER",
  "anim_smooth_4@STARTER+VAT",
  "anim_smooth_4@UNLIMITED+VAT",
  "anim_6@STARTER",
  "anim_6@STARTER+VAT",
  "anim_smooth_6@STARTER+VAT",
  "variation@STARTER",
  "variation@STARTER+VAT",
  // 2026-10-17 allowance (Pro 650, Studio 1,500). Feature prices unchanged.
  "sprite_hd@PRO+VAT",
  "sprite_hd@UNLIMITED",
  "sprite_hd@UNLIMITED+VAT",
  "style_match@PRO",
  "style_match@PRO+VAT",
  "style_match@UNLIMITED",
  "style_match@UNLIMITED+VAT",
  "edit@PRO",
  "edit@PRO+VAT",
  "edit@UNLIMITED",
  "edit@UNLIMITED+VAT",
  "rig@UNLIMITED",
  "rig@UNLIMITED+VAT",
  "anim_4@PRO",
  "anim_4@PRO+VAT",
  "anim_4@UNLIMITED",
  "anim_smooth_4@PRO",
  "anim_smooth_4@PRO+VAT",
  "anim_smooth_4@UNLIMITED",
  "anim_6@PRO",
  "anim_6@PRO+VAT",
  "anim_6@UNLIMITED",
  "anim_6@UNLIMITED+VAT",
  "anim_smooth_6@PRO",
  "anim_smooth_6@PRO+VAT",
  "anim_smooth_6@UNLIMITED",
  "anim_smooth_6@UNLIMITED+VAT",
  "anim_smooth_9@PRO+VAT",
  "anim_smooth_9@UNLIMITED",
  "anim_smooth_9@UNLIMITED+VAT",
  "rotate4@UNLIMITED+VAT",
  "walk4dir@UNLIMITED+VAT",
  "variation@PRO",
  "variation@PRO+VAT",
  "variation@UNLIMITED",
  "variation@UNLIMITED+VAT",
];
