import { describe, expect, it } from "vitest";
import { EXPERIMENTS, assignVariant } from "@/lib/funnel/experiments";
import { readUtm, sanitizeReferrer } from "@/lib/funnel/events";

describe("experiments", () => {
  it("ships with no live experiment", () => {
    expect(EXPERIMENTS).toEqual([]);
    expect(assignVariant("11111111-1111-1111-1111-111111111111", "anything")).toBeNull();
  });

  it("sticks a visitor to one variant", () => {
    const experiments = [{ id: "pack_copy", variants: ["control", "blaze"] as const }];
    const visitor = "22222222-2222-2222-2222-222222222222";
    const first = assignVariant(visitor, "pack_copy", experiments);
    expect(first === "control" || first === "blaze").toBe(true);
    expect(assignVariant(visitor, "pack_copy", experiments)).toBe(first);
    expect(assignVariant("33333333-3333-3333-3333-333333333333", "missing", experiments)).toBeNull();
  });
});

describe("attribution cleaning", () => {
  it("keeps utm labels and drops an email stuffed into the campaign", () => {
    const utm = readUtm("?utm_source=tiktok&utm_medium=social&utm_campaign=buyer@example.com&utm_content=hero");
    expect(utm.source).toBe("tiktok");
    expect(utm.medium).toBe("social");
    expect(utm.campaign).toBeNull();
    expect(utm.content).toBe("hero");
  });

  it("stores a referrer without its query string", () => {
    expect(sanitizeReferrer("https://www.tiktok.com/video/1?token=secret")).toBe("https://www.tiktok.com/video/1");
    expect(sanitizeReferrer("not a url")).toBeNull();
  });
});
