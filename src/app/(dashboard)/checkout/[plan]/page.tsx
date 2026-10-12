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
import { Loader2 } from "lucide-react";
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
} from "../_components/checkout-ui";

// Load Stripe outside of component to avoid recreating on every render
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PlanDetails {
  name: string;
  price: number;
  credits: number;
  priceId: string;
}

function CheckoutForm({ plan, planDetails }: { plan: string; planDetails: PlanDetails }) {
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
      // Confirm the SetupIntent
      const { error: submitError, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          // If a redirect (e.g. 3DS) is needed, the success page finishes the
          // subscription using the setup_intent query param Stripe appends.
          return_url: `${window.location.origin}/checkout/success?plan=${encodeURIComponent(plan)}`,
        },
        redirect: "if_required",
      });

      if (submitError) {
        setError(submitError.message || "Payment failed");
        setIsLoading(false);
        return;
      }

      if (setupIntent && setupIntent.status === "succeeded") {
        // Create the subscription on the server
        const response = await fetch("/api/stripe/confirm-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            setupIntentId: setupIntent.id,
            plan: plan,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to create subscription");
        }

        // Track successful purchase for TikTok
        // TikTok tracking removed

        setSuccess(true);
        setTimeout(() => {
          router.push("/checkout/success?plan=" + plan);
        }, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return <InlineSuccess title="Payment successful">Your {planDetails.name} plan is being activated.</InlineSuccess>;
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
            Subscribe to {planDetails.name} · <span className="font-mono">£{planDetails.price}/month</span>
          </>
        )}
      </button>

      <SecureNote>Payments processed securely by Stripe. Cancel anytime.</SecureNote>
    </form>
  );
}

// Map URL-friendly names to internal plan codes
const PLAN_URL_MAP: Record<string, string> = {
  forge: "STARTER",
  starter: "STARTER",
  apex: "PRO",
  pro: "PRO",
  titan: "UNLIMITED",
  studio: "UNLIMITED",
  unlimited: "UNLIMITED",
};

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const urlPlan = (params.plan as string)?.toLowerCase();
  const plan = PLAN_URL_MAP[urlPlan] || urlPlan?.toUpperCase();

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [planDetails, setPlanDetails] = useState<PlanDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!plan || !["STARTER", "PRO", "UNLIMITED"].includes(plan)) {
      router.push("/pricing");
      return;
    }

    // Create SetupIntent
    fetch("/api/stripe/create-subscription-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setClientSecret(data.clientSecret);
          setPlanDetails(data.plan);
          // Track checkout initiation for TikTok
          // TikTok tracking removed
        }
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [plan, router]);


  if (loading) {
    return <PageSpinner />;
  }

  if (error) {
    return <CheckoutError message={error} />;
  }

  if (!clientSecret || !planDetails) {
    return null;
  }

  return (
    <CheckoutShell
      title={`Subscribe to ${planDetails.name}`}
      subtitle="Monthly subscription. Cancel anytime from your settings."
      summary={
        <>
          <SummaryCard highlight>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-[18px] font-semibold text-white">{planDetails.name} plan</h2>
                <p className="mt-0.5 text-[13px] text-[#8B93A5]">Billed monthly</p>
              </div>
              <CreditChip>{planDetails.credits} credits/mo</CreditChip>
            </div>
            <div className="mt-5 flex items-baseline gap-1.5">
              <span className="font-sans tracking-tight tabular-nums text-[32px] font-semibold leading-none text-white">£{planDetails.price}</span>
              <span className="font-mono text-[12px] text-[#8B93A5]">/month</span>
            </div>
            <div className="mt-5 border-t border-white/[0.06] pt-2">
              <SummaryRow label="Credits" value={`${planDetails.credits} / month`} />
              <SummaryRow label="Price" value={`£${planDetails.price} / month`} strong />
            </div>
          </SummaryCard>

          <SummaryCard>
            <p className="mb-3 text-[13px] font-medium text-white">Your subscription includes</p>
            <FeatureList
              items={[
                `${planDetails.credits} credits per month`,
                "All asset categories & art styles",
                "Background removal & editing tools",
                "Cancel anytime",
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
        <CheckoutForm plan={plan} planDetails={planDetails} />
      </Elements>
    </CheckoutShell>
  );
}
