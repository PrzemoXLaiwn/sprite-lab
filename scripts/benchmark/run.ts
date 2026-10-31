/**
 * Offline generation/animation benchmark.
 *
 *   npx tsx scripts/benchmark/run.ts [outDir]
 *
 * Writes metrics.json and contact-sheet.png. Makes no provider calls.
 *
 * Live calls (only when you pass --live AND RUNWARE_API_KEY is set) are
 * capped at $3 of list price and are NOT the default:
 *
 *   npx tsx --env-file=.env.local scripts/benchmark/run.ts --live [outDir]
 *
 * This script is not imported by the app.
 */
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { LIVE_SPEND_CAP_USD, defaultLiveCatalog, selectUnderCap } from "../../src/lib/benchmark/cost-map";
import { runCappedLive } from "../../src/lib/benchmark/live-run";
import { runOfflineBenchmark } from "../../src/lib/benchmark/offline-harness";
import { PRICE } from "../../src/lib/billing/features";

const args = process.argv.slice(2);
const live = args.includes("--live");
const outDir = args.find((a) => !a.startsWith("--")) ?? join("scripts", "benchmark", "out");

async function main() {
  const bench = await runOfflineBenchmark();
  mkdirSync(outDir, { recursive: true });
  const liveReport = await maybeLive(outDir);
  const metrics = {
    measuredAt: bench.measuredAt,
    liveProviderCalls: liveReport.calls,
    spendUsd: liveReport.spendUsd,
    note: bench.note,
    prompts: bench.prompts,
    rows: bench.rows,
    live: liveReport,
  };
  writeFileSync(join(outDir, "metrics.json"), JSON.stringify(metrics, null, 2));
  writeFileSync(join(outDir, "contact-sheet.png"), bench.contactSheet);
  console.log(`Wrote ${join(outDir, "metrics.json")}`);
  console.log(`Wrote ${join(outDir, "contact-sheet.png")}`);
  console.log(JSON.stringify({ rows: bench.rows, live: liveReport }, null, 2));
}

async function maybeLive(outDir: string) {
  const plan = selectUnderCap(defaultLiveCatalog(), LIVE_SPEND_CAP_USD);
  if (!live) {
    return { ran: false, calls: 0, spendUsd: 0, reason: "Offline only. Pass --live to attempt one capped Runware call." };
  }
  if (!process.env.RUNWARE_API_KEY) {
    return { ran: false, calls: 0, spendUsd: 0, reason: "RUNWARE_API_KEY is not set. No provider call was made.", plan };
  }
  // One text-to-image call. The animation grid model needs a reference image,
  // so it is not sent from this probe.
  const klein = plan.selected.find((c) => c.id === "sprite-klein");
  if (!klein) return { ran: false, calls: 0, spendUsd: 0, reason: "Catalog did not fit under the cap.", plan };
  const out = await runCappedLive(
    [{
      id: klein.id,
      listUsd: klein.listUsd,
      body: [{
        taskType: "imageInference",
        taskUUID: randomUUID(),
        model: klein.model,
        positivePrompt: "A 2D video game sprite of a red slime, centered, plain flat solid pure white background. No text.",
        width: 1024,
        height: 1024,
        numberResults: 1,
        outputType: "URL",
        outputFormat: "PNG",
        includeCost: true,
      }],
    }],
    { capUsd: LIVE_SPEND_CAP_USD, apiKey: process.env.RUNWARE_API_KEY },
  );
  const image = out.results[0]?.image;
  if (image) writeFileSync(join(outDir, "live-klein.png"), image);
  return {
    ran: true,
    calls: out.results.length,
    spendUsd: out.spendUsd,
    skipped: out.skipped,
    errors: out.results.filter((r) => r.error).map((r) => ({ id: r.id, error: r.error })),
    reportedUsd: out.results.map((r) => ({ id: r.id, reportedUsd: r.reportedUsd, listUsd: r.listUsd })),
    listPrice: PRICE.standard,
    capUsd: LIVE_SPEND_CAP_USD,
  };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
