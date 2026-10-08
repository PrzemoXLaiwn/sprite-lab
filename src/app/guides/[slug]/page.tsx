import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { SiteNav } from "@/components/layout/SiteNav";
import { Footer } from "@/components/layout/Footer";
import { GUIDES, getGuide, type Guide } from "@/data/guides";

const SITE = "https://www.sprite-lab.com";

const RELATED_TOOLS: { label: string; href: string }[] = [
  { label: "AI sprite generator", href: "/ai-sprite-generator" },
  { label: "AI sprite animation generator", href: "/ai-sprite-animation-generator" },
  { label: "Pixel art generator", href: "/pixel-art-generator" },
  { label: "AI tileset generator", href: "/ai-tileset-generator" },
  { label: "AI game icon generator", href: "/ai-game-icon-generator" },
  { label: "Sprites for Unity", href: "/unity-sprite-generator" },
  { label: "Sprites for Godot", href: "/godot-sprite-generator" },
];

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
    title: { absolute: `${guide.title} | SpriteLab` },
    description: guide.description,
    alternates: { canonical: url },
    openGraph: {
      title: guide.title,
      description: guide.description,
      url,
      type: "article",
      modifiedTime: guide.updated,
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
  const publisher = { "@type": "Organization", name: "SpriteLab", url: SITE };
  const firstImage = guide.sections.find((s) => s.image)?.image;
  const data: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: guide.title,
      description: guide.description,
      url,
      mainEntityOfPage: url,
      datePublished: guide.updated,
      dateModified: guide.updated,
      author: publisher,
      publisher,
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

  const others = GUIDES.filter((g) => g.slug !== guide.slug);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0B0D12] text-[#ECEEF3]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(guide)) }} />
      <SiteNav />

      <article className="relative pb-20 pt-28 sm:pt-36">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[860px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(255,138,61,0.10)_0%,transparent_70%)]" />

        <div className="relative mx-auto max-w-3xl px-5">
          <nav aria-label="Breadcrumb" className="font-mono text-[12px] text-[#8B93A5]">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link href="/" className="hover:text-[#ECEEF3]">
                  home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/guides" className="hover:text-[#ECEEF3]">
                  guides
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="truncate text-[#FFB27A]">{guide.slug}</li>
            </ol>
          </nav>

          <header className="mt-6">
            <h1 className="font-display text-[34px] font-semibold leading-[1.1] text-white sm:text-[48px]">
              {guide.title}
            </h1>
            <p className="mt-4 text-[17px] leading-relaxed text-[#A6ADBB]">{guide.description}</p>
            <p className="mt-4 font-mono text-[12px] text-[#7A8294]">
              <time dateTime={guide.updated}>Updated {formatDate(guide.updated)}</time>
              {" · "}
              {guide.readingMinutes} min read
            </p>
          </header>

          <div className="mt-10 space-y-12">
            {guide.sections.map((s) => (
              <section key={s.heading} id={headingId(s.heading)} className="scroll-mt-24">
                <h2 className="font-display text-[24px] font-semibold leading-tight text-white sm:text-[28px]">
                  {s.heading}
                </h2>
                {s.body.map((p, i) => (
                  <p key={i} className="mt-4 text-[16px] leading-[1.75] text-[#A6ADBB]">
                    {p}
                  </p>
                ))}
                {s.list && (
                  <ul className="mt-5 space-y-2.5">
                    {s.list.map((item) => (
                      <li key={item} className="flex gap-3 text-[15.5px] leading-relaxed text-[#C9CFDB]">
                        <Check className="mt-1 h-4 w-4 shrink-0 text-[#FF8A3D]" />
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
                        className="flex gap-4 rounded-xl border border-white/[0.06] bg-[#151922] px-4 py-3.5 text-[15.5px] leading-relaxed text-[#C9CFDB]"
                      >
                        <span className="mt-0.5 shrink-0 font-mono text-[12px] text-[#FFB27A]">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                )}
                {s.image && (
                  <figure className="mt-6">
                    <div
                      className="flex items-center justify-center rounded-2xl border border-white/[0.06] bg-[#12151C] p-8"
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
                    <figcaption className="mt-2 text-center font-mono text-[11.5px] text-[#7A8294]">
                      {s.image.alt} — made with SpriteLab
                    </figcaption>
                  </figure>
                )}
              </section>
            ))}
          </div>

          {/* ─── CTA ─── */}
          <aside className="mt-14 rounded-2xl border border-[#FF8A3D]/20 bg-[#FF8A3D]/[0.05] p-6 sm:p-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#FFB27A]">{"// try it in spritelab"}</p>
            <h2 className="mt-2 font-display text-[22px] font-semibold text-white sm:text-[26px]">
              Generate game-ready sprites from a sentence
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[#A6ADBB]">
              Transparent PNGs, real pixel-grid pixel art, sprite sheets, seamless tiles and icons. 10 free credits on
              signup, no card required.
            </p>
            <Link
              href="/register"
              className="px-corners mt-5 inline-flex items-center gap-2 bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] px-5 py-2.5 text-[14.5px] font-semibold text-white transition hover:brightness-110"
            >
              Try it free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </aside>

          {/* ─── FAQ ─── */}
          <section id="faq" className="mt-14 scroll-mt-24">
            <h2 className="font-display text-[24px] font-semibold text-white sm:text-[28px]">Frequently asked questions</h2>
            <div className="mt-5 space-y-3">
              {guide.faq.map((f) => (
                <div key={f.q} className="rounded-2xl border border-white/[0.06] bg-[#151922] px-5 py-4">
                  <h3 className="text-[15.5px] font-semibold text-[#ECEEF3]">{f.q}</h3>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-[#A6ADBB]">{f.a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ─── Related ─── */}
          <section className="mt-14 grid gap-8 sm:grid-cols-2">
            <div>
              <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#8B93A5]">{"// related tools"}</h2>
              <ul className="mt-3 space-y-2">
                {RELATED_TOOLS.map((t) => (
                  <li key={t.href}>
                    <Link href={t.href} className="text-[14.5px] text-[#C9CFDB] hover:text-[#FF8A3D]">
                      {t.label} →
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#8B93A5]">{"// more guides"}</h2>
              <ul className="mt-3 space-y-2">
                {others.map((g) => (
                  <li key={g.slug}>
                    <Link href={`/guides/${g.slug}`} className="text-[14.5px] text-[#C9CFDB] hover:text-[#FF8A3D]">
                      {g.title} →
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <Link
            href="/guides"
            className="mt-12 inline-flex items-center gap-2 font-mono text-[12.5px] text-[#8B93A5] hover:text-[#ECEEF3]"
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
