import { MetadataRoute } from "next";
import { SEO_PAGES } from "@/data/seo-pages";

// Search engines AND AI assistants (ChatGPT, Claude, Perplexity, Gemini) are
// welcome on the public pages — being understood and recommended by them is
// part of how developers find SpriteLab. Private app routes stay off-limits
// for everyone.
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Bingbot",
];

const PUBLIC = [
  "/",
  ...SEO_PAGES.map((p) => `/${p.slug}`),
  "/pricing",
  "/community",
  "/u/",
  "/changelog",
  "/llms.txt",
  "/llms-full.txt",
  "/privacy",
  "/terms",
];

const PRIVATE = [
  // Auth-required app routes
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
  "/animate",
  "/projects",
  // Admin / internal
  "/api/",
  "/auth/",
  "/checkout/",
  "/admin/",
  "/moderator/",
  "/plugins",
  // Note: /_next/ must stay crawlable — Google needs the JS/CSS bundles to
  // render pages; blocking them hurts indexing.
];

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://www.sprite-lab.com";
  return {
    rules: [
      { userAgent: "*", allow: PUBLIC, disallow: PRIVATE },
      { userAgent: AI_CRAWLERS, allow: PUBLIC, disallow: PRIVATE },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
