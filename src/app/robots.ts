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
          "/changelog",
          "/privacy",
          "/terms",
          "/community",
        ],
        disallow: [
          "/api/",
          "/auth/",
          "/checkout/",
          "/admin/",
          "/_next/",
          "/private/",
          "/settings",
          "/moderator",
          "/referrals",
          "/edit",
          "/upscale",
          "/remove-bg",
          "/variations",
          "/plugins",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/api/", "/auth/", "/checkout/", "/admin/", "/_next/", "/private/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
