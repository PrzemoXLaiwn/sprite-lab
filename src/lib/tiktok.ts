// =============================================================================
// TikTok videos for the homepage community section
// =============================================================================
// Two sources, best first:
//   1. TikTok Display API (official) — the account's videos with view counts,
//      sorted by views. Needs TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET and
//      TIKTOK_REFRESH_TOKEN (get the token once at /api/tiktok/connect as admin).
//   2. FEATURED_TIKTOKS (src/data/tiktok.ts) via TikTok oEmbed — no views.
// When both are empty the section falls back to TikTok's creator embed,
// which shows the latest videos on its own. Scraping TikTok is blocked
// (status 10221) and against its terms, so it isn't attempted.
// =============================================================================

import { unstable_cache } from "next/cache";
import { FEATURED_TIKTOKS } from "@/data/tiktok";

export interface TikTokVideo {
  id: string;
  url: string;
  title: string;
  cover: string | null;
  views: number | null;
  likes: number | null;
}

const API = "https://open.tiktokapis.com/v2";

export function tiktokApiConfigured(): boolean {
  return Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET && process.env.TIKTOK_REFRESH_TOKEN);
}

/** Exchanges an OAuth code or refresh token for tokens. */
export async function tiktokToken(params: Record<string, string>) {
  const res = await fetch(`${API}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY ?? "",
      client_secret: process.env.TIKTOK_CLIENT_SECRET ?? "",
      ...params,
    }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    refresh_expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !json.access_token) throw new Error(`TikTok token: ${json.error ?? res.status} ${json.error_description ?? ""}`);
  return json;
}

async function fromApi(): Promise<TikTokVideo[]> {
  const { access_token } = await tiktokToken({ grant_type: "refresh_token", refresh_token: process.env.TIKTOK_REFRESH_TOKEN! });
  const fields = "id,title,video_description,cover_image_url,share_url,view_count,like_count";
  const videos: TikTokVideo[] = [];
  let cursor: number | undefined;
  for (let page = 0; page < 3; page++) {
    const res = await fetch(`${API}/video/list/?fields=${fields}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ max_count: 20, ...(cursor ? { cursor } : {}) }),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as {
      data?: {
        videos?: { id: string; title?: string; video_description?: string; cover_image_url?: string; share_url?: string; view_count?: number; like_count?: number }[];
        cursor?: number;
        has_more?: boolean;
      };
      error?: { code?: string; message?: string };
    };
    if (!res.ok || (json.error?.code && json.error.code !== "ok")) throw new Error(`TikTok video.list: ${json.error?.message ?? res.status}`);
    for (const v of json.data?.videos ?? []) {
      videos.push({
        id: v.id,
        url: v.share_url || `https://www.tiktok.com/video/${v.id}`,
        title: (v.title || v.video_description || "").trim(),
        cover: v.cover_image_url ?? null,
        views: v.view_count ?? null,
        likes: v.like_count ?? null,
      });
    }
    if (!json.data?.has_more) break;
    cursor = json.data.cursor;
  }
  return videos.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
}

async function fromOembed(): Promise<TikTokVideo[]> {
  const results = await Promise.all(
    FEATURED_TIKTOKS.map(async (url): Promise<TikTokVideo | null> => {
      try {
        const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, { cache: "no-store" });
        if (!res.ok) return null;
        const j = (await res.json()) as { title?: string; thumbnail_url?: string };
        return {
          id: url.match(/video\/(\d+)/)?.[1] ?? url,
          url,
          title: (j.title ?? "").trim(),
          cover: j.thumbnail_url ?? null,
          views: null,
          likes: null,
        };
      } catch {
        return null;
      }
    })
  );
  return results.filter((v): v is TikTokVideo => v !== null);
}

/**
 * Top videos for the homepage. Cached 6 h (cover URLs from TikTok are signed
 * and expire, so the cache must stay well under a day). Never throws.
 */
export const getTopTikToks = unstable_cache(
  async (limit: number): Promise<TikTokVideo[]> => {
    try {
      if (tiktokApiConfigured()) return (await fromApi()).slice(0, limit);
    } catch (err) {
      console.warn("[TikTok] API failed, falling back to featured list:", err instanceof Error ? err.message : err);
    }
    try {
      return (await fromOembed()).slice(0, limit);
    } catch {
      return [];
    }
  },
  ["tiktok-top-videos"],
  { revalidate: 21600 }
);
