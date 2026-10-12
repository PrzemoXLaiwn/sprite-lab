// ===========================================
// New-system category configs (v2 rebuild)
// ===========================================
// Source of truth for the 9 supported asset categories.
//
// CATEGORY_CONFIGS is the single canonical record. The three legacy
// exports (CATEGORY_PIVOTS, CATEGORY_NEEDS_BG_REMOVAL, CATEGORY_LABELS)
// are DERIVED from it at module load to preserve Module 1's contracts
// without creating drift risk — edit a category here once, all three
// lookup maps update.

export type CategoryId =
  | "character"
  | "enemy"
  | "item"
  | "weapon"
  | "tile"
  | "environment_prop"
  | "ui_icon"
  | "portrait"
  | "vfx";

/**
 * Runtime tuple of every CategoryId, narrow-typed via `as const satisfies`
 * so `CATEGORY_IDS.includes(x)` and `new Set(CATEGORY_IDS)` preserve
 * literal types. Consumed by src/lib/prompts/compose.ts for runtime
 * category-id validation.
 */
export const CATEGORY_IDS = [
  "character",
  "enemy",
  "item",
  "weapon",
  "tile",
  "environment_prop",
  "ui_icon",
  "portrait",
  "vfx",
] as const satisfies readonly CategoryId[];

/**
 * Semantic pivot name (what anchor does the engine expect?).
 *   - bottom_center — ground-aligned sprites (character on tile, weapon handle down)
 *   - center        — centred icons / portraits / vfx
 *   - top_left      — tiles (matches Unity/Godot/GameMaker tilemap indexing)
 */
export type DefaultPivot = "bottom_center" | "center" | "top_left";

/** Numeric (x, y) in 0..1 fractions of width/height for each semantic pivot. */
const PIVOT_COORDS: Record<DefaultPivot, { x: number; y: number }> = {
  bottom_center: { x: 0.5, y: 0.0 },
  center:        { x: 0.5, y: 0.5 },
  top_left:      { x: 0.0, y: 0.0 },
};

export interface CategoryConfig {
  id: CategoryId;
  /** User-facing label (category picker). */
  name: string;
  /** One-liner for the picker card. */
  description: string;
  /** Prompt fragment composed into the positive prompt at step 2d (what the thing IS). */
  objectType: string;
  /** Prompt fragment composed into the positive prompt at step 2d (how it's FRAMED). */
  composition: string;
  /** Category-specific negatives; extend the universal + style negatives. */
  negatives: string[];
  /**
   * Run BiRefNet background removal after generation? False for categories
   * that need scene context (tile — full edge-to-edge; environment prop —
   * natural grounding). Style-level `bgRemoval` is AND-ed with this at the
   * pipeline level.
   */
  needsBgRemoval: boolean;
  /** Run edge-diff tileability validation? True only for `tile`. */
  needsTileabilityCheck: boolean;
  /** Where the anchor point lives on the sprite — persisted to Asset.pivotX/Y. */
  defaultPivot: DefaultPivot;
}

// ─── The 9 categories ─────────────────────────────────────────────────────
// All filled — no Partial<>. Module 3 may retune copy / negatives.

