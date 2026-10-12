"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CreditChip, PageSpinner, SuccessShell } from "../../_components/checkout-ui";

// Declare gtag for TypeScript
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// Credit pack prices in GBP for conversion tracking
const packPrices: Record<string, number> = {
  ember: 1.19,
  blaze: 2.99,
  inferno: 7.99,
  supernova: 19.99,
  "forge-lifetime": 49,
  "apex-lifetime": 99,
  "titan-lifetime": 249,
};

function SuccessContent() {
  const searchParams = useSearchParams();
  const credits = searchParams.get("credits") || "25";
  const packName = searchParams.get("pack") || "Credit Pack";
  const packId = searchParams.get("packId") || "";
  const sessionId = searchParams.get("session_id") || "";
  const priceParam = searchParams.get("price"); // Price passed from checkout
  const [countdown, setCountdown] = useState(5);
  const [conversionTracked, setConversionTracked] = useState(false);

  // Google Ads Conversion Tracking with retry
  useEffect(() => {
    if (conversionTracked) return;

    // Try to get price from URL param, then from packPrices, then default
    const value = priceParam
      ? parseFloat(priceParam)
      : packPrices[packId.toLowerCase()] || 1.19;

    const trackConversion = () => {
      if (typeof window !== "undefined" && window.gtag) {
        window.gtag("event", "conversion", {
          send_to: "AW-17802754923/dTASCOXAhtIbEOv2galC",
          value: value,
          currency: "GBP",
          transaction_id: sessionId,
        });
        console.log("[SpriteLab] Google Ads conversion tracked:", { value, sessionId });
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
  }, [packId, sessionId, priceParam, conversionTracked]);

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
      title="Credits added"
      countdown={countdown}
      secondaryLinks={[
        { href: "/assets", label: "My assets" },
        { href: "/pricing#credit-packs", label: "Buy more credits" },
      ]}
    >
      <p>
        <CreditChip>+{credits} credits</CreditChip>
      </p>
      <p className="text-[#8B93A5]">Your {packName} pack has been added to your account.</p>
    </SuccessShell>
  );
}

export default function CreditSuccessPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <SuccessContent />
    </Suspense>
  );
}
