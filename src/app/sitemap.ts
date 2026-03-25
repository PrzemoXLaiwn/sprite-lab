import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.sprite-lab.com";
  const now = new Date().toISOString();

  return [
    // ── PUBLIC PAGES (indexable, no auth required) ──────────────
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },

    // ── SEO LANDING PAGES (organic traffic targets) ────────────
    {
      url: `${baseUrl}/pixel-art-generator`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/game-weapon-generator`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/rpg-character-creator`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },

    // ── AUTH PAGES (public, Google can render them) ─────────────
    {
      url: `${baseUrl}/login`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },

    // ── LEGAL / INFO (low priority but indexable) ──────────────
    {
      url: `${baseUrl}/changelog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },

    // ── NOTE: Auth-required pages are intentionally EXCLUDED ───
    // /generate, /assets, /usage, /settings, /presets, /community
    // These redirect to /login for Googlebot → "not indexed: redirect"
    // Only public pages belong in sitemap.
  ];
}
