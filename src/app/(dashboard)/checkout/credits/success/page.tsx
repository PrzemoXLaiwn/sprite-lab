"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckoutError, CreditChip, PageSpinner, SuccessShell } from "../../_components/checkout-ui";
import { paymentReturnToConfirm, reportServerPurchase } from "@/lib/analytics/purchase";
import { useFlushHeldPurchases } from "@/lib/analytics/use-flush-purchase";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const returning = paymentReturnToConfirm(searchParams);
  const packName = searchParams.get("pack") || "Credit Pack";
  const [credits, setCredits] = useState(searchParams.get("credits") || "");
  const [countdown, setCountdown] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  useFlushHeldPurchases();

  // 3DS and other redirects append payment_intent. The server decides whether
  // it was paid and how much; a failed or canceled return has no receipt.
  useEffect(() => {
    if (!returning || started.current) return;
    started.current = true;
    fetch("/api/stripe/confirm-credit-purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId: returning.paymentIntentId }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : "Payment not completed");
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
      title="Credits added"
      countdown={countdown}
      secondaryLinks={[
        { href: "/assets", label: "My assets" },
        { href: "/pricing#credit-packs", label: "Buy more credits" },
      ]}
    >
      <p>
        <CreditChip>{credits ? `+${credits} credits` : "Credits added"}</CreditChip>
      </p>
      <p className="text-[#9AA1CC]">Your {packName} pack has been added to your account.</p>
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
