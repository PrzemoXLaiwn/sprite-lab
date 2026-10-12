import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Lightbulb, Check } from "lucide-react";
import { SiteNav } from "@/components/layout/SiteNav";
import { Footer } from "@/components/layout/Footer";
import { GUIDE, PRICE_LIST, GUEST_TRIES, signupOffer } from "@/data/product-guide";

const SITE = "https://www.sprite-lab.com";
const URL = `${SITE}/how-it-works`;
const DESCRIPTION =
  "How SpriteLab works, step by step: create sprites from text, animate them, make seamless tiles, organise projects and understand credits — in plain words.";

export const metadata: Metadata = {
  title: { absolute: "How SpriteLab Works — Beginner's Guide | SpriteLab" },
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: { title: "How SpriteLab works", description: DESCRIPTION, url: URL, type: "article" },
};

const STYLES = [
  ["pixel_art_16", "Pixel 16-bit"], ["pixel_art_32", "Pixel HD"], ["isometric_pixel", "Isometric Pixel"],
  ["hand_painted", "Hand Painted"], ["anime_game", "Anime"], ["chibi_cute", "Chibi"],
  ["dark_souls", "Dark Fantasy"], ["cartoon_western", "Cartoon"], ["vector_clean", "Vector"],
  ["isometric", "Isometric"], ["isometric_cartoon", "Isometric Cartoon"], ["realistic_painted", "Realistic"],
] as const;

const EXTRA_TOC = [
  { id: "styles", label: "Art styles" },
  { id: "tools", label: "Remove BG & upscale" },
  { id: "export", label: "Use in your engine" },
  { id: "words", label: "Words you'll see" },
];

const GLOSSARY: [string, string][] = [
  ["Sprite", "A single game image with a transparent background — a character, an enemy, a sword."],
  ["Sprite sheet", "All frames of an animation side by side in one PNG. Game engines cut it into frames."],
  ["Frame", "One picture of an animation. More frames = smoother motion."],
  ["Tile", "A square image that repeats edge to edge to build floors, walls and levels."],
  ["Asset", "Any file your game uses. In SpriteLab: sprites, sheets and tiles."],
  ["Credit", "What you spend to generate. The price is always shown on the button first."],
];

function SectionHead({ n, title, lead }: { n: string; title: string; lead: string }) {
  return (
    <>
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#FF8A3D]">{n}</p>
      <h2 className="mt-2 text-balance font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.01em] text-white sm:text-[34px]">{title}</h2>
      <p className="mt-3 max-w-2xl text-pretty text-[15px] leading-relaxed text-[#8B93A5]">{lead}</p>
    </>
  );
}

