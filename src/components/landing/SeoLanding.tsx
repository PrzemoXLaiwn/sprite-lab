import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Check, Plus, type LucideIcon } from "lucide-react";
import { SiteNav } from "@/components/layout/SiteNav";
import { Footer } from "@/components/layout/Footer";
import { HeroPrompt } from "@/components/landing/HeroPrompt";
import { CommunityWall } from "@/components/landing/CommunityWall";
import { PromptExamples } from "@/components/landing/PromptExamples";
import { SectionHeader } from "@/components/landing/SectionHeader";
import type { FeaturedGeneration } from "@/lib/featured-generations";
import { SIGNUP_OFFER } from "@/config/signup";
import { relatedSeoPages } from "@/data/seo-pages";

/* ─────────────────────────────────────────────────────────────
   Shared layout for the public SEO landing pages
   (/pixel-art-generator, /game-weapon-generator, /rpg-character-creator).
   Pixel × dev styling, consistent with the homepage.
   ───────────────────────────────────────────────────────────── */

const SITE = "https://www.sprite-lab.com";
const CONTAINER = "mx-auto max-w-[1200px] px-5 lg:px-8";
const CHECKER = {
  backgroundColor: "#1B2446",
  backgroundImage:
    "linear-gradient(45deg, #212B4E 25%, transparent 25%, transparent 75%, #212B4E 75%), linear-gradient(45deg, #212B4E 25%, transparent 25%, transparent 75%, #212B4E 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 8px 8px",
};

export const PRIMARY_BTN =
  "px-corners inline-flex items-center justify-center gap-2 bg-[#FFA300] px-6 py-3 text-[15px] font-semibold text-[#131A31] transition hover:bg-[#FFB733]";
export const SECONDARY_BTN =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-6 py-3 text-[15px] text-[#FFF1E8] transition hover:bg-white/[0.08]";

export type SeoSprite = { src: string; alt: string; pixel?: boolean };

export type SeoCard = {
  title: string;
  body?: string;
  tag?: string;
  image?: SeoSprite;
  items?: string[];
  icon?: LucideIcon;
};

type SectionHead = { id?: string; eyebrow: string; title: ReactNode; intro?: string };

export type SeoSection =
  | (SectionHead & { kind: "cards"; cards: SeoCard[]; cols?: 2 | 3 | 4 })
  | (SectionHead & { kind: "features"; cards: SeoCard[] })
  | (SectionHead & { kind: "checklist"; items: string[] })
  | (SectionHead & { kind: "steps"; steps: { title: string; body: string }[] })
  | (SectionHead & { kind: "prompts"; prompts: string[] })
  /** Practical, asset-specific game-dev notes: a spec table, paragraphs and guide links. */
  | (SectionHead & {
      kind: "specs";
      rows: { label: string; value: string }[];
      notes: string[];
      links?: { label: string; href: string }[];
    })
  /** Real sprite sheets shown at whole-pixel scale with the frame cells marked. */
  | (SectionHead & { kind: "sheets"; sheets: SeoSheet[] })
  | { kind: "gallery"; items: FeaturedGeneration[] };

export type SeoSheet = {
  src: string;
  alt: string;
  title: string;
  body: string;
  frames: number;
  /** Frame size in image pixels. */
  frameWidth: number;
  frameHeight: number;
  fps: number;
};

export type SeoFaq = { q: string; a: string; /** Optional follow-up link under the answer. */ link?: { label: string; href: string } };

export interface SeoLandingProps {
  /** Path without leading slash, e.g. "pixel-art-generator" (used for JSON-LD). */
  slug: string;
  /** Short product name for structured data, e.g. "SpriteLab AI Pixel Art Generator". */
  appName: string;
  appDescription: string;
  /** Breadcrumb label; defaults to appName without the "SpriteLab " prefix. */
  breadcrumb?: string;
  /** Short tagline; no longer rendered above the H1 (kept for callers). */
  heroLine?: string;
  h1: ReactNode;
  subtitle: string;
  trust: string[];
  floating: (SeoSprite & { cls: string })[];
  sections: SeoSection[];
  faq: SeoFaq[];
  cta: { title: ReactNode; body: string; button: string };
}

function Eyebrow({ children }: { children: string }) {
  return (
    <p className="text-[12.5px] text-[#9AA1CC] font-semibold">{children}</p>
  );
}

function Head({ eyebrow, title, intro }: SectionHead) {
  return <SectionHeader align="left" eyebrow={eyebrow} title={title} intro={intro} className="mb-10" />;
}

function SpriteTile({ image, className = "" }: { image: SeoSprite; className?: string }) {
  return (
    <div
      className={`relative aspect-square overflow-hidden rounded-xl border border-white/[0.06] bg-[#161E39] ${className}`}
      style={CHECKER}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.src}
        alt={image.alt}
        loading="lazy"
        className={`absolute inset-0 h-full w-full object-contain p-[12%] transition-transform duration-300 group-hover:scale-[1.05] ${image.pixel ? "pixel-perfect" : ""}`}
      />
    </div>
  );
}

