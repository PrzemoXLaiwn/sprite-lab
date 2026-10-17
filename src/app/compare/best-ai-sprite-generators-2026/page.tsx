import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteNav } from "@/components/layout/SiteNav";
import { Footer } from "@/components/layout/Footer";
import { COMPARISONS, COMPARE_CHECKED_ON, COMPARE_CHECKED_ON_LABEL } from "@/data/compare";
import { SIGNUP_CREDITS } from "@/config/signup";
import { CONTAINER, CompareCta, Disclaimer, JsonLd, SITE, SectionHead } from "../_ui";

// Roundup of the tools compared one-to-one under /compare. Every competitor
// value below is restated from src/data/compare.ts (taken from each tool's own
// site on COMPARE_CHECKED_ON); re-check them together when that file changes.

const URL = `${SITE}/compare/best-ai-sprite-generators-2026`;
const TITLE = "Best AI Sprite Generators in 2026, Compared | SpriteLab";
const DESCRIPTION =
  "Six AI sprite generators side by side: SpriteLab, PixelLab, Retro Diffusion, Ludo.ai, Scenario and Leonardo AI. Pixel art, animation, API, free tiers and prices.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: URL, type: "article" },
};

interface Tool {
  name: string;
  /** Slug of the one-to-one comparison, absent for SpriteLab. */
  compare?: string;
  bestFor: string;
  pixel: string;
  animation: string;
  directions: string;
  api: string;
  free: string;
  paid: string;
}

const NL = "Not listed";

const TOOLS: Tool[] = [
  {
    name: "SpriteLab",
    bestFor: "Prompt to transparent sprite in 12 styles, then animation and engine packs",
    pixel: "Yes, real grid and limited palette",
    animation: "Yes, 4–18 frames, sheet + GIF + engine pack",
    directions: "4 and 8 static views, 4-direction walk",
    api: "No",
    free: `${SIGNUP_CREDITS} credits on signup, no card`,
    paid: "From £5/month",
  },
  {
    name: "PixelLab",
    compare: "spritelab-vs-pixellab",
    bestFor: "Pixel-art specialists: directional characters, Wang tilesets, Aseprite",
    pixel: "Yes, pixel-art-only",
    animation: "Yes, prompts or skeleton controls",
    directions: "4 and 8 directions",
    api: "Yes, plus MCP",
    free: "Free trial, no card",
    paid: "Subscription tiers",
  },
  {
    name: "Retro Diffusion",
    compare: "spritelab-vs-retro-diffusion",
    bestFor: "Pay-per-use pixel art in many styles, with API, MCP and an Aseprite extension",
    pixel: "Yes, grid-aligned with controlled palettes",
    animation: "Yes, 4–16 frames, GIF or sheet",
    directions: "8 directions (Rotate)",
    api: "Yes, plus MCP",
    free: "Starter credits",
    paid: "Pay per generation (RD Fast about $0.03)",
  },
  {
    name: "Ludo.ai",
    compare: "spritelab-vs-ludo-ai",
    bestFor: "One suite for sprites, 3D, audio and video",
    pixel: NL,
    animation: "Yes, 641+ motion presets",
    directions: NL,
    api: "Yes (Pro and above), MCP, CLI",
    free: "30 credits, no card",
    paid: "From $15/month",
  },
  {
    name: "Scenario",
    compare: "spritelab-vs-scenario",
    bestFor: "Studios training custom models on their own art style",
    pixel: NL,
    animation: NL,
    directions: NL,
    api: "Yes, API, SDKs, webhooks",
    free: "50 daily credits, no card",
    paid: "From $15/month",
  },
  {
    name: "Leonardo AI",
    compare: "spritelab-vs-leonardo-ai",
    bestFor: "General illustration, concept and marketing art",
    pixel: NL,
    animation: NL,
    directions: NL,
    api: "Yes, REST API",
    free: "150 tokens a day",
    paid: "Subscriptions and pay-as-you-go API",
  },
];

const COLUMNS: { key: keyof Tool; label: string }[] = [
  { key: "bestFor", label: "Best for" },
  { key: "pixel", label: "Pixel-accurate pixel art" },
  { key: "animation", label: "Animation to sprite sheet" },
  { key: "directions", label: "Directions" },
  { key: "api", label: "API" },
  { key: "free", label: "Free option" },
  { key: "paid", label: "Paid" },
];

