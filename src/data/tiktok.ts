// SpriteLab on TikTok — used by the homepage community section, footer and
// Organization JSON-LD (sameAs).

export const TIKTOK_HANDLE = "spritelab1";
export const TIKTOK_PROFILE_URL = `https://www.tiktok.com/@${TIKTOK_HANDLE}`;
/** Hashtag we ask the community to use so we can feature their creations. */
export const COMMUNITY_HASHTAG = "madewithspritelab";

/**
 * Videos to feature while the TikTok API isn't connected (TIKTOK_* env vars).
 * Paste full video links, e.g. "https://www.tiktok.com/@spritelab1/video/7694...".
 * With the API connected, the most-viewed videos are picked automatically.
 */
export const FEATURED_TIKTOKS: string[] = [];

/**
 * Our own clips (public/tiktok, 360×640, muted) — shown when no TikTok data
 * is available. They play inline and link to the profile.
 */
export const LOCAL_CLIPS: { src: string; poster: string; title: string }[] = [
  { src: "/tiktok/rave.mp4", poster: "/tiktok/rave.jpg", title: "Every sprite here was made by AI" },
  { src: "/tiktok/anything.mp4", poster: "/tiktok/anything.jpg", title: "AI animates ANY game sprite" },
  { src: "/tiktok/dragon.mp4", poster: "/tiktok/dragon.jpg", title: "One sentence → an animated dragon" },
];
