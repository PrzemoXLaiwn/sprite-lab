import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteNav } from "@/components/layout/SiteNav";
import { Footer } from "@/components/layout/Footer";
import { COMPARISONS, COMPARE_CHECKED_ON_LABEL, SPRITELAB_SUMMARY } from "@/data/compare";
import { CONTAINER, CompareCta, Disclaimer, JsonLd, SITE, SectionHead } from "./_ui";

const URL = `${SITE}/compare`;
const TITLE = "Best AI Sprite & Game Asset Generators Compared | SpriteLab";
const DESCRIPTION =
  "Honest comparison of AI sprite and game asset generators: PixelLab, Scenario, Retro Diffusion, Leonardo AI and Ludo.ai — features, pricing and who each suits.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: URL, type: "website" },
};

export default function CompareIndexPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "AI sprite and game asset generator comparisons",
      itemListElement: COMPARISONS.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${URL}/${c.slug}`,
        name: `SpriteLab vs ${c.competitor}`,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE },
        { "@type": "ListItem", position: 2, name: "Compare", item: URL },
      ],
    },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0B0D12] text-white">
      <JsonLd data={jsonLd} />
      <SiteNav />

      <section className="relative overflow-hidden pb-12 pt-28 sm:pt-36">
        <div className="pixel-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[960px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(255,138,61,0.13)_0%,transparent_70%)]" />
        <div className="relative z-10 mx-auto max-w-4xl px-5 text-center">
          <p className="font-mono text-[12px] text-[#FFB27A]">&gt; compare ai sprite generators</p>
          <h1 className="mt-5 font-display text-[38px] font-semibold leading-[1.06] text-white sm:text-[56px]">
            Best AI sprite &amp; <span className="text-[#FF8A3D]">game asset generators</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-relaxed text-[#8B93A5]">
            We make SpriteLab, so we are biased — which is why every comparison here is based on each tool&apos;s own
            website and says plainly when another tool is the better choice.
          </p>
        </div>
      </section>

      <section className="pb-16">
        <div className={CONTAINER}>
          <article className="rounded-2xl border border-[#FF8A3D]/25 bg-[#151922] p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-display text-[22px] font-semibold text-white">SpriteLab</h2>
              <span className="rounded-md border border-[#FF8A3D]/25 bg-[#FF8A3D]/[0.08] px-2 py-0.5 font-mono text-[10.5px] text-[#FFB27A]">
                that&apos;s us
              </span>
            </div>
            <p className="mt-2 text-[14px] leading-relaxed text-[#C9CFDB]">{SPRITELAB_SUMMARY}</p>
            <p className="mt-2 text-[13.5px] leading-relaxed text-[#8B93A5]">
              Not offered: API, MCP, 3D, 8-direction character sets or autotile tilesets.
            </p>
          </article>
        </div>
      </section>

      <section className="pb-20">
        <div className={CONTAINER}>
          <SectionHead
            eyebrow="alternatives"
            title="The other tools, honestly"
            intro={`Short summaries from each tool's official pages, checked on ${COMPARE_CHECKED_ON_LABEL}.`}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {COMPARISONS.map((c) => (
              <article key={c.slug} className="flex flex-col rounded-2xl border border-white/[0.06] bg-[#151922] p-6">
                <h2 className="font-display text-[22px] font-semibold text-white">{c.competitor}</h2>
                <p className="mt-1 text-[13.5px] font-medium text-[#FFB27A]">{c.tagline}</p>
                <p className="mt-3 text-[14px] leading-relaxed text-[#8B93A5]">{c.summary}</p>
                <p className="mt-4 text-[13px] font-semibold text-white">Better choice than SpriteLab if you:</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13.5px] leading-relaxed text-[#C9CFDB]">
                  {c.chooseCompetitorIf.slice(0, 3).map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-5">
                  <Link
                    href={`/compare/${c.slug}`}
                    className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#FF8A3D] hover:underline"
                  >
                    SpriteLab vs {c.competitor}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <a
                    href={c.competitorUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="font-mono text-[12px] text-[#8B93A5] hover:text-white"
                  >
                    {c.competitorUrl.replace(/^https?:\/\/(www\.)?/, "")} ↗
                  </a>
                </div>
              </article>
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
