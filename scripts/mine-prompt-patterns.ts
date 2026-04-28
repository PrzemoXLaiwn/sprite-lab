#!/usr/bin/env tsx
// =============================================================================
// SpriteLab — Prompt-pattern miner
// =============================================================================
// Reads the Generation table and tells us which words / 2-grams correlate
// with community lajki. Output is a ranked list of "winning phrases" plus
// a list of "anti-patterns" that show up disproportionately in unliked
// generations.
//
// Why: every prompt token costs FLUX attention. We want PROMPT_TEMPLATES
// to lean on the language that actually produces lajkowane outputs and
// to add anti-patterns to the negative prompt.
//
// USAGE
//   npx tsx scripts/mine-prompt-patterns.ts                 # all styles
//   npx tsx scripts/mine-prompt-patterns.ts PIXEL_ART_16    # one style
//   npx tsx scripts/mine-prompt-patterns.ts --json          # machine-readable
//
// HOW IT WORKS
//   1. For each style with >=30 rows, sort by `likes desc`.
//   2. Top 30% = "winners", bottom 30% = "losers".
//   3. For each token (and 2-gram), compute lift =
//        P(token | winner) / P(token | loser).
//   4. Lift > 1.5 with at least 3 occurrences in winners → winning phrase.
//   5. Lift > 1.5 in the OTHER direction → anti-pattern.
//
// OUTPUT
//   Human-readable table per style. Run with `--json` to redirect into a
//   file: `npx tsx … --json > mine-output.json`.
// =============================================================================

import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
if (existsSync(".env.local")) {
  loadEnv({ path: ".env.local" });
} else if (existsSync(".env")) {
  loadEnv({ path: ".env" });
}

// Same Accelerate→Direct fallback as export-training-data.ts.
const dbUrl = process.env.DATABASE_URL ?? "";
const directUrl = process.env.DIRECT_URL ?? "";
const looksLikePostgres = (s: string) =>
  s.startsWith("postgres://") || s.startsWith("postgresql://");
if (!looksLikePostgres(dbUrl) && looksLikePostgres(directUrl)) {
  console.log(
    "[MinePromptPatterns] DATABASE_URL is not postgres:// — using DIRECT_URL."
  );
  process.env.DATABASE_URL = directUrl;
}

import { PrismaClient } from "@prisma/client";

// Stop-words removed before counting. We strip generic English glue plus
// SpriteLab-specific tokens that show up everywhere ("sprite", "art",
// "style", "game", "character") and would dominate the chart without
// actually telling us anything.
const STOPWORDS = new Set([
  "a", "an", "the", "of", "with", "and", "or", "but", "in", "on", "at",
  "to", "for", "from", "by", "as", "is", "are", "was", "were", "be",
  "been", "being", "has", "have", "had", "this", "that", "these", "those",
  "i", "you", "he", "she", "it", "we", "they", "my", "your", "his", "her",
  "its", "our", "their", "no", "not", "do", "does", "did", "so", "very",
  // SpriteLab boilerplate — appears in every prompt, useless signal.
  "sprite", "art", "style", "game", "character", "asset", "subject",
  "view", "background", "transparent", "white", "single", "isolated",
]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    // Keep letters, digits, hyphens. Everything else becomes a separator.
    .replace(/[^a-z0-9 -]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 4 && !STOPWORDS.has(t));
}

function bigrams(tokens: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    out.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return out;
}

interface Row {
  prompt: string;
  fullPrompt: string | null;
  likes: number;
}

function captionOf(r: Row): string {
  return (r.fullPrompt && r.fullPrompt.length > 0 ? r.fullPrompt : r.prompt) ?? "";
}

// Document-level term presence (a token contributes once per row).
// We don't want a single 200-word prompt drowning out everyone else.
function presenceCounts(rows: Row[], includeBigrams: boolean): Map<string, number> {
  const f = new Map<string, number>();
  for (const r of rows) {
    const toks = tokenize(captionOf(r));
    const candidates = includeBigrams
      ? new Set([...toks, ...bigrams(toks)])
      : new Set(toks);
    for (const c of candidates) f.set(c, (f.get(c) ?? 0) + 1);
  }
  return f;
}

interface Lift {
  token: string;
  lift: number;
  topPct: number;
  botPct: number;
  topCount: number;
  botCount: number;
}

