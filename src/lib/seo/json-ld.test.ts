import { describe, expect, it } from "vitest";
import { jsonLdHtml } from "./json-ld";

describe("jsonLdHtml", () => {
  it("escapes angle brackets so the payload cannot break out of the script tag", () => {
    const html = jsonLdHtml({ a: "</script><script>alert(1)</script>" });
    expect(html).not.toContain("</script>");
    expect(html).toContain("\\u003c/script>");
    expect(JSON.parse(html).a).toBe("</script><script>alert(1)</script>");
  });
});
