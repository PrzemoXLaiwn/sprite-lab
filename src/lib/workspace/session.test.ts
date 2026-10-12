import { describe, expect, it } from "vitest";
import {
  addSourceLink,
  buildToolHref,
  DRAFT_MAX_AGE_MS,
  DRAFT_VERSION,
  isMeaningfulCreateDraft,
  parseDraft,
  parseLastActivity,
  parseSourceLinks,
  parseToolParams,
  withResultParam,
} from "./session";

const NOW = 1_800_000_000_000;
const json = (v: unknown) => JSON.stringify(v);

describe("parseDraft", () => {
  it("round-trips an animate draft", () => {
    const draft = {
      v: DRAFT_VERSION, updatedAt: NOW - 1000, sourceId: "clx123abc", action: "walk", customMotion: "", frames: 6,
      framesTouched: true, smooth: false, fps: 10, resultId: "clx999",
      result: { sheetUrl: "https://cdn.example/s.png", gifUrl: "https://cdn.example/s.gif", frameCount: 6, frameWidth: 256, frameHeight: 256 },
      resultMotion: { id: "walk", text: "walk Walk " },
    };
    expect(parseDraft("animate", json(draft), NOW)).toEqual({ ...draft, result: { ...draft.result, sheetCols: undefined }, suggested: undefined });
  });

  it("keeps tailored motion cards and drops malformed ones", () => {
    const d = parseDraft("animate", json({
      v: DRAFT_VERSION, updatedAt: NOW, sourceId: "abc", action: "ai-bark",
      suggested: [{ id: "ai-bark", label: "Bark", motion: "barks twice", loop: false, anchor: "ground", frames: 6 }, { id: 1 }, { id: "x", label: "X", motion: "m", anchor: "moon", frames: 7 }],
    }), NOW);
    expect(d?.suggested).toEqual([
      { id: "ai-bark", label: "Bark", motion: "barks twice", loop: false, anchor: "ground", frames: 6 },
      { id: "x", label: "X", motion: "m", loop: false, anchor: undefined, frames: undefined },
    ]);
  });

  it("rejects corrupt, old, foreign-version or unsafe drafts", () => {
    expect(parseDraft("animate", "{not json", NOW)).toBeNull();
    expect(parseDraft("animate", null, NOW)).toBeNull();
    expect(parseDraft("animate", json([]), NOW)).toBeNull();
    expect(parseDraft("animate", json({ v: 99, updatedAt: NOW, sourceId: "a" }), NOW)).toBeNull();
    expect(parseDraft("animate", json({ v: DRAFT_VERSION, updatedAt: NOW - DRAFT_MAX_AGE_MS - 1, sourceId: "a" }), NOW)).toBeNull();
    expect(parseDraft("animate", json({ v: DRAFT_VERSION, updatedAt: NOW, sourceId: "../../etc" }), NOW)).toBeNull();
  });

  it("drops unsafe result URLs but keeps the rest", () => {
    const d = parseDraft("edit", json({ v: DRAFT_VERSION, updatedAt: NOW, sourceId: "abc", editPrompt: "add a cape", resultUrl: "javascript:alert(1)" }), NOW);
    expect(d).toMatchObject({ sourceId: "abc", editPrompt: "add a cape" });
    expect(d?.resultUrl).toBeUndefined();
  });

  it("drops an animation snapshot with a bad sheet", () => {
    const d = parseDraft("animate", json({ v: DRAFT_VERSION, updatedAt: NOW, sourceId: "abc", result: { sheetUrl: "data:x", frameCount: 4, frameWidth: 1, frameHeight: 1 } }), NOW);
    expect(d?.result).toBeUndefined();
  });

  it("keeps valid create results, caps them and clamps the selection", () => {
    const result = (i: number) => ({ id: `r${i}`, imageUrl: `https://cdn.example/${i}.png`, seed: i, categoryId: "CHARACTERS", subcategoryId: "HEROES", styleId: "PIXEL_ART_16", view: "none", palette: "auto", prompt: "knight", generationId: `g${i}` });
    const raw = json({
      v: DRAFT_VERSION, updatedAt: NOW, prompt: "knight", groupId: "CHARACTERS",
      results: [...Array.from({ length: 15 }, (_, i) => result(i)), { id: "bad", imageUrl: "file:///c" }],
      selectedIndex: 40,
    });
    const d = parseDraft("create", raw, NOW);
    expect(d?.results).toHaveLength(12);
    expect(d?.selectedIndex).toBe(11);
    expect(d?.results[0]).toMatchObject({ id: "r0", generationId: "g0" });
  });

  it("knows when a create draft is empty", () => {
    expect(isMeaningfulCreateDraft(parseDraft("create", json({ v: DRAFT_VERSION, updatedAt: NOW, prompt: " ", results: [] }), NOW))).toBe(false);
    expect(isMeaningfulCreateDraft(parseDraft("create", json({ v: DRAFT_VERSION, updatedAt: NOW, prompt: "knight", results: [] }), NOW))).toBe(true);
    expect(isMeaningfulCreateDraft(null)).toBe(false);
  });
});

