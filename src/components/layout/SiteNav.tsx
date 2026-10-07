import Link from "next/link";
import Image from "next/image";

/** Public marketing nav (landing + SEO pages). Signed-in users get "Open app". */
export function SiteNav({ registerUrl = "/register", anchorsOnHome = false, signedIn = false }: { registerUrl?: string; anchorsOnHome?: boolean; signedIn?: boolean }) {
  const prefix = anchorsOnHome ? "" : "/";
  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-white/[0.06] bg-[#0B0D12]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-5 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="SpriteLab" width={28} height={28} priority />
          <span className="font-display text-[19px] font-semibold text-white">
            Sprite<span className="text-[#FF8A3D]">Lab</span>
          </span>
        </Link>

        <div className="hidden items-center gap-7 font-mono text-[12px] md:flex">
          <a href={`${prefix}#explore`} className="text-[#8B93A5] transition-colors hover:text-white">explore</a>
          <a href={`${prefix}#features`} className="text-[#8B93A5] transition-colors hover:text-white">features</a>
          <a href={`${prefix}#pricing`} className="text-[#8B93A5] transition-colors hover:text-white">pricing</a>
          <a href={`${prefix}#faq`} className="text-[#8B93A5] transition-colors hover:text-white">faq</a>
        </div>

        <div className="flex items-center gap-2">
          {signedIn ? (
            <>
              <Link href="/assets" className="hidden px-3 py-2 text-[13px] text-[#C9CFDB] transition-colors hover:text-white sm:block">
                My assets
              </Link>
              <Link href="/generate"
                className="px-corners bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] px-4 py-2 text-[13px] font-semibold text-white transition hover:brightness-110">
                Open app
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="px-3 py-2 text-[13px] text-[#C9CFDB] transition-colors hover:text-white">
                Log in
              </Link>
              <Link href={registerUrl}
                className="px-corners bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] px-4 py-2 text-[13px] font-semibold text-white transition hover:brightness-110">
                Start free
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
