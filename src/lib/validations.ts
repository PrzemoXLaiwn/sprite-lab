import { z } from "zod";

// ===========================================
// GENERATION VALIDATION SCHEMAS
// ===========================================

export const generateSchema = z.object({
  prompt: z
    .string()
    .min(1, "Please enter a description for your sprite")
    .max(500, "Description too long. Maximum 500 characters")
    .transform((val) => val.trim()),
  categoryId: z.string().min(1, "Please select a category"),
  subcategoryId: z.string().min(1, "Please select a type"),
  styleId: z.string().default("PIXEL_ART_16"),
  seed: z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === undefined || val === null || val === "") {
        return Math.floor(Math.random() * 2147483647);
      }
      const num = Number(val);
      if (isNaN(num) || num < 0 || num > 2147483647) {
        return Math.floor(Math.random() * 2147483647);
      }
      return num;
    }),
});

export type GenerateInput = z.infer<typeof generateSchema>;

// ===========================================
// 3D GENERATION VALIDATION
// ===========================================

// Shapes below mirror what the dashboard pages actually send to each route
// (field names included). Host/SSRF checks for image URLs are done in the
// route via src/lib/safe-fetch.ts; here we only bound type and length.

const shortId = z.string().trim().min(1).max(100);
const seedInput = z.union([z.number(), z.string().max(20), z.null()]).optional();
// Image URL or data:image/... URL. Data URLs can be large; the byte cap is
// enforced again (on decoded size) by safeFetchImage.
const imageUrlInput = z.string().min(1, "Image URL is required.").max(20_000_000);

/** Body for /api/generate-3d */
export const generate3DSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(1, "Please enter a description for your 3D model.")
    .max(500, "Description too long. Maximum 500 characters."),
  categoryId: shortId,
  subcategoryId: shortId,
  modelId: z.string().trim().min(1).max(50).optional().default("rodin"),
  style: z.string().trim().min(1).max(50).optional().default("REALISTIC"),
  qualityPreset: z.enum(["low", "medium", "high"]).optional().default("medium"),
  seed: seedInput,
});

export type Generate3DInput = z.infer<typeof generate3DSchema>;

/** Body for /api/generate-3d-stream (prompt optional when an image is given) */
export const generate3DStreamSchema = z
  .object({
    prompt: z
      .string()
      .trim()
      .max(500, "Description too long. Maximum 500 characters.")
      .optional(),
    categoryId: shortId,
    subcategoryId: shortId,
    modelId: z.string().trim().min(1).max(50).optional().default("rodin"),
    styleId: z.string().trim().min(1).max(50).optional().default("STYLIZED"),
    qualityPreset: z.enum(["low", "medium", "high"]).optional().default("medium"),
    seed: seedInput,
    customImageUrl: z.string().max(2048).optional().nullable(),
  })
  .refine((d) => !!d.customImageUrl || !!d.prompt, {
    message: "Please provide a description or upload an image",
  });

// ===========================================
// IMAGE EDITING VALIDATION
// ===========================================

const originalGenerationInput = z
  .object({
    prompt: z.string().max(1000).optional(),
    categoryId: z.string().max(100).optional(),
    subcategoryId: z.string().max(100).optional(),
    styleId: z.string().max(100).optional(),
    seed: z.number().int().min(0).max(2147483647).optional().nullable(),
  })
  .nullish();

/** Body for /api/edit-image */
export const editImageSchema = z.object({
  imageUrl: imageUrlInput,
  editPrompt: z
    .string()
    .trim()
    .min(1, "Please describe what you want to change")
    .max(500, "Edit description too long. Maximum 500 characters."),
  originalGeneration: originalGenerationInput,
  strength: z.number().min(0.05).max(1).optional(),
});

/** Body for /api/upscale */
export const upscaleSchema = z.object({
  imageUrl: imageUrlInput,
  scale: z
    .union([z.literal(2), z.literal(3), z.literal(4)], {
      message: "Scale must be 2, 3 or 4.",
    })
    .optional()
    .default(2),
  modelType: z
    .enum(["pixel", "runware", "runware-2x", "runware-4x"], { message: "Invalid upscale model." })
    .optional()
    .default("runware"),
  originalGeneration: originalGenerationInput,
});

/** Body for /api/remove-bg */
export const removeBackgroundSchema = z.object({
  imageUrl: imageUrlInput,
  originalPrompt: z.string().max(1000).optional().nullable(),
  categoryId: z.string().max(100).optional().nullable(),
  subcategoryId: z.string().max(100).optional().nullable(),
  styleId: z.string().max(100).optional().nullable(),
});

/** Body for /api/variations */
export const variationsSchema = z.object({
  imageUrl: imageUrlInput,
  prompt: z.string().trim().max(500, "Prompt too long. Maximum 500 characters.").optional().nullable(),
  numVariations: z
    .number()
    .int("Number of variations must be between 1 and 4.")
    .min(1, "Number of variations must be between 1 and 4.")
    .max(4, "Number of variations must be between 1 and 4.")
    .optional()
    .default(2),
  similarity: z
    .enum(["low", "medium", "high"], { message: "Similarity must be 'low', 'medium', or 'high'." })
    .optional()
    .default("medium"),
  seed: z.number().int().min(0).max(2147483647).optional().nullable(),
  originalGeneration: originalGenerationInput,
});

// ===========================================
// ADMIN VALIDATION
// ===========================================

export const addCreditsSchema = z.object({
  email: z.string().email("Invalid email address"),
  credits: z
    .union([z.number(), z.string()])
    .transform((val) => {
      const num = typeof val === "number" ? val : parseInt(val, 10);
      if (isNaN(num) || num <= 0) {
        throw new Error("Credits must be a positive number");
      }
      return num;
    }),
  reason: z.string().default("Manual credit addition"),
  secret: z.string().optional(),
});

export const updatePlanSchema = z.object({
  email: z.string().email("Invalid email address"),
  plan: z.enum(["FREE", "SPARK", "FORGE", "INFINITE", "LIFETIME"]),
  secret: z.string().optional(),
});

// ===========================================
// FEEDBACK VALIDATION
// ===========================================

export const feedbackSchema = z.object({
  type: z.enum(["bug", "feature", "feedback", "other"]),
  message: z.string().min(10, "Message too short").max(2000, "Message too long"),
  email: z.string().email().optional(),
  page: z.string().optional(),
  userAgent: z.string().optional(),
});

// ===========================================
// AUTH VALIDATION
// ===========================================

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/\d/, "Password must contain a number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// ===========================================
// HELPER FUNCTIONS
// ===========================================

export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);

  if (!result.success) {
    // Zod v4 uses issues instead of errors
    const issues = result.error.issues || [];
    const firstIssue = issues[0];
    return {
      success: false,
      error: firstIssue?.message || "Invalid request data",
    };
  }

  return { success: true, data: result.data };
}
