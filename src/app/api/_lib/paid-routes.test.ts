// Paid tool routes on the operation layer: a failure refunds the full charge
// exactly once, a delivered (stored) result is never refunded. Providers,
// storage, auth and Prisma are mocked; the billing store is the in-memory
// model of the real SQL (src/lib/billing/test-utils/memory-store.ts).
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VARIATION_CREDITS } from "@/config/tool-prices";
import { MemoryStore } from "@/lib/billing/test-utils/memory-store";
import { setLedgerSink } from "@/lib/billing/ledger";

const M = vi.hoisted(() => ({
  store: null as unknown,
  removeBackground: vi.fn(),
  upscaleImage: vi.fn(),
  persistImage: vi.fn(),
  saveGeneration: vi.fn(),
  replicateRun: vi.fn(),
  predCreate: vi.fn(),
  predGet: vi.fn(),
  predCancel: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "u1", email: "u1@x.co" } } }) } }),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: async () => ({ plan: "PRO", totalSpent: 12, stripeCustomerId: "cus_1" }) },
    generation: { create: async () => ({ id: "gen_nobg" }) },
  },
}));
vi.mock("@/lib/database", () => ({
  getUserCredits: async () => ({ success: true, credits: 100, plan: "PRO", role: "USER" }),
  saveGeneration: M.saveGeneration,
  getOrCreateUser: async () => ({}),
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitUserGeneration: async () => ({ blocked: null }),
  rateLimit3DGeneration: async () => ({ blocked: null }),
}));
vi.mock("@/lib/safe-fetch", () => ({
  safeFetchImage: async () => ({ buffer: Buffer.alloc(16) }),
  safeFetchErrorResponse: () => ({ error: "bad image", status: 400 }),
  assertSafeImageUrl: () => {},
}));
vi.mock("@/lib/storage", () => ({ persistImage: M.persistImage }));
vi.mock("@/lib/r2", () => ({ uploadGenerationBufferToR2: vi.fn() }));
vi.mock("@/lib/runware", () => ({ removeBackground: M.removeBackground, upscaleImage: M.upscaleImage }));
vi.mock("replicate", () => ({
  default: class {
    run = M.replicateRun;
    predictions = { create: M.predCreate, get: M.predGet, cancel: M.predCancel };
  },
}));
vi.mock("@/lib/billing/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/billing/store")>()),
  prismaStore: () => M.store,
}));

const removeBg = await import("../remove-bg/route");
const upscale = await import("../upscale/route");
const variations = await import("../variations/route");
const gen3d = await import("../generate-3d/route");
const gen3dStream = await import("../generate-3d-stream/route");

