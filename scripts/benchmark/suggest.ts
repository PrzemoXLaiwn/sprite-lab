/**
 * Motion-suggestion benchmark. Offline by default (no API call).
 *
 *   npx tsx scripts/benchmark/suggest.ts
 *
 * With a key, --live asks Haiku and Opus once each for every prompt, stops
 * before the list-price cap, and writes suggest-metrics.json. A 1×1 white
 * PNG is sent as the image because this environment has no sprite library.
 * That is not a substitute for scoring real sprites. Do not treat a run on
 * that placeholder as a quality verdict about production art.
 *
 *   npx tsx --env-file=.env.local scripts/benchmark/suggest.ts --live [outDir]
 */
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import sharp from "sharp";
import { SUGGEST_BENCH_PROMPTS, scoreSuggestions, suggestPriceDelta } from "../../src/lib/benchmark/suggest-bench";
import { parseSuggestionPayload } from "../../src/lib/animation-suggest";

const CAP_USD = 3;
const args = process.argv.slice(2);
const live = args.includes("--live");
const outDir = args.find((a) => !a.startsWith("--")) ?? join("scripts", "benchmark", "out");

async function main() {
  mkdirSync(outDir, { recursive: true });
  const illustrative = suggestPriceDelta({ input_tokens: 2000, output_tokens: 400 });
  const report: Record<string, unknown> = {
    prompts: SUGGEST_BENCH_PROMPTS.length,
    liveCalls: 0,
    spendUsd: 0,
    illustrativeTokens: { input_tokens: 2000, output_tokens: 400, note: "Not measured. Same counts on both models, priced by src/lib/claude-usage.ts." },
    illustrative,
    live: { ran: false, reason: "Offline. Pass --live with ANTHROPIC_API_KEY to call the models." },
  };
  if (live) report.live = await runLive();
  writeFileSync(join(outDir, "suggest-metrics.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

async function runLive() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ran: false, calls: 0, spendUsd: 0, reason: "ANTHROPIC_API_KEY is not set. No request was sent." };
  const image = (await sharp({ create: { width: 64, height: 64, channels: 3, background: "#ffffff" } }).png().toBuffer()).toString("base64");
  let spent = 0;
  const rows = [];
  for (const spec of SUGGEST_BENCH_PROMPTS) {
    for (const model of ["claude-haiku-4-5-20251001", "claude-opus-5-5"] as const) {
      const reserve = model.includes("haiku") ? 0.01 : 0.08;
      if (spent + reserve > CAP_USD) {
        rows.push({ id: spec.id, model, skipped: true });
        continue;
      }
      spent += reserve;
      const started = Date.now();
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model,
            max_tokens: model.includes("haiku") ? 1200 : 4000,
            system: "Reply with JSON only: {\"subject\": string, \"motions\": [{\"label\": string, \"motion\": string, \"loop\": boolean, \"anchor\": \"ground\"|\"air\"|\"cell\"|\"center\", \"frames\": 4|6|9}]}. 6 to 8 motions. First is a resting loop.",
            messages: [{ role: "user", content: [
              { type: "image", source: { type: "base64", media_type: "image/png", data: image } },
              { type: "text", text: `Sprite prompt: "${spec.prompt}". Category: ${spec.categoryId}. The image is a blank placeholder; follow the prompt.` },
            ] }],
          }),
        });
        const json = await res.json() as { content?: { type: string; text?: string }[]; usage?: { input_tokens?: number; output_tokens?: number }; error?: { message?: string } };
        const text = json.content?.find((b) => b.type === "text")?.text ?? "";
        const parsed = text ? parseSuggestionPayload(JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? text)) : null;
        const usage = { input_tokens: json.usage?.input_tokens ?? 0, output_tokens: json.usage?.output_tokens ?? 0 };
        const cost = model.includes("haiku")
          ? suggestPriceDelta(usage).haikuUsd
          : suggestPriceDelta(usage).opusUsd;
        spent += cost - reserve;
        rows.push({ id: spec.id, model, ms: Date.now() - started, costUsd: cost, usage, error: json.error?.message, score: scoreSuggestions(spec.id, parsed) });
      } catch (err) {
        rows.push({ id: spec.id, model, error: err instanceof Error ? err.message : String(err) });
      }
    }
  }
  return { ran: true, calls: rows.filter((r) => !("skipped" in r && r.skipped)).length, spendUsd: spent, capUsd: CAP_USD, rows };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
