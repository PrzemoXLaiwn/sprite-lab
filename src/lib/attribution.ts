// =============================================================================
// Where a visitor came from (first touch), for "which channel brings sign-ups"
// =============================================================================
// Pure. Only coarse, non-personal facts: a source bucket, the UTM medium and
// campaign (cleaned), the referrer's host and the landing path. Never a full
// referrer URL or query string (they can carry personal data).
// =============================================================================

export type SourceBucket =
  | "tiktok" | "google" | "bing" | "youtube" | "reddit" | "twitter" | "instagram" | "facebook" | "discord"
  | "itch" | "producthunt" | "ai_assistant" | "email" | "direct" | "other";

export interface FirstTouch {
  source: SourceBucket;
  medium: string | null;
  campaign: string | null;
  referrerHost: string | null;
  landing: string;
}

const clean = (v: string | null | undefined, max = 40): string | null => {
  const s = (v ?? "").toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, max);
  return s || null;
};

/** Host → bucket. Order matters only for readability; hosts don't overlap. */
const HOSTS: [RegExp, SourceBucket][] = [
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)google\.[a-z.]+$/, "google"],
  [/(^|\.)bing\.com$/, "bing"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube"],
  [/(^|\.)reddit\.com$/, "reddit"],
  [/(^|\.)(twitter\.com|x\.com|t\.co)$/, "twitter"],
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)(facebook\.com|fb\.com|m\.facebook\.com)$/, "facebook"],
  [/(^|\.)(discord\.com|discord\.gg|discordapp\.com)$/, "discord"],
  [/(^|\.)itch\.io$/, "itch"],
  [/(^|\.)producthunt\.com$/, "producthunt"],
  [/(^|\.)(chatgpt\.com|chat\.openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|copilot\.microsoft\.com)$/, "ai_assistant"],
  [/(^|\.)(mail\.google\.com|outlook\.live\.com|mail\.yahoo\.com)$/, "email"],
];

const UTM_SOURCES: Record<string, SourceBucket> = {
  tiktok: "tiktok", tt: "tiktok", google: "google", bing: "bing", youtube: "youtube", yt: "youtube", reddit: "reddit",
  twitter: "twitter", x: "twitter", instagram: "instagram", ig: "instagram", facebook: "facebook", fb: "facebook",
  discord: "discord", itch: "itch", "itch.io": "itch", producthunt: "producthunt", chatgpt: "ai_assistant",
  perplexity: "ai_assistant", email: "email", newsletter: "email", resend: "email",
};

/**
 * The first-touch record for a page view. `ownHost` is excluded (internal
 * navigation is not a source). AI assistants are matched before Google so
 * gemini.google.com counts as an assistant.
 */
export function classifyFirstTouch(input: { search: string; referrer: string; pathname: string; ownHost: string }): FirstTouch {
  const params = new URLSearchParams(input.search);
  const utmSource = clean(params.get("utm_source"));
  let host: string | null = null;
  try {
    host = input.referrer ? new URL(input.referrer).hostname.toLowerCase() : null;
  } catch {
    host = null;
  }
  if (host && (host === input.ownHost || host.endsWith(`.${input.ownHost.replace(/^www\./, "")}`) || host === input.ownHost.replace(/^www\./, ""))) host = null;

  let source: SourceBucket = "direct";
  if (utmSource) source = UTM_SOURCES[utmSource] ?? "other";
  else if (host) {
    const assistant = HOSTS.find(([re, b]) => b === "ai_assistant" && re.test(host!));
    source = assistant ? "ai_assistant" : HOSTS.find(([re]) => re.test(host!))?.[1] ?? "other";
  }
  return {
    source,
    medium: clean(params.get("utm_medium")),
    campaign: clean(params.get("utm_campaign"), 60),
    referrerHost: host ? host.slice(0, 80) : null,
    // Same characters the server accepts; anything else (encoded text) is dropped
    landing: `/${(input.pathname || "/").replace(/^\/+/, "").replace(/[^A-Za-z0-9/_.-]/g, "")}`.slice(0, 80),
  };
}

export const FIRST_TOUCH_KEY = "sl:first-touch";
/** A first touch older than this no longer explains a sign-up. */
export const FIRST_TOUCH_TTL_MS = 30 * 24 * 3600_000;

/** Stored value → record, or null when missing, malformed or expired. */
export function parseStoredFirstTouch(raw: string | null, now = Date.now()): FirstTouch | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<FirstTouch> & { at?: number };
    if (typeof v.at !== "number" || now - v.at > FIRST_TOUCH_TTL_MS || typeof v.source !== "string") return null;
    return {
      source: v.source as SourceBucket,
      medium: v.medium ?? null,
      campaign: v.campaign ?? null,
      referrerHost: v.referrerHost ?? null,
      landing: typeof v.landing === "string" ? v.landing : "/",
    };
  } catch {
    return null;
  }
}