const PICKS: { need: string; pick: string; why: string }[] = [
  { need: "You want a sprite in seconds and don't draw", pick: "SpriteLab", why: "Type a sentence, get a transparent PNG with the background already removed, in pixel art or 11 other styles, and animate it without leaving the page." },
  { need: "Your whole game is pixel art and you live in Aseprite", pick: "PixelLab or Retro Diffusion", why: "Both are pixel-art specialists with Aseprite extensions and directional characters; PixelLab adds Wang tilesets, Retro Diffusion charges per generation instead of a subscription." },
  { need: "You need to generate assets from code or an AI agent", pick: "PixelLab, Retro Diffusion, Ludo.ai or Scenario", why: "They offer an API, and most an MCP server. SpriteLab has no API." },
  { need: "You also need 3D models, sound or video", pick: "Ludo.ai", why: "It covers sprites, 3D, audio and video in one subscription." },
  { need: "A studio with an established art style", pick: "Scenario", why: "Custom model training on your own reference images keeps output close to your house style." },
  { need: "Concept art, key art or store images", pick: "Leonardo AI", why: "A general image platform with many models; sprites still need their background removed and their size fixed by hand." },
];

const FAQ: { q: string; a: string }[] = [
  { q: "What is the best AI sprite generator in 2026?", a: "It depends on the game. For fast prompt-to-sprite in many styles with animation, SpriteLab; for pixel-art-only workflows with directional characters and tilesets, PixelLab or Retro Diffusion; for an all-in-one suite with 3D and audio, Ludo.ai; for custom-trained studio styles, Scenario." },
  { q: "Which AI sprite generators are free?", a: `All six have a free way in: SpriteLab gives ${SIGNUP_CREDITS} credits on signup with no card, PixelLab a free trial, Retro Diffusion starter credits, Ludo.ai 30 credits, Scenario 50 daily credits and Leonardo AI 150 tokens a day. Limits and commercial-use rules differ, so check each pricing page.` },
  { q: "Which one makes real pixel art?", a: "SpriteLab, PixelLab and Retro Diffusion snap results to a real pixel grid with a limited palette. General image generators produce pixel-art-looking images whose pixels are often uneven and blurred, which need cleaning before they scale cleanly in an engine." },
  { q: "Can AI generate sprite sheets?", a: "Yes. SpriteLab, PixelLab, Retro Diffusion and Ludo.ai animate sprites into frames. SpriteLab exports one row of equal-size frames, a GIF and an engine pack for Godot, Unity and GameMaker." },
  { q: "Is this comparison biased?", a: "We make SpriteLab, so read it with that in mind. Every competitor detail comes from that tool's own website, and the table says where another tool is the better choice." },
];

export default function BestAiSpriteGeneratorsPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "The best AI sprite generators in 2026",
      description: DESCRIPTION,
      url: URL,
      datePublished: "2026-10-17",
      dateModified: "2026-10-17",
      author: { "@type": "Organization", name: "SpriteLab", url: SITE },
      publisher: { "@type": "Organization", name: "SpriteLab", url: SITE },
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "AI sprite generators compared",
      itemListElement: TOOLS.map((t, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: t.name,
        url: t.compare ? `${SITE}/compare/${t.compare}` : SITE,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE },
        { "@type": "ListItem", position: 2, name: "Compare", item: `${SITE}/compare` },
        { "@type": "ListItem", position: 3, name: "Best AI sprite generators in 2026", item: URL },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];
  const competitorUrl = (slug?: string) => COMPARISONS.find((c) => c.slug === slug)?.competitorUrl;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#131A31] text-white">
      <JsonLd data={jsonLd} />
      <SiteNav />

      <section className="pb-12 pt-28 sm:pt-36">
        <div className={CONTAINER}>
          <nav aria-label="Breadcrumb" className="text-[13px] text-[#A7ADD4]">
            <Link href="/compare" className="inline-flex min-h-10 items-center hover:text-white">Compare</Link>
          </nav>
          <h1 className="max-w-4xl text-balance font-display text-[38px] font-semibold leading-[1.06] text-white sm:text-[56px]">
            The best AI sprite generators in 2026
          </h1>
          <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-[#C8CCE8]">
            Six tools that make 2D game art from text, compared on what matters when the result has to go into a game: real pixel art,
            animation into sprite sheets, directions, an API, and what it costs. We make SpriteLab, so it&apos;s in the list, and every other
            tool is described from its own website, checked on <time dateTime={COMPARE_CHECKED_ON}>{COMPARE_CHECKED_ON_LABEL}</time>.
          </p>
        </div>
      </section>

      <section className="pb-16">
        <div className={CONTAINER}>
          <SectionHead eyebrow="side by side" title="All six at a glance" />
          <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
            <table className="w-full min-w-[980px] border-collapse text-left text-[13.5px]">
              <caption className="sr-only">AI sprite generators compared by feature</caption>
              <thead>
                <tr className="border-b border-white/[0.08] bg-[#19223F]">
                  <th scope="col" className="w-[12%] px-4 py-3 text-[12.5px] font-semibold text-[#9AA1CC]">Tool</th>
                  {COLUMNS.map((c) => (
                    <th key={c.key} scope="col" className="px-4 py-3 text-[12.5px] font-semibold text-[#9AA1CC]">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TOOLS.map((t) => (
                  <tr key={t.name} className={`border-b border-white/[0.05] align-top last:border-0 ${t.compare ? "" : "bg-[#FFA300]/[0.05]"}`}>
                    <th scope="row" className={`px-4 py-3 font-semibold ${t.compare ? "text-[#FFF1E8]" : "text-[#FFA300]"}`}>{t.name}</th>
                    {COLUMNS.map((c) => (
                      <td key={c.key} className={`px-4 py-3 leading-relaxed ${t[c.key] === NL ? "text-[#8A92BF]" : "text-[#C8CCE8]"}`}>{t[c.key]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 font-mono text-[11.5px] text-[#8A92BF]">
            &quot;Not listed&quot; means we couldn&apos;t find it on the tool&apos;s official pages, not that it definitely doesn&apos;t exist.
          </p>
        </div>
      </section>

      <section className="border-y border-white/[0.06] bg-[#19223F] py-20">
        <div className={CONTAINER}>
          <SectionHead eyebrow="which one" title="Pick by what you need" intro="No tool wins everywhere. Start from the job your game needs done." />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {PICKS.map((p) => (
              <article key={p.need} className="rounded-2xl border border-white/[0.06] bg-[#212B4E] p-6">
                <h3 className="text-[16px] font-semibold leading-snug text-white">{p.need}</h3>
                <p className="mt-1 text-[14px] font-semibold text-[#FFC857]">{p.pick}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-[#9AA1CC]">{p.why}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className={`${CONTAINER} grid grid-cols-1 gap-12 lg:grid-cols-2`}>
          <div>
            <SectionHead eyebrow="method" title="How we compared" />
            <div className="space-y-4 text-[15px] leading-[1.75] text-[#A7ADD4]">
              <p>
                We only list what each tool says about itself on its own site, documentation and pricing page; nothing comes from reviews or
                our guesses. Where a feature isn&apos;t mentioned, the table says so instead of assuming it&apos;s missing.
              </p>
              <p>
                We looked at what decides whether generated art is usable in a game: whether pixel art sits on a real grid, whether a sprite
                can become a sprite sheet of equal frames, whether characters can face several directions, whether you can automate it, and
                how much it costs to start. Image quality depends on your prompt and style, so try two or three tools on your own game
                before you decide.
              </p>
              <p>
                Prices and features change often. Each one-to-one comparison links to its sources, and the date above is when we last
                checked them.
              </p>
            </div>
          </div>
          <div>
            <SectionHead eyebrow="one to one" title="Detailed comparisons" />
            <ul className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.06] bg-[#212B4E]">
              {TOOLS.filter((t) => t.compare).map((t) => (
                <li key={t.name} className="flex flex-wrap items-center justify-between gap-x-4 px-5 py-2">
                  <Link href={`/compare/${t.compare}`} className="group inline-flex min-h-10 items-center gap-1.5 text-[14.5px] font-semibold text-[#FFA300]">
                    SpriteLab vs {t.name}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                  <a href={competitorUrl(t.compare)} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex min-h-10 items-center font-mono text-[12px] text-[#9AA1CC] hover:text-white">
                    {(competitorUrl(t.compare) ?? "").replace(/^https?:\/\/(www\.)?/, "")} ↗<span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[14px] leading-relaxed text-[#A7ADD4]">
              New to sprites? Start with <Link href="/guides/what-is-a-sprite-in-gaming" className="text-[#FFC857] hover:text-white">what a sprite is</Link> or
              see <Link href="/sprite-sheet-generator" className="text-[#FFC857] hover:text-white">what a SpriteLab sprite sheet looks like</Link>.
            </p>
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="mx-auto max-w-[820px] px-5 lg:px-8">
          <SectionHead eyebrow="faq" title="Common questions" />
          <div className="space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-[8px] border border-white/[0.06] bg-[#212B4E] px-5 open:border-white/[0.1]">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-semibold leading-snug text-[#FFF1E8] [&::-webkit-details-marker]:hidden">
                  <h3>{f.q}</h3>
                  <span aria-hidden="true" className="text-[#9AA1CC] transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="-mt-1 pb-5 pr-8 text-[14px] leading-relaxed text-[#9AA1CC]">{f.a}</p>
              </details>
            ))}
          </div>
          <div className="mt-8">
            <Disclaimer checked={COMPARE_CHECKED_ON_LABEL} />
          </div>
        </div>
      </section>

      <CompareCta />
      <Footer />
    </main>
  );
}
