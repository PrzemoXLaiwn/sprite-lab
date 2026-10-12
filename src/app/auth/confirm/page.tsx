"use client";

import { ArrowRight, CheckCircle2, Zap } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { primaryBtnCls } from "@/app/(auth)/_components/auth-ui";

export default function EmailConfirmedPage() {
  const [countdown, setCountdown] = useState(5);

  // Track registration conversion for TikTok
  useEffect(() => {
    // TikTok tracking removed
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = "/generate?welcome=1";
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#0B0D12] px-4 py-10 text-[#ECEEF3]">
      <div className="pixel-grid pointer-events-none absolute inset-0" />

      <div className="relative w-full max-w-[400px]">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <Image src="/logo.png" alt="SpriteLab" width={28} height={28} priority />
          <span className="font-display text-[17px] font-semibold text-white">
            Sprite<span className="text-[#FF8A3D]">Lab</span>
          </span>
        </Link>

        <div className="rounded-2xl border border-white/[0.06] bg-[#0E1016] p-7 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/[0.06] text-emerald-300">
            <CheckCircle2 className="h-6 w-6" />
          </div>

          <h1 className="font-display text-[24px] font-semibold text-white">You&apos;re in</h1>
          <p className="mt-2 text-[14px] text-[#8B93A5]">Your email is confirmed and your account is active.</p>

          <div className="mt-5 inline-flex items-center gap-2 rounded-lg border border-[#FF8A3D]/20 bg-[#FF8A3D]/[0.06] px-3 py-1.5 text-[13px] text-[#FFB27A]">
            <Zap className="h-3.5 w-3.5" />
            10 free credits ready to use
          </div>

          <p className="mt-5 text-[13px] leading-relaxed text-[#C9CFDB]">
            We&apos;ll guide you through creating your first game asset in about 30 seconds.
          </p>

          <Link href="/generate?welcome=1" className={`${primaryBtnCls} mt-6`}>
            Start creating
            <ArrowRight className="h-4 w-4" />
          </Link>

          <p className="mt-4 font-mono text-[11px] text-[#7A8294]">
            Redirecting in <span className="tabular-nums text-[#FFB27A]">{countdown}</span>s
          </p>
        </div>
      </div>
    </div>
  );
}
