#!/usr/bin/env tsx
/**
 * One-shot verification script for the BiRefNet model hash used in
 * src/lib/runware/client.ts.
 *
 * Usage:
 *   npx tsx scripts/verify-birefnet-hash.ts
 *
 * Loads RUNWARE_API_KEY from .env.local (Next.js convention) at repo root.
 * The key is never printed or embedded — it goes straight from process.env
 * into the SDK's constructor.
 *
 * Exit codes:
 *   0 — response contains a non-empty imageURL (hash works, pipeline contract met)
 *   1 — error, missing imageURL, or any unexpected failure
 */

import dotenv from "dotenv";
import path from "path";
import { Runware } from "@runware/sdk-js";

// Script runs from worktree root (.claude/worktrees/<branch>/); .env.local
// lives at the repo root, three levels up.
const envPath = path.resolve(process.cwd(), "../../../.env.local");
const envResult = dotenv.config({ path: envPath });
if (envResult.error) {
  console.error(`Failed to load env file at: ${envPath}`);
  console.error(`Reason: ${envResult.error.message}`);
  process.exit(1);
}

const apiKey = process.env.RUNWARE_API_KEY;
if (!apiKey) {
  console.error("RUNWARE_API_KEY not set after loading .env.local");
  process.exit(1);
}

const MODEL_HASH = "runware:112@5";
const TEST_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Cat03.jpg/640px-Cat03.jpg";

async function main(): Promise<void> {
  console.log(`Verifying BG-removal model hash: ${MODEL_HASH}`);
  console.log(`Test input:                      ${TEST_IMAGE}`);
  console.log();

  const client = new Runware({ apiKey: apiKey! });

  try {
    await client.ensureConnection();
    console.log("SDK connection OK");
  } catch (err) {
    console.error("SDK connection FAILED:");
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const t0 = Date.now();
  let result: unknown;
  try {
    result = await client.removeBackground({
      model: MODEL_HASH,
      inputImage: TEST_IMAGE,
      outputType: "URL",
      outputFormat: "PNG",
    });
  } catch (err) {
    console.error(`removeBackground threw after ${Date.now() - t0}ms:`);
    if (err instanceof Error) {
      console.error(`  name:    ${err.name}`);
      console.error(`  message: ${err.message}`);
    }
    console.error("Full error serialisation:");
    try {
      const props = err instanceof Error ? Object.getOwnPropertyNames(err) : [];
      console.error(JSON.stringify(err, props.length > 0 ? props : undefined, 2));
    } catch {
      console.error(String(err));
    }
    process.exit(1);
  }
  const durationMs = Date.now() - t0;

  console.log(`removeBackground returned in ${durationMs}ms`);
  console.log("Full response:");
  console.log(JSON.stringify(result, null, 2));

  const urlPresent =
    result !== null &&
    typeof result === "object" &&
    "imageURL" in result &&
    typeof (result as { imageURL: unknown }).imageURL === "string" &&
    (result as { imageURL: string }).imageURL.length > 0;

  console.log();
  if (urlPresent) {
    console.log("HASH VALID — imageURL present in response");
    process.exit(0);
  } else {
    console.log("HASH AMBIGUOUS — response missing a non-empty imageURL field");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unhandled:", err);
  process.exit(1);
});
