import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/claude-usage", () => ({
  claudeCall: (_feature: string, _model: string, call: () => Promise<unknown>) => call(),
  trackClaude: vi.fn(),
}));

import { trackClaude } from "@/lib/claude-usage";
import {
  parseSuggestionPayload,
  SUGGEST_HAIKU_FLAG,
  suggestHaikuEnabled,
  suggestMotions,
  type SuggestCache,
} from "./animation-suggest";

const good = {
  subject: "a brown dog",
  motions: [
    { label: "Idle Breathing", motion: "The dog breathes and shifts its weight, tail low.", loop: true, anchor: "ground", frames: 4 },
    { label: "Walk", motion: "The dog walks in place, legs alternating, tail swaying.", loop: true, anchor: "ground", frames: 6 },
    { label: "Wag Tail", motion: "The dog stands and wags its tail in a wide happy sweep.", loop: true, anchor: "ground", frames: 4 },
    { label: "Bark", motion: "The dog barks once, mouth open, then settles.", loop: false, anchor: "ground", frames: 4 },
    { label: "Sniff Ground", motion: "The dog lowers its head and sniffs along the ground.", loop: false, anchor: "ground", frames: 6 },
    { label: "Hurt", motion: "The dog flinches, yelps and recovers its stance.", loop: false, anchor: "ground", frames: 4 },
  ],
};

afterEach(() => {
  delete process.env[SUGGEST_HAIKU_FLAG];
  vi.clearAllMocks();
});

describe("suggest motions", () => {
  it("keeps Haiku off unless the flag is set", () => {
    expect(suggestHaikuEnabled({})).toBe(false);
    expect(suggestHaikuEnabled({ [SUGGEST_HAIKU_FLAG]: "1" })).toBe(true);
  });

  it("rejects a payload with fewer than three usable motions", () => {
    expect(parseSuggestionPayload({ motions: [{ label: "Idle", motion: "Breathes slowly in place.", loop: true, anchor: "ground", frames: 4 }] })).toBeNull();
  });

  it("uses the injected model once and then the durable cache", async () => {
    process.env[SUGGEST_HAIKU_FLAG] = "1";
    const complete = vi.fn(async (model: string) => {
      expect(model).toBe("claude-haiku-4-5-20251001");
      return { model, content: [{ type: "text", text: JSON.stringify(good) }], usage: { input_tokens: 2000, output_tokens: 400 } };
    });
    const saved = new Map<string, string>();
    const cache: SuggestCache = {
      async get(key) {
        const raw = saved.get(key);
        return raw ? JSON.parse(raw) : null;
      },
      async set(key, value, userId) {
        expect(userId).toBe("user_1");
        saved.set(key, JSON.stringify(value));
      },
    };
    const opts = { cacheKey: "sprite-dog-1", image: Buffer.from("png"), prompt: "a brown dog", categoryId: "CREATURES", userId: "user_1" };
    const first = await suggestMotions(opts, { complete, cache });
    expect(first.ai).toBe(true);
    expect(first.motions.some((m) => /wag/i.test(m.label))).toBe(true);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(trackClaude).toHaveBeenCalledWith("suggest", expect.anything(), "user_1");

    const second = await suggestMotions({ ...opts, cacheKey: "sprite-dog-2" }, { complete, cache: {
      async get() { return first; },
      async set() { throw new Error("should not write"); },
    } });
    expect(second.motions.map((m) => m.label)).toEqual(first.motions.map((m) => m.label));
    expect(complete).toHaveBeenCalledTimes(1);
  });
});
