/**
 * Pipeline step 5: background removal → Buffer.
 *
 * Thin pipeline-shaped wrapper over `runware.removeBackground` from file #5.
 * Exists because:
 *   - Runware returns a URL; step 6 (sharp pixelation) needs a Buffer.
 *   - Fetching-and-verifying that URL + timeout + error wrapping belongs
 *     one abstraction below the orchestrator — pipeline/generate.ts stays
 *     focused on step ordering, not HTTP transport.
 *
 * Contract:
 *   - Input: URL of the image whose background should be removed (typically
 *     `ImageInferenceResult.images[i].url` from step 4).
 *   - Output: Buffer of the PNG + the Runware taskUUID (for audit
 *     correlation; persisted on the Asset row in step 12).
 *   - Every failure path throws BackgroundRemovalError with cause + context.
 */

import { runware } from "../runware/client";
import { BackgroundRemovalError } from "../pipeline/errors";
import { logger } from "../logger";

/** Total budget for the post-BG-removal URL fetch (request + body read). */
const FETCH_TIMEOUT_MS = 30_000;

/**
 * Max characters of the image URL to surface in logs / error context.
 * Runware returns long signed S3 URLs — the leading path is enough for
 * identification; the signature suffix is noise in logs.
 */
const URL_LOG_TRUNCATE = 80;

function truncate(url: string): string {
  return url.slice(0, URL_LOG_TRUNCATE);
}

function assertValidImageUrl(url: string): void {
  if (typeof url !== "string" || url.length === 0) {
    throw new BackgroundRemovalError(
      "removeBackgroundToBuffer: imageUrl must be a non-empty string",
      { context: { imageUrl: "" } }
    );
  }
  if (!url.startsWith("https://")) {
    throw new BackgroundRemovalError(
      `removeBackgroundToBuffer: imageUrl must start with https:// (got: ${truncate(url)})`,
      { context: { imageUrl: truncate(url) } }
    );
  }
}

/**
 * Runs background removal via Runware, then fetches the resulting PNG into
 * a Buffer that step 6 can feed directly into sharp.
 *
 * Failure modes (all → BackgroundRemovalError with `cause` and/or context):
 *   - Invalid `imageUrl` (empty / non-https).
 *   - Runware API failure (already typed — bubbles untouched from client.ts).
 *   - Fetch timeout after 30s (AbortController).
 *   - Non-2xx response.
 *   - Empty response body.
 *   - Any other fetch / body-read failure (DNS, TLS, network, stream abort).
 */
export async function removeBackgroundToBuffer(
  imageUrl: string
): Promise<{ buffer: Buffer; taskUUID: string }> {
  assertValidImageUrl(imageUrl);

  // Runware call. Its own errors are already BackgroundRemovalError with
  // SDK-level context; let them bubble unchanged.
  const result = await runware.removeBackground({
    imageInput: imageUrl,
    outputFormat: "PNG",
  });

  // Fetch the returned URL into a Buffer for step 6.
  const truncatedInput = truncate(imageUrl);
  const t0 = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(result.url, { signal: controller.signal });

    if (!response.ok) {
      throw new BackgroundRemovalError(
        `fetch returned ${response.status}${response.statusText ? " " + response.statusText : ""}`,
        {
          context: {
            imageUrl: truncatedInput,
            taskUUID: result.taskUUID,
            status: response.status,
          },
        }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      throw new BackgroundRemovalError("fetch returned empty body", {
        context: {
          imageUrl: truncatedInput,
          taskUUID: result.taskUUID,
        },
      });
    }

    const durationMs = Date.now() - t0;
    logger.debug("removeBackgroundToBuffer ok", {
      taskUUID: result.taskUUID,
      inputUrl: truncatedInput,
      fetchBytes: buffer.length,
      durationMs,
    });

    return { buffer, taskUUID: result.taskUUID };
  } catch (cause) {
    // BackgroundRemovalError thrown inside this block (non-2xx, empty body)
    // — rethrow untouched to keep their specific context intact.
    if (cause instanceof BackgroundRemovalError) throw cause;

    // AbortController fired → fetch timed out.
    if (cause instanceof Error && cause.name === "AbortError") {
      throw new BackgroundRemovalError(
        `fetch timeout after ${FETCH_TIMEOUT_MS}ms`,
        {
          context: {
            imageUrl: truncatedInput,
            taskUUID: result.taskUUID,
            timeoutMs: FETCH_TIMEOUT_MS,
          },
        }
      );
    }

    // Network / DNS / TLS / body-stream failure.
    throw new BackgroundRemovalError("fetch failed", {
      cause,
      context: {
        imageUrl: truncatedInput,
        taskUUID: result.taskUUID,
      },
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
