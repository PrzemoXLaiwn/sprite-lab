// Access control for the ST Packs beta: the flag hides everything (404), a
// session is required (401), and only ADMIN / OWNER get through (403 below).
// Providers, storage and the job store are mocked; nothing touches the network.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const M = vi.hoisted(() => ({
  user: null as { id: string } | null,
  role: "USER" as string,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: M.user } }) } }),
}));
vi.mock("@/lib/admin", () => ({
  isAdmin: async () => M.role === "ADMIN" || M.role === "OWNER",
  isModerator: async () => ["MODERATOR", "ADMIN", "OWNER"].includes(M.role),
  getUserRole: async () => M.role,
  getAdminStats: vi.fn(), getCancellationReport: vi.fn(), getReports: vi.fn(), updateReportStatus: vi.fn(), getModeratorStats: vi.fn(),
}));
vi.mock("@/lib/st-packs/jobs", () => ({
  listJobs: async () => [],
  tick: async () => ({ snapshot: { id: "job1", status: "done", expressions: [] }, work: [] }),
  runWork: async () => {},
  getSnapshot: async () => ({ id: "job1", status: "cancelled" }),
  cancelJob: async () => {},
  regenerateExpression: async () => true,
  getJob: async () => ({ id: "job1abcdefg", status: "done", prompt: null, baseKey: null, zipKey: null, gridKey: null, options: {}, expressions: [] }),
  baseKeyFor: (id: string) => `st-packs/bases/${id}.png`,
  createJob: async () => "job1",
  normaliseOptions: (o: unknown) => o,
  buildArtifacts: vi.fn(), buildExtraArchive: vi.fn(), jobSlug: () => "x",
}));
vi.mock("@/lib/r2", () => ({
  getR2ObjectBuffer: async () => null,
  getR2ObjectStream: async () => null,
  getR2SignedGetUrl: async () => null,
  zipDelivery: () => "stream",
  uploadBufferToR2: async () => ({ success: true }),
}));
vi.mock("@/lib/rate-limit", () => ({ rateLimitUserAction: async () => ({ blocked: null }) }));
vi.mock("@/lib/runware", () => ({ generateStImage: vi.fn(), ProviderModerationError: class extends Error {} }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("next/server", async (importOriginal) => ({ ...(await importOriginal<typeof import("next/server")>()), after: (fn: () => unknown) => { void fn(); } }));

const jobsList = await import("./jobs/route");
const jobOne = await import("./jobs/[id]/route");
const advance = await import("./jobs/[id]/advance/route");
const cancel = await import("./jobs/[id]/cancel/route");
const regenerate = await import("./jobs/[id]/expressions/[label]/regenerate/route");
const download = await import("./jobs/[id]/download/route");
const base = await import("./base/route");
const baseOne = await import("./base/[id]/route");
const guard = await import("./_lib/guard");
const actions = await import("@/app/(dashboard)/admin/page.actions");

const params = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });
const req = (url: string, init?: RequestInit) => new Request(`https://sprite-lab.com${url}`, init);
const json = (body: unknown) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

/** Every route, called the way the app would. */
async function statuses(): Promise<number[]> {
  const calls = [
    () => jobsList.GET(),
    () => jobsList.POST(req("/api/st-packs/jobs", json({ baseId: "00000000-0000-4000-8000-000000000000", source: "upload", expressionSet: "default8", width: 504, height: 672 }))),
    () => jobOne.GET(req("/api/st-packs/jobs/job1"), params({ id: "job1abcdefg" })),
    () => advance.POST(req("/api/st-packs/jobs/job1/advance", { method: "POST" }), params({ id: "job1abcdefg" })),
    () => cancel.POST(req("/api/st-packs/jobs/job1/cancel", { method: "POST" }), params({ id: "job1abcdefg" })),
    () => regenerate.POST(req("/x", json({ from: "edit" })), params({ id: "job1abcdefg", label: "joy" })),
    () => download.GET(req("/api/st-packs/jobs/job1/download?kind=readme"), params({ id: "job1abcdefg" })),
    () => base.POST(req("/api/st-packs/base", json({ prompt: "a ranger" }))),
    () => baseOne.GET(req("/x"), params({ id: "00000000-0000-4000-8000-000000000000" })),
  ];
  const out: number[] = [];
  for (const c of calls) out.push((await c()).status);
  return out;
}

describe("ST Packs access", () => {
  beforeEach(() => { M.user = { id: "u1" }; M.role = "ADMIN"; process.env.ST_PACKS_ENABLED = "true"; });
  afterEach(() => { delete process.env.ST_PACKS_ENABLED; });

  it("flag off → 404 everywhere, even for an admin", async () => {
    delete process.env.ST_PACKS_ENABLED;
    expect(await statuses()).toEqual(Array(9).fill(404));
    expect(await guard.canUseStPacks("u1")).toBe(false);
    expect((await actions.checkAdminAccess()).stPacks).toBe(false);
  });

  it("not signed in → 401", async () => {
    M.user = null;
    expect(await statuses()).toEqual(Array(9).fill(401));
    expect(await guard.canUseStPacks(null)).toBe(false);
  });

  it.each(["USER", "SUPPORT", "MODERATOR"])("%s → 403", async (role) => {
    M.role = role;
    expect(await statuses()).toEqual(Array(9).fill(403));
    expect(await guard.canUseStPacks("u1")).toBe(false);
    expect((await actions.checkAdminAccess()).stPacks).toBe(false);
  });

  it.each(["ADMIN", "OWNER"])("%s gets through (no 401/403/404 from the guard)", async (role) => {
    M.role = role;
    const s = await statuses();
    // list / snapshot / advance / cancel / regenerate / readme download: 200;
    // POST jobs: 404 (the mocked base is not in storage); base from prompt: 502 (provider mocked away); base image: 404 (storage mocked empty)
    expect(s).toEqual([200, 404, 200, 200, 200, 200, 200, 502, 404]);
    expect(await guard.canUseStPacks("u1")).toBe(true);
    expect((await actions.checkAdminAccess()).stPacks).toBe(true);
  });
});
