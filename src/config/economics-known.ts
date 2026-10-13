// Margin violations that exist today (audit 2026-10-13, after the price change). They are NOT accepted:
// `npm run economics` lists them as KNOWN_FAILURE and exits non-zero until the
// prices are fixed. The unit test only blocks NEW violations (regressions).
// Prices stay frozen until the cost ledger has ≥14 days of real data.
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
];
