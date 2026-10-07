import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Check, type LucideIcon } from "lucide-react";
import { SiteNav } from "@/components/layout/SiteNav";
import { Footer } from "@/components/layout/Footer";
import { HeroPrompt } from "@/components/landing/HeroPrompt";
import { CommunityWall } from "@/components/landing/CommunityWall";
import type { FeaturedGeneration } from "@/lib/featured-generations";

/* ─────────────────────────────────────────────────────────────
   Shared layout for the public SEO landing pages
   (/pixel-art-generator, /game-weapon-generator, /rpg-character-creator).
   Pixel × dev styling, consistent with the homepage.
   ───────────────────────────────────────────────────────────── */

const SITE = "https://www.sprite-lab.com";
const CONTAINER = "mx-auto max-w-[1200px] px-5 lg:px-8";
const CHECKER = {
  backgroundImage: "repeating-conic-gradient(#ffffff06 0% 25%, transparent 0% 50%)",
  backgroundSize: "14px 14px",
};

export const PRIMARY_BTN =
  "px-corners inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] px-6 py-3 text-[15px] font-semibold text-white transition hover:brightness-110";
export const SECONDARY_BTN =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-6 py-3 text-[15px] text-[#ECEEF3] transition hover:bg-white/[0.08]";

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
  | { kind: "gallery"; items: FeaturedGeneration[] };

export type SeoFaq = { q: string; a: string };

export interface SeoLandingProps {
  /** Path without leading slash, e.g. "pixel-art-generator" (used for JSON-LD). */
  slug: string;
  /** Short product name for structured data, e.g. "SpriteLab AI Pixel Art Generator". */
  appName: string;
  appDescription: string;
  /** Mono line above the H1 (without the leading "> "). */
  heroLine: string;
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
    <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#8B93A5]">{`// ${children}`}</p>
  );
}

function Head({ eyebrow, title, intro }: SectionHead) {
  return (
    <div className="mb-10 max-w-2xl">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-2 font-display text-[30px] font-semibold leading-tight text-white sm:text-[40px]">{title}</h2>
      {intro && <p className="mt-3 text-[15px] leading-relaxed text-[#8B93A5]">{intro}</p>}
    </div>
  );
}

