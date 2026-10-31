import { afterEach, describe, expect, it } from "vitest";
import sharp from "sharp";
import { FEATURES, PRICE } from "@/lib/billing/features";
import { CREDIT_COSTS } from "@/lib/services/generation";
import { costScenarios, defaultLiveCatalog, LIVE_SPEND_CAP_USD, refundsThatStillCost, selectUnderCap } from "./cost-map";
import { runOfflineBenchmark } from "./offline-harness";
import { FRAME_NORMALIZE_FLAG } from "@/lib/image/frame-normalize";

afterEach(() => {
  delete process.env[FRAME_NORMALIZE_FLAG];
});

describe("cost map", () => {
  it("covers refunds where the provider can already have billed", () => {
    const rows = costScenarios();
    const ids = new Set(rows.map((r) => r.id));
    for (const id of [
      "sprite_fail_explicit",
      "sprite_hd_timeout_then_standard",
      "upload_fail_after_image",
      "anim4_fail_after_grid",
      "anim6_fail",
      "anim9_fail",
      "anim_smooth4_partial",
      "anim_smooth6_partial",
      "rotate4_fail",
      "rotate8_fail",
      "walk4_fail",
      "rig_fail",
      "rig_cancel_then_ai_walk",
      "edit_fail",
      "remove_bg_fail",
      "upscale_fail",
      "variation_partial",
      "model_3d_fail",
    ]) {
      expect(ids.has(id)).toBe(true);
    }
    const leaks = refundsThatStillCost();
    expect(leaks.length).toBeGreaterThan(10);
    for (const row of rows) {
      expect(row.providerUsd.max).toBeGreaterThanOrEqual(row.providerUsd.min);
      expect(row.creditsRefunded).toBeLessThanOrEqual(row.creditsCharged);
    }
    const upload = rows.find((r) => r.id === "upload_fail_after_image")!;
    expect(upload.creditsRefunded).toBe(CREDIT_COSTS.hd);
    expect(upload.providerUsd.min).toBe(PRICE.hd);
    const smooth = rows.find((r) => r.id === "anim_smooth6_partial")!;
    expect(smooth.providerUsd.max).toBeLessThanOrEqual(FEATURES.anim_smooth_6.capUsd + 0.001);
  });

  it("keeps a live catalog under the $3 cap and drops anything past it", () => {
    const catalog = defaultLiveCatalog();
    const planned = selectUnderCap(catalog);
    expect(planned.skipped).toHaveLength(0);
    expect(planned.totalUsd).toBeCloseTo(PRICE.standard + PRICE.grid1024, 6);
    expect(planned.totalUsd).toBeLessThan(LIVE_SPEND_CAP_USD);
    const tooMany = selectUnderCap(Array.from({ length: 50 }, (_, i) => ({ id: `g${i}`, model: "google:4@3", listUsd: PRICE.grid1024 })));
    expect(tooMany.totalUsd).toBeLessThanOrEqual(LIVE_SPEND_CAP_USD + 1e-9);
    expect(tooMany.skipped.length).toBeGreaterThan(0);
    expect(tooMany.selected.length).toBeLessThan(50);
  });
});

describe("pipeline flow with the flag", () => {
  it("runs postprocessSprite and buildAnimation and the flag improves the synthetic fixtures", async () => {
    const bench = await runOfflineBenchmark();
    expect(bench.liveProviderCalls).toBe(0);
    expect(bench.spendUsd).toBe(0);
    const spriteOff = bench.rows.find((r) => r.pipeline === "sprite" && r.variant === "production")!;
    const spriteOn = bench.rows.find((r) => r.pipeline === "sprite" && r.variant === "frame-normalize")!;
    const animOff = bench.rows.find((r) => r.pipeline === "animation" && r.variant === "production")!;
    const animOn = bench.rows.find((r) => r.pipeline === "animation" && r.variant === "frame-normalize")!;

    expect(spriteOff.greenPixels).toBeGreaterThan(0);
    expect(spriteOn.greenPixels).toBe(0);
    expect(spriteOn.haloPixels).toBeLessThan(spriteOff.haloPixels);
    expect(spriteOn.sameCanvas).toBe(true);

    expect(animOff.frames).toBe(4);
    expect(animOn.frames).toBe(4);
    expect(animOn.sameCanvas).toBe(true);
    expect(animOn.heightStd).toBeLessThan(animOff.heightStd);
    expect(animOn.baselineSpread).toBeLessThanOrEqual(animOff.baselineSpread + 1);
    expect(animOn.uniqueColors).toBeLessThanOrEqual(animOff.uniqueColors);

    const meta = await sharp(bench.contactSheet).metadata();
    expect(meta.width).toBe(640);
    expect(meta.format).toBe("png");

    const production = bench.prompts.find((p) => p.id === "production")!;
    const variant = bench.prompts.find((p) => p.id === "palette-and-scale")!;
    expect(production.addsPaletteLine).toBe(false);
    expect(variant.addsPaletteLine).toBe(true);
    expect(variant.chars).toBeGreaterThan(production.chars);
  }, 60_000);
});