export default function HowItWorksPage() {
  const offer = signupOffer();
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: "How to create and animate game sprites with SpriteLab",
      description: DESCRIPTION,
      url: URL,
      step: GUIDE.slice(0, 3).flatMap((s) => s.steps.map((st) => ({ "@type": "HowToStep", name: st.title, text: st.body }))),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "SpriteLab", item: SITE },
        { "@type": "ListItem", position: 2, name: "How it works", item: URL },
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-[#0B0D12] text-[#ECEEF3]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteNav />

      {/* Hero */}
      <section className="relative pb-12 pt-28 sm:pt-36">
        <div className="pixel-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
        <div className="relative mx-auto max-w-[1100px] px-5 lg:px-8">
          <p className="font-mono text-[12px] text-[#FFB27A]">&gt; beginner&apos;s guide<span className="caret" /></p>
          <h1 className="mt-4 max-w-3xl font-display text-[40px] font-semibold leading-[1.04] tracking-[-0.015em] text-white sm:text-[60px]">
            How SpriteLab works
          </h1>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-[#8B93A5]">
            Everything you can do, what&apos;s worth trying first and what it costs — no game-art experience needed.
          </p>

          {/* Quick start */}
          <ol className="mt-10 grid gap-3 sm:grid-cols-3">
            {[
              { t: "Describe a sprite", d: `Try it ${GUEST_TRIES}× right on the homepage — no account.` },
              { t: "Sign up free", d: `Get ${offer.credits} credits${offer.bonus ? ` + ${offer.bonus} bonus` : ""}. No card.` },
              { t: "Animate & collect", d: "Animate your favourites and keep them in a project." },
            ].map((x, i) => (
              <li key={x.t} className="rounded-2xl border border-white/[0.07] bg-[#0E1016] p-5">
                <span className="font-mono text-[12px] text-[#FFB27A]">step {String(i + 1).padStart(2, "0")}</span>
                <p className="mt-1.5 text-[15px] font-semibold text-white">{x.t}</p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-[#8B93A5]">{x.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1100px] gap-12 px-5 pb-24 lg:grid-cols-[200px_1fr] lg:px-8">
        {/* TOC */}
        <nav aria-label="On this page" className="hidden lg:block">
          <div className="sticky top-24">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#7A8294]">on this page</p>
            <ul className="mt-3 space-y-1 text-[13.5px]">
              {GUIDE.map((s) => (
                <li key={s.id}><a href={`#${s.id}`} className="block py-1 text-[#8B93A5] transition-colors hover:text-white">{s.tab === "Create" ? "Creating sprites" : s.tab}</a></li>
              ))}
              {EXTRA_TOC.map((x) => (
                <li key={x.id}><a href={`#${x.id}`} className="block py-1 text-[#8B93A5] transition-colors hover:text-white">{x.label}</a></li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="min-w-0 space-y-20">
          {GUIDE.map((s, idx) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <SectionHead n={`0${idx + 1}`} title={s.title} lead={s.lead} />

              <ol className="mt-7 grid gap-3 sm:grid-cols-2">
                {s.steps.map((st, i) => (
                  <li key={st.title} className="rounded-2xl border border-white/[0.07] bg-[#0E1016] p-5">
                    <span className="font-mono text-[12px] text-[#FFB27A]">{String(i + 1).padStart(2, "0")}</span>
                    <p className="mt-1 text-[15px] font-semibold text-white">{st.title}</p>
                    <p className="mt-1 text-[14px] leading-relaxed text-[#8B93A5]">{st.body}</p>
                  </li>
                ))}
              </ol>

              {s.id === "credits" ? (
                <div className="mt-5 overflow-hidden rounded-2xl border border-white/[0.07]">
                  <table className="w-full text-left text-[14px]">
                    <thead className="bg-white/[0.03] font-mono text-[11px] uppercase tracking-[0.06em] text-[#7A8294]">
                      <tr><th scope="col" className="px-4 py-3 font-normal sm:px-5">What</th><th scope="col" className="px-4 py-3 text-right font-normal sm:px-5">Cost</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                      {PRICE_LIST.map((p) => (
                        <tr key={p.item}>
                          <td className="px-4 py-3 text-[#C9CFDB] sm:px-5">{p.item}{p.note && <span className="block text-[12px] text-[#7A8294] sm:ml-2 sm:inline">{p.note}</span>}</td>
                          <td className={`whitespace-nowrap px-4 py-3 text-right align-top font-mono sm:px-5 sm:align-middle ${p.cost === "free" ? "text-emerald-300" : "text-white"}`}>{p.cost}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : s.tips.length > 0 && (
                <div className="mt-5 rounded-2xl border border-[#FF8A3D]/20 bg-[#FF8A3D]/[0.04] p-5">
                  <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-[#FFB27A]">
                    <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" /> worth trying
                  </p>
                  <ul className="mt-3 space-y-2">
                    {s.tips.map((t) => (
                      <li key={t} className="flex gap-2.5 text-[14px] leading-relaxed text-[#C9CFDB]"><Check className="mt-1 h-3.5 w-3.5 shrink-0 text-[#FF8A3D]" aria-hidden="true" />{t}</li>
                    ))}
                  </ul>
                </div>
              )}

              <Link href={s.href} className="group mt-5 inline-flex min-h-10 items-center gap-1.5 text-[14px] font-medium text-white transition-colors hover:text-[#FFB27A]">
                {s.cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </section>
          ))}

          {/* Styles */}
          <section id="styles" className="scroll-mt-24">
            <SectionHead n="05" title="12 art styles" lead="The same prompt in a different style gives a completely different look. Pick one per game and stick to it — your sprites will match." />
            <div className="mt-7 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {STYLES.map(([file, name]) => (
                <figure key={file} className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0E1016]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/styles/${file}.png`} alt={`${name} style example`} loading="lazy" className="aspect-square w-full object-cover" />
                  <figcaption className="px-2 py-2 text-center text-[12px] text-[#C9CFDB]">{name}</figcaption>
                </figure>
              ))}
            </div>
          </section>

          {/* Tools */}
          <section id="tools" className="scroll-mt-24">
            <SectionHead n="06" title="Remove background & upscale" lead="Two helpers for images you already have — including ones you didn't make with SpriteLab." />
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.07] bg-[#0E1016] p-5">
                <p className="text-[15px] font-semibold text-white">Remove BG</p>
                <p className="mt-1 text-[14px] leading-relaxed text-[#8B93A5]">Upload any image and get it back with a transparent background. 1 credit, Starter plan and up.</p>
              </div>
              <div className="rounded-2xl border border-white/[0.07] bg-[#0E1016] p-5">
                <p className="text-[15px] font-semibold text-white">Upscale</p>
                <p className="mt-1 text-[14px] leading-relaxed text-[#8B93A5]">Pixel-perfect upscale keeps pixel art razor sharp and is free. AI upscale 2× / 4× adds detail to painted art (paid plans).</p>
              </div>
            </div>
          </section>

          {/* Export */}
          <section id="export" className="scroll-mt-24">
            <SectionHead n="07" title="Use it in your engine" lead="Sprites are standard transparent PNGs and sprite sheets are equal-size frames in a row — every engine understands them." />
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <Link href="/guides" className="group rounded-2xl border border-white/[0.07] bg-[#0E1016] p-5 transition-colors hover:border-white/20">
                <p className="text-[15px] font-semibold text-white">Unity & Godot step by step</p>
                <p className="mt-1 text-[14px] leading-relaxed text-[#8B93A5]">Import settings, slicing sprite sheets and pixel-perfect filtering.</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[13px] text-[#FFB27A]">Read the guides <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></span>
              </Link>
              <div className="rounded-2xl border border-white/[0.07] bg-[#0E1016] p-5">
                <p className="text-[15px] font-semibold text-white">Yours to use commercially</p>
                <p className="mt-1 text-[14px] leading-relaxed text-[#8B93A5]">Use everything you generate in free or paid games. No attribution required.</p>
              </div>
            </div>
          </section>

          {/* Glossary */}
          <section id="words" className="scroll-mt-24">
            <SectionHead n="08" title="Words you'll see" lead="New to game art? These are the only terms you need." />
            <dl className="mt-7 divide-y divide-white/[0.06] rounded-2xl border border-white/[0.07] bg-[#0E1016]">
              {GLOSSARY.map(([term, def]) => (
                <div key={term} className="grid gap-1 px-5 py-4 sm:grid-cols-[160px_1fr] sm:gap-6">
                  <dt className="font-mono text-[13px] text-[#FFB27A]">{term}</dt>
                  <dd className="text-[14px] leading-relaxed text-[#C9CFDB]">{def}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* CTA */}
          <section className="rounded-3xl border border-white/[0.07] bg-[#0E1016] p-8 text-center sm:p-10">
            <h2 className="text-balance font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.01em] text-white sm:text-[34px]">Ready to make your first sprite?</h2>
            <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-[#8B93A5]">
              {offer.credits} free credits{offer.bonus ? ` + ${offer.bonus} launch bonus` : ""} when you sign up. No card needed.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/register" className="px-corners inline-flex h-12 items-center justify-center gap-2 bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] px-7 text-[15px] font-semibold text-white transition hover:brightness-110">
                Start creating free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/" className="inline-flex h-12 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] px-6 text-[15px] font-medium text-[#ECEEF3] transition hover:bg-white/[0.08]">
                Try it without an account
              </Link>
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </main>
  );
}
