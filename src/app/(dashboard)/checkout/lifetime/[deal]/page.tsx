"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Loader2, Infinity as InfinityIcon } from "lucide-react";
import {
  BTN_PRIMARY,
  stripeAppearance,
  PageSpinner,
  CheckoutError,
  CheckoutShell,
  SummaryCard,
  SummaryRow,
  FeatureList,
  FormError,
  SecureNote,
  InlineSuccess,
  CreditChip,
} from "../../_components/checkout-ui";

const BASE_PLAN_LABEL: Record<string, string> = {
  STARTER: "Starter",
  PRO: "Pro",
  UNLIMITED: "Studio",
};

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Map URL-friendly names to internal deal codes
const DEAL_URL_MAP: Record<string, string> = {
  starter_lifetime: "STARTER_LIFETIME",
  forge_lifetime: "STARTER_LIFETIME",
  forge: "STARTER_LIFETIME",
  pro_lifetime: "PRO_LIFETIME",
  apex_lifetime: "PRO_LIFETIME",
  apex: "PRO_LIFETIME",
  unlimited_lifetime: "UNLIMITED_LIFETIME",
  titan_lifetime: "UNLIMITED_LIFETIME",
  titan: "UNLIMITED_LIFETIME",
};

interface DealDetails {
  name: string;
  price: number;
  originalPrice: number;
  credits: number;
  basePlan: string;
}

function LifetimeCheckoutForm({ deal, dealDetails }: { deal: string; dealDetails: DealDetails }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error: submitError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/lifetime/success`,
        },
        redirect: "if_required",
      });

      if (submitError) {
        setError(submitError.message || "Payment failed");
        setIsLoading(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === "succeeded") {
        // Confirm the purchase on the server
        const response = await fetch("/api/stripe/confirm-lifetime-purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || data.error || "Failed to confirm purchase");
        }

        setSuccess(true);
        setTimeout(() => {
          router.push(`/checkout/lifetime/success?deal=${dealDetails.name}&credits=${dealDetails.credits}`);
        }, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <InlineSuccess title="Welcome to Lifetime access">
        <span className="font-mono text-[#FFB27A]">{dealDetails.credits} credits/month</span>, forever
      </InlineSuccess>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />

      {error && <FormError message={error} />}

      <button
        type="submit"
        disabled={!stripe || isLoading}
        className={`flex h-12 w-full items-center justify-center gap-2 text-[14px] ${BTN_PRIMARY}`}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing…
          </>
        ) : (
          <>
            Get lifetime access · <span className="font-mono">£{(dealDetails.price / 100).toFixed(0)}</span>
          </>
        )}
      </button>

      <SecureNote>Payments processed securely by Stripe. One-time payment, no recurring charges.</SecureNote>
    </form>
  );
}

export default function LifetimeCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const urlDeal = (params.deal as string)?.toLowerCase();
  const deal = DEAL_URL_MAP[urlDeal];

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [dealDetails, setDealDetails] = useState<DealDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!deal) {
      router.push("/pricing");
      return;
    }

    fetch("/api/stripe/create-lifetime-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deal }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          // Prefer the human-readable message (e.g. SOLD_OUT / ALREADY_LIFETIME).
          setError(data.message || data.error);
        } else {
          setClientSecret(data.clientSecret);
          setDealDetails(data.deal);
        }
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [deal, router]);


  if (loading) {
    return <PageSpinner />;
  }

  if (error) {
    return <CheckoutError message={error} />;
  }

  if (!clientSecret || !dealDetails) {
    return null;
  }

  const savings = Math.round((1 - dealDetails.price / dealDetails.originalPrice) * 100);
  const basePlanLabel = BASE_PLAN_LABEL[dealDetails.basePlan] ?? dealDetails.basePlan;

  return (
    <CheckoutShell
      title={dealDetails.name}
      subtitle="Pay once. No subscription, no renewals."
      summary={
        <>
          <SummaryCard highlight>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <InfinityIcon className="h-4 w-4 text-[#FF8A3D]" />
                <h2 className="font-display text-[18px] font-semibold text-white">{dealDetails.name}</h2>
              </div>
              <div className="flex flex-wrap justify-end gap-1.5">
                <span className="rounded-full border border-emerald-400/20 bg-emerald-500/[0.06] px-2.5 py-1 font-mono text-[11px] text-emerald-200">
                  Save {savings}%
                </span>
              </div>
            </div>
            <div className="mt-5 flex items-baseline gap-2">
              <span className="font-sans tracking-tight tabular-nums text-[32px] font-semibold leading-none text-white">
                £{(dealDetails.price / 100).toFixed(0)}
              </span>
              <span className="font-mono text-[12px] text-[#7A8294] line-through">
                £{(dealDetails.originalPrice / 100).toFixed(0)}
              </span>
              <span className="font-mono text-[12px] text-[#8B93A5]">one-time</span>
            </div>
            <div className="mt-3">
              <CreditChip>{dealDetails.credits} credits every month, forever</CreditChip>
            </div>
            <div className="mt-5 border-t border-white/[0.06] pt-2">
              <SummaryRow label="Plan features" value={basePlanLabel} />
              <SummaryRow label="Monthly credits" value={dealDetails.credits} />
              <SummaryRow label="Total" value={`£${(dealDetails.price / 100).toFixed(0)}`} strong />
            </div>
          </SummaryCard>

          <SummaryCard>
            <p className="mb-3 text-[13px] font-medium text-white">What you get</p>
            <FeatureList
              items={[
                `${dealDetails.credits} credits refreshed every month`,
                `All ${basePlanLabel} features included`,
                "No monthly payments, ever",
                "Locked-in price (immune to future price increases)",
              ]}
            />
          </SummaryCard>
        </>
      }
    >
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: stripeAppearance,
        }}
      >
        <LifetimeCheckoutForm deal={deal} dealDetails={dealDetails} />
      </Elements>
    </CheckoutShell>
  );
}
