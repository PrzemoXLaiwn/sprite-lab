// A Claude call that throws leaves an `error` / `timeout` row in the cost
// ledger (no estimated cost, the error message), at every call site — and the
// caller still gets its normal fallback. The SDK is mocked: nothing leaves the machine.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LedgerRow } from "@/lib/billing/ledger";

const M = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => ({ default: class { messages = { create: M.create }; } }));
vi.mock("@/lib/prisma", () => ({ prisma: { generationEvent: { create: vi.fn(() => Promise.resolve()) } } }));
vi.mock("@/lib/cloudflare-ai", () => ({ translateWithCloudflare: async () => null }));

const { setLedgerSink } = await import("@/lib/billing/ledger");
const { claudeCall, trackClaudeError } = await import("./claude-usage");
const { planAnimation } = await import("./animation-planner");
const { suggestMotions } = await import("./animation-suggest");
const { findRigPoints } = await import("./rig-keypoints");
const { translatePromptIfNeeded, enhanceUserPrompt } = await import("./prompt-enhance");

let rows: LedgerRow[];
beforeEach(() => {
  rows = [];
  setLedgerSink(async (r) => { rows.push(r); });
  M.create.mockReset();
  vi.stubEnv("ANTHROPIC_API_KEY", "sk-test-not-real");
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("trackClaudeError", () => {
  it("records an error row with no estimated cost and the message", () => {
    trackClaudeError("planner", "claude-opus-5-5", new Error("529 overloaded_error"));
    expect(rows).toEqual([expect.objectContaining({ provider: "anthropic", model: "claude-opus-5-5", task: "planner", outcome: "error", estCostUsd: 0, costUsd: null, error: "529 overloaded_error" })]);
  });

  it("marks client timeouts as timeout (still $0)", () => {
    const err = Object.assign(new Error("Request timed out."), { name: "APIConnectionTimeoutError" });
    trackClaudeError("rig", "claude-opus-5-5", err);
    expect(rows[0]).toMatchObject({ outcome: "timeout", estCostUsd: 0 });
  });

  it("never throws, even when the ledger writer throws synchronously or the error is odd", () => {
    setLedgerSink(() => { throw new Error("db down"); });
    const weird = { toString() { throw new Error("no string"); } };
    expect(() => trackClaudeError("suggest", "m", weird)).not.toThrow();
    expect(() => trackClaudeError("suggest", "m", new Error("x"))).not.toThrow();
  });

  it("claudeCall re-throws the same error after logging it once", async () => {
    const err = new Error("400 invalid_request_error");
    await expect(claudeCall("enhance", "m", async () => { throw err; })).rejects.toBe(err);
    expect(rows).toHaveLength(1);
    await expect(claudeCall("enhance", "m", async () => 42)).resolves.toBe(42);
    expect(rows).toHaveLength(1); // success rows come from trackClaude (usage), not from here
  });
});

describe("every Claude call site logs a thrown call and still falls back", () => {
  const png = Buffer.from("png");
  beforeEach(() => { M.create.mockRejectedValue(new Error("500 api_error: Internal server error")); });

  it.each([
    ["planner", "claude-opus-5-5", () => planAnimation({ image: png, prompt: "knight", categoryId: null, motion: "walk", frameCount: 4 })],
    ["suggest", "claude-opus-5-5", () => suggestMotions({ cacheKey: `k${Math.random()}`, image: png, prompt: "knight", categoryId: null })],
    ["rig", "claude-opus-5-5", () => findRigPoints(png, 64, 64)],
    ["translate", "claude-haiku-4-5-20251001", () => translatePromptIfNeeded("rycerz z mieczem")],
    ["enhance", "claude-haiku-4-5-20251001", () => enhanceUserPrompt("red dragon", "CREATURES", "DRAGONS")],
  ])("%s", async (task, model, run) => {
    await run(); // resolves with the caller's fallback, never rejects
    expect(rows).toEqual([expect.objectContaining({ provider: "anthropic", task, model, outcome: "error", estCostUsd: 0, error: "500 api_error: Internal server error" })]);
  });
});
