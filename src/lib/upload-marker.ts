// =============================================================================
// Uploaded sprites (POST /api/import-sprite) — how they're marked
// =============================================================================
// An upload is a free, user-supplied image saved as a generation row so the
// tools can use it. It is not work we made: it never counts as "generated"
// (usage stats, quests, XP, getting-started) and is never shared publicly.
// Client-safe (no I/O, no sharp).
// =============================================================================

/** Uploads are stored with this marker at the start of full_prompt. */
export const UPLOAD_MARKER = "[upload]";

export function isUploadedPrompt(fullPrompt: string | null | undefined): boolean {
  return (fullPrompt ?? "").startsWith(UPLOAD_MARKER);
}

/**
 * Prisma `where` fragment for generation rows that aren't uploads. Spelled with
 * an OR on NULL because `NOT { startsWith }` alone also drops rows whose
 * full_prompt is NULL (SQL NOT on NULL is NULL).
 */
export const NOT_UPLOADED = {
  OR: [{ fullPrompt: null }, { NOT: { fullPrompt: { startsWith: UPLOAD_MARKER } } }],
};

/** The same filter for raw SQL on the generations table. */
export const NOT_UPLOADED_SQL = `(full_prompt IS NULL OR full_prompt NOT LIKE '${UPLOAD_MARKER}%')`;