function computeLift(
  topF: Map<string, number>,
  botF: Map<string, number>,
  topN: number,
  botN: number,
  minTopCount: number
): { wins: Lift[]; losses: Lift[] } {
  const wins: Lift[] = [];
  const losses: Lift[] = [];
  // Smoothing constant: prevents divide-by-zero / wild lift on rare
  // tokens. 0.02 ≈ "appears in 1/50 generations".
  const eps = 0.02;

  // Wins: high in top, low in bottom.
  for (const [tok, cnt] of topF) {
    if (cnt < minTopCount) continue;
    const topPct = cnt / topN;
    const botCount = botF.get(tok) ?? 0;
    const botPct = botCount / botN;
    const lift = topPct / Math.max(eps, botPct);
    if (lift > 1.5) {
      wins.push({ token: tok, lift, topPct, botPct, topCount: cnt, botCount });
    }
  }

  // Losses: high in bottom, low in top — same formula in reverse.
  for (const [tok, cnt] of botF) {
    if (cnt < minTopCount) continue;
    const botPct = cnt / botN;
    const topCount = topF.get(tok) ?? 0;
    const topPct = topCount / topN;
    const lift = botPct / Math.max(eps, topPct);
    if (lift > 1.5) {
      losses.push({ token: tok, lift, topPct, botPct, topCount, botCount: cnt });
    }
  }

  wins.sort((a, b) => b.lift - a.lift);
  losses.sort((a, b) => b.lift - a.lift);
  return { wins, losses };
}

async function mineStyle(prisma: PrismaClient, style: string, asJson: boolean) {
  const all = await prisma.generation.findMany({
    where: { styleId: style },
    select: { prompt: true, fullPrompt: true, likes: true },
    orderBy: [{ likes: "desc" }, { createdAt: "desc" }],
  });

  if (all.length < 30) {
    if (!asJson) {
      console.log(`\n# ${style} — only ${all.length} rows (need 30+), skipping`);
    }
    return null;
  }

  // Top / bottom 30% buckets, capped at 80 each so a single mega-style
  // doesn't drown out small ones.
  const bucket = Math.min(80, Math.max(15, Math.floor(all.length * 0.3)));
  const top = all.slice(0, bucket);
  const bot = all.slice(-bucket);

  const topF = presenceCounts(top, true);
  const botF = presenceCounts(bot, true);
  const minTopCount = Math.max(3, Math.floor(bucket * 0.1));

  const { wins, losses } = computeLift(topF, botF, top.length, bot.length, minTopCount);
  const result = {
    style,
    total: all.length,
    bucket,
    topMaxLikes: top[0]?.likes ?? 0,
    topMedianLikes: top[Math.floor(top.length / 2)]?.likes ?? 0,
    botMaxLikes: bot[0]?.likes ?? 0,
    wins: wins.slice(0, 20),
    losses: losses.slice(0, 15),
  };

  if (asJson) return result;

  console.log(`\n${"=".repeat(72)}`);
  console.log(`# ${style}  (${all.length} rows; top/bot bucket = ${bucket})`);
  console.log(
    `# top-likes max=${result.topMaxLikes} median=${result.topMedianLikes} | bot max=${result.botMaxLikes}`
  );
  console.log(`${"=".repeat(72)}`);

  console.log(`\n  WINNING PHRASES (consider adding to PROMPT_TEMPLATES)`);
  console.log(`  ${"token".padEnd(30)} ${"lift".padStart(6)}  ${"top%".padStart(6)}  ${"bot%".padStart(6)}`);
  for (const w of wins.slice(0, 20)) {
    console.log(
      `  ${w.token.padEnd(30)} ${w.lift.toFixed(2).padStart(6)}  ${(w.topPct * 100).toFixed(0).padStart(5)}%  ${(w.botPct * 100).toFixed(0).padStart(5)}%`
    );
  }

  console.log(`\n  ANTI-PATTERNS (consider adding to negativePrompt)`);
  console.log(`  ${"token".padEnd(30)} ${"lift".padStart(6)}  ${"top%".padStart(6)}  ${"bot%".padStart(6)}`);
  for (const l of losses.slice(0, 15)) {
    console.log(
      `  ${l.token.padEnd(30)} ${l.lift.toFixed(2).padStart(6)}  ${(l.topPct * 100).toFixed(0).padStart(5)}%  ${(l.botPct * 100).toFixed(0).padStart(5)}%`
    );
  }

  return result;
}

async function main() {
  const argv = process.argv.slice(2);
  const asJson = argv.includes("--json");
  const styleArg = argv.find((a) => !a.startsWith("--"));

  const prisma = new PrismaClient();

  let styles: string[];
  if (styleArg) {
    styles = [styleArg];
  } else {
    // Pull every distinct styleId we have data for. This catches legacy
    // IDs (the admin panel showed 1,207 gens but only ~816 matched our
    // 12 known StyleIds — there's clearly extra stuff in there).
    const distinct = await prisma.generation.findMany({
      select: { styleId: true },
      distinct: ["styleId"],
    });
    styles = distinct.map((r) => r.styleId).filter(Boolean) as string[];
    if (!asJson) console.log(`# Found ${styles.length} distinct styleIds: ${styles.join(", ")}`);
  }

  const results = [];
  for (const s of styles) {
    const r = await mineStyle(prisma, s, asJson);
    if (r) results.push(r);
  }

  if (asJson) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log(
      `\n${"=".repeat(72)}\n# Mined ${results.length} style(s) with enough data.\n` +
        `# Tip: run again with --json > mining-output.json to capture machine-readable.\n`
    );
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("[MinePromptPatterns] fatal:", err);
  process.exit(1);
});
