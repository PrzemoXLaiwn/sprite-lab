"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, Home, AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#131A31] px-4 py-10 text-[#FFF1E8]">
      <div className="pixel-grid pointer-events-none absolute inset-0" />

      <div className="relative w-full max-w-[420px] text-center">
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-red-400/20 bg-red-500/[0.06] text-red-200">
          <AlertTriangle className="h-5 w-5" />
        </div>

        <h1 className="font-display text-[24px] font-semibold text-white">Something went wrong</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-[#9AA1CC]">
          An unexpected error occurred. Try again, or head back home.
        </p>

        <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="group px-corners inline-flex h-11 items-center justify-center gap-2 bg-[#FFA300] px-5 text-[14px] font-semibold text-[#131A31] transition-[filter] hover:bg-[#FFB733]"
          >
            <RefreshCw className="h-4 w-4 transition-transform duration-500 group-hover:rotate-180" />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-5 text-[14px] font-medium text-[#FFF1E8] transition-colors hover:bg-white/[0.08]"
          >
            <Home className="h-4 w-4" />
            Go home
          </Link>
        </div>

        {error.digest && (
          <p className="mt-8 font-mono text-[11px] text-[#8A92BF]">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