function SpriteTile({ image, className = "" }: { image: SeoSprite; className?: string }) {
  return (
    <div
      className={`relative aspect-square overflow-hidden rounded-xl border border-white/[0.06] bg-[#12151C] ${className}`}
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

function Section({ section }: { section: SeoSection }) {
  if (section.kind === "gallery") {
    return <CommunityWall items={section.items} registerUrl="/register" />;
  }

  const wrap = (children: ReactNode, alt = false) => (
    <section
      id={section.id}
      className={`relative scroll-mt-20 py-20 sm:py-24 ${alt ? "border-y border-white/[0.06] bg-[#0E1016]" : ""}`}
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
              className="group rounded-2xl border border-white/[0.06] bg-[#151922] p-4 transition-colors hover:border-[#FF8A3D]/30"
            >
              {c.image && <SpriteTile image={c.image} className="mb-4" />}
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[16px] font-semibold text-white">{c.title}</h3>
                {c.tag && (
                  <span className="shrink-0 rounded-md border border-[#FF8A3D]/25 bg-[#FF8A3D]/[0.08] px-2 py-0.5 font-mono text-[10.5px] text-[#FFB27A]">
                    {c.tag}
                  </span>
                )}
              </div>
              {c.body && <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#8B93A5]">{c.body}</p>}
              {c.items && (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {c.items.map((it) => (
                    <li
                      key={it}
                      className="rounded-md border border-white/[0.07] bg-white/[0.03] px-2 py-0.5 font-mono text-[11px] text-[#C9CFDB]"
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
            <div key={c.title} className="rounded-2xl border border-white/[0.06] bg-[#151922] p-6">
              {c.icon && (
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-[#FF8A3D]/20 bg-[#FF8A3D]/[0.08]">
                  <c.icon className="h-5 w-5 text-[#FF8A3D]" />
                </div>
              )}
              <h3 className="text-[15px] font-semibold text-white">{c.title}</h3>
              {c.body && <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#8B93A5]">{c.body}</p>}
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
              className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#151922] px-4 py-3.5 text-[14px] text-[#C9CFDB]"
            >
              <Check className="h-4 w-4 shrink-0 text-[#FF8A3D]" />
              {it}
            </li>
          ))}
        </ul>
      );

    case "steps":
      return wrap(
        <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {section.steps.map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-white/[0.06] bg-[#151922] p-6">
              <span className="font-mono text-[12px] text-[#FFB27A]">{`step_0${i + 1}`}</span>
              <h3 className="mt-2 text-[16px] font-semibold text-white">{s.title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#8B93A5]">{s.body}</p>
            </li>
          ))}
        </ol>,
        true
      );

    case "prompts":
      return wrap(
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {section.prompts.map((p) => (
              <a
                key={p}
                href="#top"
                className="group flex items-start gap-3 rounded-xl border border-white/[0.06] bg-[#151922] px-4 py-3.5 transition-colors hover:border-[#FF8A3D]/30"
              >
                <span className="font-mono text-[13px] text-[#FF8A3D]">&gt;</span>
                <span className="font-mono text-[13px] leading-relaxed text-[#C9CFDB] group-hover:text-white">{p}</span>
              </a>
            ))}
          </div>
          <p className="mt-4 font-mono text-[11.5px] text-[#7A8294]">
            {"// paste any of these into the generator above — no account needed"}
          </p>
        </>
      );
  }
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
      offers: { "@type": "Offer", price: "0", priceCurrency: "GBP", description: "10 free credits on signup" },
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
    <main className="min-h-screen overflow-x-hidden bg-[#0B0D12] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteNav />

      {/* ═══ HERO ═══════════════════════════════════════════ */}
      <section id="top" className="relative scroll-mt-16 overflow-hidden pb-14 pt-28 sm:pt-36">
        <div className="pixel-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[960px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(255,138,61,0.13)_0%,transparent_70%)]" />

        <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden="true">
          {props.floating.map((s) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={s.src}
              src={s.src}
              alt=""
              className={`absolute opacity-80 ${s.pixel ? "pixel-perfect" : ""} ${s.cls}`}
            />
          ))}
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-5 text-center">
          <p className="font-mono text-[12px] text-[#FFB27A]">
            &gt; {props.heroLine}
            <span className="caret" />
          </p>
          <h1 className="mt-5 font-display text-[40px] font-semibold leading-[1.04] text-white sm:text-[60px] md:text-[72px]">
            {props.h1}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-[#8B93A5] sm:text-[17px]">
            {props.subtitle}
          </p>

          <div className="mt-9">
            <HeroPrompt registerUrl="/register" />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-[11.5px] text-[#8B93A5]">
            {props.trust.map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-[#FF8A3D]" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {props.sections.map((s, i) => (
        <Section key={i} section={s} />
      ))}

      {/* ═══ FAQ ════════════════════════════════════════════ */}
      <section id="faq" className="relative scroll-mt-20 py-20 sm:py-24">
        <div className="mx-auto max-w-[820px] px-5 lg:px-8">
          <Head eyebrow="faq" title="Common questions" />
          <div className="space-y-3">
            {props.faq.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl border border-white/[0.06] bg-[#151922] px-5 py-4 open:border-white/[0.1]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-[#ECEEF3] [&::-webkit-details-marker]:hidden">
                  <h3>{f.q}</h3>
                  <span className="font-mono text-[14px] text-[#FF8A3D] transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2.5 text-[14px] leading-relaxed text-[#8B93A5]">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ══════════════════════════════════════ */}
      <section className="relative pb-24 pt-4">
        <div className={CONTAINER}>
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0E1016] px-6 py-14 text-center sm:px-12">
            <div className="pixel-grid pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_70%)]" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[320px] w-[640px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(255,138,61,0.10)_0%,transparent_70%)]" />
            <div className="relative">
              <Eyebrow>ship it</Eyebrow>
              <h2 className="mt-3 font-display text-[30px] font-semibold leading-tight text-white sm:text-[44px]">
                {props.cta.title}
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-[#8B93A5]">{props.cta.body}</p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/register" className={PRIMARY_BTN}>
                  {props.cta.button}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a href="#top" className={SECONDARY_BTN}>
                  Try without account
                </a>
              </div>
              <p className="mt-5 font-mono text-[11.5px] text-[#7A8294]">10 free credits on signup · no credit card required</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
