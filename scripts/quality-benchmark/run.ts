/**
 * Isolated generation-quality benchmark. Not imported by the app.
 *
 *   npx tsx scripts/quality-benchmark/run.ts
 *       Writes the synthetic before/after contact sheet and metrics.
 *       Spends nothing.
 *
 *   npx tsx --env-file=.env.local scripts/quality-benchmark/run.ts --live
 *       Also calls Runware for the fixed prompt set. Hard cap is $3
 *       (list price reserved before each call). Refuses to start when
 *       RUNWARE_API_KEY is missing. Does not charge credits, write the
 *       ledger, or touch the database.
 *
 * Optional:
 *   --out <dir>          default docs/quality-investigation/outputs
 *   --cap <usd>          default 3, cannot be raised above 3
 *   --hd                 also one GPT Image Mini still (list $0.036) of pixel-knight
 *   --animate            one 1024 Nano Banana walk grid (list $0.0692) using the klein knight
 *   --extra-model <air>  one extra still of pixel-knight; requires --extra-usd <list price>
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { BENCHMARK_CASES, currentPrompt, DEFAULT_CAP_USD, PRODUCTION_MODELS, strictPrompt } from "../../src/lib/quality-benchmark/cases";
import { runOffline } from "../../src/lib/quality-benchmark/offline";
import { contactSheet } from "../../src/lib/quality-benchmark/contact-sheet";
import { applyQualityPass } from "../../src/lib/image/quality-postprocess";
import { postprocessSprite } from "../../src/lib/image/sprite-postprocess";

const CAP_HARD = 3;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function has(name: string): boolean {
  return process.argv.includes(name);
}

interface Spend {
  spent: number;
  cap: number;
  calls: { id: string; model: string; listUsd: number; reportedUsd: number | null; outcome: string }[];
}

function reserve(spend: Spend, listUsd: number, id: string): void {
  if (!(listUsd > 0) || listUsd > spend.cap) {
    throw new Error(`Refusing ${id}: list price $${listUsd} is outside the $${spend.cap} cap`);
  }
  if (spend.spent + listUsd > spend.cap + 1e-9) {
    throw new Error(`Stopping before ${id}: $${(spend.spent + listUsd).toFixed(4)} would pass the $${spend.cap} cap`);
  }
}

async function runware(task: Record<string, unknown>, spend: Spend, id: string, listUsd: number): Promise<{ img: Buffer; reported: number | null }> {
  const key = process.env.RUNWARE_API_KEY;
  if (!key) throw new Error("RUNWARE_API_KEY is not set");
  reserve(spend, listUsd, id);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);
  let reported: number | null = null;
  let outcome = "error";
  try {
    const res = await fetch("https://api.runware.ai/v1", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify([{
        taskType: "imageInference",
        taskUUID: randomUUID(),
        outputType: "URL",
        outputFormat: "PNG",
        includeCost: true,
        numberResults: 1,
        width: 1024,
        height: 1024,
        ...task,
      }]),
      signal: controller.signal,
    });
    const json = (await res.json().catch(() => ({}))) as {
      data?: { imageURL?: string; cost?: number }[];
      errors?: { code?: string; message?: string }[];
    };
    if (json.errors?.length || !json.data?.[0]?.imageURL) {
      const e = json.errors?.[0];
      outcome = "error";
      throw new Error(`Runware ${e?.code ?? res.status}: ${e?.message ?? "no image"}`.slice(0, 240));
    }
    reported = typeof json.data[0].cost === "number" ? json.data[0].cost : null;
    const imgRes = await fetch(json.data[0].imageURL, { signal: controller.signal });
    if (!imgRes.ok) throw new Error(`download ${imgRes.status}`);
    outcome = "ok";
    return { img: Buffer.from(await imgRes.arrayBuffer()), reported };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const timeout = /abort|timeout/i.test(msg);
    outcome = timeout ? "timeout" : "error";
    // A timeout may have been billed. An explicit Runware error was not.
    reported = timeout ? listUsd : 0;
    throw err;
  } finally {
    clearTimeout(timer);
    spend.spent += reported ?? listUsd;
    spend.calls.push({ id, model: String(task.model ?? ""), listUsd, reportedUsd: reported, outcome });
  }
}

async function main() {
  const outDir = arg("--out") || "docs/quality-investigation/outputs";
  mkdirSync(outDir, { recursive: true });

  const offline = await runOffline();
  writeFileSync(join(outDir, "offline-contact-sheet.png"), offline.sheet);
  const summary: Record<string, unknown> = {
    live: false,
    reason: "offline only",
    offline: offline.rows,
    capUsd: Math.min(CAP_HARD, Number(arg("--cap") ?? DEFAULT_CAP_USD) || DEFAULT_CAP_USD),
  };

  if (!has("--live")) {
    writeFileSync(join(outDir, "metrics.json"), JSON.stringify(summary, null, 2));
    console.log(`Offline sheet written to ${outDir}. Pass --live to call Runware (cap $${summary.capUsd}).`);
    return;
  }

  if (!process.env.RUNWARE_API_KEY) {
    summary.reason = "RUNWARE_API_KEY is not set; live run skipped";
    writeFileSync(join(outDir, "metrics.json"), JSON.stringify(summary, null, 2));
    console.error(summary.reason);
    process.exitCode = 2;
    return;
  }

  const cap = Math.min(CAP_HARD, Number(arg("--cap") ?? DEFAULT_CAP_USD) || DEFAULT_CAP_USD);
  const spend: Spend = { spent: 0, cap, calls: [] };
  const sheetRows: { title: string; cells: { title: string; png: Buffer }[] }[] = [];

  for (const c of BENCHMARK_CASES) {
    const prompt = currentPrompt(c);
    const id = `${c.id}:current`;
    try {
      const { img } = await runware({
        model: PRODUCTION_MODELS.standard.air,
        positivePrompt: prompt.slice(0, 2900),
        seed: 12011,
      }, spend, id, PRODUCTION_MODELS.standard.listUsd);
      writeFileSync(join(outDir, `${c.id}-klein-raw.png`), img);
      const current = await postprocessSprite(img, { pixelGrid: c.pixel ? 128 : undefined, paletteSize: 32 });
      const quality = await applyQualityPass(current.png, { pixel: c.pixel });
      writeFileSync(join(outDir, `${c.id}-current.png`), current.png);
      writeFileSync(join(outDir, `${c.id}-quality.png`), quality);
      sheetRows.push({
        title: c.id,
        cells: [
          { title: "Raw klein", png: img },
          { title: "Current post", png: current.png },
          { title: "Quality flag", png: quality },
        ],
      });
      console.log(`${id} bg=${current.backgroundRemoved} colors=${current.colors ?? "-"}`);
    } catch (err) {
      console.error(`${id} failed:`, err instanceof Error ? err.message : err);
    }
  }

  // One strict-prompt comparison on the pixel knight, same seed, so the
  // prompt is the only change. Skipped automatically if the cap is tight.
  try {
    const knight = BENCHMARK_CASES[0];
    const { img } = await runware({
      model: PRODUCTION_MODELS.standard.air,
      positivePrompt: strictPrompt(knight).slice(0, 2900),
      seed: 12011,
    }, spend, "pixel-knight:strict", PRODUCTION_MODELS.standard.listUsd);
    writeFileSync(join(outDir, "pixel-knight-strict-raw.png"), img);
    const processed = await postprocessSprite(img, { pixelGrid: 128, paletteSize: 32 });
    writeFileSync(join(outDir, "pixel-knight-strict.png"), processed.png);
    sheetRows.push({
      title: "pixel-knight strict prompt",
      cells: [{ title: "Strict + current post", png: processed.png }],
    });
  } catch (err) {
    console.error("strict prompt skipped:", err instanceof Error ? err.message : err);
  }

  if (has("--hd")) {
    try {
      const { img } = await runware({
        model: PRODUCTION_MODELS.hd.air,
        positivePrompt: currentPrompt(BENCHMARK_CASES[0]).slice(0, 2900),
      }, spend, "pixel-knight:hd", PRODUCTION_MODELS.hd.listUsd);
      writeFileSync(join(outDir, "pixel-knight-hd-raw.png"), img);
      const processed = await postprocessSprite(img, { pixelGrid: 128, paletteSize: 32 });
      writeFileSync(join(outDir, "pixel-knight-hd.png"), processed.png);
      sheetRows.push({ title: "pixel-knight HD", cells: [{ title: "GPT Image Mini", png: processed.png }] });
    } catch (err) {
      console.error("hd skipped:", err instanceof Error ? err.message : err);
    }
  }

  if (has("--animate")) {
    try {
      const { readFileSync } = await import("node:fs");
      const reference = readFileSync(join(outDir, "pixel-knight-current.png"));
      const { img } = await runware({
        model: PRODUCTION_MODELS.animation.air,
        positivePrompt: "A 2x2 sprite sheet of this exact pixel-art knight walking to the right, four distinct poses, wide white gaps, plain white background, no grid lines, no text.",
        referenceImages: [`data:image/png;base64,${reference.toString("base64")}`],
      }, spend, "pixel-knight:walk-grid", PRODUCTION_MODELS.animation.listUsd);
      writeFileSync(join(outDir, "pixel-knight-walk-grid.png"), img);
    } catch (err) {
      console.error("animate skipped:", err instanceof Error ? err.message : err);
    }
  }

  const extra = arg("--extra-model");
  const extraUsd = Number(arg("--extra-usd"));
  if (extra) {
    if (!Number.isFinite(extraUsd) || extraUsd <= 0) {
      console.error("--extra-model requires --extra-usd <positive list price>");
    } else {
      try {
        const { img } = await runware({
          model: extra,
          positivePrompt: currentPrompt(BENCHMARK_CASES[0]).slice(0, 2900),
          seed: 12011,
        }, spend, "pixel-knight:extra", extraUsd);
        const safe = extra.replace(/[^a-z0-9]+/gi, "_").slice(0, 40);
        writeFileSync(join(outDir, `pixel-knight-extra-${safe}.png`), img);
      } catch (err) {
        console.error("extra model skipped:", err instanceof Error ? err.message : err);
      }
    }
  }

  if (sheetRows.length) {
    writeFileSync(join(outDir, "live-contact-sheet.png"), await contactSheet(sheetRows, 256));
  }
  summary.live = spend.calls.some((c) => c.outcome === "ok");
  summary.reason = summary.live ? "live run finished" : "live run attempted, no successful image";
  summary.spentUsd = Math.round(spend.spent * 1e6) / 1e6;
  summary.calls = spend.calls;
  writeFileSync(join(outDir, "metrics.json"), JSON.stringify(summary, null, 2));
  console.log(`Spent $${spend.spent.toFixed(4)} of $${spend.cap} across ${spend.calls.length} calls.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
