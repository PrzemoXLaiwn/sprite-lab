import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PLAN_FEATURES } from "@/config/plan-features";
import { COMMERCIAL_LICENCE_ANSWER, LICENCE_CHANGE_DATE } from "@/config/licence";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { PRIVACY_MARKDOWN } from "@/content/legal/privacy";
import { TERMS_MARKDOWN } from "@/content/legal/terms";
import { COOKIES_MARKDOWN } from "@/content/legal/cookies";
import { REFUNDS_MARKDOWN } from "@/content/legal/refunds";

const PAGES = [PRIVACY_MARKDOWN, TERMS_MARKDOWN, COOKIES_MARKDOWN, REFUNDS_MARKDOWN];

const UNRESOLVED_ON_THE_PAGE = [
  "[VERIFY]",
  "[DATE]",
  "[ICO",
  "[CMP",
  "[ADR",
  "[DESCRIBE",
  "[VAT",
  "[PHONE",
  "[OPTIONAL",
  "[BACKUP",
  "[SUPABASE",
  "[CONSENT COOKIE",
  "[COMPLAINT",
  "[EU REPRESENTATIVE",
  "[LEGAL ENTITY",
  "[COUNTRY",
  "[SAFEGUARD",
  "Draft for review",
  "Cookie settings",
  "not legal advice",
];

describe("legal pages", () => {
  it("uses a fixed last-updated date and hides unresolved placeholders", () => {
    for (const page of PAGES) {
      expect(page).toContain(`Last updated: ${LICENCE_CHANGE_DATE}`);
      expect(page).not.toContain("new Date(");
      for (const token of UNRESOLVED_ON_THE_PAGE) {
        expect(page, token).not.toContain(token);
      }
    }
    expect(LICENCE_CHANGE_DATE).toBe("17 October 2026");
  });

  it("renders the four documents with the seller and without the draft banner", () => {
    for (const page of PAGES) {
      const html = renderToStaticMarkup(createElement(LegalDocument, { markdown: page }));
      expect(html).toContain("Przemek Lawin");
      expect(html).toContain("17 October 2026");
      expect(html).not.toContain("Draft for review");
      expect(html).not.toContain("[VERIFY]");
    }
  });

  it("renders a link nested in bold, and bold nested in a link label", () => {
    const html = renderToStaticMarkup(
      createElement(LegalDocument, {
        markdown:
          "# Title\n\nEmail **[support@sprite-lab.com](mailto:support@sprite-lab.com)** or see [the **Privacy Policy**](/privacy). Use `**not bold**` as code.",
      }),
    );
    expect(html).toContain('<a href="mailto:support@sprite-lab.com"');
    expect(html).toContain('<a href="/privacy"');
    expect(html).toContain("<strong");
    expect(html).toContain(">Privacy Policy<");
    expect(html).not.toContain("[support@sprite-lab.com]");
    expect(html).not.toContain("](mailto:");
    expect(html).toContain("**not bold**");
  });

  it("does not leave raw markdown links on the four policies", () => {
    for (const page of PAGES) {
      const html = renderToStaticMarkup(createElement(LegalDocument, { markdown: page }));
      expect(html).not.toMatch(/\[[^\]]+\]\([^)]+\)/);
      expect(html).toContain('href="mailto:support@sprite-lab.com"');
    }
    expect(PRIVACY_MARKDOWN).not.toContain("spritelab.contact@gmail.com");
    expect(COOKIES_MARKDOWN).not.toContain("choose by category");
    expect(COOKIES_MARKDOWN).toContain("clearing cookies");
  });

  it("limits the commercial licence to paid plans and keeps the resale restriction contractual", () => {
    expect(TERMS_MARKDOWN).toContain("personal, non-commercial use only");
    expect(TERMS_MARKDOWN).toContain("Starter, Pro and Studio");
    expect(TERMS_MARKDOWN).toContain("contractual restriction");
    expect(TERMS_MARKDOWN).toContain("despite the assignment in clause 9.2");
    expect(TERMS_MARKDOWN).toContain("keep the licence that applied when they were created");
    expect(TERMS_MARKDOWN).not.toContain("You own all assets");
    expect(COMMERCIAL_LICENCE_ANSWER).toContain("Free plan");
    expect(PLAN_FEATURES.FREE).toContain("Personal, non-commercial use");
    expect(PLAN_FEATURES.STARTER).toContain("Commercial licence");
    expect(PLAN_FEATURES.PRO).toContain("Commercial licence");
    expect(PLAN_FEATURES.UNLIMITED).toContain("Commercial licence");
    expect(PLAN_FEATURES.FREE.join(" ")).not.toContain("Commercial licence");
  });
});
