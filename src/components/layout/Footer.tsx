import Link from "next/link";
import Image from "next/image";
import { SEO_PAGES } from "@/data/seo-pages";
import { GUIDES } from "@/data/guides";
import { TIKTOK_HANDLE, TIKTOK_PROFILE_URL } from "@/data/tiktok";
import { TikTokIcon } from "@/components/icons/TikTokIcon";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Tools",
    links: SEO_PAGES.map((p) => ({ label: p.label, href: `/${p.slug}` })),
  },
  {
    title: "Learn",
    links: [
      { label: "How SpriteLab works", href: "/how-it-works" },
      { label: "All guides", href: "/guides" },
      ...GUIDES.slice(0, 4).map((g) => ({ label: g.title, href: `/guides/${g.slug}` })),
      { label: "Compare AI sprite tools", href: "/compare" },
    ],
  },
  {
    title: "Product",
    links: [
      { label: "Gallery", href: "/#explore" },
      { label: "Features", href: "/#features" },
      { label: "Community gallery", href: "/community" },
      { label: "Pricing", href: "/pricing" },
      { label: "Changelog", href: "/changelog" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Get started", href: "/register" },
      { label: "TikTok", href: TIKTOK_PROFILE_URL },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Site map", href: "/sitemap" },
    ],
  },
];

/** Public marketing footer, matches SiteNav. */
export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#131A31]">
      <div className="mx-auto max-w-[1200px] px-5 py-12 lg:px-8">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-4 lg:grid-cols-[1.3fr_1fr_1.2fr_1fr_1fr]">
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link href="/" aria-label="SpriteLab home" className="inline-flex h-10 items-center gap-2.5">
              <Image src="/logo.png" alt="" width={24} height={24} />
              <span className="font-display text-[18px] font-semibold text-white">
                Sprite<span className="text-[#FFA300]">Lab</span>
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-[13.5px] leading-relaxed text-[#C8CCE8]">
              AI game sprite generator for indie developers. Transparent PNG, ready for your engine.
            </p>
            <a href={TIKTOK_PROFILE_URL} target="_blank" rel="noopener noreferrer"
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-[8px] border border-white/[0.14] px-4 text-[14px] font-semibold text-[#FFF1E8] transition hover:bg-white/[0.06]">
              <TikTokIcon className="h-4 w-4" /> @{TIKTOK_HANDLE} on TikTok<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-[13px] font-semibold text-[#FFF1E8]">{col.title}</p>
              <ul className="mt-2 text-[13px] sm:mt-3 sm:space-y-1">
                {col.links.map((l) => (
                  <li key={l.href}>
                    {l.href.startsWith("mailto:") || l.href.startsWith("https://") ? (
                      <a href={l.href} className="inline-flex min-h-10 items-center py-2 leading-snug text-[#9AA1CC] transition-colors hover:text-white sm:min-h-6 sm:py-1"
                        {...(l.href.startsWith("https://") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                        {l.label}{l.href.startsWith("https://") && <span className="sr-only"> (opens in a new tab)</span>}
                      </a>
                    ) : (
                      <Link href={l.href} className="inline-flex min-h-10 items-center py-2 leading-snug text-[#9AA1CC] transition-colors hover:text-white sm:min-h-6 sm:py-1">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-white/[0.06] pt-6 text-[12.5px] text-[#A7ADD4] sm:flex-row">
          <p>&copy; {new Date().getFullYear()} SpriteLab. All rights reserved.</p>
          <p>Made for indie game devs</p>
        </div>
      </div>
    </footer>
  );
}
