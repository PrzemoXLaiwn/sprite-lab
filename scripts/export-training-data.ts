#!/usr/bin/env tsx
// =============================================================================
// SpriteLab — Training data export
// =============================================================================
// Pulls historical Generation rows from the production DB and writes them
// out as a JSONL training set ready for Runware Training (or any other
// LoRA / fine-tuning endpoint that accepts {image_url, caption} pairs).
//
// USAGE
//   npx tsx scripts/export-training-data.ts ^
//     --style PIXEL_ART_16 ^
//     --category CHARACTERS ^
//     --limit 200 ^
//     --output ./training-data/spritelab-pixel-character.jsonl
//
//   (use `\` line continuations on bash, `^` on Windows cmd, or one line.)
//
// ENV
//   The script auto-loads `.env.local` first, then `.env` if present, so
//   DATABASE_URL / DIRECT_URL come from the same files Next dev uses.
//   Ensure both are set or the Prisma client can't connect.
//
// DEFAULTS
//   --limit       200    (Runware LoRA training works well with 50-500 images)
//   --output      ./training-data/<style>[-<category>].jsonl
//   --min-likes   0      (filter by community likes if you want curated set)
//   --public-only true   (skip private generations)
//
// OUTPUT FORMAT (one JSON per line)
//   { "image": "<https url>", "caption": "<full prompt>" }
//
// AFTER EXPORT
//   See docs/CUSTOM_MODEL.md for the actual training-on-Runware steps.
// =============================================================================

// Load env BEFORE PrismaClient. Prisma reads DATABASE_URL at construction
// time; if the env file isn't loaded yet, the client throws. Try
// `.env.local` first (Next dev convention) then fall back to `.env`.
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
if (existsSync(".env.local")) {
  loadEnv({ path: ".env.local" });
} else if (existsSync(".env")) {
  loadEnv({ path: ".env" });
}

// Vercel projects using Prisma Accelerate set DATABASE_URL to a
// `prisma://accelerate.prisma-data.net/...` proxy URL — perfect for the
// Next runtime, but the standalone PrismaClient in this script doesn't
// know how to talk to it (Accelerate needs the @prisma/extension-accelerate
// package). Fall back to DIRECT_URL, which is always a real
// `postgres://` connection string used for migrations / one-off scripts.
const dbUrl = process.env.DATABASE_URL ?? "";
const directUrl = process.env.DIRECT_URL ?? "";
const looksLikePostgres = (s: string) =>
  s.startsWith("postgres://") || s.startsWith("postgresql://");
if (!looksLikePostgres(dbUrl) && looksLikePostgres(directUrl)) {
  console.log(
    "[ExportTrainingData] DATABASE_URL is not a postgres:// URL " +
      "(probably Prisma Accelerate); using DIRECT_URL instead."
  );
  process.env.DATABASE_URL = directUrl;
}

import { PrismaClient } from "@prisma/client";
import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

interface CliArgs {
  style?: string;
  category?: string;
  limit: number;
  output?: string;
  minLikes: number;
  publicOnly: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { limit: 200, minLikes: 0, publicOnly: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === "--style" && next) args.style = next;
    else if (a === "--category" && next) args.category = next;
    else if (a === "--limit" && next) args.limit = Math.max(1, parseInt(next, 10));
    else if (a === "--output" && next) args.output = next;
    else if (a === "--min-likes" && next) args.minLikes = Math.max(0, parseInt(next, 10));
    else if (a === "--public-only" && next) args.publicOnly = next !== "false";
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.style && !args.category) {
    console.error(
      "[ExportTrainingData] error: provide at least one of --style or --category"
    );
    process.exit(1);
  }

  const prisma = new PrismaClient();

  // Build a where clause from whatever filters the user passed.
  // styleId / categoryId are stored verbatim on the Generation row.
  const where: Record<string, unknown> = {};
  if (args.style) where.styleId = args.style;
  if (args.category) where.categoryId = args.category;
  if (args.publicOnly) where.isPublic = true;
  if (args.minLikes > 0) where.likes = { gte: args.minLikes };

  console.log("[ExportTrainingData] Querying generations…", where);

  const rows = await prisma.generation.findMany({
    where,
    take: args.limit,
    orderBy: [{ likes: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      prompt: true,
      fullPrompt: true,
      imageUrl: true,
      styleId: true,
      categoryId: true,
      subcategoryId: true,
      seed: true,
      likes: true,
      createdAt: true,
    },
  });

  console.log(`[ExportTrainingData] Found ${rows.length} rows.`);

  if (rows.length === 0) {
    console.warn(
      "[ExportTrainingData] No rows matched. Lower --min-likes, drop --public-only, or relax the filter."
    );
    await prisma.$disconnect();
    process.exit(2);
  }

  const outputPath =
    args.output ??
    `./training-data/spritelab-${(args.style ?? "any").toLowerCase()}${
      args.category ? "-" + args.category.toLowerCase() : ""
    }.jsonl`;

  await mkdir(dirname(outputPath), { recursive: true });

  // JSONL = one record per line. Caption uses fullPrompt when available
  // (the actual string that hit FLUX), falling back to the user-typed
  // prompt — fullPrompt makes the LoRA learn the whole framing recipe.
  const lines = rows
    .map((r) =>
      JSON.stringify({
        image: r.imageUrl,
        caption: (r.fullPrompt && r.fullPrompt.length > 0 ? r.fullPrompt : r.prompt).trim(),
        meta: {
          id: r.id,
          style: r.styleId,
          category: r.categoryId,
          subcategory: r.subcategoryId,
          seed: r.seed,
          likes: r.likes,
        },
      })
    )
    .join("\n");

  await writeFile(outputPath, lines + "\n", "utf8");

  console.log(`[ExportTrainingData] ✅ Wrote ${rows.length} entries → ${outputPath}`);
  console.log(`[ExportTrainingData]    Next: see docs/CUSTOM_MODEL.md`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("[ExportTrainingData] fatal:", err);
  process.exit(1);
});
