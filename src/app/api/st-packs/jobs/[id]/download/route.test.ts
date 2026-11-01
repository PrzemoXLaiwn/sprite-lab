// A stored pack is redirected or streamed. The route rebuilds only when the
// object is missing, which is the fallback for a worker that never wrote it.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const M = vi.hoisted(() => ({
  job: null as Record<string, unknown> | null,
  buildArtifacts: vi.fn(),
  buildExtraArchive: vi.fn(),
  signed: null as string | null,
  signedKey: null as string | null,
  stream: null as { body: ReadableStream<Uint8Array>; contentLength: number } | null,
  buffer: null as Buffer | null,
  delivery: "redirect" as "redirect" | "stream",
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) } }),
}));
vi.mock("@/lib/admin", () => ({
  isAdmin: async () => true,
  isModerator: async () => true,
  getUserRole: async () => "ADMIN",
}));
vi.mock("@/lib/st-packs/jobs", () => ({
  getJob: async () => M.job,
  buildArtifacts: (...args: unknown[]) => M.buildArtifacts(...args),
  buildExtraArchive: (...args: unknown[]) => M.buildExtraArchive(...args),
  jobSlug: () => "hero",
}));
vi.mock("@/lib/r2", () => ({
  getR2SignedGetUrl: async (key: string) => {
    M.signedKey = key;
    return M.signed;
  },
  getR2ObjectStream: async () => M.stream,
  getR2ObjectBuffer: async () => M.buffer,
  zipDelivery: () => M.delivery,
}));

import { GET } from "./route";

function job(over: Record<string, unknown> = {}) {
  return {
    id: "job1abcdefg",
    status: "done",
    prompt: "hero",
    baseKey: null,
    zipKey: "st-packs/job1abcdefg/pack.zip",
    gridKey: null,
    options: {},
    expressions: [],
    ...over,
  };
}

function download(kind: string) {
  return GET(
    new Request(`https://sprite-lab.com/api/st-packs/jobs/job1abcdefg/download?kind=${kind}`),
    { params: Promise.resolve({ id: "job1abcdefg" }) },
  );
}

describe("GET /api/st-packs/jobs/[id]/download", () => {
  beforeEach(() => {
    process.env.ST_PACKS_ENABLED = "true";
    M.job = job();
    M.buildArtifacts.mockReset();
    M.buildExtraArchive.mockReset();
    M.signed = "https://acct.r2.cloudflarestorage.com/pack.zip";
    M.signedKey = null;
    M.stream = null;
    M.buffer = null;
    M.delivery = "redirect";
  });
  afterEach(() => {
    delete process.env.ST_PACKS_ENABLED;
  });

  it("redirects a stored zip and does not rebuild it", async () => {
    expect((await download("zip")).status).toBe(302);
    expect((await download("zip")).headers.get("location")).toBe(M.signed);
    expect(M.signedKey).toBe("st-packs/job1abcdefg/pack.zip");
    expect(M.buildArtifacts).not.toHaveBeenCalled();
  });

  it("streams a stored zip when the signed URL cannot be used", async () => {
    M.delivery = "stream";
    M.signed = null;
    M.stream = {
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]));
          controller.close();
        },
      }),
      contentLength: 3,
    };
    const res = await download("zip");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-length")).toBe("3");
    expect(res.headers.get("content-type")).toBe("application/zip");
    expect(M.buildArtifacts).not.toHaveBeenCalled();
  });

  it("builds a missing zip for a finished job, then redirects", async () => {
    M.job = job({ zipKey: null });
    M.buildArtifacts.mockResolvedValue({ zipKey: "st-packs/job1abcdefg/pack.zip", gridKey: null });
    const res = await download("zip");
    expect(res.status).toBe(302);
    expect(M.buildArtifacts).toHaveBeenCalledTimes(1);
    expect(M.buildArtifacts).toHaveBeenCalledWith("job1abcdefg");
    expect(M.signedKey).toBe("st-packs/job1abcdefg/pack.zip");
  });

  it("does not build a zip while the job is still running", async () => {
    M.job = job({ zipKey: null, status: "running" });
    expect((await download("zip")).status).toBe(404);
    expect(M.buildArtifacts).not.toHaveBeenCalled();
  });

  it("serves a prebuilt PNG pack from its stable key", async () => {
    M.job = job({ options: { packs: { png: true, gif: false } } });
    const res = await download("png");
    expect(res.status).toBe(302);
    expect(M.signedKey).toBe("st-packs/job1abcdefg/static.png.zip");
    expect(M.buildExtraArchive).not.toHaveBeenCalled();
  });

  it("serves a prebuilt GIF pack and otherwise builds the extra archive", async () => {
    M.job = job({ options: { packs: { png: false, gif: true } } });
    expect((await download("gif")).status).toBe(302);
    expect(M.signedKey).toBe("st-packs/job1abcdefg/gif.zip");
    expect(M.buildExtraArchive).not.toHaveBeenCalled();

    M.job = job({ options: {} });
    M.buildExtraArchive.mockResolvedValue(Buffer.from("PK"));
    const res = await download("png");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/zip");
    expect(M.buildExtraArchive).toHaveBeenCalledWith("job1abcdefg", "png");
  });
});
