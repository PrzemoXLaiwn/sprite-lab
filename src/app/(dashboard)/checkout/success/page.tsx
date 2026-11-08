"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CheckoutError, CreditChip, PageSpinner, SuccessShell } from "../_components/checkout-ui";
import { reportServerPurchase, subscriptionReturnToConfirm } from "@/lib/analytics/purchase";
import { useFlushHeldPurchases } from "@/lib/analytics/use-flush-purchase";

const planNames: Record<string, string> = {
  STARTER: "Starter",
  PRO: "Pro",
  UNLIMITED: "Studio",
};

const planCredits: Record<string, number> = {
  STARTER: 250,
  PRO: 500,
  UNLIMITED: 1200,
};

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const returning = subscriptionReturnToConfirm(searchParams);
  const plan = returning?.plan || searchParams.get("plan")?.toUpperCase() || "";
  const [countdown, setCountdown] = useState(5);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const confirmStarted = useRef(false);
  const confirmErrorRef = useRef<string | null>(null);
  useFlushHeldPurchases();
  useEffect(() => {
    confirmErrorRef.current = confirmError;
  }, [confirmError]);

  // A Stripe redirect (for example 3DS) lands here with a SetupIntent id.
  // redirect_status is not proof. The server confirms the SetupIntent, and
  // the purchase event uses only the receipt on that response.
  useEffect(() => {
    if (!returning || confirmStarted.current) return;
    confirmStarted.current = true;

    fetch("/api/stripe/confirm-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setupIntentId: returning.setupIntentId, plan: returning.plan }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setConfirmError(data.error || "Failed to activate subscription. Please contact support.");
          return;
        }
        reportServerPurchase(data);
      })
      .catch(() => setConfirmError("Failed to activate subscription. Please contact support."));
  }, [returning]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!confirmErrorRef.current) router.push("/generate");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

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
      {planCredits[plan] != null && (
        <p>
          <CreditChip>+{planCredits[plan]} credits</CreditChip>
          <span className="ml-2 text-[#9AA1CC]">added to your account</span>
        </p>
      )}
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
