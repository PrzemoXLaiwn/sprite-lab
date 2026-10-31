// The ST label list is what SillyTavern's classifier emits; file names and
// prompt fragments hang off it, so it must stay complete and exact.
import { describe, expect, it } from "vitest";
import {
  PING_PONG_ALLOWED, ST_DEFAULT_LABELS, ST_EXPRESSION_FRAGMENTS, ST_EXPRESSION_LABELS,
  expressionFileName, isExpressionLabel, motionNoteFor, resolveExpressionLabels,
} from "./st-expressions";
import { basePrompt, editPrompt, videoPrompt } from "@/lib/st-packs/prompts";
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

  it("never ping-pongs the lively labels", () => {
    expect(PING_PONG_ALLOWED.has("joy")).toBe(false);
    expect(PING_PONG_ALLOWED.has("surprise")).toBe(false);
    expect(PING_PONG_ALLOWED.has("sadness")).toBe(true);
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
  });
});
