import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Home } from "lucide-react";

// The root layout's robots tag is `index, follow`. Next also injects
// `noindex` when this page renders, so a 404 used to ship both. This export
// replaces the inherited robots value; the page stays noindex.
export const metadata: Metadata = {
  title: { absolute: "Page not found | SpriteLab" },
  robots: { index: false, follow: false },
  // A child openGraph object replaces the layout's, whose og:url is the
  // homepage. This page has no URL of its own, so omit url.
  openGraph: {
    title: "Page not found | SpriteLab",
    description: "This page does not exist.",
    siteName: "SpriteLab",
    locale: "en_US",
    type: "website",
  },
};

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#131A31] px-4 py-10 text-[#FFF1E8]">
      <div className="pixel-grid pointer-events-none absolute inset-0" />

      <div className="relative w-full max-w-[440px] text-center">
        <Link href="/" className="mb-10 inline-flex items-center gap-2.5">
          <Image src="/logo.png" alt="SpriteLab" width={28} height={28} />
          <span className="font-display text-[17px] font-semibold text-white">
            Sprite<span className="text-[#FFA300]">Lab</span>
          </span>
        </Link>

        <p className="font-display text-[96px] font-semibold leading-none text-white sm:text-[120px]">
          404
        </p>

        <h1 className="mt-6 font-display text-[24px] font-semibold text-white">Page not found</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-[#9AA1CC]">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <p className="mt-4 font-mono text-[11px] text-[#8A92BF]">
          &gt; error: route not found
        </p>

        <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Link
            href="/generate"
            className="px-corners inline-flex h-11 items-center justify-center gap-2 bg-[#FFA300] px-5 text-[14px] font-semibold text-[#131A31] transition-[filter] hover:bg-[#FFB733]"
          >
            Start creating
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-5 text-[14px] font-medium text-[#FFF1E8] transition-colors hover:bg-white/[0.08]"
          >
            <Home className="h-4 w-4" />
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
