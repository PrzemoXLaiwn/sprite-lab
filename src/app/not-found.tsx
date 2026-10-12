import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#0B0D12] px-4 py-10 text-[#ECEEF3]">
      <div className="pixel-grid pointer-events-none absolute inset-0" />

      <div className="relative w-full max-w-[440px] text-center">
        <Link href="/" className="mb-10 inline-flex items-center gap-2.5">
          <Image src="/logo.png" alt="SpriteLab" width={28} height={28} />
          <span className="font-display text-[17px] font-semibold text-white">
            Sprite<span className="text-[#FF8A3D]">Lab</span>
          </span>
        </Link>

        <p className="font-display text-[96px] font-semibold leading-none text-white sm:text-[120px]">
          404<span className="caret" />
        </p>

        <h1 className="mt-6 font-display text-[24px] font-semibold text-white">Page not found</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-[#8B93A5]">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <p className="mt-4 font-mono text-[11px] text-[#7A8294]">
          <span className="text-[#FF8A3D]">&gt;</span> error: route not found
        </p>

        <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Link
            href="/generate"
            className="px-corners inline-flex h-11 items-center justify-center gap-2 bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] px-5 text-[14px] font-semibold text-white transition-[filter] hover:brightness-110"
          >
            Start creating
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-5 text-[14px] font-medium text-[#ECEEF3] transition-colors hover:bg-white/[0.08]"
          >
            <Home className="h-4 w-4" />
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