describe("parseLastActivity", () => {
  const base = { tool: "animate", href: "/animate?id=abc&result=def", title: "knight", updatedAt: NOW };

  it("accepts tool paths only", () => {
    expect(parseLastActivity(json(base), NOW)).toMatchObject({ tool: "animate", href: "/animate?id=abc&result=def" });
    expect(parseLastActivity(json({ ...base, href: "https://evil.example/animate" }), NOW)).toBeNull();
    expect(parseLastActivity(json({ ...base, href: "//evil.example" }), NOW)).toBeNull();
    expect(parseLastActivity(json({ ...base, tool: "admin" }), NOW)).toBeNull();
  });

  it("expires", () => {
    expect(parseLastActivity(json({ ...base, updatedAt: NOW - DRAFT_MAX_AGE_MS - 1 }), NOW)).toBeNull();
  });
});

describe("URL helpers", () => {
  it("parses ids and drops malformed ones", () => {
    expect(parseToolParams(new URLSearchParams("id=abc&result=def"))).toEqual({ id: "abc", result: "def" });
    expect(parseToolParams(new URLSearchParams("id=a%2Fb&result="))).toEqual({ id: null, result: null });
    expect(parseToolParams(new URLSearchParams(""))).toEqual({ id: null, result: null });
  });

  it("builds tool links", () => {
    expect(buildToolHref("animate", { id: "abc", result: "def" })).toBe("/animate?id=abc&result=def");
    expect(buildToolHref("edit", { id: "abc" })).toBe("/edit?id=abc");
    expect(buildToolHref("create", { id: "abc", result: "def" })).toBe("/generate?result=def");
    expect(buildToolHref("animate", {})).toBe("/animate");
  });

  it("sets and removes ?result= without touching other params", () => {
    expect(withResultParam("/animate?id=abc", "def")).toBe("/animate?id=abc&result=def");
    expect(withResultParam("/animate?id=abc&result=def", null)).toBe("/animate?id=abc");
    expect(withResultParam("/animate?id=abc&result=def", "def")).toBeNull();
    expect(withResultParam("/generate?styleId=PIXEL_ART_16", "g1")).toBe("/generate?styleId=PIXEL_ART_16&result=g1");
  });
});

describe("source links", () => {
  it("parses safely", () => {
    expect(parseSourceLinks("nope")).toEqual({});
    expect(parseSourceLinks(json({ a: "b", "bad id": "c", d: 5 }))).toEqual({ a: "b" });
  });

  it("keeps the newest links only", () => {
    let links = {};
    for (let i = 0; i < 5; i++) links = addSourceLink(links, `anim${i}`, `src${i}`, 3);
    expect(Object.keys(links)).toEqual(["anim2", "anim3", "anim4"]);
    links = addSourceLink(links, "anim2", "srcX", 3);
    expect(Object.keys(links)).toEqual(["anim3", "anim4", "anim2"]);
    expect(addSourceLink(links, "../x", "y", 3)).toBe(links);
  });
});
