import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { INDEXED_SEO_PAGES } from "@/data/seo-pages";
import { MIN_INDEXED_PROFILE_ASSETS } from "@/lib/profile-indexing";
import { GUIDES } from "@/data/guides";
import { COMPARISONS, COMPARE_CHECKED_ON } from "@/data/compare";

// Rebuilt daily so newly public profiles show up without a deploy
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://www.sprite-lab.com";
  const now = new Date().toISOString();

  // ── Static public pages ─────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    // Homepage — highest priority
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },

    // SEO landing pages — high priority organic traffic targets (noindexed ones left out)
    ...INDEXED_SEO_PAGES.map((p) => ({
      url: `${baseUrl}/${p.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),

    // Beginner's guide to the app
    {
      url: `${baseUrl}/how-it-works`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },

    // Game dev guides — answer-first articles for search and AI assistants
    {
      url: `${baseUrl}/guides`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...GUIDES.map((g) => ({
      url: `${baseUrl}/guides/${g.slug}`,
      lastModified: new Date(g.updated).toISOString(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),

    // Honest comparisons with other AI sprite tools
    {
      url: `${baseUrl}/compare`,
      lastModified: new Date(COMPARE_CHECKED_ON).toISOString(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...COMPARISONS.map((c) => ({
      url: `${baseUrl}/compare/${c.slug}`,
      lastModified: new Date(COMPARE_CHECKED_ON).toISOString(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),

    // Pricing — public, high conversion intent
    {
      url: `${baseUrl}/pricing`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },

    // Community gallery — public, fresh content signals
    {
      url: `${baseUrl}/community`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },


    // Info and trust pages
    {
      url: `${baseUrl}/about`,
      lastModified: new Date("2026-10-13").toISOString(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date("2026-10-13").toISOString(),
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/sitemap`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
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
  ];

  // ── Dynamic: public user profiles ───────────────────────────────
  // Only profiles with enough public work to be worth a visit; thinner ones are
  // noindexed by the page itself (see lib/profile-indexing.ts).
  let profilePages: MetadataRoute.Sitemap = [];
  try {
    const publicUsers = await prisma.user.findMany({
      where: {
        isProfilePublic: true,
        isActive: true,
        username: { not: null },
        totalGenerationsPublic: { gte: MIN_INDEXED_PROFILE_ASSETS },
      },
      select: { username: true, updatedAt: true },
      take: 500, // Cap to prevent sitemap bloat
    });

    profilePages = publicUsers.map((user) => ({
      url: `${baseUrl}/u/${user.username}`,
      lastModified: user.updatedAt.toISOString(),
      changeFrequency: "weekly" as const,
      priority: 0.3,
    }));
  } catch {
    // DB unavailable at build time — skip dynamic pages
  }

  return [...staticPages, ...profilePages];
}
