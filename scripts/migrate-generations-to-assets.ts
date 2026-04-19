#!/usr/bin/env tsx
/**
 * migrate-generations-to-assets.ts
 *
 * One-shot migration: copies every row from the legacy `generations` table
 * into the new `assets` table, tagged `legacy=true`, with the source
 * `generations.id` preserved in `assets.legacy_generation_id` for URL
 * compatibility (not as the asset's own id — see Tweak 5 in the module-1
 * approval thread).
 *
 * SAFE TO RE-RUN. Idempotent via the `legacy_generation_id @unique` constraint
 * — rows already migrated are detected upfront and skipped.
 *
 * Usage:
 *   npx tsx scripts/migrate-generations-to-assets.ts --dry-run
 *   npx tsx scripts/migrate-generations-to-assets.ts
 *   npx tsx scripts/migrate-generations-to-assets.ts --batch-size=1000
 *
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║  AFTER THE FIRST SUCCESSFUL REAL RUN (non-dry), apply this manually:  ║
 * ║                                                                       ║
 * ║    ALTER TABLE assets                                                 ║
 * ║      ADD CONSTRAINT assets_image_location_check                       ║
 * ║      CHECK ((image_key IS NOT NULL) != (legacy_image_url IS NOT NULL));║
 * ║                                                                       ║
 * ║  Prisma push-mode cannot emit CHECK constraints. The constraint       ║
 * ║  enforces that every asset row has exactly one of `image_key` (new)   ║
 * ║  or `legacy_image_url` (migrated) populated. See FOLLOWUP.md #3.      ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 */

import { PrismaClient } from "@prisma/client";
import {
  LEGACY_CATEGORY_REDIRECTS,
  LEGACY_STYLE_REDIRECTS,
  LEGACY_ONLY,
  type OldCategoryId,
  type OldStyleId,
} from "../src/config/legacy/redirect-maps";

const prisma = new PrismaClient();

// ─── CLI args ───────────────────────────────────────────────────────────────

interface Args {
  dryRun: boolean;
  batchSize: number;
}

function parseArgs(argv: string[]): Args {
  let dryRun = false;
  let batchSize = 500;
  for (const arg of argv.slice(2)) {
    if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg.startsWith("--batch-size=")) {
      const n = Number(arg.split("=")[1]);
      if (!Number.isFinite(n) || n <= 0) {
        throw new Error(`Invalid --batch-size: ${arg}`);
      }
      batchSize = n;
    } else if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: npx tsx scripts/migrate-generations-to-assets.ts [--dry-run] [--batch-size=N]"
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return { dryRun, batchSize };
}

// ─── ID redirection ─────────────────────────────────────────────────────────

interface MapResult {
  categoryId: string;
  styleId: string;
  retiredCategory: boolean;
  retiredStyle: boolean;
  unknownCategory: boolean;
  unknownStyle: boolean;
}

