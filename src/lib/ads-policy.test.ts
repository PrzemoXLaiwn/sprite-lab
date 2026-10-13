import { describe, expect, it } from "vitest";
import { AD_MIN_WORDS, adsAllowed, countWords, isAdPath } from "./ads-policy";

describe("ads policy", () => {
  it("allows only guide articles and comparison pages", () => {
    expect(isAdPath("/guides/how-to-make-pixel-art-sprites-for-games")).toBe(true);
    expect(isAdPath("/compare")).toBe(true);
    expect(isAdPath("/compare/spritelab-vs-pixellab")).toBe(true);
    for (const p of ["/", "/guides", "/guides/", "/pricing", "/community", "/ai-sprite-generator", "/how-it-works", "/about", "/u/someone", "/generate", "/guides/a/b"]) {
      expect(isAdPath(p), p).toBe(false);
    }
  });

  it("never shows ads to signed-in members", () => {
    expect(adsAllowed({ pathname: "/compare", signedIn: true, mainWords: 5000 })).toBe(false);
  });

  it("needs at least AD_MIN_WORDS words of main text", () => {
    const pathname = "/guides/how-to-make-pixel-art-sprites-for-games";
    expect(adsAllowed({ pathname, signedIn: false, mainWords: AD_MIN_WORDS - 1 })).toBe(false);
    expect(adsAllowed({ pathname, signedIn: false, mainWords: AD_MIN_WORDS })).toBe(true);
  });

  it("counts words, not symbols", () => {
    expect(countWords("  Use 32×32 sprites — always · at 3× scale  ")).toBe(7);
  });
});
