// The ST label list is what SillyTavern's classifier emits; file names and
// prompt fragments hang off it, so it must stay complete and exact.
import { describe, expect, it } from "vitest";
import {
  ST_DEFAULT_LABELS, ST_EXPRESSIVE_ACTING, ST_EXPRESSION_FRAGMENTS, ST_EXPRESSION_LABELS,
  expressionFileName, isExpressionLabel, motionNoteFor, resolveExpressionLabels,
} from "./st-expressions";
import { EXPRESSIVE_MOTION_RULE, basePrompt, editPrompt, videoPrompt } from "@/lib/st-packs/prompts";
import { SFW_PREFIX } from "@/lib/st-packs/sfw";

describe("ST expression labels", () => {
  it("has all 28 labels, unique and lowercase", () => {
    expect(ST_EXPRESSION_LABELS).toHaveLength(28);
    expect(new Set(ST_EXPRESSION_LABELS).size).toBe(28);
    for (const l of ST_EXPRESSION_LABELS) expect(l).toBe(l.toLowerCase());
    for (const l of ["admiration", "amusement", "anger", "annoyance", "approval", "caring", "confusion", "curiosity", "desire", "disappointment", "disapproval", "disgust", "embarrassment", "excitement", "fear", "gratitude", "grief", "joy", "love", "nervousness", "optimism", "pride", "realization", "relief", "remorse", "sadness", "surprise", "neutral"]) {
      expect(isExpressionLabel(l)).toBe(true);
    }
  });

  it("default 8 is a subset and always includes neutral", () => {
    expect(ST_DEFAULT_LABELS).toHaveLength(8);
    for (const l of ST_DEFAULT_LABELS) expect(isExpressionLabel(l)).toBe(true);
    expect(ST_DEFAULT_LABELS).toContain("neutral");
    expect(resolveExpressionLabels("default8")).toContain("neutral");
    expect(resolveExpressionLabels("all28")).toHaveLength(28);
    expect(resolveExpressionLabels("custom", ["joy", "bogus", "joy"])).toEqual(["neutral", "joy"]);
    expect(resolveExpressionLabels("custom", [])).toEqual(["neutral"]);
    expect(resolveExpressionLabels("custom", ["excitement"], false)).toEqual(["excitement"]);
    expect(resolveExpressionLabels("default8", [], false)).not.toContain("neutral");
    expect(resolveExpressionLabels("default8", [], false)).toHaveLength(7);
    expect(resolveExpressionLabels("all28", [], false)).toHaveLength(27);
  });

  it("maps labels to file names and rejects unknown ones", () => {
    expect(expressionFileName("joy")).toBe("joy.webp");
    expect(expressionFileName("neutral", "png")).toBe("neutral.png");
    expect(() => expressionFileName("Joy")).toThrow(/Unknown/);
    expect(() => expressionFileName("happy")).toThrow(/Unknown/);
  });

  it("every label has a prompt fragment and a motion note", () => {
    for (const l of ST_EXPRESSION_LABELS) {
      expect(ST_EXPRESSION_FRAGMENTS[l].length).toBeGreaterThan(10);
      expect(motionNoteFor(l).length).toBeGreaterThan(5);
    }
    expect(motionNoteFor("joy")).toMatch(/NOT a continuous looping laugh/);
    expect(motionNoteFor("pride")).toBe("calm, subtle, holds the expression");
  });
});

describe("prompts", () => {
  it("start with the SFW prefix and carry the fragment / motion note", () => {
    expect(basePrompt("a red-haired ranger", "waist", "anime cel shading")).toMatch(new RegExp(`^${SFW_PREFIX}`));
    expect(basePrompt("a ranger", "bust")).toMatch(/bust portrait/);
    expect(editPrompt("anger", null)).toContain(ST_EXPRESSION_FRAGMENTS.anger);
    expect(editPrompt("anger", "soft light")).toMatch(/soft light/);
    expect(videoPrompt("joy")).toContain(motionNoteFor("joy"));
    expect(videoPrompt("joy")).toMatch(/no camera movement/);
    expect(videoPrompt("joy")).toMatch(/no head sway/);
    expect(videoPrompt("joy")).toMatch(/head stays still and centred/);
    expect(videoPrompt("joy")).toMatch(/no blink is better/);
    expect(videoPrompt("joy")).toMatch(/robotic blink/);
    expect(videoPrompt("joy")).not.toMatch(/drift of the head/);
    expect(videoPrompt("joy").length).toBeLessThan(2000);
  });

  it("gives every emotion its own acting beat and forbids a robotic loop", () => {
    const lines = ST_EXPRESSION_LABELS.map((l) => ST_EXPRESSIVE_ACTING[l]);
    expect(new Set(lines).size).toBe(28);
    for (const l of ST_EXPRESSION_LABELS) {
      expect(ST_EXPRESSIVE_ACTING[l].length).toBeGreaterThan(40);
      const prompt = videoPrompt(l, "expressive");
      expect(prompt).toContain(EXPRESSIVE_MOTION_RULE);
      expect(prompt).toContain("No robotic blinking");
      expect(prompt).toContain("no mechanical repetition");
      expect(prompt).toContain(ST_EXPRESSIVE_ACTING[l]);
      expect(prompt).toContain("last frame matches the first");
      expect(prompt).toContain("ease in");
      expect(prompt).toContain("Do not touch the face");
      expect(videoPrompt(l, "expressive", "#00FF00")).toContain("#00FF00");
      expect(prompt).not.toMatch(/no head sway/);
      expect(prompt.length).toBeLessThan(2000);
    }
    expect(ST_EXPRESSIVE_ACTING.anger).toMatch(/fists/);
    expect(ST_EXPRESSIVE_ACTING.joy).toMatch(/shoulders shake/);
    expect(ST_EXPRESSIVE_ACTING.sadness).toMatch(/hand rubs/);
    expect(ST_EXPRESSIVE_ACTING.surprise).toMatch(/step back/);
  });

  it("locks every edit to the input framing (expressive included), hands away from the face", () => {
    // SillyTavern swaps the files in place: a new crop reads as a jump (Nov 2026)
    for (const opts of [undefined, { motion: "expressive" as const, framing: "waist" as const }, { motion: "expressive" as const, framing: "bust" as const }]) {
      const p = editPrompt("anger", null, opts);
      expect(p).toMatch(/Keep exactly the same framing, crop, scale and position as the input image/);
      expect(p).toMatch(/Do not move or resize the character/);
      expect(p).not.toMatch(/shift the crop/);
    }
    expect(editPrompt("anger", null, { motion: "expressive", framing: "waist" })).toMatch(/away from the face/);
  });
});
