// ===========================================
// Legacy ID redirect maps
// ===========================================
// Old-system style and category IDs → new-system IDs (or LEGACY_ONLY).
//
// The OLD_*_IDS arrays below are frozen: they enumerate every distinct value
// observed in the production `generations` table audit (1113 rows, 23 unique
// styles, 28 unique categories). The legacy `generations` table is read-only
// post-rebuild, so these lists do not grow.
//
// Decision rule: only map when two values UNAMBIGUOUSLY represent the same
// concept (same-name different-casing, known renames). Anything uncertain
// maps to LEGACY_ONLY — better to hide the regen button than regen under
// the wrong style/category.
//
// Redirect semantics:
//   - Legacy-asset RENDER: legacy rows store pre-redirect IDs verbatim; the
//     UI calls resolveLegacyStyleId / resolveLegacyCategoryId to get the
//     canonical new ID for display or null if retired/unknown.
//   - REGENERATE-from-legacy: if the redirect resolves to a real new ID, the
//     regen button pre-selects that ID. If null (LEGACY_ONLY or unknown),
//     hide the regen button.
//   - NEW generations: never consult these maps.
//
// Drift protection: the `Record<OldStyleId, …>` and `Record<OldCategoryId, …>`
// types are compile-time exhaustive — adding a new OLD_*_IDS entry without a
// mapping fails the build. No runtime self-check is needed now that the
// frozen arrays replace the retired-enum source of truth.

export const LEGACY_ONLY = "__LEGACY_ONLY__" as const;
export type LegacyOnly = typeof LEGACY_ONLY;

// --- Old IDs (frozen from the 2026-04 prod DB audit) ------------------------

export const OLD_STYLE_IDS = [
  // Pixel 16 — three casings of the same concept
  "PIXEL_ART_16",
  "pixel_art_16",
  "pixel-16",
  // Pixel 32 — three casings of the same concept
  "PIXEL_ART_32",
  "pixel_art_32",
  "pixel-32",
  // Hand-painted / HD
  "HAND_PAINTED",
  "REALISTIC_PAINTED",
  "realistic_painted",
  // Isometric variants collapsed into one
  "ISOMETRIC",
  "ISOMETRIC_PIXEL",
  // Retired styles (no new-spec equivalent)
  "VECTOR_CLEAN",
  "ANIME_GAME",
  "CHIBI_CUTE",
  "CARTOON_WESTERN",
  "DARK_SOULS",
  "ISOMETRIC_CARTOON",
  // Standalone lowercase/unlabeled variants — too ambiguous to map
  "cartoon",
  "realistic",
  "anime",
  "painted",
  "vector",
  // 3D output stored in 2D table — retired
  "3D_RODIN",
] as const;
export type OldStyleId = (typeof OLD_STYLE_IDS)[number];

export const OLD_CATEGORY_IDS = [
  // Characters
  "CHARACTERS",
  "characters",
  // Creatures → enemy
  "CREATURES",
  "creatures",
  // Weapons
  "WEAPONS",
  "weapons",
  // Armor → item
  "ARMOR",
  "armor",
  // Consumables → item
  "CONSUMABLES",
  "consumables",
  // Resources / quest items / generic items → item
  "RESOURCES",
  "QUEST_ITEMS",
  "quest_items",
  "items",
  // Environment / buildings → environment_prop
  "ENVIRONMENT",
  "environment",
  "buildings",
  // Tilesets
  "TILESETS",
  "tilesets",
  // UI
  "UI_ELEMENTS",
  "ui_elements",
  "ui",
  // Effects / projectiles → vfx
  "EFFECTS",
  "effects",
  "projectiles",
  // Uncertain — retired
  "spritesheets",
  "vehicles",
  "ISOMETRIC",
] as const;
export type OldCategoryId = (typeof OLD_CATEGORY_IDS)[number];

// --- Redirect maps (exhaustive over the unions above) -----------------------

