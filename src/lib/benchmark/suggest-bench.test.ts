import { describe, expect, it } from "vitest";
import { parseSuggestionPayload } from "@/lib/animation-suggest";
import { SUGGEST_BENCH_PROMPTS, scoreSuggestions, suggestPriceDelta } from "./suggest-bench";

describe("suggest benchmark scorer", () => {
  it("has 20 prompts and prices Haiku at one fifth of Opus", () => {
    expect(SUGGEST_BENCH_PROMPTS).toHaveLength(20);
    const price = suggestPriceDelta({ input_tokens: 2_000, output_tokens: 400 });
    expect(price.haikuOverOpus).toBeCloseTo(0.2, 5);
    expect(price.savedUsd).toBeCloseTo(price.opusUsd * 0.8, 8);
  });

  it("passes a dog set and fails a set that makes the dog fly", () => {
    const dog = parseSuggestionPayload({
      subject: "a brown dog",
      motions: [
        { label: "Idle", motion: "The dog breathes and shifts its weight.", loop: true, anchor: "ground", frames: 4 },
        { label: "Walk", motion: "The dog walks in place with a swaying tail.", loop: true, anchor: "ground", frames: 6 },
        { label: "Wag Tail", motion: "The dog stands still and wags its tail.", loop: true, anchor: "ground", frames: 4 },
        { label: "Bark", motion: "The dog barks once and settles.", loop: false, anchor: "ground", frames: 4 },
        { label: "Sniff Ground", motion: "The dog sniffs along the ground.", loop: false, anchor: "ground", frames: 6 },
        { label: "Sit", motion: "The dog sits down and looks up.", loop: false, anchor: "ground", frames: 4 },
      ],
    });
    expect(scoreSuggestions("dog", dog).reasons).toEqual([]);
    const flying = parseSuggestionPayload({
      subject: "a brown dog",
      motions: [
        { label: "Idle", motion: "The dog breathes.", loop: true, anchor: "ground", frames: 4 },
        { label: "Fly", motion: "The dog flies with wings spread.", loop: true, anchor: "air", frames: 6 },
        { label: "Drive", motion: "The dog drives a car with wheels.", loop: true, anchor: "ground", frames: 6 },
        { label: "Walk", motion: "The dog walks in place.", loop: true, anchor: "ground", frames: 6 },
        { label: "Bark", motion: "The dog barks once.", loop: false, anchor: "ground", frames: 4 },
        { label: "Sit", motion: "The dog sits.", loop: false, anchor: "ground", frames: 4 },
      ],
    });
    const bad = scoreSuggestions("dog", flying);
    expect(bad.forbidden).toBe(true);
    expect(bad.reasons.length).toBeGreaterThan(0);
  });
});
