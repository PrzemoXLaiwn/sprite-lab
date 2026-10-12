import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ArrowUp, Check } from "lucide-react";
import { SHOWCASE, isPixelShowcase } from "@/data/showcase";

export const metadata: Metadata = {
  title: {
    template: "%s - SpriteLab",
    default: "Sign In - SpriteLab",
  },
  description: "Sign in or create an account to start generating game assets with AI. Free to try.",
  robots: {
    index: false, // Don't index auth pages
    follow: true,
  },
};

const CHECKER = {
  backgroundImage: "repeating-conic-gradient(#ffffff08 0% 25%, transparent 0% 50%)",
  backgroundSize: "20px 20px",
} as const;

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tiles = SHOWCASE.slice(0, 9);
  const featured = SHOWCASE.find((s) => s.id === "sc-fox-mage") ?? SHOWCASE[0];

  return (
    <div className="min-h-screen bg-[#0B0D12] text-[#ECEEF3] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* ── Form column ─────────────────────────────────────── */}
      <div className="flex min-h-screen flex-col px-4 py-5 sm:px-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 rounded-lg">
            <Image src="/logo.png" alt="SpriteLab" width={28} height={28} priority />
            <span className="font-display text-[17px] font-semibold text-white">
              Sprite<span className="text-[#FF8A3D]">Lab</span>
            </span>
          </Link>
          <Link href="/" className="text-[13px] text-[#8B93A5] transition-colors hover:text-white">
            Back to site
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[380px]">{children}</div>
        </main>

        <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-mono text-[11px] text-[#7A8294] lg:justify-start">
          <span>&copy; {new Date().getFullYear()} SpriteLab</span>
          <Link href="/terms" className="transition-colors hover:text-[#C9CFDB]">Terms</Link>
          <Link href="/privacy" className="transition-colors hover:text-[#C9CFDB]">Privacy</Link>
        </footer>
      </div>

      {/* ── Visual panel (desktop only) ─────────────────────── */}
      <aside className="hidden p-3 lg:sticky lg:top-0 lg:flex lg:h-screen" aria-hidden="true">
        <div className="relative flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0E1016]">
          <div className="pixel-grid absolute inset-0" />

          <div className="relative flex flex-1 flex-col justify-center px-10 py-12 xl:px-16">
            <div className="mx-auto w-full max-w-[520px]">
              <p className="font-mono text-[12px] text-[#7A8294]">
                <span className="text-[#FF8A3D]">&gt;</span> turn a sentence into a game-ready sprite<span className="caret" />
              </p>
              <h2 className="mt-4 font-display text-[32px] font-semibold leading-tight text-white xl:text-[36px]">
                From prompt to sprite in seconds
              </h2>
              <p className="mt-3 max-w-[440px] text-[15px] leading-relaxed text-[#8B93A5]">
                Characters, weapons, items and creatures in pixel art and more. Transparent PNG, commercial use included.
              </p>

              {/* Prompt mock */}
              <div className="mt-8 flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#151922] py-2 pl-4 pr-2">
                <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-[#C9CFDB]">{featured.prompt}</span>
                <span className="px-corners flex h-8 w-8 shrink-0 items-center justify-center bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] text-white">
                  <ArrowUp className="h-4 w-4" />
                </span>
              </div>

              {/* Sprite grid */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                {tiles.map((item) => (
                  <div
                    key={item.id}
                    className="group relative aspect-square overflow-hidden rounded-xl border border-white/[0.06] bg-[#151922]"
                  >
                    <div className="absolute inset-0" style={CHECKER} />
                    <Image
                      src={item.imageUrl}
                      alt=""
                      fill
                      unoptimized
                      sizes="160px"
                      className={`object-contain p-[14%] transition-transform duration-300 group-hover:scale-105 ${isPixelShowcase(item) ? "pixel-perfect" : ""}`}
                    />
                    <span className="absolute bottom-2 left-2 rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] text-[#C9CFDB] opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                      {item.style}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[12px] text-[#8B93A5]">
                {["10 free credits", "No card required", "Commercial license"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-[#FF8A3D]" />
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
