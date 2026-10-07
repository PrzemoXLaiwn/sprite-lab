"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Infinity as InfinityIcon } from "lucide-react";
import { CreditChip, PageSpinner, SuccessShell } from "../../_components/checkout-ui";

// Declare gtag for TypeScript
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// Lifetime deal prices in GBP for conversion tracking
const dealPrices: Record<string, number> = {
  forge: 49,
  apex: 99,
  titan: 249,
};

function LifetimeSuccessContent() {
  const searchParams = useSearchParams();
  const deal = searchParams.get("deal") || "Lifetime";
  const credits = searchParams.get("credits") || "75";
  const dealId = searchParams.get("dealId") || "";
  const sessionId = searchParams.get("session_id") || "";
  const priceParam = searchParams.get("price");
  const [countdown, setCountdown] = useState(5);
  const [conversionTracked, setConversionTracked] = useState(false);

  // Google Ads Conversion Tracking with retry
  useEffect(() => {
    if (conversionTracked) return;

    // Try to get price from URL param, then from dealPrices, then default
    const value = priceParam
      ? parseFloat(priceParam)
      : dealPrices[dealId.toLowerCase()] || 49;

    const trackConversion = () => {
      if (typeof window !== "undefined" && window.gtag) {
        window.gtag("event", "conversion", {
          send_to: "AW-17802754923/dTASCOXAhtIbEOv2galC",
          value: value,
          currency: "GBP",
          transaction_id: sessionId,
        });
        console.log("[SpriteLab] Google Ads conversion tracked:", { value, sessionId, deal });
        setConversionTracked(true);
        return true;
      }
      return false;
    };

    // Try immediately
    if (trackConversion()) return;

    // Retry every 500ms for up to 5 seconds (gtag may not be loaded yet)
    let attempts = 0;
    const maxAttempts = 10;
    const interval = setInterval(() => {
      attempts++;
      if (trackConversion() || attempts >= maxAttempts) {
        clearInterval(interval);
        if (attempts >= maxAttempts) {
          console.warn("[SpriteLab] Could not track conversion - gtag not available");
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [dealId, sessionId, priceParam, conversionTracked, deal]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = "/generate";
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <SuccessShell
      icon={<InfinityIcon className="h-7 w-7 text-[#FF8A3D]" />}
      title={`Welcome to ${deal}`}
      countdown={countdown}
      secondaryLinks={[
        { href: "/assets", label: "My assets" },
        { href: "/settings", label: "Account settings" },
      ]}
    >
      <p>Your lifetime access is now active.</p>
      <p>
        <CreditChip>+{credits} credits</CreditChip>
        <span className="ml-2 text-[#8B93A5]">added to your account</span>
      </p>
      <p className="text-[#8B93A5]">
        You&apos;ll receive <span className="font-mono text-[#C9CFDB]">{credits}</span> credits every month, forever.
      </p>
    </SuccessShell>
  );
}

export default function LifetimeSuccessPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <LifetimeSuccessContent />
    </Suspense>
  );
}
