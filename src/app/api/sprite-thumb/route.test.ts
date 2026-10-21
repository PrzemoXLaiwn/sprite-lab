import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import sharp from "sharp";
import { readFileSync } from "fs";

vi.mock("@/lib/safe-fetch", async () => {
  const actual = await vi.importActual<typeof import("@/lib/safe-fetch")>("@/lib/safe-fetch");
  return {
    ...actual,
    safeFetchImage: vi.fn(async () => {
      throw new actual.SafeFetchError("NOT_FOUND", "Image not found");
    }),
  };
});

import { GET } from "./route";

function get(url: string) {
  return GET(new NextRequest(url));
}

describe("sprite-thumb", () => {
  it("redirects extra query params to the canonical URL before fetching", async () => {
    const res = await get("http://localhost/api/sprite-thumb?src=/showcase/knight.png&w=64&k=nearest&x=1");
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe(
      "http://localhost/api/sprite-thumb?src=%2Fshowcase%2Fknight.png&w=64&k=nearest",
    );
    expect(await res.text()).not.toContain("RIFF");
  });

  it("redirects a smooth kernel to nearest", async () => {
    const res = await get("http://localhost/api/sprite-thumb?src=/showcase/fox-mage.png&w=40&k=smooth");
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toContain("k=nearest");
  });

  it("returns 400 for a directory", async () => {
    const res = await get("http://localhost/api/sprite-thumb?src=/styles/&w=64&k=nearest");
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Not a file");
  });

  it("returns 404 when R2 has no object", async () => {
    const res = await get(
      "http://localhost/api/sprite-thumb?src=https://pub-6411769b95ba423f9b01e8987f6d6e34.r2.dev/missing.png&w=64&k=nearest",
    );
    expect(res.status).toBe(404);
  });

  it("downscales fox-mage to a crisp 32px integer scale", async () => {
    const res = await get("http://localhost/api/sprite-thumb?src=/showcase/fox-mage.png&w=40&k=nearest");
    expect(res.status).toBe(200);
    const webp = Buffer.from(await res.arrayBuffer());
    const out = await sharp(webp).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(out.info.width).toBe(32);
    expect(out.info.height).toBe(32);

    const src = await sharp(readFileSync("public/showcase/fox-mage.png")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const factor = 12;
    const x = 3;
    const y = 5;
    const si = (y * factor * src.info.width + x * factor) * src.info.channels;
    const di = (y * out.info.width + x) * out.info.channels;
    expect([...out.data.subarray(di, di + 4)]).toEqual([...src.data.subarray(si, si + 4)]);
  });
});
