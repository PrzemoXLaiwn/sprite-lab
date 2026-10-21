import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteNav } from "@/components/layout/SiteNav";
import { Footer } from "@/components/layout/Footer";
import { GUIDES, guideReadingMinutes } from "@/data/guides";
import { SIGNUP_CREDITS, SIGNUP_CTA } from "@/config/signup";

const SITE = "https://www.sprite-lab.com";
const URL = `${SITE}/guides`;
const DESCRIPTION =
  "Practical guides for indie game devs: sprite sheets, pixel art sizes, frame counts, Godot 4, Unity and GameMaker import, hitboxes and tiles.";

export const metadata: Metadata = {
  title: { absolute: "Game Dev Guides: Sprites, Sheets & Tiles | SpriteLab" },
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
    <main className="min-h-screen overflow-x-hidden bg-[#131A31] text-[#FFF1E8]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteNav />

      <section className="relative pb-24 pt-28 sm:pt-36">
        <div className="pixel-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />

        <div className="relative mx-auto max-w-3xl px-5">
          <h1 className="mt-4 font-display text-[38px] font-semibold leading-[1.08] text-white sm:text-[54px]">
            Game Dev Guides
          </h1>
          <p className="mt-4 text-[17px] leading-relaxed text-[#A7ADD4]">
            Practical, engine-level answers to the questions indie developers ask about 2D game art: sprite sizes and
            frame counts, sprite sheet layout, importing into Godot 4, Unity and GameMaker, hitboxes, 4-direction
            characters, seamless tiles and keeping a whole set of assets consistent. Written and kept up to date by
            the <Link href="/about" className="text-[#C8CCE8] underline decoration-white/20 underline-offset-2 hover:text-white">SpriteLab team</Link>.
            New to the app itself? Start with{" "}
            <Link href="/how-it-works" className="text-[#C8CCE8] underline decoration-white/20 underline-offset-2 hover:text-white">how SpriteLab works</Link>.
          </p>

          <ul className="mt-12 space-y-4">
            {GUIDES.map((g) => (
              <li key={g.slug}>
                <Link
                  href={`/guides/${g.slug}`}
                  className="group block rounded-2xl border border-white/[0.06] bg-[#212B4E] p-5 transition-colors hover:border-[#FFA300]/30 sm:p-6"
                >
                  <h2 className="font-display text-[20px] font-semibold leading-snug text-white group-hover:text-[#FFC857] sm:text-[22px]">
                    {g.title}
                  </h2>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-[#A7ADD4]">{g.description}</p>
                  <p className="mt-3 flex items-center gap-1.5 font-mono text-[11.5px] text-[#8A92BF]">
                    {guideReadingMinutes(g)} min read · updated {g.updated}
                    <ArrowRight className="h-3.5 w-3.5 text-[#FFA300] transition-transform group-hover:translate-x-0.5" />
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-14 rounded-2xl border border-[#FFA300]/20 bg-[#FFA300]/[0.05] p-6 sm:p-8">
            <h2 className="font-display text-[22px] font-semibold leading-tight text-white">Try it in SpriteLab</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[#A7ADD4]">
              Generate sprites, sprite sheets, seamless tiles and icons from a text prompt. Sign up free for {SIGNUP_CREDITS} credits.
              No card required.
            </p>
            <Link
              href="/register"
              className="px-corners mt-5 inline-flex items-center gap-2 bg-[#FFA300] px-5 py-2.5 text-[14.5px] font-semibold text-[#131A31] transition hover:bg-[#FFB733]"
            >
              {SIGNUP_CTA}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
