import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://www.sprite-lab.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          // SEO landing pages
          "/pixel-art-generator",
          "/game-weapon-generator",
          "/rpg-character-creator",
          // Public app pages (no auth required)
          "/pricing",
          "/community",
          "/u/",
          // Auth pages
          "/login",
          "/register",
          // Info pages
          "/changelog",
          "/privacy",
          "/terms",
        ],
        disallow: [
          // Auth-required dashboard routes
          "/generate",
          "/assets",
          "/gallery",
          "/usage",
          "/dashboard",
          "/presets",
          "/settings",
          "/referrals",
          "/edit",
          "/upscale",
          "/remove-bg",
          "/variations",
          // Admin / internal
          "/api/",
          "/auth/",
          "/checkout/",
          "/admin/",
          "/moderator/",
          "/_next/",
          "/plugins",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
