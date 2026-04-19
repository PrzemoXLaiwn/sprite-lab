/**
 * R2 object-key builders and parser.
 *
 * Single source of truth for the spec's key convention:
 *   gen/{userId}/{projectId}/{assetId}.png          — canonical sprite (step 11a)
 *   gen/{userId}/{projectId}/{assetId}_display.png  — 1024 NN upscale  (step 11b)
 *   gen/{userId}/{projectId}/{assetId}_n.png        — normal map       (module 9)
 *
 * Orchestrator (step 11), regeneration path, community share, and any
 * future orphan-cleanup cron MUST use these helpers rather than
 * hand-formatting keys — drift here = mismatched keys = unreachable
 * uploads / missed cleanups.
 *
 * No logger: pure string building, nothing to log.
 */

import { StorageError } from "../pipeline/errors";

export interface AssetKeyComponents {
  userId: string;
  projectId: string;
  assetId: string;
}

type FieldName = "userId" | "projectId" | "assetId";

/**
 * A component segment must be a non-empty string with no "/" and no
 * whitespace — either would break the slash-delimited path structure.
 * No sanitisation / URL-encoding: CUIDs and UUIDs are safe characters;
 * anything else should surface, not be silently mangled.
 */
function assertValidField(name: FieldName, value: string): void {
  if (typeof value !== "string" || value.length === 0) {
    throw new StorageError(`${name} must be a non-empty string`, {
      context: { field: name, value: String(value) },
    });
  }
  // Reject forward slash (path separator) or any whitespace (ASCII or Unicode).
  if (/[/\s]/.test(value)) {
    throw new StorageError(`${name} must not contain "/" or whitespace`, {
      context: { field: name, value },
    });
  }
}

function assertValidComponents(c: AssetKeyComponents): void {
  assertValidField("userId", c.userId);
  assertValidField("projectId", c.projectId);
  assertValidField("assetId", c.assetId);
}

/**
 * Canonical sprite — the true-pixel-size PNG the user downloads.
 * Pipeline step 11a uploads here. Matches Asset.imageKey.
 */
export function buildAssetKey(c: AssetKeyComponents): string {
  assertValidComponents(c);
  return `gen/${c.userId}/${c.projectId}/${c.assetId}.png`;
}

/**
 * Display variant — 1024² nearest-neighbor upscale the UI renders.
 * Pipeline step 11b uploads here. Matches Asset.displayKey.
 */
export function buildDisplayKey(c: AssetKeyComponents): string {
  assertValidComponents(c);
  return `gen/${c.userId}/${c.projectId}/${c.assetId}_display.png`;
}

/**
 * Normal map — RGB-encoded XYZ normals derived from the sprite's
 * luminance. Produced by the optional module-9 feature; module 2
 * never writes this key but the builder exists for naming consistency
 * and to forbid drift when module 9 lands.
 */
export function buildNormalMapKey(c: AssetKeyComponents): string {
  assertValidComponents(c);
  return `gen/${c.userId}/${c.projectId}/${c.assetId}_n.png`;
}

/**
 * Inverse of `buildAssetKey`. Returns the parsed components or `null`
 * on any mismatch — never throws, never partially parses.
 *
 * Matches ONLY the canonical sprite form `gen/{u}/{p}/{a}.png`. Does
 * NOT match:
 *   - display variants (`..._display.png`)
 *   - normal map variants (`..._n.png`) or any other `_*` suffix
 *   - wrong prefix (not `gen/`)
 *   - missing segments or extra segments
 *   - segments with `/` or whitespace (symmetric with builder rules)
 *   - uppercase prefix / extension (canonical form is lowercase)
 *
 * Used by the orphan-cleanup cron (future module) to identify which
 * user + project owns a given R2 key.
 */
export function parseAssetKey(key: string): AssetKeyComponents | null {
  if (typeof key !== "string") return null;

  // The asset-id capture excludes `_` so `_display` / `_n` variants fall
  // through — the `_` survives the greedy match and breaks `.png$`.
  const re = /^gen\/([^/\s]+)\/([^/\s]+)\/([^/\s_]+)\.png$/;
  const m = re.exec(key);
  if (!m) return null;

  return {
    userId: m[1],
    projectId: m[2],
    assetId: m[3],
  };
}
