# AdSense "Low value content" audit — 13 Oct 2026

AdSense rejected sprite-lab.com with "Low value content". This audit lists every public, indexable page, measures
its real body text and records what was changed (branch `feat/content-adsense`).

## Method

- Pages rendered by a local dev server (`next dev --webpack`, placeholder public Supabase env, no database, so
  DB-driven sections such as the community wall render empty).
- Word count = visible text inside `<main>` with `<nav>`, `<footer>`, `<script>` and `<style>` removed. It still
  includes on-page chrome such as CTAs, FAQ and link lists, so it overstates article prose slightly.
- Guide prose was also counted from the data (`src/data/guides*.ts`): section text + tables + FAQ, code excluded.
- Near-duplicates: share of each landing page's 5-word shingles that also occur on any sibling landing page.

## Findings (before)

| Page | Words | Ads | Notes |
| --- | ---: | --- | --- |
| `/` (home) | 1133 | no | Fine. |
| `/ai-sprite-generator` | 624 | **yes** | Template page, 26% text shared with siblings. |
| `/pixel-art-generator` | 619 | **yes** | 25% shared. |
| `/ai-sprite-animation-generator` | 621 | **yes** | 4% shared. |
| `/rpg-character-creator` | 534 | **yes** | 34% shared. |
| `/game-weapon-generator` | 593 | **yes** | 30% shared. |
| `/ai-tileset-generator` | 477 | **yes** | 8% shared. |
| `/ai-game-icon-generator` | 405 | **yes** | 11% shared, thinnest landing page. |
| `/unity-sprite-generator` | 548 | **yes** | 31% shared, and its 5 import steps duplicate the Unity guide. |
| `/godot-sprite-generator` | 526 | **yes** | 32% shared, steps duplicate the Godot guide. |
| `/guides` (index) | 274 | **yes** | A list of links with ads. |
| 6 guide articles | 977–1252 | yes | Good, but under 1,100 words of prose each; no byline, no curated related links. |
| `/compare` + 5 comparisons | 554–890 | yes | Byline and check date already present. Kept. |
| `/how-it-works` | 1002 | no | Fine. |
| `/pricing` | 0 SSR | no | Client-rendered; transactional. No ads. |
| `/community` | 0 SSR | no | Client-rendered gallery ("loading" in HTML). No ads. |
| `/changelog` | 259 | no | Short but genuine. No ads. |
| `/privacy`, `/terms` | 561, 619 | no | Legal. No ads. |
| `/u/<username>` | small | no | Up to 500 profiles in the sitemap with `totalGenerationsPublic > 0` — a profile with one image is thin UGC. |
| `/about`, `/contact` | — | — | **Missing.** Contact was only a `mailto:` in the footer; no page said who runs the site. |

Main problems, in the order AdSense is likely to weigh them:

1. Ads were served on nine template landing pages (400–620 words, a third shared text) and on a link-list index.
2. No About or Contact page — the "who is behind this" signal was absent.
3. Two landing pages (Unity, Godot) repeated guide content nearly verbatim.
4. Hundreds of thin user profiles were in the sitemap.
5. Guides were decent but short and anonymous.

## What changed

### Ads (signed-out visitors only, as before)

- **Removed** from all 9 tool landing pages (`src/app/(landing)/layout.tsx`), and from the `/guides` index
  (`src/app/guides/layout.tsx`).
- **Kept** on guide articles (now rendered by `src/app/guides/[slug]/page.tsx`) and comparisons (`/compare` layout).
- Never on home, pricing, how-it-works, legal pages, changelog, community, profiles, about, contact or the app.
- Privacy policy text updated to say ads run on "guide articles and comparisons".

### Thin and duplicate pages

Choice: **enrich the 7 landing pages that target distinct assets, noindex the 2 engine pages.**

- `/unity-sprite-generator` and `/godot-sprite-generator` → `noindex, follow`, removed from the sitemap
  (`index: false` in `src/data/seo-pages.ts`). Their content is a subset of the Unity and Godot guides, which are
  now the canonical answers and were expanded (engine pack, `.tres`, frame folders, Max Size trap). They stay
  linked in the footer and crawlable so the noindex is seen.
- The other 7 landing pages got a distinct "specs" section (`src/data/landing-specs.ts`): asset-specific sizes,
  frame counts, engine setup and honest limits, linking to the relevant guides. Shared text dropped from
  25–34% to 18–23% on the template-heavy ones.
- `/u/<username>`: `noindex` below 6 public assets (`src/lib/profile-indexing.ts`, unit-tested); the sitemap only
  lists profiles with ≥ 6.

### Trust pages

- `/about`: what SpriteLab is, why it exists, the generation pipeline step by step (providers named, matching the
  privacy policy), what it does not do, how it is paid for (plans + ads on guides), contact.
- `/contact`: the existing `support@sprite-lab.com` inbox (now `src/config/contact.ts`), four topic cards that open
  a pre-filled email, refund and account-deletion facts taken from the terms and settings.
- Both in the footer, sitemap and robots allow-list.
- **Owner to-do:** the About page says "built and run by the SpriteLab team". Adding a real name (and, if there is
  one, a company name/registered address) would strengthen it; this was not invented.

### Guides

- Byline "By SpriteLab team" → `/about`, updated date, first-published date, reading time, breadcrumbs (already
  there), an "In this guide" table of contents, curated related guides and tool links per guide.
