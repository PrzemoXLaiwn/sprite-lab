"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
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
    <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#ef4444]/10 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#ef4444]/15 rounded-full blur-[200px] animate-float" style={{ animationDuration: "8s" }} />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#ef4444]/10 rounded-full blur-[150px] animate-float" style={{ animationDelay: "2s", animationDuration: "10s" }} />
        <div className="absolute inset-0 grid-pattern opacity-20" />
      </div>

      <div className="relative z-10 text-center max-w-lg">
        {/* Error icon */}
        <div className="w-16 h-16 mx-auto mb-8 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <span className="text-3xl">!</span>
        </div>

        {/* Error badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] text-sm mb-6">
          <AlertTriangle className="w-4 h-4" />
          <span>Something went wrong</span>
        </div>

        {/* Error Text */}
        <h1 className="text-6xl md:text-7xl font-display font-black mb-4 text-[#ef4444]">
          Oops!
        </h1>

        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
          An Error Occurred
        </h2>

        <p className="text-white/50 mb-10 text-lg leading-relaxed">
          Coreling ran into an unexpected error. Don&apos;t worry, our team has been notified!
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => reset()}
            className="group flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-[#FF6B2C] to-[#FF6B2C] text-black font-bold hover:shadow-xl hover:shadow-[#FF6B2C]/30 transition-all hover:scale-105"
          >
            <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
            Try Again
          </button>
          <Link
            href="/"
            className="group flex items-center gap-2 px-8 py-4 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-all border border-white/10 hover:border-[#FF6B2C]/30"
          >
            <Home className="w-5 h-5" />
            Go Home
          </Link>
        </div>

        {/* Error code */}
        {error.digest && (
          <div className="mt-10 p-3 rounded-lg bg-white/5 border border-white/10">
            <p className="text-xs text-white/30 font-mono">
              Error ID: {error.digest}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
