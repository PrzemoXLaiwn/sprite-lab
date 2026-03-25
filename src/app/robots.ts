import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://www.sprite-lab.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/pixel-art-generator",
          "/game-weapon-generator",
          "/rpg-character-creator",
          "/pricing",
          "/login",
          "/register",
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
          "/community",
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
