import Link from "next/link";
import Image from "next/image";
import { MobileMenu } from "./MobileMenu";

const PRIMARY =
  "px-corners inline-flex h-10 items-center bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] px-4 text-[13px] font-semibold text-white transition hover:brightness-110";
const QUIET = "inline-flex h-10 items-center px-3 text-[13px] text-[#C9CFDB] transition-colors hover:text-white";

/** Public marketing nav (landing + SEO pages). Signed-in users get "Open app". */
export function SiteNav({ registerUrl = "/register", anchorsOnHome = false, signedIn = false }: { registerUrl?: string; anchorsOnHome?: boolean; signedIn?: boolean }) {
  const prefix = anchorsOnHome ? "" : "/";
  const links = [
    { href: `${prefix}#explore`, label: "explore" },
    { href: `${prefix}#features`, label: "features" },
    { href: "/how-it-works", label: "how it works" },
    { href: `${prefix}#pricing`, label: "pricing" },
    { href: "/guides", label: "guides" },
    { href: `${prefix}#faq`, label: "faq" },
  ];

  return (
    <nav aria-label="Main" className="fixed left-0 right-0 top-0 z-50 border-b border-white/[0.06] bg-[#0B0D12]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-5 lg:px-8">
        <Link href="/" aria-label="SpriteLab home" className="flex h-10 shrink-0 items-center gap-2.5">
          <Image src="/logo.png" alt="" width={28} height={28} priority />
          <span className="font-display text-[19px] font-semibold text-white">
            Sprite<span className="text-[#FF8A3D]">Lab</span>
          </span>
        </Link>

        <div className="hidden items-center gap-7 font-mono text-[12px] lg:flex">
          {links.map((l) => (
            <a key={l.label} href={l.href} className="text-[#8B93A5] transition-colors hover:text-white">{l.label}</a>
          ))}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {signedIn ? (
            <>
              <Link href="/assets" className={`${QUIET} hidden sm:inline-flex`}>My assets</Link>
              <Link href="/generate" className={PRIMARY}>Open app</Link>
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
