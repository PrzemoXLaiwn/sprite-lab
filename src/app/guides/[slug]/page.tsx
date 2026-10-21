import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { SiteNav } from "@/components/layout/SiteNav";
import { Footer } from "@/components/layout/Footer";
import { FIRST_PUBLISHED, GUIDES, getGuide, guideReadingMinutes, guideWordCount, type Guide } from "@/data/guides";
import { GUIDE_INTROS } from "@/data/guide-intros";
import { SIGNUP_CREDITS, SIGNUP_CTA } from "@/config/signup";

const SITE = "https://www.sprite-lab.com";

const ALL_TOOLS: { label: string; href: string }[] = [
  { label: "AI sprite generator", href: "/ai-sprite-generator" },
  { label: "AI sprite animation generator", href: "/ai-sprite-animation-generator" },
  { label: "Pixel art generator", href: "/pixel-art-generator" },
  { label: "AI tileset generator", href: "/ai-tileset-generator" },
  { label: "AI game icon generator", href: "/ai-game-icon-generator" },
  { label: "Sprites for Unity", href: "/unity-sprite-generator" },
  { label: "Sprites for Godot", href: "/godot-sprite-generator" },
  { label: "RPG character creator", href: "/rpg-character-creator" },
  { label: "Game weapon generator", href: "/game-weapon-generator" },
];

const AUTHOR = { name: "SpriteLab team", href: "/about" };

/** The guide's own tools first, then the general ones, at most five. */
function toolsFor(guide: Guide) {
  const own = (guide.tools ?? []).map((href) => ALL_TOOLS.find((t) => t.href === href)).filter((t) => t !== undefined);
  const rest = ALL_TOOLS.filter((t) => !own.includes(t));
  return [...own, ...rest].slice(0, 5);
}

/** Curated related guides first, then the rest, at most five. */
function relatedFor(guide: Guide) {
  const own = (guide.related ?? []).map(getGuide).filter((g) => g !== undefined);
  const rest = GUIDES.filter((g) => g.slug !== guide.slug && !own.includes(g));
  return [...own, ...rest].slice(0, 5);
}

const CHECKER = {
  backgroundImage: "repeating-conic-gradient(#ffffff06 0% 25%, transparent 0% 50%)",
  backgroundSize: "14px 14px",
};

export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};
  const url = `${SITE}/guides/${guide.slug}`;
  return {
    // Brand only where it still fits the ~60 characters search results show
    title: { absolute: guide.title.length <= 48 ? `${guide.title} | SpriteLab` : guide.title },
    description: guide.description,
    alternates: { canonical: url },
    openGraph: {
      title: guide.title,
      description: guide.description,
      url,
      type: "article",
      publishedTime: guide.published ?? FIRST_PUBLISHED,
      modifiedTime: guide.updated,
      authors: [`${SITE}${AUTHOR.href}`],
      siteName: "SpriteLab",
    },
  };
}

