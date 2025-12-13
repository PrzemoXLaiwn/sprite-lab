/**
 * Duplicate Generation Detection
 * Prevents users from accidentally generating the same prompt multiple times
 */

interface GenerationRecord {
  prompt: string;
  categoryId: string;
  subcategoryId: string;
  styleId: string;
  timestamp: number;
}

// In-memory cache for recent generations (per user session)
const recentGenerations = new Map<string, GenerationRecord[]>();

// How long to remember generations (5 minutes)
const DUPLICATE_WINDOW_MS = 5 * 60 * 1000;

// Maximum records to keep per user
const MAX_RECORDS_PER_USER = 20;

/**
 * Normalize prompt for comparison (lowercase, trim, remove extra spaces)
 */
function normalizePrompt(prompt: string): string {
  return prompt.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Calculate similarity between two prompts (0-1)
 * Using simple word overlap for speed
 */
function calculateSimilarity(prompt1: string, prompt2: string): number {
  const words1 = new Set(normalizePrompt(prompt1).split(" "));
  const words2 = new Set(normalizePrompt(prompt2).split(" "));

  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Check if a generation request is a potential duplicate
 */
export function checkForDuplicate(
  userId: string,
  prompt: string,
  categoryId: string,
  subcategoryId: string,
  styleId: string
): {
  isDuplicate: boolean;
  similarity: number;
  previousPrompt?: string;
  timeAgo?: string;
} {
  const userRecords = recentGenerations.get(userId) || [];
  const now = Date.now();

  // Clean up old records
  const validRecords = userRecords.filter(
    (record) => now - record.timestamp < DUPLICATE_WINDOW_MS
  );
  recentGenerations.set(userId, validRecords);

  // Check for exact or similar duplicates
  for (const record of validRecords) {
    // Check exact match (same category, subcategory, style)
    if (
      record.categoryId === categoryId &&
      record.subcategoryId === subcategoryId &&
      record.styleId === styleId
    ) {
      const similarity = calculateSimilarity(prompt, record.prompt);

      // If very similar (>80%) or exact match
      if (similarity > 0.8) {
        const timeAgoMs = now - record.timestamp;
        const timeAgo = formatTimeAgo(timeAgoMs);

        return {
          isDuplicate: true,
          similarity,
          previousPrompt: record.prompt,
          timeAgo,
        };
      }
    }
  }

  return { isDuplicate: false, similarity: 0 };
}

/**
 * Record a generation for future duplicate checking
 */
export function recordGeneration(
  userId: string,
  prompt: string,
  categoryId: string,
  subcategoryId: string,
  styleId: string
): void {
  const userRecords = recentGenerations.get(userId) || [];

  // Add new record
  userRecords.push({
    prompt,
    categoryId,
    subcategoryId,
    styleId,
    timestamp: Date.now(),
  });

  // Keep only recent records
  const trimmedRecords = userRecords.slice(-MAX_RECORDS_PER_USER);
  recentGenerations.set(userId, trimmedRecords);
}

/**
 * Clear records for a user (e.g., on logout)
 */
export function clearUserRecords(userId: string): void {
  recentGenerations.delete(userId);
}

/**
 * Format time ago string
 */
function formatTimeAgo(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds} seconds ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;

  return "recently";
}

/**
 * Server-side duplicate check using database
 * More reliable than in-memory for production
 */
export async function checkDatabaseDuplicate(
  prisma: {
    generation: {
      findFirst: (args: {
        where: {
          userId: string;
          prompt: string;
          categoryId: string;
          subcategoryId: string;
          styleId: string;
          createdAt: { gte: Date };
        };
        select: { id: boolean; createdAt: boolean };
      }) => Promise<{ id: string; createdAt: Date } | null>;
    };
  },
  userId: string,
  prompt: string,
  categoryId: string,
  subcategoryId: string,
  styleId: string
): Promise<{
  isDuplicate: boolean;
  existingId?: string;
  createdAt?: Date;
}> {
  try {
    const fiveMinutesAgo = new Date(Date.now() - DUPLICATE_WINDOW_MS);

    const existing = await prisma.generation.findFirst({
      where: {
        userId,
        prompt: normalizePrompt(prompt),
        categoryId,
        subcategoryId,
        styleId,
        createdAt: { gte: fiveMinutesAgo },
      },
      select: { id: true, createdAt: true },
    });

    if (existing) {
      return {
        isDuplicate: true,
        existingId: existing.id,
        createdAt: existing.createdAt,
      };
    }

    return { isDuplicate: false };
  } catch (error) {
    console.error("Duplicate check failed:", error);
    // Don't block generation on duplicate check failure
    return { isDuplicate: false };
  }
}
