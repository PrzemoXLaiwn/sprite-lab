import { describe, expect, it } from "vitest";
import { classifyFirstTouch, parseStoredFirstTouch } from "./attribution";

const base = { search: "", referrer: "", pathname: "/", ownHost: "www.sprite-lab.com" };

describe("classifyFirstTouch", () => {
  it("buckets referrers by host", () => {
    expect(classifyFirstTouch({ ...base, referrer: "https://www.tiktok.com/@spritelab1/video/123" }).source).toBe("tiktok");
    expect(classifyFirstTouch({ ...base, referrer: "https://www.google.co.uk/" }).source).toBe("google");
    expect(classifyFirstTouch({ ...base, referrer: "https://old.reddit.com/r/gamedev/x" }).source).toBe("reddit");
    expect(classifyFirstTouch({ ...base, referrer: "https://chatgpt.com/" }).source).toBe("ai_assistant");
    expect(classifyFirstTouch({ ...base, referrer: "https://gemini.google.com/app" }).source).toBe("ai_assistant");
    expect(classifyFirstTouch({ ...base, referrer: "https://some-blog.example/post" }).source).toBe("other");
  });

  it("UTM source wins over the referrer, and is cleaned", () => {
    const t = classifyFirstTouch({ ...base, search: "?utm_source=TikTok&utm_medium=Bio Link&utm_campaign=Dungeon%20Launch!", referrer: "https://www.google.com/" });
    expect(t).toMatchObject({ source: "tiktok", medium: "bio-link", campaign: "dungeon-launch" });
  });

  it("internal navigation and no referrer count as direct; only the host is kept", () => {
    expect(classifyFirstTouch({ ...base, referrer: "https://www.sprite-lab.com/pricing" }).source).toBe("direct");
    expect(classifyFirstTouch({ ...base, referrer: "https://sprite-lab.com/" }).source).toBe("direct");
    const t = classifyFirstTouch({ ...base, referrer: "https://www.youtube.com/watch?v=abc&email=a@b.c", pathname: "/play" });
    expect(t).toMatchObject({ source: "youtube", referrerHost: "www.youtube.com", landing: "/play" });
    expect(JSON.stringify(t)).not.toContain("a@b.c");
    // Landing path keeps only the characters the server accepts
    expect(classifyFirstTouch({ ...base, pathname: "/guides/caf%C3%A9 x" }).landing).toBe("/guides/cafC3A9x");
  });
});

describe("parseStoredFirstTouch", () => {
  it("reads a fresh record and drops expired or malformed ones", () => {
    const now = 1_000_000_000_000;
    const ok = JSON.stringify({ at: now - 1000, source: "tiktok", medium: null, campaign: null, referrerHost: "www.tiktok.com", landing: "/" });
    expect(parseStoredFirstTouch(ok, now)?.source).toBe("tiktok");
    expect(parseStoredFirstTouch(JSON.stringify({ at: now - 40 * 24 * 3600_000, source: "x" }), now)).toBeNull();
    expect(parseStoredFirstTouch("{not json", now)).toBeNull();
    expect(parseStoredFirstTouch(null, now)).toBeNull();
  });
});
