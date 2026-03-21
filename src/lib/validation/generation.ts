// =============================================================================
// SPRITELAB — GENERATION VALIDATION SCHEMAS
// =============================================================================
// Zod schemas for every generation-related API endpoint.
// These are NEW schemas — they do NOT replace src/lib/validations.ts yet.
// The existing validations.ts file is kept intact during this phase.
//
// These will be wired into route handlers in a later phase.
// =============================================================================

import { z } from "zod";
import { SeedSchema } from "./common";
import { ALL_CATEGORIES } from "@/config/categories/all-categories";
import { STYLES_2D_FULL } from "@/config/styles/styles-2d";

// -----------------------------------------------------------------------------
// DERIVED ENUM VALUES FROM EXISTING CATEGORY / STYLE CONFIGS
// These read the live arrays so schemas stay in sync automatically when
// new categories or styles are added.
// -----------------------------------------------------------------------------

const CATEGORY_IDS = ALL_CATEGORIES.map((c) => c.id) as [
  string,
  ...string[],
];

const STYLE_IDS = Object.keys(STYLES_2D_FULL) as [string, ...string[]];

// -----------------------------------------------------------------------------
// SHARED FIELD SCHEMAS
// -----------------------------------------------------------------------------

const PromptField = z
  .string()
  .min(3, "Description must be at least 3 characters")
  .max(500, "Description must be 500 characters or less")
  .transform((v) => v.trim());

const CategoryField = z.enum(CATEGORY_IDS, {
  error: "Invalid category — please select a valid asset type",
});

const StyleField = z.enum(STYLE_IDS, {
  error: "Invalid art style — please select a valid style",
});

// -----------------------------------------------------------------------------
// SINGLE ASSET GENERATION
// Endpoint: POST /api/generate  (and /api/generate-v2)
// -----------------------------------------------------------------------------

export const SingleGenerationSchema = z.object({
  prompt: PromptField,
  categoryId: CategoryField,
  /** subcategoryId is optional — some endpoints don't require it */
  subcategoryId: z.string().optional().default(""),
  styleId: StyleField.default("pixel-16"),
  seed: SeedSchema,
});

export type SingleGenerationInput = z.infer<typeof SingleGenerationSchema>;

// -----------------------------------------------------------------------------
// GUEST GENERATION (no auth, stricter limits enforced at route level)
// Endpoint: POST /api/generate-guest
// -----------------------------------------------------------------------------

export const GuestGenerationSchema = z.object({
  prompt: PromptField,
  categoryId: CategoryField,
  subcategoryId: z.string().optional().default(""),
  styleId: StyleField.default("pixel-16"),
  seed: SeedSchema,
});

export type GuestGenerationInput = z.infer<typeof GuestGenerationSchema>;

// -----------------------------------------------------------------------------
// ASSET PACK GENERATION
// Endpoint: POST /api/generate-asset-pack
// Generates 3–12 thematically related assets from a single description.
// -----------------------------------------------------------------------------

export const PackGenerationSchema = z.object({
  packDescription: z
    .string()
    .min(5, "Pack description must be at least 5 characters")
    .max(200, "Pack description must be 200 characters or less")
    .transform((v) => v.trim()),
  styleId: StyleField.default("pixel-16"),
  count: z
    .number()
    .int()
    .min(3, "Pack must contain at least 3 assets")
    .max(12, "Pack can contain at most 12 assets")
    .default(6),
});

export type PackGenerationInput = z.infer<typeof PackGenerationSchema>;

// -----------------------------------------------------------------------------
// BATCH GENERATION
// Endpoint: POST /api/generate-batch
// Generates N assets from an array of user-supplied prompts.
// -----------------------------------------------------------------------------

export const BatchGenerationSchema = z.object({
  prompts: z
    .array(PromptField)
    .min(1, "Batch must contain at least 1 prompt")
    .max(20, "Batch can contain at most 20 prompts"),
  categoryId: CategoryField,
  subcategoryId: z.string().optional().default(""),
  styleId: StyleField.default("pixel-16"),
});

export type BatchGenerationInput = z.infer<typeof BatchGenerationSchema>;

// -----------------------------------------------------------------------------
// SPRITESHEET GENERATION
// Endpoint: POST /api/generate-spritesheet
// -----------------------------------------------------------------------------

export const SpritesheetGenerationSchema = z.object({
  prompt: PromptField,
  categoryId: CategoryField,
  subcategoryId: z.string().optional().default(""),
  styleId: StyleField.default("pixel-16"),
  frameCount: z
    .number()
    .int()
    .min(2, "Spritesheet must have at least 2 frames")
    .max(8, "Spritesheet can have at most 8 frames")
    .default(4),
  seed: SeedSchema,
});

export type SpritesheetGenerationInput = z.infer<
  typeof SpritesheetGenerationSchema
>;

// -----------------------------------------------------------------------------
// TILE GENERATION
// Endpoint: POST /api/generate-tile
// -----------------------------------------------------------------------------

export const TileGenerationSchema = z.object({
  prompt: PromptField,
  styleId: StyleField.default("pixel-16"),
  tileSize: z.number().int().min(16).max(512).default(64),
  seed: SeedSchema,
});

export type TileGenerationInput = z.infer<typeof TileGenerationSchema>;

// -----------------------------------------------------------------------------
// 3D GENERATION
// Endpoint: POST /api/generate-3d
// -----------------------------------------------------------------------------

export const Generation3DSchema = z.object({
  prompt: PromptField,
  categoryId: CategoryField,
  subcategoryId: z.string().optional().default(""),
  format: z.enum(["glb", "obj"]).default("glb"),
});

export type Generation3DInput = z.infer<typeof Generation3DSchema>;

// -----------------------------------------------------------------------------
// IMAGE PROCESSING SCHEMAS
// (upscale, remove-bg, inpaint — kept here for co-location with generation)
// -----------------------------------------------------------------------------

export const UpscaleSchema = z.object({
  imageUrl: z.string().url("Invalid image URL"),
  scale: z.number().min(2).max(4).default(2),
});

export const RemoveBgSchema = z.object({
  imageUrl: z.string().url("Invalid image URL"),
});

export const InpaintSchema = z.object({
  imageUrl: z.string().url("Invalid image URL"),
  prompt: PromptField,
  mask: z.string().optional(),
});

export const VariationsSchema = z.object({
  imageUrl: z.string().url("Invalid image URL"),
  prompt: z.string().max(500).optional(),
  count: z.number().int().min(1).max(4).default(1),
});

export type UpscaleInput = z.infer<typeof UpscaleSchema>;
export type RemoveBgInput = z.infer<typeof RemoveBgSchema>;
export type InpaintInput = z.infer<typeof InpaintSchema>;
export type VariationsInput = z.infer<typeof VariationsSchema>;
