import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SEO_PAGES } from "@/data/seo-pages";

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

    // SEO landing pages — high priority organic traffic targets
    ...SEO_PAGES.map((p) => ({
      url: `${baseUrl}/${p.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.9,
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