let store: MemoryStore;
const post = (path: string, body: unknown) =>
  new Request(`https://www.sprite-lab.com/api/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.7" },
    body: JSON.stringify(body),
  });
const refunds = () => store.txs.filter((t) => t.type === "REFUND");
const onlyOp = () => {
  expect(store.ops).toHaveLength(1);
  return store.ops[0];
};
/** Failure contract: the charge happened, then exactly one refund of all of it. */
function expectFullRefundOnce(charged: number) {
  const op = onlyOp();
  expect(op.creditsCharged).toBe(charged);
  expect(op.creditsRefunded).toBe(charged);
  expect(op.status).toBe("FAILED");
  expect(refunds()).toEqual([{ userId: "u1", amount: charged, type: "REFUND" }]);
  expect(store.credits("u1")).toBe(100);
}
/** Success contract: charged once, nothing refunded. */
function expectChargedNoRefund(charged: number) {
  const op = onlyOp();
  expect(op.status).toBe("SUCCEEDED");
  expect(op.creditsRefunded).toBe(0);
  expect(refunds()).toHaveLength(0);
  expect(store.credits("u1")).toBe(100 - charged);
}

beforeEach(() => {
  store = new MemoryStore({ u1: 100 });
  M.store = store;
  setLedgerSink(async (row) => { store.calls.push(row); });
  for (const fn of [M.removeBackground, M.upscaleImage, M.persistImage, M.saveGeneration, M.replicateRun, M.predCreate, M.predGet, M.predCancel]) fn.mockReset();
  M.persistImage.mockResolvedValue("https://cdn.sprite-lab.com/u1/out.png");
  M.saveGeneration.mockResolvedValue({ success: true, generation: { id: "gen1" } });
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/remove-bg (1 credit)", () => {
  const req = () => post("remove-bg", { imageUrl: "https://cdn.sprite-lab.com/u1/in.png" });

  it("success: charged once, no refund, operation SUCCEEDED with the gallery row", async () => {
    M.removeBackground.mockResolvedValue({ success: true, imageUrl: "https://im.runware.ai/tmp.png" });
    const res = await removeBg.POST(req());
    expect(res.status).toBe(200);
    expect((await res.json()).imageUrl).toBe("https://cdn.sprite-lab.com/u1/out.png");
    expectChargedNoRefund(1);
    expect(store.ops[0].feature).toBe("remove_bg");
  });

  it("provider failure: full refund once", async () => {
    M.removeBackground.mockResolvedValue({ success: false, error: "Runware 500" });
    expect((await removeBg.POST(req())).status).toBe(500);
    expectFullRefundOnce(1);
  });

  it("provider throws: full refund once", async () => {
    M.removeBackground.mockRejectedValue(new Error("socket hang up"));
    expect((await removeBg.POST(req())).status).toBe(500);
    expectFullRefundOnce(1);
  });

  it("result can't be stored (temporary URL only): full refund once", async () => {
    M.removeBackground.mockResolvedValue({ success: true, imageUrl: "https://im.runware.ai/tmp.png" });
    M.persistImage.mockResolvedValue(null);
    expect((await removeBg.POST(req())).status).toBe(500);
    expectFullRefundOnce(1);
  });
});

describe("POST /api/upscale (AI 4× = 2 credits)", () => {
  const req = () => post("upscale", { imageUrl: "https://cdn.sprite-lab.com/u1/in.png", scale: 4, modelType: "runware" });

  it("success: charged once, no refund", async () => {
    M.upscaleImage.mockResolvedValue({ success: true, imageUrl: "https://im.runware.ai/up.png" });
    expect((await upscale.POST(req())).status).toBe(200);
    expectChargedNoRefund(2);
    expect(M.saveGeneration).toHaveBeenCalledWith(expect.objectContaining({ imageUrl: "https://cdn.sprite-lab.com/u1/out.png" }));
  });

  it("provider failure: full refund once", async () => {
    M.upscaleImage.mockResolvedValue({ success: false, error: "Runware upscale timed out" });
    expect((await upscale.POST(req())).status).toBe(500);
    expectFullRefundOnce(2);
  });

  it("store failure: full refund once, nothing saved to the gallery", async () => {
    M.upscaleImage.mockResolvedValue({ success: true, imageUrl: "https://im.runware.ai/up.png" });
    M.persistImage.mockResolvedValue(null);
    expect((await upscale.POST(req())).status).toBe(500);
    expectFullRefundOnce(2);
    expect(M.saveGeneration).not.toHaveBeenCalled();
  });

  it("pixel-perfect upscaling stays free (no operation)", async () => {
    // sharp needs a real image; an invalid buffer fails before any charge
    const res = await upscale.POST(post("upscale", { imageUrl: "https://cdn.sprite-lab.com/u1/in.png", scale: 2, modelType: "pixel" }));
    expect(res.status).toBe(500);
    expect(store.ops).toHaveLength(0);
    expect(store.credits("u1")).toBe(100);
  });
});

describe(`POST /api/variations (${VARIATION_CREDITS} credits each, Replicate)`, () => {
  const req = (n = 2) => post("variations", { imageUrl: "https://cdn.sprite-lab.com/u1/in.png", numVariations: n, similarity: "medium" });
  const ok = (id: string) => ({ id, status: "succeeded", output: [`https://replicate.delivery/${id}.png`] });

  beforeEach(() => {
    let n = 0;
    M.predCreate.mockImplementation(async () => ({ id: `p${++n}` }));
  });

  it("success: charged once, no refund, one ledger row per prediction", async () => {
    M.predGet.mockImplementation(async (id: string) => ok(id));
    const res = await variations.POST(req(2));
    expect(res.status).toBe(200);
    expect((await res.json()).creditsUsed).toBe(2 * VARIATION_CREDITS);
    expectChargedNoRefund(2 * VARIATION_CREDITS);
    const rows = store.calls.filter((c) => c.provider === "replicate");
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.outcome === "ok" && r.estCostUsd === 0.04 && r.operationId === store.ops[0].id)).toBe(true);
  });

  it("every prediction fails: full refund once", async () => {
    M.predGet.mockImplementation(async (id: string) => ({ id, status: "failed", error: "NSFW" }));
    expect((await variations.POST(req(2))).status).toBe(500);
    expectFullRefundOnce(2 * VARIATION_CREDITS);
    // failed per-image predictions aren't billed
    expect(store.calls.filter((c) => c.provider === "replicate").map((c) => [c.outcome, c.estCostUsd])).toEqual([["error", 0], ["error", 0]]);
  });

  it("create throws: full refund once, the call is in the ledger", async () => {
    M.predCreate.mockRejectedValue(new Error("Request to https://api.replicate.com/v1/models failed with status 401 Unauthorized"));
    expect((await variations.POST(req(3))).status).toBe(500);
    expectFullRefundOnce(3 * VARIATION_CREDITS);
    expect(store.calls).toEqual([expect.objectContaining({ provider: "replicate", outcome: "error", estCostUsd: 0 })]);
  });

  it("one of two delivered: refunds only the missing variation, closes PARTIAL", async () => {
    M.predGet.mockImplementation(async (id: string) => (id === "p1" ? ok(id) : { id, status: "failed", error: "x" }));
    const res = await variations.POST(req(2));
    expect(res.status).toBe(200);
    const op = onlyOp();
    expect(op.status).toBe("PARTIAL");
    expect(op.creditsRefunded).toBe(VARIATION_CREDITS);
    expect(refunds()).toHaveLength(1);
    expect(store.credits("u1")).toBe(100 - VARIATION_CREDITS);
  });

  it("nothing could be stored: full refund once", async () => {
    M.predGet.mockImplementation(async (id: string) => ok(id));
    M.persistImage.mockResolvedValue(null);
    expect((await variations.POST(req(2))).status).toBe(500);
    expectFullRefundOnce(2 * VARIATION_CREDITS);
  });
});

