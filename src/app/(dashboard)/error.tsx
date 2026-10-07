"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, AlertTriangle, LayoutDashboard } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-[420px] rounded-2xl border border-white/[0.06] bg-[#0E1016] p-7 text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-red-400/20 bg-red-500/[0.06] text-red-200">
          <AlertTriangle className="h-5 w-5" />
        </div>

        <h2 className="font-display text-[22px] font-semibold text-white">Something went wrong</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-[#8B93A5]">
          We couldn&apos;t load this page. Try again, or go back to the generator.
        </p>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="px-corners inline-flex h-11 items-center justify-center gap-2 bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] px-5 text-[14px] font-semibold text-white transition-[filter] hover:brightness-110"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
          <Link
            href="/generate"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-5 text-[14px] font-medium text-[#ECEEF3] transition-colors hover:bg-white/[0.08]"
          >
            <LayoutDashboard className="h-4 w-4" />
            Back to generator
          </Link>
        </div>

        {error.digest && (
          <p className="mt-6 font-mono text-[11px] text-[#7A8294]">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
