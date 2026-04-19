// ===========================================
// New-system style configs (v2 rebuild)
// ===========================================
// Source of truth for the 10 supported styles. Populated during Module 3
// (prompt templates) after the Runware LoRA test matrix.
//
// WHY a const map and not a DB table:
//   - Styles are semantic constants, not user data
//   - LoRA IDs change on the order of months (not days)
//   - Type safety at every call site (StyleId union)
//   - No DB round-trip to render the style picker
//   - Migration path to a table is trivial later if admin flexibility is needed
//     (dump const → seed table, swap a lookup function)

export type StyleId =
  | "pixel_8bit_nes"
  | "pixel_16bit_snes"
  | "pixel_32bit"
  | "topdown_rpg"
  | "sidescroller"
  | "isometric"
  | "gameboy_dmg"
  | "pico8"
  | "db16"
  | "hd_hand_painted";

/**
 * Runtime tuple of every StyleId, narrow-typed via `as const satisfies`
 * so `STYLE_IDS.includes(x)` and `new Set(STYLE_IDS)` preserve literal
 * types. Consumed by src/lib/prompts/compose.ts for runtime style-id
 * validation (single source of truth — no hardcoded mirror elsewhere).
 */
export const STYLE_IDS = [
  "pixel_8bit_nes",
  "pixel_16bit_snes",
  "pixel_32bit",
  "topdown_rpg",
  "sidescroller",
  "isometric",
  "gameboy_dmg",
  "pico8",
  "db16",
  "hd_hand_painted",
] as const satisfies readonly StyleId[];

/** Hex string like "#9BBC0F". */
export type Hex = `#${string}`;

export type PaletteSpec =
  | { kind: "derived"; targetColors: number }             // quantize to N colors post-gen
  | { kind: "forced"; colors: readonly Hex[] }            // snap to fixed list (Game Boy, PICO-8, DB16)
  | { kind: "user" }                                       // filled at request time
  | { kind: "none" };                                      // HD — no quantization

export interface StyleConfig {
  id: StyleId;
  name: string;                 // user-facing label
  description: string;          // one-liner for the style picker card
  isPixel: boolean;             // gates UNIVERSAL_PIXEL_BASE in the negative composer
  model: "flux-schnell" | "flux-dev";
  defaultSize: { width: number; height: number };
  allowedSizes: ReadonlyArray<{ width: number; height: number }>;
  palette: PaletteSpec;
  promptPrefix: string;         // style tokens prepended in pipeline step 2
  negatives: string[];          // style-specific negatives (extend the universal pixel base)
  lora: { id: string; weight: number } | null; // null = no LoRA (Game Boy, DB16, HD)
  bgRemoval: boolean;           // false for HD (user may want painted background), true otherwise
}

/**
 * Universal negative applied to every pixel style. Extended per-style with
 * `style.negatives` via the prompt builder (Module 2).
 */
export const UNIVERSAL_PIXEL_BASE_NEGATIVE =
  "blurry, smooth gradients, anti-aliased, photorealistic, 3d render, soft shading, depth of field, motion blur, lens flare";

/**
 * Fixed palettes (populated now because they're non-negotiable; LoRA IDs and
 * prompt prefixes land in Module 3).
 */
export const GAMEBOY_DMG_PALETTE: readonly Hex[] = [
  "#9BBC0F",
  "#8BAC0F",
  "#306230",
  "#0F380F",
] as const;

export const PICO8_PALETTE: readonly Hex[] = [
  "#000000",
  "#1D2B53",
  "#7E2553",
  "#008751",
  "#AB5236",
  "#5F574F",
  "#C2C3C7",
  "#FFF1E8",
  "#FF004D",
  "#FFA300",
  "#FFEC27",
  "#00E436",
  "#29ADFF",
  "#83769C",
  "#FF77A8",
  "#FFCCAA",
] as const;

export const DB16_PALETTE: readonly Hex[] = [
  "#140C1C",
  "#442434",
  "#30346D",
  "#4E4A4E",
  "#854C30",
  "#346524",
  "#D04648",
  "#757161",
  "#597DCE",
  "#D27D2C",
  "#8595A1",
  "#6DAA2C",
  "#D2AA99",
  "#6DC2CA",
  "#DAD45E",
  "#DEEED6",
] as const;

/**
 * Full config map — Module 2 fills THREE placeholder entries for pipeline
 * end-to-end testing (pixel_16bit_snes, pixel_32bit, topdown_rpg). The
 * remaining seven styles stay unfilled; `getStyleConfig()` throws for
 * them so the UI can't offer broken styles. Module 3's LoRA test matrix
 * fills the rest and may retune the three below.
 *
 * `lora: null` everywhere — the post-Module-2 LoRA matrix picks weights.
 * `model: "flux-schnell"` everywhere for MVP — cheaper, faster; Module 3
 * may upgrade specific styles to flux-dev based on quality testing.
 */
export const STYLE_CONFIGS: Partial<Record<StyleId, StyleConfig>> = {
  pixel_16bit_snes: {
    id: "pixel_16bit_snes",
    name: "Pixel 16-bit (SNES)",
    description: "Classic 16-bit SNES/Genesis-era pixel art sprites.",
    isPixel: true,
    model: "flux-schnell",
    defaultSize: { width: 32, height: 32 },
    allowedSizes: [
      { width: 32, height: 32 },
      { width: 64, height: 64 },
    ],
    palette: { kind: "derived", targetColors: 16 },
    promptPrefix:
      "16-bit pixel art game sprite, SNES Genesis era, clean pixel edges, no anti-aliasing, limited color palette",
    negatives: ["blurry", "smooth gradients", "3d render"],
    lora: null,
    bgRemoval: true,
  },

  pixel_32bit: {
    id: "pixel_32bit",
    name: "Pixel 32-bit",
    description: "Late 16-bit / early 32-bit detailed pixel art sprites.",
    isPixel: true,
    model: "flux-schnell",
    defaultSize: { width: 64, height: 64 },
    allowedSizes: [
      { width: 64, height: 64 },
      { width: 128, height: 128 },
    ],
    palette: { kind: "derived", targetColors: 32 },
    promptPrefix:
      "32-bit pixel art, Genesis/SNES late era, detailed sprite, clean pixels",
    negatives: ["blurry", "smooth gradients", "3d render"],
    lora: null,
    bgRemoval: true,
  },

  topdown_rpg: {
    id: "topdown_rpg",
    name: "Top-down RPG",
    description: "Top-down 2D RPG assets (Zelda / Pokémon perspective).",
    isPixel: true,
    model: "flux-schnell",
    defaultSize: { width: 32, height: 32 },
    allowedSizes: [
      { width: 32, height: 32 },
      { width: 64, height: 64 },
    ],
    palette: { kind: "derived", targetColors: 16 },
    promptPrefix:
      "top-down view, 2D RPG asset, Zelda/Pokemon perspective, pixel art, grid-aligned",
    negatives: [
      "blurry",
      "smooth gradients",
      "3d render",
      "perspective view",
      "3d",
      "side view",
    ],
    lora: null,
    bgRemoval: true,
  },

  // pixel_8bit_nes, sidescroller, isometric, gameboy_dmg, pico8, db16,
  // hd_hand_painted — deferred. getStyleConfig() throws for these; UI
  // must hide them until Module 3 fills them in.
};

export function getStyleConfig(id: StyleId): StyleConfig {
  const cfg = STYLE_CONFIGS[id];
  if (!cfg) {
    throw new Error(
      `[style-configs] No config for style "${id}". Module 3 must populate STYLE_CONFIGS before this is callable.`
    );
  }
  return cfg;
}