const COLS: Record<2 | 3 | 4, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

/** Shown 128 px tall: half of a 256 px frame, so every art pixel of a 2× pixel-art sheet is one screen pixel. */
const SHEET_H = 128;

function SheetStrip({ sheet }: { sheet: SeoSheet }) {
  const cellW = Math.round((sheet.frameWidth * SHEET_H) / sheet.frameHeight);
  const width = cellW * sheet.frames;
  return (
    <figure className="rounded-[8px] border border-white/[0.06] bg-[#212B4E] p-4">
      <div className="overflow-x-auto pb-1">
        <div className="relative" style={{ ...CHECKER, width, height: SHEET_H }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sheet.src} alt={sheet.alt} width={width} height={SHEET_H} loading="lazy" className="pixel-perfect block max-w-none" />
          {/* Frame cells */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0"
            style={{ backgroundImage: `repeating-linear-gradient(90deg, transparent 0 ${cellW - 1}px, rgba(255,163,0,0.55) ${cellW - 1}px ${cellW}px)` }} />
        </div>
      </div>
      <figcaption className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-[15px] font-semibold text-white">{sheet.title}</span>
        <span className="text-[13px] text-[#A7ADD4]">
          {sheet.frames} frames, {sheet.frameWidth}×{sheet.frameHeight} px each, {sheet.fps} FPS
        </span>
        <span className="basis-full text-[13.5px] leading-relaxed text-[#9AA1CC]">{sheet.body}</span>
      </figcaption>
    </figure>
  );
}

function Section({ section }: { section: SeoSection }) {
  if (section.kind === "gallery") {
    return <CommunityWall items={section.items} registerUrl="/register" />;
  }

  const wrap = (children: ReactNode, alt = false) => (
    <section
      id={section.id}
      className={`relative scroll-mt-16 py-16 sm:py-20 ${alt ? "border-y border-white/[0.06] bg-[#19223F]" : ""}`}
    >
      <div className={CONTAINER}>
        <Head eyebrow={section.eyebrow} title={section.title} intro={section.intro} />
        {children}
      </div>
    </section>
  );

  switch (section.kind) {
    case "cards":
      return wrap(
        <div className={`grid grid-cols-1 gap-4 ${COLS[section.cols ?? 3]}`}>
          {section.cards.map((c) => (
            <article
              key={c.title}
              className="group rounded-[8px] border border-white/[0.06] bg-[#212B4E] p-4 transition-colors hover:border-[#FFA300]/30"
            >
              {c.image && <SpriteTile image={c.image} className="mb-4" />}
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[16px] font-semibold leading-snug text-white">{c.title}</h3>
                {c.tag && (
                  <span className="shrink-0 rounded-md border border-[#FFA300]/25 bg-[#FFA300]/[0.08] px-2 py-0.5 font-mono text-[10.5px] text-[#FFC857]">
                    {c.tag}
                  </span>
                )}
              </div>
              {c.body && <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#9AA1CC]">{c.body}</p>}
              {c.items && (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {c.items.map((it) => (
                    <li
                      key={it}
                      className="rounded-md border border-white/[0.07] bg-white/[0.03] px-2 py-0.5 font-mono text-[11px] text-[#C8CCE8]"
                    >
                      {it}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      );

    case "features":
      return wrap(
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {section.cards.map((c) => (
            <div key={c.title} className="rounded-[8px] border border-white/[0.06] bg-[#212B4E] p-6">
              {c.icon && (
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-[#FFA300]/20 bg-[#FFA300]/[0.08]">
                  <c.icon className="h-5 w-5 text-[#FFA300]" aria-hidden="true" />
                </div>
              )}
              <h3 className="text-[15px] font-semibold text-white">{c.title}</h3>
              {c.body && <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#9AA1CC]">{c.body}</p>}
            </div>
          ))}
        </div>,
        true
      );

    case "checklist":
      return wrap(
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {section.items.map((it) => (
            <li
              key={it}
              className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-[#212B4E] px-4 py-3.5 text-[14px] leading-relaxed text-[#C8CCE8]"
            >
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#FFA300]" aria-hidden="true" />
              {it}
            </li>
          ))}
        </ul>
      );

    case "steps":
      return wrap(
        <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {section.steps.map((s, i) => (
            <li key={s.title} className="rounded-[8px] border border-white/[0.06] bg-[#212B4E] p-6">
              <span className="font-mono text-[12px] text-[#FFC857]">{`step ${String(i + 1).padStart(2, "0")}`}</span>
              <h3 className="mt-2 text-[16px] font-semibold text-white">{s.title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#9AA1CC]">{s.body}</p>
            </li>
          ))}
        </ol>,
        true
      );

    case "specs":
      return wrap(
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-12">
          <dl className="divide-y divide-white/[0.06] self-start rounded-[8px] border border-white/[0.06] bg-[#212B4E]">
            {section.rows.map((r) => (
              <div key={r.label} className="grid grid-cols-1 gap-1 px-5 py-3.5 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-4">
                <dt className="text-[11.5px] text-[#9AA1CC] font-semibold">{r.label}</dt>
                <dd className="text-[14px] leading-relaxed text-[#C8CCE8]">{r.value}</dd>
              </div>
            ))}
          </dl>
          <div>
            {section.notes.map((n, i) => (
              <p key={i} className={`${i ? "mt-4" : ""} text-[15px] leading-[1.75] text-[#A7ADD4]`}>
                {n}
              </p>
            ))}
            {section.links && section.links.length > 0 && (
              <ul className="mt-5">
                {[...section.links, { label: "How SpriteLab works, step by step", href: "/how-it-works" }].map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="group inline-flex min-h-10 items-center gap-1.5 py-1.5 text-[14.5px] leading-snug text-[#FFC857] transition-colors hover:text-white">
                      {l.label}
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      );

    case "sheets":
      return wrap(
        <div className="space-y-5">
          {section.sheets.map((sh) => <SheetStrip key={sh.src} sheet={sh} />)}
        </div>
      );

    case "prompts":
      return wrap(
        <>
          <PromptExamples prompts={section.prompts} />
          <p className="mt-4 font-mono text-[11.5px] text-[#8A92BF]">
            {"Tap one to drop it into the generator above"}
          </p>
        </>
      );
  }
}

function RelatedTools({ slug }: { slug: string }) {
  const pages = relatedSeoPages(slug);
  if (pages.length === 0) return null;
  return (
    <section className="relative scroll-mt-16 border-t border-white/[0.06] py-16 sm:py-20">
      <div className={CONTAINER}>
        <Head eyebrow="next" title="Related tools" intro="The same pipeline, a different file." />
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {pages.map((page) => (
            <li key={page.slug}>
              <Link
                href={`/${page.slug}`}
                className="flex min-h-11 flex-col justify-center rounded-[8px] border border-white/[0.06] bg-[#212B4E] px-4 py-3 transition-colors hover:border-[#FFA300]/40"
              >
                <span className="text-[15px] font-semibold text-white">{page.label}</span>
                <span className="mt-1 text-[13.5px] leading-snug text-[#9AA1CC]">{page.summary}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function SeoLanding(props: SeoLandingProps) {
  const url = `${SITE}/${props.slug}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: props.appName,
      description: props.appDescription,
      url,
      applicationCategory: "DesignApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "GBP", description: SIGNUP_OFFER },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "SpriteLab", item: SITE },
        {
          "@type": "ListItem",
          position: 2,
          name: props.breadcrumb ?? props.appName.replace(/^SpriteLab\s+(—\s+)?/, ""),
          item: url,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: props.faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  return (
    <main className="min-h-screen overflow-x-clip bg-[#131A31] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteNav />

      {/* ═══ HERO ═══════════════════════════════════════════ */}
      <section id="top" className="relative scroll-mt-16 overflow-hidden border-b border-white/[0.06] pb-14 pt-24 sm:pt-32">
        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-5">
          <div className="max-w-3xl">
            <h1 className="text-balance font-display text-[36px] font-semibold leading-[1.04] tracking-[-0.02em] text-[#FFF1E8] min-[400px]:text-[40px] sm:text-[56px] md:text-[64px]">
              {props.h1}
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-[16px] leading-relaxed text-[#C8CCE8] sm:text-[17px]">
              {props.subtitle}
            </p>
            <div className="mt-8 [&>div]:mx-0">
              <HeroPrompt registerUrl="/register" />
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13.5px] text-[#A7ADD4]">
              {props.trust.map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[#00E436]" aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          {props.floating.length > 0 && (
            <div className="checker mt-10 flex w-fit max-w-full gap-px overflow-hidden rounded-[10px] border border-white/[0.09]" aria-hidden="true">
              {props.floating.map((f) => (
                <div key={f.src} className="flex h-20 w-20 items-center justify-center sm:h-24 sm:w-24">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.src} alt="" loading="lazy" decoding="async" className={`h-14 w-14 object-contain sm:h-16 sm:w-16 ${f.pixel ? "pixel-perfect" : ""}`} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {props.sections.map((s, i) => (
        <Section key={i} section={s} />
      ))}

      <RelatedTools slug={props.slug} />

      {/* ═══ FAQ ════════════════════════════════════════════ */}
      <section id="faq" className="relative scroll-mt-16 py-16 sm:py-20">
        <div className="mx-auto max-w-[820px] px-5 lg:px-8">
          <Head eyebrow="faq" title="Common questions" />
          <div className="space-y-3">
            {props.faq.map((f) => (
              <details
                key={f.q}
                className="group rounded-[8px] border border-white/[0.06] bg-[#212B4E] px-5 open:border-white/[0.1]"
              >
                <summary className="flex min-h-14 cursor-pointer py-4 list-none items-center justify-between gap-4 text-[15px] font-semibold leading-snug text-[#FFF1E8] [&::-webkit-details-marker]:hidden">
                  <h3>{f.q}</h3>
                  <Plus className="h-4 w-4 shrink-0 text-[#9AA1CC] transition-transform duration-200 group-open:rotate-45" aria-hidden="true" />
                </summary>
                <p className={`-mt-1 pr-8 text-[14px] leading-relaxed text-[#9AA1CC] ${f.link ? "pb-2" : "pb-5"}`}>{f.a}</p>
                {f.link && (
                  <Link href={f.link.href} className="mb-3 inline-flex min-h-10 items-center gap-1.5 text-[14px] text-[#FFC857] transition-colors hover:text-white">
                    {f.link.label}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                )}
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ══════════════════════════════════════ */}
      <section className="relative pb-24 pt-4">
        <div className={CONTAINER}>
          <div className="relative overflow-hidden rounded-[8px] border border-white/[0.08] bg-[#19223F] px-6 py-14 text-center sm:px-12">
            <div className="pixel-grid pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_70%)]" />
            <div className="relative">
              <Eyebrow>ship it</Eyebrow>
              <h2 className="mt-3 text-balance font-display text-[32px] font-semibold leading-[1.08] tracking-[-0.01em] text-white sm:text-[44px]">
                {props.cta.title}
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-[#9AA1CC]">{props.cta.body}</p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/register" className={PRIMARY_BTN}>
                  {props.cta.button}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
              <p className="mt-5 font-mono text-[11.5px] text-[#8A92BF]">No credit card required</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