function mapIds(oldCategoryId: string, oldStyleId: string): MapResult {
  const catMap = (LEGACY_CATEGORY_REDIRECTS as Record<string, string | typeof LEGACY_ONLY>)[
    oldCategoryId
  ];
  const styleMap = (LEGACY_STYLE_REDIRECTS as Record<string, string | typeof LEGACY_ONLY>)[
    oldStyleId
  ];

  // Redirect semantics (see src/config/legacy/redirect-maps.ts):
  //   - known → real new id: use it
  //   - known → LEGACY_ONLY:  keep old id verbatim (asset is display-only)
  //   - unknown:               keep old id verbatim (flagged in logs)
  return {
    categoryId:
      catMap === undefined || catMap === LEGACY_ONLY ? oldCategoryId : catMap,
    styleId:
      styleMap === undefined || styleMap === LEGACY_ONLY ? oldStyleId : styleMap,
    retiredCategory: catMap === LEGACY_ONLY,
    retiredStyle: styleMap === LEGACY_ONLY,
    unknownCategory: catMap === undefined,
    unknownStyle: styleMap === undefined,
  };
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { dryRun, batchSize } = parseArgs(process.argv);
  const start = Date.now();

  console.log(
    `[migrate] mode=${dryRun ? "DRY-RUN" : "WRITE"} batchSize=${batchSize}`
  );
  console.log(`[migrate] counting source rows…`);

  const preGenCount = await prisma.generation.count();
  const preLegacyAssetCount = await prisma.asset.count({ where: { legacy: true } });
  console.log(
    `[migrate] pre: generations=${preGenCount} legacy-assets=${preLegacyAssetCount}`
  );

  if (preGenCount === 0) {
    console.log(`[migrate] no source rows — nothing to do.`);
    return;
  }

  // Aggregate counters
  let processed = 0;
  let wouldInsertOrInserted = 0;
  let skippedAlreadyMigrated = 0;
  let retiredCategoryCount = 0;
  let retiredStyleCount = 0;
  let unknownCategoryCount = 0;
  let unknownStyleCount = 0;
  const unknownCategoryIds = new Set<string>();
  const unknownStyleIds = new Set<string>();
  let sampleLogged = false;

  // Cursor-based pagination — stable against inserts into generations during
  // the run (there shouldn't be any since it's frozen read-only, but defensive).
  let cursor: string | undefined = undefined;

  while (true) {
    const batch: Awaited<ReturnType<typeof prisma.generation.findMany>> =
      await prisma.generation.findMany({
        take: batchSize,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
      });
    if (batch.length === 0) break;

    // Idempotency: detect rows already migrated in a previous run.
    const ids = batch.map((g) => g.id);
    const existing = await prisma.asset.findMany({
      where: { legacyGenerationId: { in: ids } },
      select: { legacyGenerationId: true },
    });
    const existingSet = new Set(
      existing.map((a) => a.legacyGenerationId).filter((v): v is string => !!v)
    );

    const toInsert: Array<{
      userId: string;
      projectId: string | null;
      folderId: string | null;
      categoryId: string;
      subcategoryId: string | null;
      styleId: string;
      rawPrompt: string;
      composedPrompt: string;
      model: string;
      qualityTier: string;
      seed: number;
      width: number;
      height: number;
      imageKey: null;
      legacyImageUrl: string;
      transparentBg: boolean;
      creditsUsed: number;
      isPublic: boolean;
      likes: number;
      legacy: true;
      legacyGenerationId: string;
      createdAt: Date;
    }> = [];

    for (const g of batch) {
      processed++;

      if (existingSet.has(g.id)) {
        skippedAlreadyMigrated++;
        continue;
      }

      const mapped = mapIds(g.categoryId, g.styleId);
      if (mapped.retiredCategory) retiredCategoryCount++;
      if (mapped.retiredStyle) retiredStyleCount++;
      if (mapped.unknownCategory) {
        unknownCategoryCount++;
        unknownCategoryIds.add(g.categoryId);
      }
      if (mapped.unknownStyle) {
        unknownStyleCount++;
        unknownStyleIds.add(g.styleId);
      }

      toInsert.push({
        userId: g.userId,
        projectId: g.projectId,
        folderId: g.folderId,
        categoryId: mapped.categoryId,
        subcategoryId: g.subcategoryId || null, // old schema: NOT NULL; new: nullable
        styleId: mapped.styleId,
        rawPrompt: g.prompt,
        composedPrompt: g.fullPrompt ?? g.prompt,
        model: "flux-dev",        // best guess — old system didn't consistently record
        qualityTier: "standard",
        seed: g.seed ?? 0,        // sentinel; legacy rows can't regen anyway
        width: 1024,              // Tweak 1: no image probe
        height: 1024,
        imageKey: null,
        legacyImageUrl: g.imageUrl,
        transparentBg: true,
        creditsUsed: 0,           // replicateCost was USD, not credits — drop
        isPublic: g.isPublic,
        likes: g.likes,
        legacy: true,
        legacyGenerationId: g.id,
        createdAt: g.createdAt,
      });
    }

    if (toInsert.length > 0 && !sampleLogged) {
      // One sample payload so the operator can eyeball the shape before committing.
      console.log(`[migrate] sample row (first about-to-insert):`);
      console.log(JSON.stringify(toInsert[0], null, 2));
      sampleLogged = true;
    }

    if (toInsert.length > 0) {
      if (dryRun) {
        wouldInsertOrInserted += toInsert.length;
      } else {
        const result = await prisma.asset.createMany({
          data: toInsert,
          skipDuplicates: true,
        });
        wouldInsertOrInserted += result.count;
        if (result.count !== toInsert.length) {
          // Shouldn't happen (pre-check already filtered existing). Log for audit.
          const diff = toInsert.length - result.count;
          console.warn(
            `[migrate] WARNING: createMany inserted ${result.count} of ${toInsert.length} in this batch (${diff} silently skipped by the DB)`
          );
          skippedAlreadyMigrated += diff;
        }
      }
    }

    cursor = batch[batch.length - 1].id;
    if (processed % (batchSize * 5) === 0 || batch.length < batchSize) {
      console.log(
        `[migrate] progress: processed=${processed}/${preGenCount} ${dryRun ? "would-insert" : "inserted"}=${wouldInsertOrInserted} skipped=${skippedAlreadyMigrated}`
      );
    }
  }

  const postLegacyAssetCount = await prisma.asset.count({ where: { legacy: true } });
  const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);

  console.log(
    [
      ``,
      `[migrate] ${dryRun ? "DRY-RUN COMPLETE" : "DONE"} in ${elapsedSec}s`,
      `  processed:              ${processed}`,
      `  ${dryRun ? "would-insert" : "inserted   "}:           ${wouldInsertOrInserted}`,
      `  skipped (already-done): ${skippedAlreadyMigrated}`,
      `  retired category refs:  ${retiredCategoryCount}`,
      `  retired style refs:     ${retiredStyleCount}`,
      `  unknown category refs:  ${unknownCategoryCount}${unknownCategoryIds.size > 0 ? `  [${Array.from(unknownCategoryIds).join(", ")}]` : ""}`,
      `  unknown style refs:     ${unknownStyleCount}${unknownStyleIds.size > 0 ? `  [${Array.from(unknownStyleIds).join(", ")}]` : ""}`,
      `  generations pre:        ${preGenCount}`,
      `  legacy-assets pre:      ${preLegacyAssetCount}`,
      `  legacy-assets post:     ${postLegacyAssetCount}${dryRun ? "  (unchanged, dry-run)" : ""}`,
      ``,
      dryRun
        ? `[migrate] NOTHING WAS WRITTEN. Re-run without --dry-run to commit.`
        : `[migrate] REMEMBER: apply the assets_image_location_check CHECK constraint (see header).`,
      ``,
    ].join("\n")
  );

  if (unknownCategoryCount > 0 || unknownStyleCount > 0) {
    console.warn(
      `[migrate] NOTE: ${unknownCategoryCount} unknown category and ${unknownStyleCount} unknown style refs were encountered. These rows were migrated with their original IDs verbatim. Review the lists above and consider extending src/config/legacy/redirect-maps.ts if these IDs should map to new-system IDs.`
    );
  }
}

main()
  .catch((err) => {
    console.error(`[migrate] FATAL:`, err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
