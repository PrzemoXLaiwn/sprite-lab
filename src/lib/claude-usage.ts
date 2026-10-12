// =============================================================================
// Claude usage ledger — one row per API call so the admin panel can chart spend
// =============================================================================
// Anthropic has no public balance API, so we log the token usage every
// response reports and price it ourselves. Rows live in generation_events
// (eventType "claude_usage") to avoid a migration; logging never throws.
// =============================================================================

import { prisma } from "@/lib/prisma";

/** USD per million tokens [input, output]. Cache reads bill at 10% of input. */
const PRICES: Record<string, [number, number]> = {
  opus: [5, 25],
  sonnet: [3, 15],
  haiku: [1, 5],
};

export const CLAUDE_USAGE_EVENT = "claude_usage";
export const CLAUDE_BALANCE_EVENT = "claude_balance";

function priceFor(model: string): [number, number] {
  const tier = Object.keys(PRICES).find((k) => model.includes(k));
  return PRICES[tier ?? "opus"];
}

interface UsageLike {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

export function claudeCostUsd(model: string, u: UsageLike): number {
  const [pin, pout] = priceFor(model);
  const input = (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) * 1.25 + (u.cache_read_input_tokens ?? 0) * 0.1;
  return (input * pin + (u.output_tokens ?? 0) * pout) / 1_000_000;
}

/** Fire-and-forget: records one Claude call (feature = planner, rig, suggest, translate, enhance). */
export function trackClaude(feature: string, response: { model?: string; usage?: UsageLike } | null | undefined, userId = "system"): void {
  if (!response?.usage) return;
  const model = response.model ?? "unknown";
  const u = response.usage;
  const meta = {
    feature,
    model,
    input: u.input_tokens ?? 0,
    output: u.output_tokens ?? 0,
    cacheRead: u.cache_read_input_tokens ?? 0,
    cost: Number(claudeCostUsd(model, u).toFixed(6)),
  };
  prisma.generationEvent
    .create({ data: { generationId: "claude", userId, eventType: CLAUDE_USAGE_EVENT, metadata: JSON.stringify(meta) } })
    .catch(() => {});
}
