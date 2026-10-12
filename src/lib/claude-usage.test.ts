import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: { generationEvent: { create: vi.fn(() => Promise.resolve()) } } }));

const { claudeCostUsd, trackClaude } = await import("./claude-usage");
const { prisma } = await import("@/lib/prisma");

describe("claudeCostUsd", () => {
  it("prices opus input and output per million tokens", () => {
    expect(claudeCostUsd("claude-opus-5-5", { input_tokens: 1_000_000, output_tokens: 0 })).toBeCloseTo(5);
    expect(claudeCostUsd("claude-opus-5-5", { input_tokens: 0, output_tokens: 1_000_000 })).toBeCloseTo(25);
  });

  it("uses the haiku tier for haiku models", () => {
    expect(claudeCostUsd("claude-haiku-4-5-20251001", { input_tokens: 1_000_000, output_tokens: 1_000_000 })).toBeCloseTo(6);
  });

  it("bills cache reads at 10% of input", () => {
    expect(claudeCostUsd("claude-opus-5-5", { cache_read_input_tokens: 1_000_000 })).toBeCloseTo(0.5);
  });
});

describe("trackClaude", () => {
  it("logs one usage row and never throws without usage", () => {
    trackClaude("planner", { model: "claude-opus-5-5", usage: { input_tokens: 1000, output_tokens: 500 } });
    trackClaude("planner", null);
    expect(prisma.generationEvent.create).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(prisma.generationEvent.create).mock.calls[0][0] as { data: { eventType: string; metadata: string } };
    expect(arg.data.eventType).toBe("claude_usage");
    expect(JSON.parse(arg.data.metadata)).toMatchObject({ feature: "planner", input: 1000, output: 500 });
  });
});
