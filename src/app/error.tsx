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
    <div className="min-h-screen bg-[#030305] flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#ff4444]/10 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#ff4444]/15 rounded-full blur-[200px] animate-float" style={{ animationDuration: "8s" }} />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#ff4444]/10 rounded-full blur-[150px] animate-float" style={{ animationDelay: "2s", animationDuration: "10s" }} />
        <div className="absolute inset-0 grid-pattern opacity-20" />
      </div>

      <div className="relative z-10 text-center max-w-lg">
        {/* Sad Coreling */}
        <div className="relative w-56 h-56 mx-auto mb-8">
          <div className="absolute inset-0 bg-[#ff4444]/30 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "2s" }} />
          <div className="absolute inset-0 animate-pulse-ring rounded-full border-2 border-[#ff4444]/20" />
          <Image
            src="/coreling-sad.png"
            alt="Sad Coreling"
            width={224}
            height={224}
            className="relative drop-shadow-2xl animate-float"
            style={{ animationDuration: "2.5s" }}
          />
        </div>

        {/* Error badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff4444]/10 border border-[#ff4444]/30 text-[#ff4444] text-sm mb-6">
          <AlertTriangle className="w-4 h-4" />
          <span>Something went wrong</span>
        </div>

        {/* Error Text */}
        <h1 className="text-6xl md:text-7xl font-display font-black mb-4 text-[#ff4444]">
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
            className="group flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-black font-bold hover:shadow-xl hover:shadow-[#00ff88]/30 transition-all hover:scale-105"
          >
            <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
            Try Again
          </button>
          <Link
            href="/"
            className="group flex items-center gap-2 px-8 py-4 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-all border border-white/10 hover:border-[#00ff88]/30"
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