- New content blocks: tables and code samples (GDScript, GML, C#, JSON).
- Article JSON-LD now has an author (`SpriteLab team`, url `/about`), publisher logo, `datePublished`,
  `dateModified`, `wordCount`, `isPartOf`. Existing FAQPage, HowTo and BreadcrumbList kept.
- Outdated facts fixed (4-direction walk and the engine pack now exist).

### New guides

| Guide | Prose + FAQ words (code excluded) | Page words |
| --- | ---: | ---: |
| How to Import Sprite Strips into GameMaker | 1337 | 1629 |
| Pixel Art Sprite Sizes for Games: 16, 32 or 64? | 1223 | 1394 |
| How Many Frames Should a Sprite Animation Have? | 1316 | 1542 |
| How to Make a 4-Direction Top-Down RPG Character | 1211 | 1467 |
| Hitboxes and Hurtboxes from Sprite Sheets | 1270 | 1640 |
| Sprite Sheet Layout: Strips, Grids and Texture Atlases | 1264 | 1423 |

Godot 4 and Unity import already had guides; they were expanded rather than duplicated (Unity 977 → 1211 page
words, Godot 1004 → 1210).

Every SpriteLab claim in the guides was checked against the code: engine pack layout
(`src/lib/export/engine-pack.ts`), frame options, prices and default fps (`src/config/animations.ts`,
`animation-service.ts`), 4-direction walk row order and left-row mirroring, 256 px frame height with a 128 px
pixel grid. Images are only from `public/showcase`.

## After (page words)

| Page | Before | After |
| --- | ---: | ---: |
| `/ai-sprite-generator` | 624 | 907 |
| `/pixel-art-generator` | 619 | 881 |
| `/ai-sprite-animation-generator` | 621 | 902 |
| `/rpg-character-creator` | 534 | 793 |
| `/game-weapon-generator` | 593 | 852 |
| `/ai-tileset-generator` | 477 | 738 |
| `/ai-game-icon-generator` | 405 | 672 |
| `/guides` | 274 | 533 |
| `/guides/how-to-import-sprite-sheets-into-unity` | 977 | 1211 |
| `/guides/how-to-use-sprite-sheets-in-godot-4` | 1004 | 1210 |
| `/about` | — | 644 |
| `/contact` | — | 334 |

## Not changed / left for later

- `/community` and `/pricing` render their content client-side; crawlers see almost nothing. Neither carries ads,
  but server-rendering a first page of the gallery would help SEO.
- The four oldest guides (pixel art, tiles, consistency, sprite sheet with AI) are 875–1090 prose words; good but
  could each take one more practical section.
- Comparisons (554–890 words) keep ads; they are original and dated, but are the shortest pages that do.

## After deploy (owner)

1. Deploy, then check a guide while signed out: the AdSense script should load; on a tool landing page it should not.
2. Submit the sitemap again in Google Search Console and request indexing for `/about`, `/contact` and the six new
   guides.
3. Wait until Search Console shows the new guides as indexed (often a few days to two weeks), then in AdSense →
   Sites → sprite-lab.com tick "I confirm I have fixed the issues" and **Request review**.
4. Reviews usually take from a few days up to 2–4 weeks. If it is rejected again, keep adding long-form guides for a
   few weeks before the next request rather than re-submitting immediately.

## Second pass — SEO polish (branch `feat/seo-polish`, 13 Oct 2026)

### Ads rule, now enforced in code

`src/lib/ads-policy.ts` (unit-tested) and `src/components/ads/AdSense.tsx`, mounted by the `guides` and `compare`
layouts. The script loads only when **all** hold: path is `/guides/<slug>`, `/compare` or `/compare/<slug>`; the
visitor is signed out; the `<main>` text, without nav, footer and `[data-ads-ignore]` blocks (CTAs, related links),
is at least **800 words**. Measured on a dev server: every guide qualifies (1,100–1,673 words), `/compare` qualifies
(833), the five comparison pages do **not** (493–629), so they no longer load ads. `/guides` index (502) never.

### Older guides (prose + tables + FAQ, code excluded)

| Guide | Before | After |
| --- | ---: | ---: |
| How to Make a Sprite Sheet with AI | 1092 | 1626 |
| How to Make Pixel Art Sprites for Games | 940 | 1422 |
| How to Make Seamless Tiles for 2D Games | 883 | 1499 |
| How to Keep AI Game Art Consistent | 894 | 1353 |

Each got a "Common mistakes" section plus practical sections (frame/fps/credit table, resolution table, tile file
format and TileMapLayer / Tile Palette setup, consistency check). All guides now have a "What you'll learn / you'll
need" box (`src/data/guide-intros.ts`) and a reading time computed from the text.

### Server rendering

- `/pricing` is a server component reading `src/lib/stripe.ts` and `src/config/animations.ts`: plans, packs, a
  credit-cost table and the FAQ (`<details>`, FAQPage JSON-LD) are in the HTML. Client islands: current plan,
  checkout buttons, lifetime deals, live stats, mobile CTA. `pricing-data.ts` is tested to mirror `stripe.ts`.
- `/community` renders the first 48 public works on the server (prompt, style name, likes, descriptive alt text);
  filters, search, infinite scroll, likes, comments and chat stay client-side.

### Other

- HTML `/sitemap`, OG images for guides, guide index, comparisons, how-it-works, about, contact, sitemap.
- Guides ↔ tool pages ↔ `/how-it-works` cross-links. Titles, descriptions and canonicals checked unique and correct
  on 38 public URLs.
- `/api/stats` no longer returns invented numbers (1,000 assets / 100 users) when the database is down.
