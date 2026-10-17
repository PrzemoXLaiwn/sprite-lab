"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CheckoutError, CreditChip, PageSpinner, SuccessShell } from "../_components/checkout-ui";
import { STARTER_FIRST_MONTH_OFFER, starterFirstMonthIntroGbp } from "@/config/starter-first-month";
import { PLAN_MONTHLY_CREDITS, PLAN_MONTHLY_PRICE_GBP } from "@/config/plan-features";

// Declare gtag for TypeScript
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// Plan name, credits and price for the receipt and the Google Ads conversion
// value. Credits and prices come from plan-features (the same numbers PLANS
// charges). The Starter intro price is applied below when the offer is on.
const planNames: Record<string, string> = {
  STARTER: "Starter",
  PRO: "Pro",
  UNLIMITED: "Studio",
};

const planCredits: Record<string, number> = {
  STARTER: PLAN_MONTHLY_CREDITS.STARTER,
  PRO: PLAN_MONTHLY_CREDITS.PRO,
  UNLIMITED: PLAN_MONTHLY_CREDITS.UNLIMITED,
};

const planPrices: Record<string, number> = {
  STARTER: PLAN_MONTHLY_PRICE_GBP.STARTER,
  PRO: PLAN_MONTHLY_PRICE_GBP.PRO,
  UNLIMITED: PLAN_MONTHLY_PRICE_GBP.UNLIMITED,
};

function SuccessContent() {
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan")?.toUpperCase() || "STARTER";
  const introOffer = searchParams.get("offer") === STARTER_FIRST_MONTH_OFFER && plan === "STARTER";
  const sessionId = searchParams.get("session_id") || "";
  const setupIntentId = searchParams.get("setup_intent");
  const redirectStatus = searchParams.get("redirect_status");
  const [countdown, setCountdown] = useState(5);
  const [conversionTracked, setConversionTracked] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const confirmStarted = useRef(false);
  const confirmErrorRef = useRef<string | null>(null);
  useEffect(() => {
    confirmErrorRef.current = confirmError;
  }, [confirmError]);

  // Returning from a Stripe redirect (e.g. 3DS) during subscription checkout:
  // the in-page confirm never ran, so create the subscription now. The API is
  // idempotent per SetupIntent, so a reload can't create a second one.
  useEffect(() => {
    if (!setupIntentId || redirectStatus !== "succeeded" || confirmStarted.current) return;
    confirmStarted.current = true;

    fetch("/api/stripe/confirm-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setupIntentId, plan }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setConfirmError(data.error || "Failed to activate subscription. Please contact support.");
        }
      })
      .catch(() => setConfirmError("Failed to activate subscription. Please contact support."));
  }, [setupIntentId, redirectStatus, plan]);

  // Google Ads Conversion Tracking with retry
  useEffect(() => {
    if (conversionTracked) return;

    const value = introOffer ? starterFirstMonthIntroGbp() : planPrices[plan] || 5.0;

    const trackConversion = () => {
      if (typeof window !== "undefined" && window.gtag) {
        window.gtag("event", "conversion", {
          send_to: "AW-17802754923/dTASCOXAhtIbEOv2galC",
          value: value,
          currency: "GBP",
          transaction_id: sessionId,
        });
        console.log("[SpriteLab] Google Ads conversion tracked:", { value, sessionId, plan });
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
  }, [plan, sessionId, conversionTracked, introOffer]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!confirmErrorRef.current) window.location.href = "/generate";
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (confirmError) {
    return <CheckoutError message={confirmError} />;
  }

  return (
    <SuccessShell
      title={`Welcome to ${planNames[plan] || "your plan"}`}
      countdown={countdown}
      secondaryLinks={[
        { href: "/assets", label: "My assets" },
        { href: "/pricing", label: "View plans" },
      ]}
    >
      <p>Your subscription is now active.</p>
      <p>
        <CreditChip>+{planCredits[plan] ?? 250} credits</CreditChip>
        <span className="ml-2 text-[#9AA1CC]">added to your account</span>
      </p>
    </SuccessShell>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <SuccessContent />
    </Suspense>
  );
}
