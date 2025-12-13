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

export const generate3DSchema = z.object({
  prompt: z
    .string()
    .min(1, "Please enter a description")
    .max(500, "Description too long")
    .transform((val) => val.trim()),
  categoryId: z.string().min(1, "Category required"),
  subcategoryId: z.string().min(1, "Type required"),
  format: z.enum(["glb", "obj"]).default("glb"),
});

export type Generate3DInput = z.infer<typeof generate3DSchema>;

// ===========================================
// IMAGE EDITING VALIDATION
// ===========================================

export const editImageSchema = z.object({
  imageUrl: z.string().url("Invalid image URL"),
  prompt: z.string().min(1, "Please describe the edit").max(500),
  mask: z.string().optional(),
});

export const upscaleSchema = z.object({
  imageUrl: z.string().url("Invalid image URL"),
  scale: z.number().min(2).max(4).default(2),
});

export const removeBackgroundSchema = z.object({
  imageUrl: z.string().url("Invalid image URL"),
});

export const variationsSchema = z.object({
  imageUrl: z.string().url("Invalid image URL"),
  prompt: z.string().max(500).optional(),
  count: z.number().min(1).max(4).default(1),
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
