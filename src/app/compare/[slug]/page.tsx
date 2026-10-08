import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { SiteNav } from "@/components/layout/SiteNav";
import { Footer } from "@/components/layout/Footer";
import { COMPARISONS, COMPARE_CHECKED_ON_LABEL, getComparison, type Comparison } from "@/data/compare";
import { CONTAINER, CompareCta, Disclaimer, JsonLd, SITE, SectionHead } from "../_ui";

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return COMPARISONS.map((c) => ({ slug: c.slug }));
}

function titleFor(c: Comparison) {
  return `SpriteLab vs ${c.competitor}: AI Sprite Generator Comparison | SpriteLab`;
}

function descriptionFor(c: Comparison) {
  const d = `SpriteLab vs ${c.competitor}: an honest feature and pricing comparison for game devs, from official sources — including when ${c.competitor} is the better pick.`;
  return d.length <= 160 ? d : `${d.slice(0, 157).trimEnd()}…`;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const c = getComparison(slug);
  if (!c) return {};
  const url = `${SITE}/compare/${c.slug}`;
  const title = titleFor(c);
  const description = descriptionFor(c);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "article" },
  };
}

export default async function ComparePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const c = getComparison(slug);
  if (!c) notFound();

  const url = `${SITE}/compare/${c.slug}`;
  const others = COMPARISONS.filter((o) => o.slug !== c.slug);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: `SpriteLab vs ${c.competitor}: AI Sprite Generator Comparison`,
      description: descriptionFor(c),
      url,
      mainEntityOfPage: url,
      datePublished: c.checkedOn,
      dateModified: c.checkedOn,
      author: { "@type": "Organization", name: "SpriteLab", url: SITE },
      publisher: { "@type": "Organization", name: "SpriteLab", url: SITE },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: c.faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE },
        { "@type": "ListItem", position: 2, name: "Compare", item: `${SITE}/compare` },
        { "@type": "ListItem", position: 3, name: `SpriteLab vs ${c.competitor}`, item: url },
      ],
    },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0B0D12] text-white">
      <JsonLd data={jsonLd} />
      <SiteNav />

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden pb-12 pt-28 sm:pt-36">
        <div className="pixel-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[960px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(255,138,61,0.13)_0%,transparent_70%)]" />
        <div className="relative z-10 mx-auto max-w-4xl px-5 text-center">
          <nav aria-label="Breadcrumb" className="font-mono text-[12px] text-[#8B93A5]">
            <Link href="/" className="hover:text-white">home</Link>
            <span className="px-1.5">/</span>
            <Link href="/compare" className="hover:text-white">compare</Link>
            <span className="px-1.5">/</span>
            <span className="text-[#FFB27A]">{c.slug}</span>
          </nav>
          <h1 className="mt-5 font-display text-[38px] font-semibold leading-[1.06] text-white sm:text-[56px]">
            SpriteLab vs <span className="text-[#FF8A3D]">{c.competitor}</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-relaxed text-[#8B93A5]">{c.summary}</p>
          <p className="mt-4 font-mono text-[11.5px] text-[#7A8294]">
            {`checked on ${COMPARE_CHECKED_ON_LABEL} · written by the SpriteLab team`}
          </p>
        </div>
      </section>

      {/* ═══ TABLE ═══ */}
      <section className="pb-16">
        <div className={CONTAINER}>
          <SectionHead eyebrow="side by side" title="Feature comparison" />
          <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-[#151922]">
            <table className="w-full min-w-[640px] border-collapse text-left text-[14px]">
              <thead>
                <tr className="border-b border-white/[0.08] bg-[#0E1016]">
                  <th scope="col" className="w-[22%] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.08em] text-[#8B93A5]">
                    Feature
                  </th>
                  <th scope="col" className="w-[39%] px-4 py-3 font-semibold text-[#FF8A3D]">SpriteLab</th>
                  <th scope="col" className="w-[39%] px-4 py-3 font-semibold text-white">{c.competitor}</th>
                </tr>
              </thead>
              <tbody>
                {c.rows.map((r) => (
                  <tr key={r.feature} className="border-b border-white/[0.05] last:border-0 align-top">
                    <th scope="row" className="px-4 py-3 font-medium text-[#ECEEF3]">{r.feature}</th>
                    <td className="px-4 py-3 leading-relaxed text-[#C9CFDB]">{r.spritelab}</td>
                    <td className="px-4 py-3 leading-relaxed text-[#C9CFDB]">{r.competitor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 font-mono text-[11.5px] text-[#7A8294]">
            {`// "Not listed on their site" means we could not find it on ${c.competitor}'s official pages — not that it definitely doesn't exist.`}
          </p>
        </div>
      </section>

      {/* ═══ WHO SHOULD CHOOSE WHAT ═══ */}
      <section className="border-y border-white/[0.06] bg-[#0E1016] py-20">
        <div className={CONTAINER}>
          <SectionHead eyebrow="which one" title="Which should you choose?" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ChooseCard title={`Choose ${c.competitor} if…`} items={c.chooseCompetitorIf} />
            <ChooseCard title="Choose SpriteLab if…" items={c.chooseSpriteLabIf} accent />
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="py-20">
        <div className="mx-auto max-w-[820px] px-5 lg:px-8">
          <SectionHead eyebrow="faq" title="Common questions" />
          <div className="space-y-3">
            {c.faq.map((f) => (
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

      {/* ═══ SOURCES ═══ */}
      <section className="pb-16">
        <div className="mx-auto max-w-[820px] px-5 lg:px-8">
          <SectionHead eyebrow="sources" title="Sources" intro={`Checked on ${COMPARE_CHECKED_ON_LABEL}.`} />
          <ul className="space-y-2">
            {c.sources.map((s) => (
              <li key={s.url} className="text-[14px] text-[#C9CFDB]">
                <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="hover:text-white hover:underline">
                  {s.label}
                </a>
                <span className="ml-2 break-all font-mono text-[11.5px] text-[#7A8294]">{s.url}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <Disclaimer checked={COMPARE_CHECKED_ON_LABEL} />
          </div>
          <p className="mt-6 text-[14px] text-[#8B93A5]">
            More comparisons:{" "}
            {others.map((o, i) => (
              <span key={o.slug}>
                <Link href={`/compare/${o.slug}`} className="text-[#FF8A3D] hover:underline">
                  SpriteLab vs {o.competitor}
                </Link>
                {i < others.length - 1 ? " · " : ""}
              </span>
            ))}
            {" · "}
            <Link href="/compare" className="text-[#FF8A3D] hover:underline">
              all AI sprite generators
            </Link>
          </p>
        </div>
      </section>

      <CompareCta />
      <Footer />
    </main>
  );
}

function ChooseCard({ title, items, accent = false }: { title: string; items: string[]; accent?: boolean }) {
  return (
    <div
      className={`rounded-2xl border bg-[#151922] p-6 ${accent ? "border-[#FF8A3D]/25" : "border-white/[0.06]"}`}
    >
      <h3 className="font-display text-[20px] font-semibold text-white">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {items.map((it) => (
          <li key={it} className="flex items-start gap-3 text-[14px] leading-relaxed text-[#C9CFDB]">
            <Check className={`mt-1 h-4 w-4 shrink-0 ${accent ? "text-[#FF8A3D]" : "text-[#8B93A5]"}`} />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