export const CATEGORY_CONFIGS: Record<CategoryId, CategoryConfig> = {
  character: {
    id: "character",
    name: "Character",
    description: "Full-body game character — heroes, NPCs, player sprites.",
    objectType: "a game character, full body",
    composition:
      "centered, facing forward, T-pose or idle stance, plain background",
    negatives: ["cropped", "partial view", "cut off", "text", "watermark"],
    needsBgRemoval: true,
    needsTileabilityCheck: false,
    defaultPivot: "bottom_center",
  },

  enemy: {
    id: "enemy",
    name: "Enemy",
    description: "Hostile creature, monster, or adversary sprite.",
    objectType: "a hostile creature, full body",
    composition:
      "centered, menacing stance, facing forward or 3/4 view, plain background",
    negatives: ["cropped", "partial view", "cut off", "text", "watermark"],
    needsBgRemoval: true,
    needsTileabilityCheck: false,
    defaultPivot: "bottom_center",
  },

  item: {
    id: "item",
    name: "Item",
    description: "Inventory icon — consumables, armor pieces, resources, quest items.",
    objectType: "a single game item, icon-style",
    composition:
      "centered, isolated object, no character, neutral angle, plain background",
    negatives: [
      "multiple items",
      "character",
      "scene",
      "cropped",
      "text",
      "watermark",
    ],
    needsBgRemoval: true,
    needsTileabilityCheck: false,
    defaultPivot: "center",
  },

  weapon: {
    id: "weapon",
    name: "Weapon",
    description: "Standalone weapon — sword, staff, bow, firearm, etc.",
    objectType: "a game weapon, standalone, detailed",
    composition:
      "centered, weapon only (no hand, no wielder), side view typical, plain background",
    negatives: [
      "hand",
      "character",
      "wielding",
      "scene",
      "cropped",
      "text",
      "watermark",
    ],
    needsBgRemoval: true,
    needsTileabilityCheck: false,
    defaultPivot: "bottom_center",
  },

  tile: {
    id: "tile",
    name: "Tile",
    description: "Seamless tileable ground/floor/wall texture.",
    objectType: "a seamless game texture tile",
    composition:
      "seamless tileable, edges match on all sides, centered pattern, no border",
    negatives: [
      "border",
      "frame",
      "vignette",
      "centered object",
      "single object",
      "character",
    ],
    needsBgRemoval: false,
    needsTileabilityCheck: true,
    defaultPivot: "top_left",
  },

  environment_prop: {
    id: "environment_prop",
    name: "Environment Prop",
    description: "Non-tileable scene object — tree, rock, barrel, sign, etc.",
    objectType: "a game environment prop, standalone scene object",
    composition:
      "centered, grounded base, natural 3/4 or front view, plain background",
    negatives: [
      "tileable",
      "seamless pattern",
      "character",
      "weapon",
      "cropped",
      "text",
      "watermark",
    ],
    needsBgRemoval: false,
    needsTileabilityCheck: false,
    defaultPivot: "bottom_center",
  },

  ui_icon: {
    id: "ui_icon",
    name: "UI Icon",
    description: "HUD element — action buttons, skill icons, status indicators.",
    objectType: "a UI icon, clean stylized game element",
    composition:
      "centered, bold silhouette, clear symbol, plain background",
    negatives: [
      "photorealistic",
      "character",
      "scene",
      "cropped",
      "text",
      "watermark",
    ],
    needsBgRemoval: true,
    needsTileabilityCheck: false,
    defaultPivot: "center",
  },

  portrait: {
    id: "portrait",
    name: "Portrait",
    description: "Character bust — dialogue portraits, profile pictures.",
    objectType: "a character portrait, bust shot",
    composition:
      "head and shoulders, facing forward or slight 3/4, plain background",
    negatives: [
      "full body",
      "cropped face",
      "back view",
      "scene",
      "text",
      "watermark",
    ],
    needsBgRemoval: true,
    needsTileabilityCheck: false,
    defaultPivot: "center",
  },

  vfx: {
    id: "vfx",
    name: "VFX",
    description: "Effect sprite — magic bursts, particles, impact flashes.",
    objectType: "a game VFX effect sprite",
    composition:
      "centered, radial composition, dynamic motion lines, plain background",
    negatives: [
      "character",
      "weapon",
      "scene",
      "solid object",
      "cropped",
      "text",
      "watermark",
    ],
    needsBgRemoval: true,
    needsTileabilityCheck: false,
    defaultPivot: "center",
  },
};

// ─── Main lookup ──────────────────────────────────────────────────────────

/**
 * Strict lookup with a defensive throw for runtime id values that bypass
 * the compile-time CategoryId check (e.g. untyped JSON input). Mirrors
 * the pattern in `src/config/styles/style-configs.ts::getStyleConfig`.
 */
export function getCategoryConfig(id: CategoryId): CategoryConfig {
  const cfg = CATEGORY_CONFIGS[id];
  if (!cfg) {
    throw new Error(
      `[category-configs] No config for category "${id}". ` +
        `All CategoryId values should have an entry in CATEGORY_CONFIGS.`
    );
  }
  return cfg;
}

// ─── Module-1 backwards-compat exports ───────────────────────────────────
// Derived from CATEGORY_CONFIGS so there is a SINGLE source of truth.
// Callers (the Asset insert helper per Module 1's contract) can keep
// using these maps unchanged; edits to CATEGORY_CONFIGS flow through.

/**
 * Pivot fraction (x, y ∈ 0..1) — the Asset insert helper MUST override
 * the DB default (0.5, 0.5) with these values based on categoryId.
 *
 * Derived from CATEGORY_CONFIGS[id].defaultPivot via PIVOT_COORDS.
 */
export const CATEGORY_PIVOTS: Record<CategoryId, { x: number; y: number }> =
  Object.fromEntries(
    CATEGORY_IDS.map((id) => [id, PIVOT_COORDS[CATEGORY_CONFIGS[id].defaultPivot]])
  ) as Record<CategoryId, { x: number; y: number }>;

/**
 * Category-level BG-removal signal. The pipeline ANDs this with the
 * style-level signal — if either is false, step 5 is skipped.
 *
 * False for: tile (needs edge-to-edge coverage) and environment_prop
 * (needs natural grounding / scene context).
 *
 * Derived from CATEGORY_CONFIGS[id].needsBgRemoval.
 */
export const CATEGORY_NEEDS_BG_REMOVAL: Record<CategoryId, boolean> =
  Object.fromEntries(
    CATEGORY_IDS.map((id) => [id, CATEGORY_CONFIGS[id].needsBgRemoval])
  ) as Record<CategoryId, boolean>;

/** User-facing label for the category picker. Derived from `CategoryConfig.name`. */
export const CATEGORY_LABELS: Record<CategoryId, string> =
  Object.fromEntries(
    CATEGORY_IDS.map((id) => [id, CATEGORY_CONFIGS[id].name])
  ) as Record<CategoryId, string>;

/**
 * Helper for the Asset insert path. Module 2's `createAsset()` helper
 * should call this and override the DB (0.5, 0.5) default.
 *
 * @example
 *   const pivot = pivotForCategory("character");
 *   await prisma.asset.create({ data: { ..., pivotX: pivot.x, pivotY: pivot.y } });
 */
export function pivotForCategory(id: CategoryId): { x: number; y: number } {
  return CATEGORY_PIVOTS[id];
}
