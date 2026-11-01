import { describe, expect, it } from "vitest";
import { resolveExpressionLabels } from "./st-expressions";
import {
  ST_DEFAULT_SIZE, ST_PIPELINE, ST_QA, ST_VIDEO_MODELS,
  clipListUsd, estimateJobUsd, isOutputSize, nativeContentSize, qaThresholds, stPacksSettings, viduQ2TurboClipUsd,
} from "./st-packs";

describe("ST Packs native output and throughput", () => {
  it("exports Vidu at the cropped 720×960 frame and LTX at its own canvas", () => {
    expect(nativeContentSize(ST_VIDEO_MODELS["vidu:3@2"])).toEqual({ width: 720, height: 960 });
    expect(nativeContentSize(ST_VIDEO_MODELS["lightricks:ltx@2.3-fast"])).toEqual({ width: 768, height: 1024 });
    expect(ST_DEFAULT_SIZE).toEqual({ width: 720, height: 960 });
  });

  it("accepts the native sizes and the older downscales", () => {
    expect(isOutputSize(720, 960)).toBe(true);
    expect(isOutputSize(768, 1024)).toBe(true);
    expect(isOutputSize(608, 810)).toBe(true);
    expect(isOutputSize(100, 100)).toBe(false);
  });

  it("encodes once at quality 90 with full alpha, under a 6 MB cap", () => {
    expect(ST_PIPELINE.webpQuality).toBe(90);
    expect(ST_PIPELINE.webpAlphaQuality).toBe(100);
    expect(ST_PIPELINE.webpEffort).toBe(4);
    expect(ST_PIPELINE.webpMaxBytes).toBe(6_000_000);
    expect(ST_QA.maxBytes).toBe(6_000_000);
  });

  it("runs two posts and eight videos by default", () => {
    const s = stPacksSettings({});
    expect(s.postConcurrency).toBe(2);
    expect(s.videoConcurrency).toBe(8);
    expect(s.concurrency).toBe(8);
  });

  it("keeps a 28-pack under the default spend cap with the free key matte", () => {
    const usd = estimateJobUsd(resolveExpressionLabels("all28"), { videoSeconds: 4, matteMode: "key" });
    expect(usd).toBeLessThan(stPacksSettings({}).maxUsdPerJob);
    expect(usd).toBeGreaterThan(0);
  });

  it("prices Vidu from the published 720p points, including first-and-last at 8 s", () => {
    expect(viduQ2TurboClipUsd(3)).toBeCloseTo(0.061875, 6);
    expect(viduQ2TurboClipUsd(4)).toBe(0.0825);
    expect(viduQ2TurboClipUsd(5)).toBe(0.11);
    expect(viduQ2TurboClipUsd(6)).toBe(0.1375);
    expect(viduQ2TurboClipUsd(8)).toBe(0.193);
    expect(clipListUsd("lightricks:ltx@2.3-fast", 4)).toBeCloseTo(0.12, 6);
    const eight = estimateJobUsd(resolveExpressionLabels("all28"), { videoSeconds: 8, matteMode: "key" });
    expect(eight).toBeLessThan(stPacksSettings({}).maxUsdPerJob);
    expect(eight).toBeGreaterThan(28 * 0.193);
  });

  it("loosens drift and pop for expressive and keeps the hole checks", () => {
    const bars = qaThresholds("expressive");
    expect(bars.driftPx).toBeGreaterThan(ST_QA.driftPx);
    expect(bars.consSpikeAbs).toBeGreaterThan(ST_QA.consSpikeAbs);
    expect(bars.alphaCoverageMax).toBe(ST_QA.alphaCoverageMax);
    expect(bars.cornerOpaqueMax).toBe(ST_QA.cornerOpaqueMax);
    expect(bars.seamAbs).toBe(ST_QA.seamAbs);
    expect(qaThresholds("subtle")).toBe(ST_QA);
  });
});
