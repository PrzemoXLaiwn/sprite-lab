"use client";

import { ArrowRight, CheckCircle2, Zap } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { primaryBtnCls } from "@/app/(auth)/_components/auth-ui";
import { track, FUNNEL } from "@/lib/analytics";
import { SIGNUP_CREDITS } from "@/config/signup";
import { isCheckoutReturn, safeRedirectPath } from "@/lib/safe-redirect";

export default function EmailConfirmedPage() {
  const searchParams = useSearchParams();
  const next = safeRedirectPath(searchParams.get("next"));
  const destination = isCheckoutReturn(next) ? next : "/generate?welcome=1";
  const [countdown, setCountdown] = useState(5);

  // Only brand-new accounts land here (email confirmation, or first OAuth
  // sign-in via /auth/callback), so this is the completed-signup conversion.
  useEffect(() => {
    track(FUNNEL.signupComplete);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = destination;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [destination]);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#131A31] px-4 py-10 text-[#FFF1E8]">
      <div className="pixel-grid pointer-events-none absolute inset-0" />

      <div className="relative w-full max-w-[400px]">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <Image src="/logo.png" alt="SpriteLab" width={28} height={28} priority />
          <span className="font-display text-[17px] font-semibold text-white">
            Sprite<span className="text-[#FFA300]">Lab</span>
          </span>
        </Link>

        <div className="rounded-2xl border border-white/[0.06] bg-[#19223F] p-7 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/[0.06] text-emerald-300">
            <CheckCircle2 className="h-6 w-6" />
          </div>

          <h1 className="font-display text-[24px] font-semibold text-white">You&apos;re in</h1>
          <p className="mt-2 text-[14px] text-[#9AA1CC]">Your email is confirmed and your account is active.</p>

          <div className="mt-5 inline-flex items-center gap-2 rounded-lg border border-[#FFA300]/20 bg-[#FFA300]/[0.06] px-3 py-1.5 text-[13px] text-[#FFC857]">
            <Zap className="h-3.5 w-3.5" />
            {SIGNUP_CREDITS} free credits ready to use
          </div>

          <p className="mt-5 text-[13px] leading-relaxed text-[#C8CCE8]">
            We&apos;ll guide you through creating your first game asset in about 30 seconds.
          </p>

          <Link href={destination} className={`${primaryBtnCls} mt-6`}>
            {isCheckoutReturn(next) ? "Continue to checkout" : "Start creating"}
            <ArrowRight className="h-4 w-4" />
          </Link>

          <p className="mt-4 font-mono text-[11px] text-[#8A92BF]">
            Redirecting in <span className="tabular-nums text-[#FFC857]">{countdown}</span>s
          </p>
        </div>
      </div>
    </div>
  );
}
