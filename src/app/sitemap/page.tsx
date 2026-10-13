import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/layout/SiteNav";
import { Footer } from "@/components/layout/Footer";
import { SEO_PAGES } from "@/data/seo-pages";
import { GUIDES } from "@/data/guides";
import { COMPARISONS } from "@/data/compare";

const SITE = "https://www.sprite-lab.com";
const URL = `${SITE}/sitemap`;
const DESCRIPTION =
  "Every public page on SpriteLab in one place: the sprite, pixel art, animation, tile and icon tools, all game dev guides, tool comparisons and company pages.";

export const metadata: Metadata = {
  title: { absolute: "Site Map — All SpriteLab Pages, Tools and Guides | SpriteLab" },
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: { title: "SpriteLab site map", description: DESCRIPTION, url: URL, type: "website" },
};

type Item = { label: string; href: string; note?: string };

function groups(): { title: string; intro: string; items: Item[] }[] {
  return [
    {
      title: "Tools",
      intro: "What you can make, one page per kind of asset.",
      items: SEO_PAGES.map((p) => ({ label: p.label, href: `/${p.slug}`, note: p.summary })),
    },
    {
      title: "Guides",
      intro: "Long-form answers about 2D game art and getting it into an engine.",
      items: [
        { label: "All guides", href: "/guides" },
        ...GUIDES.map((g) => ({ label: g.title, href: `/guides/${g.slug}`, note: g.description })),
      ],
    },
    {
      title: "Comparisons",
      intro: "SpriteLab next to other AI sprite tools, from their own published information.",
      items: [
        { label: "Compare AI sprite tools", href: "/compare" },
        ...COMPARISONS.map((c) => ({ label: `SpriteLab vs ${c.competitor}`, href: `/compare/${c.slug}` })),
      ],
    },
    {
      title: "Product",
      intro: "How the app works, what it costs and what people make with it.",
      items: [
        { label: "How SpriteLab works", href: "/how-it-works", note: "A walkthrough of creating, animating and exporting sprites." },
        { label: "Pricing", href: "/pricing", note: "Plans, credit packs and the credit cost of every action." },
        { label: "Community gallery", href: "/community", note: "Work shared by SpriteLab users, with prompts and styles." },
        { label: "Changelog", href: "/changelog", note: "What changed and when." },
      ],
    },
    {
      title: "Company",
      intro: "Who runs SpriteLab and the rules that apply.",
      items: [
        { label: "About", href: "/about" },
        { label: "Contact", href: "/contact" },
        { label: "Privacy policy", href: "/privacy" },
        { label: "Terms of service", href: "/terms" },
      ],
    },
  ];
}

export default function SitemapPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0B0D12] text-[#ECEEF3]">
      <SiteNav />
      <section className="relative pb-24 pt-28 sm:pt-36">
        <div className="relative mx-auto max-w-3xl px-5">
          <p className="font-mono text-[12px] text-[#FFB27A]">&gt; site map</p>
          <h1 className="mt-4 font-display text-[38px] font-semibold leading-[1.08] text-white sm:text-[54px]">Site map</h1>
          <p className="mt-4 text-[17px] leading-relaxed text-[#A6ADBB]">
            Every public page on SpriteLab. Search engines read the{" "}
            <a href="/sitemap.xml" className="text-[#C9CFDB] underline decoration-white/20 underline-offset-2 hover:text-white">
              XML sitemap
            </a>
            ; this one is for people.
          </p>

          <div className="mt-12 space-y-12">
            {groups().map((g) => (
              <section key={g.title} aria-labelledby={`map-${g.title.toLowerCase()}`}>
                <h2 id={`map-${g.title.toLowerCase()}`} className="font-display text-[24px] font-semibold leading-tight text-white">
                  {g.title}
                </h2>
                <p className="mt-1.5 text-[14.5px] text-[#8B93A5]">{g.intro}</p>
                <ul className="mt-4 divide-y divide-white/[0.06] rounded-2xl border border-white/[0.06] bg-[#0E1016]">
                  {g.items.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href} className="group block min-h-11 px-5 py-3 transition-colors hover:bg-white/[0.03]">
                        <span className="text-[15px] font-medium leading-snug text-[#ECEEF3] group-hover:text-[#FFB27A]">{item.label}</span>
                        {item.note && <span className="mt-0.5 block text-[13.5px] leading-relaxed text-[#8B93A5]">{item.note}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
