// The main pack must be exactly what SillyTavern's zip upload expects: a flat
// archive of <label>.webp, lowercase, no folders; stills and GIFs elsewhere.
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { buildExtraZip, buildMainZip, packFileName, packSlug, readmeText } from "./package";

const webp = (n: number) => Buffer.from(`RIFF-webp-${n}`);

describe("ST pack zips", () => {
  it("main zip: flat root, label.webp files only, optional README, no directories", async () => {
    const zip = await JSZip.loadAsync(await buildMainZip([{ label: "neutral", data: webp(1) }, { label: "joy", data: webp(2) }], { readme: true }));
    const names = Object.keys(zip.files).sort();
    expect(names).toEqual(["README.txt", "joy.webp", "neutral.webp"]);
    for (const f of Object.values(zip.files)) {
      expect(f.dir).toBe(false);
      expect(f.name).not.toMatch(/\//);
      expect(f.name).toBe(f.name.toLowerCase().replace("readme.txt", "README.txt"));
    }
    expect(await zip.file("joy.webp")!.async("nodebuffer")).toEqual(webp(2));
    expect(await zip.file("README.txt")!.async("string")).toMatch(/Character Expressions/);
  });

  it("main zip without README has only images", async () => {
    const zip = await JSZip.loadAsync(await buildMainZip([{ label: "anger", data: webp(3) }]));
    expect(Object.keys(zip.files)).toEqual(["anger.webp"]);
  });

  it("rejects labels SillyTavern would not classify", async () => {
    await expect(buildMainZip([{ label: "happy", data: webp(1) }])).rejects.toThrow(/Unknown expression label/);
    await expect(buildMainZip([{ label: "Joy", data: webp(1) }])).rejects.toThrow(/Unknown expression label/);
  });

  it("stills and GIF fallbacks go to their own archives", async () => {
    const png = await JSZip.loadAsync(await buildExtraZip([{ label: "neutral", data: Buffer.from("png") }], "png"));
    expect(Object.keys(png.files)).toEqual(["neutral.png"]);
    const gif = await JSZip.loadAsync(await buildExtraZip([{ label: "neutral", data: Buffer.from("gif") }], "gif"));
    expect(Object.keys(gif.files)).toEqual(["neutral.gif"]);
  });

  it("file names use an ascii slug", () => {
    expect(packSlug("Zoë the Ranger!")).toBe("zoe-the-ranger");
    expect(packSlug("   ")).toBe("character");
    expect(packFileName("zoe", "zip")).toBe("zoe_st_pack.zip");
    expect(packFileName("zoe", "png")).toBe("zoe_static_png.zip");
    expect(packFileName("zoe", "gif")).toBe("zoe_gif.zip");
    expect(readmeText()).toMatch(/fallback expression to "neutral"/);
  });
});