describe("POST /api/generate-3d (4 credits, Replicate) — no UI caller", () => {
  const req = () => post("generate-3d", { prompt: "iron sword", categoryId: "WEAPONS", subcategoryId: "SWORDS", modelId: "rodin" });

  it("success: charged once, no refund, reference + 3D calls in the ledger", async () => {
    M.replicateRun.mockResolvedValueOnce("https://replicate.delivery/ref.png").mockResolvedValueOnce("https://replicate.delivery/model.glb");
    const res = await gen3d.POST(req());
    expect(res.status).toBe(200);
    expectChargedNoRefund(4);
    expect(store.calls.map((c) => [c.provider, c.task, c.outcome])).toEqual([["replicate", "3d_reference", "ok"], ["replicate", "3d_model", "ok"]]);
  });

  it("every reference model fails: full refund once", async () => {
    M.replicateRun.mockRejectedValue(new Error("prediction failed: CUDA out of memory"));
    expect((await gen3d.POST(req())).status).toBe(500);
    expectFullRefundOnce(4);
    expect(store.calls.map((c) => c.outcome)).toEqual(["error", "error"]);
  });

  it("3D step fails: full refund once", async () => {
    M.replicateRun.mockResolvedValueOnce("https://replicate.delivery/ref.png").mockRejectedValue(new Error("prediction failed"));
    expect((await gen3d.POST(req())).status).toBe(500);
    expectFullRefundOnce(4);
  });

  it("gallery row can't be saved: full refund once", async () => {
    M.replicateRun.mockResolvedValueOnce("https://replicate.delivery/ref.png").mockResolvedValueOnce("https://replicate.delivery/model.glb");
    M.saveGeneration.mockResolvedValue({ success: false, error: "db" });
    expect((await gen3d.POST(req())).status).toBe(500);
    expectFullRefundOnce(4);
  });
});

describe("POST /api/generate-3d-stream (4 credits, Replicate, SSE) — no UI caller", () => {
  const req = () => post("generate-3d-stream", { prompt: "iron sword", categoryId: "WEAPONS", subcategoryId: "SWORDS" });

  it("success: charged once, no refund", async () => {
    M.replicateRun.mockResolvedValueOnce("https://replicate.delivery/ref.png").mockResolvedValueOnce("https://replicate.delivery/model.glb");
    const text = await (await gen3dStream.POST(req())).text();
    expect(text).toContain("event: complete");
    expectChargedNoRefund(4);
  });

  it("every provider call fails: full refund once", async () => {
    M.replicateRun.mockRejectedValue(new Error("prediction failed"));
    const text = await (await gen3dStream.POST(req())).text();
    expect(text).toContain("event: error");
    expectFullRefundOnce(4);
  });

  it("both 3D engines fail after a reference image: full refund once", async () => {
    M.replicateRun.mockResolvedValueOnce("https://replicate.delivery/ref.png").mockRejectedValue(new Error("prediction failed"));
    const text = await (await gen3dStream.POST(req())).text();
    expect(text).toContain("All 3D generators failed");
    expectFullRefundOnce(4);
  });
});
