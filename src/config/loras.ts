// =============================================================================
// SpriteLab — LoRA configuration
// =============================================================================
// LoRA (Low-Rank Adaptation) is the practical way to give a base model new
// skills without full fine-tuning. A LoRA is a ~50-200MB delta on top of
// a frozen base model (FLUX-dev in our case) that biases generations
// toward a specific style / subject / aesthetic.
//
// SpriteLab ships LoRA support in two waves:
//
//   1. PUBLIC LoRAs (now): popular Civitai LoRAs that match each style.
//      Free quality boost; users see drastically better output for the
//      styles where a public LoRA exists. Trade-off: we don't fully
//      control the look.
//
//   2. CUSTOM LoRAs (later): SpriteLab-trained LoRAs on a curated dataset
//      of game-asset reference images. Brand-defining output. Cost:
//      ~$15-50 per LoRA on Runware Training, ~50-200 reference images
//      per LoRA. See docs/CUSTOM_MODEL.md for the full training playbook.
//
// AIR FORMAT (Asset Identification Resource):
//   Civitai:    "civitai:<model_id>@<version_id>"
//   Runware:    "runware:<user_id>/<lora_name>@<version>"
//
// Add or swap LoRAs by editing STYLE_LORA_MAP below — no other code change
// is required. The pipeline picks them up automatically.
// =============================================================================

export interface SpriteLabLora {
  /** Runware Asset Identification Resource — see header for format. */
  model: string;
  /** Influence strength. 0.7-1.0 is typical; >1 over-fits, <0.5 barely shows. */
  weight: number;
  /**
   * Activator words this LoRA was trained against. Many Civitai LoRAs only
   * "switch on" when a specific token appears in the prompt (e.g. the
   * Dever pixel-game-assets LoRA needs `dvr-pixel-flux`). When set, these
   * tokens are PREPENDED to every generation prompt that uses this LoRA
   * — early-token weighting matters in transformer attention.
   *
   * Leave undefined for LoRAs that activate without a trigger.
   */
  triggerWords?: string[];
  /**
   * Human-readable note for the maintainer — what this LoRA does, where it
   * came from, and any prompt-token tricks ("activator words") it expects.
   * Never sent to the model.
   */
  note?: string;
}

/**
 * Per-style LoRA stack. Keyed by StyleId from STYLES_2D_FULL.
 *
 * EMPTY ARRAY (or missing key) = no LoRA, run the base model alone.
 * That's the safe default; SpriteLab works fine without LoRAs and
 * prompt engineering still does the heavy lifting.
 *
 * To plug in a Civitai LoRA, find one on civitai.com, click "Resource
 * details" → copy the AIR string into the `model` field below.
 * To plug in a custom-trained SpriteLab LoRA, train it via Runware
 * (see docs/CUSTOM_MODEL.md) and paste the resulting AIR here.
 */
// Curated public LoRAs for FLUX.1 D from Civitai. Each entry has been
// vetted on download/like count, base-model compatibility, and trigger
// requirements. Update or replace as we ship our own custom-trained
// SpriteLab LoRAs (see docs/CUSTOM_MODEL.md).
export const STYLE_LORA_MAP: Record<string, SpriteLabLora[]> = {
  // ─── Pixel art family ────────────────────────────────────────────────
  // Dever's "Pixel Game Assets [FLUX]" — explicitly trained on game
  // asset reference images (weapons, characters, items). 9.2K likes,
  // 3.7K downloads on Civitai. Trigger word `dvr-pixel-flux` is
  // mandatory — without it the LoRA barely engages.
  // https://civitai.com/models/945266/pixel-game-assets-flux-by-dever
  PIXEL_ART_16: [
    {
      model: "civitai:945266@1058316",
      weight: 0.85,
      triggerWords: ["dvr-pixel-flux"],
      note: "Dever Pixel Game Assets — 9.2K likes; sprite-first training set",
    },
  ],
  PIXEL_ART_32: [
    {
      model: "civitai:945266@1058316",
      weight: 0.8,
      triggerWords: ["dvr-pixel-flux"],
      note: "Dever Pixel Game Assets — slightly lower weight for 32-bit (more detail headroom)",
    },
  ],
  // 64BIT LoRA is purpose-built for isometric / overhead retro graphics.
  // Strong activation phrase is required — see triggerWords. 3.4K downloads.
  // https://civitai.com/models/816360/pixel-art-and-video-game-graphics-lora
  ISOMETRIC_PIXEL: [
    {
      model: "civitai:816360@1406637",
      weight: 0.75,
      triggerWords: ["64-bit screenshot from 64BITGAME"],
      note: "64Bit Pixel Art — N64-era isometric sprite training set",
    },
  ],

  // ─── Hand-painted / artistic ─────────────────────────────────────────
  HAND_PAINTED: [],

  // ─── Anime / chibi ───────────────────────────────────────────────────
  ANIME_GAME: [],
  CHIBI_CUTE: [],

  // ─── Dark fantasy ────────────────────────────────────────────────────
  DARK_SOULS: [],

  // ─── Cartoon / vector ────────────────────────────────────────────────
  CARTOON_WESTERN: [],
  VECTOR_CLEAN: [],

  // ─── Isometric ───────────────────────────────────────────────────────
  ISOMETRIC: [],
  ISOMETRIC_CARTOON: [],

  // ─── Realistic ───────────────────────────────────────────────────────
  REALISTIC_PAINTED: [],
};

/**
 * Optional category-level LoRA layered on top of the style LoRA.
 * Use case: a "weapons-only" LoRA improves weapon silhouettes regardless
 * of the chosen style. Combined with the style LoRA the pipeline applies
 * both (Runware supports stacking up to ~5 LoRAs per call).
 */
export const CATEGORY_LORA_MAP: Record<string, SpriteLabLora[]> = {
  WEAPONS: [],
  ARMOR: [],
  CHARACTERS: [],
  CREATURES: [],
  CONSUMABLES: [],
  RESOURCES: [],
  UI_ELEMENTS: [],
  ENVIRONMENT: [],
  QUEST_ITEMS: [],
  EFFECTS: [],
  PROJECTILES: [],
};

/**
 * Resolve the LoRA stack for a given style + category combination.
 * Stacks the style LoRA first (more specific), then the category LoRA
 * if any. Returns at most 5 entries (Runware's practical ceiling).
 */
export function resolveLorasForGeneration(
  styleId: string,
  categoryId: string
): SpriteLabLora[] {
  const styleLoras = STYLE_LORA_MAP[styleId] ?? [];
  const categoryLoras = CATEGORY_LORA_MAP[categoryId] ?? [];
  return [...styleLoras, ...categoryLoras].slice(0, 5);
}

/**
 * Extracts a deduplicated, comma-separated phrase of every trigger word
 * across the resolved LoRA stack. The caller PREPENDS this to the prompt
 * so the LoRAs activate properly — early-token weighting in transformer
 * attention means a trigger at position 0 lands harder than at position
 * 200.
 *
 * Returns an empty string when no LoRA in the stack uses triggers; the
 * caller should treat that as "no prefix needed" and pass the prompt
 * through unmodified.
 */
export function composeLoraTriggerPhrase(loras: SpriteLabLora[]): string {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const l of loras) {
    for (const t of l.triggerWords ?? []) {
      const key = t.toLowerCase().trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      ordered.push(t.trim());
    }
  }
  return ordered.join(", ");
}
