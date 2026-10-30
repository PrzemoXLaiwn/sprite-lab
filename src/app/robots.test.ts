import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import robots from "./robots";
import { INDEXED_SEO_PAGES, SEO_PAGES, relatedSeoPages } from "@/data/seo-pages";

describe("robots.txt", () => {
  const body = robots();
  const rules = Array.isArray(body.rules) ? body.rules : [body.rules];
  const star = rules.find((rule) => rule.userAgent === "*");

  it("lets every indexed landing page be crawled", () => {
    const allow = star?.allow;
    const allowed = Array.isArray(allow) ? allow : allow ? [allow] : [];
    for (const page of INDEXED_SEO_PAGES) {
      expect(allowed, page.slug).toContain(`/${page.slug}`);
    }
    expect(allowed).toContain("/guides");
    expect(allowed).toContain("/compare");
  });

  it("keeps the signed-in app out of the crawl", () => {
    const disallow = star?.disallow;
    const blocked = Array.isArray(disallow) ? disallow : disallow ? [disallow] : [];
    for (const path of ["/generate", "/assets", "/settings", "/admin/", "/api/", "/member/", "/play", "/quests", "/checkout/"]) {
      expect(blocked).toContain(path);
    }
  });
});

describe("seo landing pages", () => {
  it("each indexed page has a route and a dated lastmod", () => {
    for (const page of INDEXED_SEO_PAGES) {
      const file = join(process.cwd(), "src/app/(landing)", page.slug, "page.tsx");
      expect(existsSync(file), page.slug).toBe(true);
      expect(page.updated, page.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(page.summary.length, page.slug).toBeGreaterThan(40);
      expect(relatedSeoPages(page.slug).some((p) => p.slug === page.slug), page.slug).toBe(false);
    }
  });

  it("does not list the same slug twice", () => {
    const slugs = SEO_PAGES.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
