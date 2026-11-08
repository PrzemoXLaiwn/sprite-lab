"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Infinity as InfinityIcon } from "lucide-react";
import { CheckoutError, CreditChip, PageSpinner, SuccessShell } from "../../_components/checkout-ui";
import { paymentReturnToConfirm, reportServerPurchase } from "@/lib/analytics/purchase";
import { useFlushHeldPurchases } from "@/lib/analytics/use-flush-purchase";

function LifetimeSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const returning = paymentReturnToConfirm(searchParams);
  const deal = searchParams.get("deal") || "Lifetime";
  const [credits, setCredits] = useState(searchParams.get("credits") || "");
  const [countdown, setCountdown] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  useFlushHeldPurchases();

  // Lifetime sales stay paused. This only confirms a PaymentIntent that
  // already exists (a purchase made before the pause, or a redirect).
  useEffect(() => {
    if (!returning || started.current) return;
    started.current = true;
    fetch("/api/stripe/confirm-lifetime-purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId: returning.paymentIntentId }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof data.message === "string" ? data.message : data.error || "Payment not completed");
          return;
        }
        reportServerPurchase(data);
        if (data.credits != null) setCredits(String(data.credits));
      })
      .catch(() => setError("Payment not completed"));
  }, [returning]);

  useEffect(() => {
    if (error) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/generate");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [router, error]);

  if (error) return <CheckoutError message={error} />;

  return (
    <SuccessShell
      icon={<InfinityIcon className="h-7 w-7 text-[#FFA300]" />}
      title={`Welcome to ${deal}`}
      countdown={countdown}
      secondaryLinks={[
        { href: "/assets", label: "My assets" },
        { href: "/settings", label: "Account settings" },
      ]}
    >
      <p>Your lifetime access is now active.</p>
      <p>
        <CreditChip>{credits ? `+${credits} credits` : "Credits added"}</CreditChip>
        <span className="ml-2 text-[#9AA1CC]">added to your account</span>
      </p>
      {credits && (
        <p className="text-[#9AA1CC]">
          You&apos;ll receive <span className="font-mono text-[#C8CCE8]">{credits}</span> credits every month, forever.
        </p>
      )}
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
