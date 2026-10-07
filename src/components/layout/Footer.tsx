import Link from "next/link";
import Image from "next/image";
import { SEO_PAGES } from "@/data/seo-pages";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "tools",
    links: SEO_PAGES.map((p) => ({ label: p.label.toLowerCase(), href: `/${p.slug}` })),
  },
  {
    title: "product",
    links: [
      { label: "explore", href: "/#explore" },
      { label: "features", href: "/#features" },
      { label: "pricing", href: "/#pricing" },
      { label: "changelog", href: "/changelog" },
    ],
  },
  {
    title: "company",
    links: [
      { label: "get started", href: "/register" },
      { label: "contact", href: "mailto:support@sprite-lab.com" },
      { label: "privacy", href: "/privacy" },
      { label: "terms", href: "/terms" },
    ],
  },
];

/** Public marketing footer. Pixel × dev styling, matches SiteNav. */
export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#0B0D12]">
      <div className="mx-auto max-w-[1200px] px-5 py-12 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="SpriteLab" width={24} height={24} />
              <span className="font-display text-[18px] font-semibold text-white">
                Sprite<span className="text-[#FF8A3D]">Lab</span>
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-[#8B93A5]">
              AI game sprite generator for indie developers. Transparent PNG, ready for your engine.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#7A8294]">{`// ${col.title}`}</p>
              <ul className="mt-3 space-y-2 font-mono text-[12px]">
                {col.links.map((l) => (
                  <li key={l.href}>
                    {l.href.startsWith("mailto:") ? (
                      <a href={l.href} className="text-[#8B93A5] transition-colors hover:text-white">
                        {l.label}
                      </a>
                    ) : (
                      <Link href={l.href} className="text-[#8B93A5] transition-colors hover:text-white">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-white/[0.06] pt-6 font-mono text-[11px] text-[#7A8294] sm:flex-row">
          <p>&copy; {new Date().getFullYear()} SpriteLab. All rights reserved.</p>
          <p>made for indie game devs</p>
        </div>
      </div>
    </footer>
  );
}
