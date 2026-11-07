import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }), usePathname: () => "/community" }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) }));

import { CommunityClient } from "./CommunityClient";

describe("community first page is server-rendered", () => {
  it("puts prompts, style names, likes and alt text in the HTML", () => {
    const html = renderToString(
      createElement(CommunityClient, {
        initial: {
          total: 60,
          categoryCounts: { CHARACTERS: 40, WEAPONS: 20 },
          typeCounts: { "2d": 58, "3d": 2 },
          generations: [
            {
              id: "g1",
              prompt: "armoured knight with a blue cape",
              imageUrl: "https://example.com/knight.png",
              categoryId: "CHARACTERS",
              subcategoryId: "HEROES",
              styleId: "PIXEL_ART_16",
              likes: 7,
              createdAt: "2026-10-01T10:00:00.000Z",
              user: { name: "Ada", avatarUrl: null },
            },
          ],
        },
      })
    );
    expect(html).toContain("armoured knight with a blue cape");
    expect(html).toContain("Pixel 16-bit");
    expect(html).toContain('alt="armoured knight with a blue cape (Pixel 16-bit game sprite)"');
    expect(html).toMatch(/>7</);
    expect(html).toContain("Load more"); // 1 of 60 loaded: infinite scroll continues on the client
    expect(html).not.toContain("aspect-square animate-pulse"); // no gallery skeleton when the server sent data
    // Counts are the gallery totals, not "1 2D" from the single card on this page.
    expect(html).toMatch(/58<\/span> 2D/);
    expect(html).toMatch(/2<\/span> 3D/);
    expect(html).not.toMatch(/>1<\/span> 2D/);
    expect(html).toMatch(/All<\/button>|All/);
    expect(html).toContain(">60<");
  });
});
