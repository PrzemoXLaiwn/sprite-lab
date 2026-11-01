import { describe, expect, it } from "vitest";
import { gifPackKey, packFlags, pngPackKey, withPackFlags, zipButtonState } from "./downloads";

describe("zipButtonState", () => {
  it("stays idle while the job is running", () => {
    expect(zipButtonState({ status: "running", hasZip: false, doneCount: 3, error: null })).toBe("idle");
  });

  it("prepares after the job finishes and before the zip is stored", () => {
    expect(zipButtonState({ status: "done", hasZip: false, doneCount: 4, error: null })).toBe("preparing");
    expect(zipButtonState({ status: "partial", hasZip: false, doneCount: 1, error: null })).toBe("preparing");
  });

  it("is ready only when the zip key exists", () => {
    expect(zipButtonState({ status: "done", hasZip: true, doneCount: 4, error: null })).toBe("ready");
    expect(zipButtonState({ status: "partial", hasZip: true, doneCount: 1, error: "Packaging failed: old" })).toBe("ready");
  });

  it("offers the click fallback when packaging failed or the job closed without a zip", () => {
    expect(zipButtonState({ status: "done", hasZip: false, doneCount: 4, error: "Packaging failed: storage" })).toBe("fallback");
    expect(zipButtonState({ status: "partial", hasZip: false, doneCount: 2, error: "Stopped: no progress for 30 minutes" })).toBe("fallback");
  });

  it("stays idle when nothing finished", () => {
    expect(zipButtonState({ status: "failed", hasZip: false, doneCount: 0, error: "no clips" })).toBe("idle");
    expect(zipButtonState({ status: "done", hasZip: false, doneCount: 0, error: null })).toBe("idle");
  });
});

describe("pack flags", () => {
  it("reads readiness from options.packs and ignores the request flags", () => {
    expect(packFlags({ png: true, gif: true, packs: { png: true, gif: false } })).toEqual({ png: true, gif: false });
    expect(packFlags(null)).toEqual({ png: false, gif: false });
    expect(packFlags({ packs: "nope" })).toEqual({ png: false, gif: false });
  });

  it("records readiness without dropping the job options", () => {
    expect(withPackFlags({ png: true, gif: true, readme: true, packs: { png: false, gif: true } }, { png: true, gif: false })).toEqual({
      png: true,
      gif: true,
      readme: true,
      packs: { png: true, gif: false },
    });
  });
});

describe("pack keys", () => {
  it("uses a stable object key so the download can find the file without a new column", () => {
    expect(pngPackKey("job1")).toBe("st-packs/job1/static.png.zip");
    expect(gifPackKey("job1")).toBe("st-packs/job1/gif.zip");
  });
});
