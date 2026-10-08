import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteNav } from "@/components/layout/SiteNav";
import { Footer } from "@/components/layout/Footer";
import { GUIDES } from "@/data/guides";

const SITE = "https://www.sprite-lab.com";
const URL = `${SITE}/guides`;
const DESCRIPTION =
  "Practical guides for indie game developers: sprite sheets, pixel art, Unity and Godot 4 import, seamless tiles and keeping AI game art consistent.";

export const metadata: Metadata = {
  title: { absolute: "Game Dev Guides — Sprites, Sprite Sheets & Tiles | SpriteLab" },
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: {
    title: "Game Dev Guides — SpriteLab",
    description: DESCRIPTION,
    url: URL,
    type: "website",
  },
};

export default function GuidesIndexPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Game Dev Guides",
      description: DESCRIPTION,
      url: URL,
      hasPart: GUIDES.map((g) => ({
        "@type": "Article",
        headline: g.title,
        description: g.description,
        url: `${URL}/${g.slug}`,
        dateModified: g.updated,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "SpriteLab", item: SITE },
        { "@type": "ListItem", position: 2, name: "Guides", item: URL },
      ],
    },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0B0D12] text-[#ECEEF3]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteNav />

      <section className="relative pb-24 pt-28 sm:pt-36">
        <div className="pixel-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[860px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(255,138,61,0.12)_0%,transparent_70%)]" />

        <div className="relative mx-auto max-w-3xl px-5">
          <p className="font-mono text-[12px] text-[#FFB27A]">&gt; game dev guides</p>
          <h1 className="mt-4 font-display text-[38px] font-semibold leading-[1.08] text-white sm:text-[54px]">
            Game Dev Guides
          </h1>
          <p className="mt-4 text-[17px] leading-relaxed text-[#A6ADBB]">
            Short, practical answers to the questions indie developers ask about 2D game art: making sprite sheets,
            pixel art that stays crisp, importing into Unity and Godot 4, seamless tiles, and keeping a whole set of
            assets consistent.
          </p>

          <ul className="mt-12 space-y-4">
            {GUIDES.map((g) => (
              <li key={g.slug}>
                <Link
                  href={`/guides/${g.slug}`}
                  className="group block rounded-2xl border border-white/[0.06] bg-[#151922] p-5 transition-colors hover:border-[#FF8A3D]/30 sm:p-6"
                >
                  <h2 className="font-display text-[20px] font-semibold leading-snug text-white group-hover:text-[#FFB27A] sm:text-[22px]">
                    {g.title}
                  </h2>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-[#A6ADBB]">{g.description}</p>
                  <p className="mt-3 flex items-center gap-1.5 font-mono text-[11.5px] text-[#7A8294]">
                    {g.readingMinutes} min read
                    <ArrowRight className="h-3.5 w-3.5 text-[#FF8A3D] transition-transform group-hover:translate-x-0.5" />
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-14 rounded-2xl border border-[#FF8A3D]/20 bg-[#FF8A3D]/[0.05] p-6 sm:p-8">
            <h2 className="font-display text-[22px] font-semibold text-white">Try it in SpriteLab</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[#A6ADBB]">
              Generate sprites, sprite sheets, seamless tiles and icons from a text prompt. 10 free credits on signup,
              no card required.
            </p>
            <Link
              href="/register"
              className="px-corners mt-5 inline-flex items-center gap-2 bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] px-5 py-2.5 text-[14.5px] font-semibold text-white transition hover:brightness-110"
            >
              Start free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
