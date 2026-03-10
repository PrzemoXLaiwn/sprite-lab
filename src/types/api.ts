// =============================================================================
// SPRITELAB — STANDARD API RESPONSE TYPES
// =============================================================================
// Every API route should return one of these shapes.
// This makes client-side error handling consistent and predictable.
//
// Usage in a route handler:
//   return Response.json(apiSuccess({ imageUrl }))
//   return Response.json(apiError("Not enough credits"), { status: 402 })
//
// Usage on the client:
//   const data: ApiResponse<GenerateResult> = await res.json()
//   if (!data.success) { showError(data.error); return; }
//   const { imageUrl } = data.data;
// =============================================================================

// -----------------------------------------------------------------------------
// CORE TYPES
// -----------------------------------------------------------------------------

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  /** Human-readable error message safe to show to users */
  error: string;
  /**
   * Optional machine-readable error code for client branching.
   * Examples: "INSUFFICIENT_CREDITS", "VALIDATION_ERROR", "RATE_LIMITED",
   *           "UNAUTHENTICATED", "FORBIDDEN", "NOT_FOUND"
   */
  code?: string;
}

/** Union type — use this as the return type annotation for route handlers */
export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Wrap data in a standard success envelope.
 *
 * @example
 * return Response.json(apiSuccess({ imageUrl, seed }))
 */
export function apiSuccess<T>(data: T): ApiSuccess<T> {
  return { success: true, data };
}

/**
 * Wrap an error message in a standard error envelope.
 *
 * @param error   Human-readable message shown to the user
 * @param code    Optional machine-readable code for client-side branching
 *
 * @example
 * return Response.json(apiError("Not enough credits", "INSUFFICIENT_CREDITS"), { status: 402 })
 * return Response.json(apiError(parsed.error.issues[0].message, "VALIDATION_ERROR"), { status: 400 })
 */
export function apiError(error: string, code?: string): ApiError {
  return { success: false, error, ...(code ? { code } : {}) };
}

// -----------------------------------------------------------------------------
// COMMON ERROR CODES
// -----------------------------------------------------------------------------
// Centralised constants prevent typos in magic strings across route handlers.

export const API_ERRORS = {
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INSUFFICIENT_CREDITS: "INSUFFICIENT_CREDITS",
  RATE_LIMITED: "RATE_LIMITED",
  GENERATION_FAILED: "GENERATION_FAILED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  INVALID_JSON: "INVALID_JSON",
} as const;

export type ApiErrorCode = (typeof API_ERRORS)[keyof typeof API_ERRORS];

// -----------------------------------------------------------------------------
// PAGINATION
// -----------------------------------------------------------------------------

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export function paginatedSuccess<T>(
  items: T[],
  total: number,
  limit: number,
  offset: number
): ApiSuccess<PaginatedResponse<T>> {
  return apiSuccess({
    items,
    total,
    limit,
    offset,
    hasMore: offset + items.length < total,
  });
}