export const LEGACY_STYLE_REDIRECTS: Record<OldStyleId, string | LegacyOnly> = {
  PIXEL_ART_16:      "pixel_16bit_snes",
  pixel_art_16:      "pixel_16bit_snes",
  "pixel-16":        "pixel_16bit_snes",
  PIXEL_ART_32:      "pixel_32bit",
  pixel_art_32:      "pixel_32bit",
  "pixel-32":        "pixel_32bit",
  HAND_PAINTED:      "hd_hand_painted",
  REALISTIC_PAINTED: "hd_hand_painted",
  realistic_painted: "hd_hand_painted",
  ISOMETRIC:         "isometric",
  ISOMETRIC_PIXEL:   "isometric",
  VECTOR_CLEAN:      LEGACY_ONLY,
  ANIME_GAME:        LEGACY_ONLY,
  CHIBI_CUTE:        LEGACY_ONLY,
  CARTOON_WESTERN:   LEGACY_ONLY,
  DARK_SOULS:        LEGACY_ONLY,
  ISOMETRIC_CARTOON: LEGACY_ONLY,
  cartoon:           LEGACY_ONLY,
  realistic:         LEGACY_ONLY,
  anime:             LEGACY_ONLY,
  painted:           LEGACY_ONLY,
  vector:            LEGACY_ONLY,
  "3D_RODIN":        LEGACY_ONLY,
};

export const LEGACY_CATEGORY_REDIRECTS: Record<OldCategoryId, string | LegacyOnly> = {
  CHARACTERS:   "character",
  characters:   "character",
  CREATURES:    "enemy",
  creatures:    "enemy",
  WEAPONS:      "weapon",
  weapons:      "weapon",
  ARMOR:        "item",
  armor:        "item",
  CONSUMABLES:  "item",
  consumables:  "item",
  RESOURCES:    "item",
  QUEST_ITEMS:  "item",
  quest_items:  "item",
  items:        "item",
  ENVIRONMENT:  "environment_prop",
  environment:  "environment_prop",
  buildings:    "environment_prop",
  TILESETS:     "tile",
  tilesets:     "tile",
  UI_ELEMENTS:  "ui_icon",
  ui_elements:  "ui_icon",
  ui:           "ui_icon",
  EFFECTS:      "vfx",
  effects:      "vfx",
  projectiles:  "vfx",
  spritesheets: LEGACY_ONLY, // multi-frame outputs — no single new-spec category
  vehicles:     LEGACY_ONLY, // no new-spec category for vehicles
  ISOMETRIC:    LEGACY_ONLY, // was a cross-style category, retired
};

// --- Public helpers ---------------------------------------------------------

/**
 * Resolve an old style ID to its new canonical ID.
 *
 * @returns new-system ID, or `null` if the old ID is retired OR unknown.
 *          Callers MUST handle null — see FOLLOWUP.md "Legacy UI contracts".
 *          On null, render with fallback label "Legacy / Unknown" and disable
 *          regenerate/variation actions.
 */
export function resolveLegacyStyleId(oldId: string): string | null {
  if (!(oldId in LEGACY_STYLE_REDIRECTS)) return null;
  const mapped = LEGACY_STYLE_REDIRECTS[oldId as OldStyleId];
  return mapped === LEGACY_ONLY ? null : mapped;
}

/**
 * Resolve an old category ID to its new canonical ID.
 *
 * @returns new-system ID, or `null` if the old ID is retired OR unknown.
 *          Callers MUST handle null — see FOLLOWUP.md "Legacy UI contracts".
 *          On null, render with fallback label "Legacy / Unknown" and disable
 *          regenerate/variation actions.
 */
export function resolveLegacyCategoryId(oldId: string): string | null {
  if (!(oldId in LEGACY_CATEGORY_REDIRECTS)) return null;
  const mapped = LEGACY_CATEGORY_REDIRECTS[oldId as OldCategoryId];
  return mapped === LEGACY_ONLY ? null : mapped;
}
