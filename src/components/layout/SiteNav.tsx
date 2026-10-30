import Link from "next/link";
import Image from "next/image";
import { MobileMenu } from "./MobileMenu";
import { isNewFeature } from "@/config/new-features";
import { NewBadge } from "@/components/dashboard/NewBadge";

const PRIMARY =
  "px-corners inline-flex h-10 items-center bg-[#FFA300] px-4 text-[13px] font-semibold text-[#131A31] transition hover:bg-[#FFB733]";
const QUIET = "inline-flex h-10 items-center px-3 text-[13px] text-[#C8CCE8] transition-colors hover:text-white";

/** Public marketing nav (landing + SEO pages). Signed-in users get "Open app". */
export function SiteNav({ registerUrl = "/register", anchorsOnHome = false, signedIn = false }: { registerUrl?: string; anchorsOnHome?: boolean; signedIn?: boolean }) {
  const prefix = anchorsOnHome ? "" : "/";
  const links = [
    { href: `${prefix}#explore`, label: "Gallery" },
    { href: `${prefix}#tools`, label: "Tools" },
    { href: "/sprite-sheet-generator", label: "Sprite sheets" },
    { href: "/how-it-works", label: "How it works" },
    { href: `${prefix}#pricing`, label: "Pricing" },
    { href: "/guides", label: "Guides" },
    { href: `${prefix}#faq`, label: "FAQ" },
  ];

  return (
    <nav aria-label="Main" className="fixed left-0 right-0 top-0 z-50 border-b border-white/[0.06] bg-[#131A31]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-5 lg:px-8">
        <Link href="/" aria-label="SpriteLab home" className="flex h-10 shrink-0 items-center gap-2.5">
          <Image src="/logo.png" alt="" width={28} height={28} />
          <span className="font-display text-[19px] font-semibold text-white">
            Sprite<span className="text-[#FFA300]">Lab</span>
          </span>
        </Link>

        <div className="hidden items-center gap-6 text-[14px] font-medium lg:flex">
          {links.map((l) => (
            <a key={l.label} href={l.href} className="text-[#C8CCE8] transition-colors hover:text-white">{l.label}</a>
          ))}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {signedIn ? (
            <>
              {/* Signed-in only (search engines never see it) */}
              <Link href="/play" className={`${QUIET} gap-1.5 whitespace-nowrap`}>
                Dungeon
                {isNewFeature("/play") && <NewBadge />}
              </Link>
              <Link href="/assets" className={`${QUIET.replace("inline-flex", "hidden sm:inline-flex")} whitespace-nowrap`}>My assets</Link>
              <Link href="/generate" className={`${PRIMARY} whitespace-nowrap`}>Open app</Link>
            </>
          ) : (
            <>
              <Link href="/login" className={QUIET}>Log in</Link>
              <Link href={registerUrl} className={PRIMARY}>Start free</Link>
            </>
          )}
          <MobileMenu links={links} />
        </div>
      </div>
    </nav>
  );
}
