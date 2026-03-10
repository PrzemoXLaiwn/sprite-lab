// =============================================================================
// SPRITELAB — SHARED VALIDATION PRIMITIVES
// =============================================================================
// Reusable Zod schemas used across multiple validation files.
// Import from here rather than re-defining the same shapes in each file.
//
// Also re-exports apiSuccess / apiError so route handlers only need one import
// for both validation and response formatting.
// =============================================================================

import { z } from "zod";

// Re-export response helpers so route handlers can import from one place
export { apiSuccess, apiError, API_ERRORS } from "@/types/api";
export type { ApiSuccess, ApiError, ApiResponse, ApiErrorCode } from "@/types/api";

// -----------------------------------------------------------------------------
// PRIMITIVE SCHEMAS
// -----------------------------------------------------------------------------

/** UUID string — matches Prisma's @id @default(uuid()) */
export const UserIdSchema = z
  .string()
  .uuid("Invalid user ID format");

/** Public HTTPS image URL */
export const ImageUrlSchema = z
  .string()
  .url("Invalid image URL")
  .refine(
    (url) => url.startsWith("https://"),
    "Image URL must use HTTPS"
  );

/** Positive integer seed for reproducible generations */
export const SeedSchema = z
  .union([z.number().int(), z.string(), z.null(), z.undefined()])
  .optional()
  .transform((val) => {
    if (val === undefined || val === null || val === "") {
      return Math.floor(Math.random() * 2_147_483_647);
    }
    const num = Number(val);
    if (isNaN(num) || num < 0 || num > 2_147_483_647) {
      return Math.floor(Math.random() * 2_147_483_647);
    }
    return Math.floor(num);
  });

// -----------------------------------------------------------------------------
// PAGINATION
// -----------------------------------------------------------------------------

export const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type PaginationInput = z.infer<typeof PaginationSchema>;

// -----------------------------------------------------------------------------
// PARSE HELPER
// -----------------------------------------------------------------------------

/**
 * Safely parse a request body as JSON, returning null on failure.
 * Use instead of bare `await request.json()` to avoid unhandled throws.
 *
 * @example
 * const body = await parseJsonBody(request);
 * if (!body) return Response.json(apiError("Invalid JSON", API_ERRORS.INVALID_JSON), { status: 400 });
 */
export async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/**
 * Validate data against a Zod schema and return a typed result.
 * Returns the first error message on failure — keeps handler code lean.
 *
 * @example
 * const parsed = validateBody(SingleGenerationSchema, body);
 * if (!parsed.success) {
 *   return Response.json(apiError(parsed.error, API_ERRORS.VALIDATION_ERROR), { status: 400 });
 * }
 * const { prompt, categoryId } = parsed.data;
 */
export function validateBody<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid request data",
    };
  }
  return { success: true, data: result.data };
}
