// Shared input validation for project create (POST /api/projects) and
// update (PATCH /api/projects/[id]). Not a route file.

export const PROJECT_FIELD_LIMITS = {
  name: 100,
  gameType: 100,
  perspective: 50,
  artStyle: 100,
  mood: 100,
  systems: 500,
  notes: 2000,
} as const;

type ProjectField = keyof typeof PROJECT_FIELD_LIMITS;

export type ProjectFields = Partial<Record<ProjectField, string | null>>;

/**
 * Validates the known project fields in `body`.
 * - Fields that are absent (undefined) are omitted from the result.
 * - null or empty/whitespace strings become null (clears optional fields).
 * - Non-string values or strings over the length limit are rejected.
 * Strings are trimmed.
 */
export function parseProjectFields(
  body: Record<string, unknown>
): { fields: ProjectFields } | { error: string } {
  const fields: ProjectFields = {};

  for (const key of Object.keys(PROJECT_FIELD_LIMITS) as ProjectField[]) {
    const value = body[key];
    if (value === undefined) continue;

    if (value === null) {
      fields[key] = null;
      continue;
    }

    if (typeof value !== "string") {
      return { error: `Invalid ${key}` };
    }

    const trimmed = value.trim();
    if (trimmed.length > PROJECT_FIELD_LIMITS[key]) {
      return { error: `${key} is too long (max ${PROJECT_FIELD_LIMITS[key]} characters)` };
    }

    fields[key] = trimmed || null;
  }

  return { fields };
}