function headingId(heading: string) {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildJsonLd(guide: Guide) {
  const url = `${SITE}/guides/${guide.slug}`;
  const publisher = { "@type": "Organization", name: "SpriteLab", url: SITE, logo: `${SITE}/logo.png` };
  const author = { "@type": "Organization", name: AUTHOR.name, url: `${SITE}${AUTHOR.href}` };
  const words = guideWordCount(guide);
  const firstImage = guide.sections.find((s) => s.image)?.image;
  const data: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: guide.title,
      description: guide.description,
      url,
      mainEntityOfPage: url,
      datePublished: guide.published ?? FIRST_PUBLISHED,
      dateModified: guide.updated,
      author,
      publisher,
      wordCount: words,
      timeRequired: `PT${guideReadingMinutes(guide)}M`,
      inLanguage: "en",
      isPartOf: { "@type": "CollectionPage", name: "Game Dev Guides", url: `${SITE}/guides` },
      image: firstImage ? `${SITE}${firstImage.src}` : undefined,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: guide.faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "SpriteLab", item: SITE },
        { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE}/guides` },
        { "@type": "ListItem", position: 3, name: guide.title, item: url },
      ],
    },
  ];

  const stepSection = guide.sections.find((s) => s.steps?.length);
  if (stepSection?.steps) {
    data.push({
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: guide.title,
      description: guide.description,
      step: stepSection.steps.map((text, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        name: `Step ${i + 1}`,
        text,
        url: `${url}#${headingId(stepSection.heading)}`,
      })),
    });
  }
  return data;
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const tools = toolsFor(guide);
  const related = relatedFor(guide);
  const published = guide.published ?? FIRST_PUBLISHED;
  const intro = GUIDE_INTROS[guide.slug];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#131A31] text-[#FFF1E8]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(guide)) }} />
      <SiteNav />

      <article className="relative pb-20 pt-28 sm:pt-36">

        <div className="relative mx-auto max-w-3xl px-5">
          <nav aria-label="Breadcrumb" className="font-mono text-[12px] text-[#9AA1CC]">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link href="/" className="inline-flex min-h-10 items-center hover:text-[#FFF1E8]">
                  home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/guides" className="inline-flex min-h-10 items-center hover:text-[#FFF1E8]">
                  guides
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="min-w-0 max-w-full truncate text-[#FFC857]">{guide.slug}</li>
            </ol>
          </nav>

          <header className="mt-6">
            <h1 className="font-display text-[34px] font-semibold leading-[1.1] text-white sm:text-[48px]">
              {guide.title}
            </h1>
            <p className="mt-4 text-[17px] leading-relaxed text-[#A7ADD4]">{guide.description}</p>
            <p className="mt-4 flex flex-wrap gap-x-2 gap-y-1 font-mono text-[12px] leading-relaxed text-[#8A92BF]">
              <span>
                By{" "}
                <Link href={AUTHOR.href} rel="author" className="text-[#C8CCE8] underline decoration-white/20 underline-offset-2 hover:text-white">
                  {AUTHOR.name}
                </Link>
              </span>
              <span aria-hidden="true">·</span>
              <time dateTime={guide.updated}>Updated {formatDate(guide.updated)}</time>
              {published !== guide.updated && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    First published <time dateTime={published}>{formatDate(published)}</time>
                  </span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span>{guideReadingMinutes(guide)} min read</span>
            </p>
          </header>

          {intro && (
            <aside aria-label="What you'll learn" className="mt-8 grid gap-5 rounded-2xl border border-[#FFA300]/20 bg-[#FFA300]/[0.04] px-5 py-5 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] sm:gap-8">
              <div>
                <h2 className="text-[12.5px] text-[#FFC857] font-semibold">{"What you'll learn"}</h2>
                <ul className="mt-3 space-y-2">
                  {intro.learn.map((item) => (
                    <li key={item} className="flex gap-2.5 text-[14.5px] leading-snug text-[#FFF1E8]">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#FFA300]" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className="text-[12.5px] text-[#9AA1CC] font-semibold">{"You'll need"}</h2>
                <ul className="mt-3 space-y-2">
                  {intro.needs.map((item) => (
                    <li key={item} className="text-[14px] leading-snug text-[#C8CCE8]">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          )}

          <nav aria-label="In this guide" className="mt-8 rounded-2xl border border-white/[0.06] bg-[#19223F] px-5 py-4">
            <p className="text-[12.5px] text-[#9AA1CC] font-semibold">{"In this guide"}</p>
            <ol className="mt-1.5 grid gap-x-6 sm:grid-cols-2">
              {guide.sections.map((s) => (
                <li key={s.heading}>
                  <a href={`#${headingId(s.heading)}`} className="flex min-h-10 items-center py-1 text-[14px] leading-snug text-[#C8CCE8] hover:text-[#FFC857]">
                    {s.heading}
                  </a>
                </li>
              ))}
              <li>
                <a href="#faq" className="flex min-h-10 items-center py-1 text-[14px] leading-snug text-[#C8CCE8] hover:text-[#FFC857]">
                  Frequently asked questions
                </a>
              </li>
            </ol>
          </nav>

          <div className="mt-10 space-y-12">
            {guide.sections.map((s) => (
              <section key={s.heading} id={headingId(s.heading)} className="scroll-mt-24">
                <h2 className="font-display text-[24px] font-semibold leading-tight text-white sm:text-[28px]">
                  {s.heading}
                </h2>
                {s.body.map((p, i) => (
                  <p key={i} className="mt-4 text-[16px] leading-[1.75] text-[#A7ADD4]">
                    {p}
                  </p>
                ))}
                {s.table && (
                  <div className="mt-5 overflow-x-auto rounded-xl border border-white/[0.06]">
                    <table className="w-full min-w-[480px] border-collapse text-left text-[14px] leading-snug">
                      <thead className="bg-[#212B4E]">
                        <tr>
                          {s.table.head.map((h) => (
                            <th key={h} scope="col" className="px-3.5 py-2.5 text-[11.5px] font-medium text-[#9AA1CC]">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {s.table.rows.map((row) => (
                          <tr key={row.join("|")} className="border-t border-white/[0.06]">
                            {row.map((cell, ci) => (
                              <td key={ci} className={`px-3.5 py-2.5 align-top ${ci === 0 ? "font-medium text-[#FFF1E8]" : "text-[#A7ADD4]"}`}>
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {s.list && (
                  <ul className="mt-5 space-y-2.5">
                    {s.list.map((item) => (
                      <li key={item} className="flex gap-3 text-[15.5px] leading-relaxed text-[#C8CCE8]">
                        <Check className="mt-1 h-4 w-4 shrink-0 text-[#FFA300]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {s.steps && (
                  <ol className="mt-5 space-y-3">
                    {s.steps.map((step, i) => (
                      <li
                        key={step}
                        className="flex gap-4 rounded-xl border border-white/[0.06] bg-[#212B4E] px-4 py-3.5 text-[15.5px] leading-relaxed text-[#C8CCE8]"
                      >
                        <span className="mt-0.5 shrink-0 font-mono text-[12px] text-[#FFC857]">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                )}
                {s.code && (
                  <figure className="mt-5 overflow-hidden rounded-xl border border-white/[0.06] bg-[#19223F]">
                    <figcaption className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-2 font-mono text-[11.5px] text-[#9AA1CC]">
                      <span className="min-w-0 truncate">{s.code.caption}</span>
                      <span className="shrink-0 text-[#FFC857]">{s.code.lang}</span>
                    </figcaption>
                    <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[12.5px] leading-[1.65] text-[#C8CCE8]">
                      <code>{s.code.text}</code>
                    </pre>
                  </figure>
                )}
                {s.after?.map((p, i) => (
                  <p key={i} className="mt-4 text-[16px] leading-[1.75] text-[#A7ADD4]">
                    {p}
                  </p>
                ))}
                {s.image && (
                  <figure className="mt-6">
                    <div
                      className="flex items-center justify-center rounded-2xl border border-white/[0.06] bg-[#161E39] p-8"
                      style={CHECKER}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={s.image.src}
                        alt={s.image.alt}
                        loading="lazy"
                        className={`h-48 w-48 object-contain sm:h-56 sm:w-56 ${s.image.pixel ? "pixel-perfect" : ""}`}
                      />
                    </div>
                    <figcaption className="mt-2 text-center font-mono text-[11.5px] text-[#8A92BF]">
                      {s.image.alt} — made with SpriteLab
                    </figcaption>
                  </figure>
                )}
              </section>
            ))}
          </div>

          {/* ─── CTA ─── */}
          <aside data-ads-ignore className="mt-14 rounded-2xl border border-[#FFA300]/20 bg-[#FFA300]/[0.05] p-6 sm:p-8">
            <p className="text-[12.5px] text-[#FFC857] font-semibold">{"Try it in SpriteLab"}</p>
            <h2 className="mt-2 text-balance font-display text-[22px] font-semibold leading-tight text-white sm:text-[26px]">
              Generate game-ready sprites from a sentence
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[#A7ADD4]">
              Transparent PNGs, real pixel-grid pixel art, sprite sheets, seamless tiles and icons. Sign up free for {SIGNUP_CREDITS} credits.
              No card required.
            </p>
            <Link
              href="/register"
              className="px-corners mt-6 inline-flex h-11 items-center gap-2 bg-[#FFA300] px-5 text-[14.5px] font-semibold text-[#131A31] transition hover:bg-[#FFB733]"
            >
              {SIGNUP_CTA}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </aside>

          {/* ─── FAQ ─── */}
          <section id="faq" className="mt-14 scroll-mt-24">
            <h2 className="font-display text-[24px] font-semibold leading-tight text-white sm:text-[28px]">Frequently asked questions</h2>
            <div className="mt-5 space-y-3">
              {guide.faq.map((f) => (
                <div key={f.q} className="rounded-2xl border border-white/[0.06] bg-[#212B4E] px-5 py-4">
                  <h3 className="text-[15.5px] font-semibold text-[#FFF1E8]">{f.q}</h3>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-[#A7ADD4]">{f.a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ─── Related ─── */}
          <section data-ads-ignore className="mt-14 grid gap-8 sm:grid-cols-2">
            <div>
              <h2 className="text-[12.5px] text-[#9AA1CC] font-semibold">{"Related tools"}</h2>
              <ul className="mt-2">
                {tools.map((t) => (
                  <li key={t.href}>
                    <Link href={t.href} className="group inline-flex min-h-10 items-center gap-1.5 py-1.5 text-[14.5px] leading-snug text-[#C8CCE8] transition-colors hover:text-[#FFC857]">
                      {t.label} <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/how-it-works" className="group inline-flex min-h-10 items-center gap-1.5 py-1.5 text-[14.5px] leading-snug text-[#C8CCE8] transition-colors hover:text-[#FFC857]">
                    How SpriteLab works, step by step <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="text-[12.5px] text-[#9AA1CC] font-semibold">{"Related guides"}</h2>
              <ul className="mt-2">
                {related.map((g) => (
                  <li key={g.slug}>
                    <Link href={`/guides/${g.slug}`} className="group inline-flex min-h-10 items-center gap-1.5 py-1.5 text-[14.5px] leading-snug text-[#C8CCE8] transition-colors hover:text-[#FFC857]">
                      {g.title} <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <Link
            href="/guides"
            className="mt-10 inline-flex min-h-10 items-center gap-2 font-mono text-[12.5px] text-[#9AA1CC] hover:text-[#FFF1E8]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            all guides
          </Link>
        </div>
      </article>

      <Footer />
    </main>
  );
}
