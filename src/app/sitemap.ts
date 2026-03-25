import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

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

    // SEO landing pages — high priority organic traffic targets
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

    // Auth pages — indexable for brand searches
    {
      url: `${baseUrl}/login`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },

    // Info pages
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
  // Each public profile is a unique indexable page with user-generated content
  let profilePages: MetadataRoute.Sitemap = [];
  try {
    const publicUsers = await prisma.user.findMany({
      where: {
        isProfilePublic: true,
        isActive: true,
        username: { not: null },
        totalGenerationsPublic: { gt: 0 },
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
