// Ledger rows for the tool providers: Runware upscale / background removal /
// legacy imageInference (SDK, includeCost) and Replicate. SDKs are mocked.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LedgerRow, OperationContext } from "./ledger";

const M = vi.hoisted(() => ({ upscale: vi.fn(), removeBackground: vi.fn(), imageInference: vi.fn() }));
vi.mock("@runware/sdk-js", () => ({
  Runware: class {
    ensureConnection = async () => {};
    upscale = M.upscale;
    removeBackground = M.removeBackground;
    imageInference = M.imageInference;
  },
}));
vi.mock("@/lib/cloudflare-ai", () => ({ cloudflareAiConfigured: () => false, generateWithCloudflare: vi.fn() }));

const { setLedgerSink, runInOperation } = await import("./ledger");
const { replicateCall, COST_CAP_ERROR } = await import("./replicate");
const { upscaleImage, removeBackground, generateImage } = await import("@/lib/runware");
const { PRICE } = await import("./features");

let rows: LedgerRow[];
beforeEach(() => {
  rows = [];
  setLedgerSink(async (r) => { rows.push(r); });
  vi.stubEnv("RUNWARE_API_KEY", "rw-test-not-real");
  for (const f of [M.upscale, M.removeBackground, M.imageInference]) f.mockReset();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
const ctx = (capUsd: number): OperationContext => ({ operationId: "op1", userId: "u1", capUsd, spentUsd: 0, calls: 0, incomplete: false, pending: [] });

describe("Runware tool calls", () => {
  it("upscale: asks for the cost and logs the reported price", async () => {
    M.upscale.mockResolvedValue({ imageURL: "https://im.runware.ai/u.png", cost: 0.0019 });
    const r = await upscaleImage("https://cdn/x.png", 4);
    expect(r.success).toBe(true);
    expect(M.upscale.mock.calls[0][0]).toMatchObject({ includeCost: true });
    expect(rows).toEqual([expect.objectContaining({ provider: "runware", task: "upscale", size: "4x", outcome: "ok", costUsd: 0.0019, estCostUsd: PRICE.upscale })]);
  });

  it("upscale timeout: logged as timeout at list price, caller gets success=false", async () => {
    M.upscale.mockRejectedValue(new Error("Runware upscale timed out after 90000ms"));
    expect((await upscaleImage("https://cdn/x.png", 2)).success).toBe(false);
    expect(rows[0]).toMatchObject({ outcome: "timeout", estCostUsd: PRICE.upscale, costUsd: null });
  });

  it("an SDK error object (explicit API error) is logged at $0 with its message", async () => {
    M.removeBackground.mockRejectedValue({ error: true, errors: [{ code: "invalidInputImage", message: "bad image" }] });
    expect((await removeBackground("https://cdn/x.png")).success).toBe(false);
    expect(rows[0]).toMatchObject({ task: "remove_bg", outcome: "error", estCostUsd: 0, error: "Runware invalidInputImage: bad image" });
  });

  it("background removal inside an operation is correlated with it", async () => {
    M.removeBackground.mockResolvedValue([{ imageURL: "https://im.runware.ai/b.png", cost: 0.0006 }]);
    await runInOperation(ctx(1), () => removeBackground("https://cdn/x.png"));
    expect(rows[0]).toMatchObject({ operationId: "op1", task: "remove_bg", costUsd: 0.0006 });
  });

  it("legacy imageInference (queue worker) is logged too", async () => {
    M.imageInference.mockResolvedValue([{ imageURL: "https://im.runware.ai/i.png", seed: 1, cost: 0.0031 }]);
    expect((await generateImage({ prompt: "a sword" }, "free")).success).toBe(true);
    expect(rows).toEqual([expect.objectContaining({ task: "image", model: "runware:100@1", costUsd: 0.0031, outcome: "ok" })]);
  });
});

describe("replicateCall", () => {
  it("logs ok calls at our estimate (Replicate reports no price)", async () => {
    await replicateCall({ model: "black-forest-labs/flux-dev", task: "3d_reference", estCostUsd: 0.025 }, async () => "url");
    expect(rows[0]).toMatchObject({ provider: "replicate", outcome: "ok", costUsd: null, estCostUsd: 0.025 });
  });

  it("an HTTP 4xx rejection never ran: $0; other failures count at list price", async () => {
    const spec = { model: "m", task: "3d_model", estCostUsd: 0.4 };
    await expect(replicateCall(spec, async () => { throw new Error("Request to https://api.replicate.com/v1/predictions failed with status 422 Unprocessable Entity"); })).rejects.toThrow();
    await expect(replicateCall(spec, async () => { throw new Error("Prediction failed: CUDA OOM"); })).rejects.toThrow();
    await expect(replicateCall(spec, async () => { throw new Error("This operation was aborted"); })).rejects.toThrow();
    expect(rows.map((r) => [r.outcome, r.estCostUsd])).toEqual([["error", 0], ["error", 0.4], ["timeout", 0.4]]);
  });

  it("refuses a call that would cross the operation's cost cap, before it runs", async () => {
    const run = vi.fn(async () => "url");
    await runInOperation(ctx(0.5), async () => {
      await replicateCall({ model: "m", task: "3d_model", estCostUsd: 0.4 }, run);
      await expect(replicateCall({ model: "m", task: "3d_model", estCostUsd: 0.4 }, run)).rejects.toThrow(COST_CAP_ERROR);
    });
    expect(run).toHaveBeenCalledTimes(1);
    expect(rows).toHaveLength(1);
  });
});
