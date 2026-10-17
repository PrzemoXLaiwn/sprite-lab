"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
import {
  STARTER_FIRST_MONTH_OFFER,
  starterCheckoutOfferLine,
  starterFirstMonthIntroGbp,
} from "@/config/starter-first-month";
import { track, FUNNEL } from "@/lib/analytics";

// Load Stripe outside of component to avoid recreating on every render
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PlanDetails {
  name: string;
  price: number;
  credits: number;
  priceId: string;
  firstMonthApplied: boolean;
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
      const successPath = planDetails.firstMonthApplied
        ? `/checkout/success?plan=${encodeURIComponent(plan)}&offer=${STARTER_FIRST_MONTH_OFFER}`
        : `/checkout/success?plan=${encodeURIComponent(plan)}`;

      // Confirm the SetupIntent
      const { error: submitError, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          // If a redirect (e.g. 3DS) is needed, the success page finishes the
          // subscription using the setup_intent query param Stripe appends.
          // The intro coupon itself is on the SetupIntent metadata, not this URL.
          return_url: `${window.location.origin}${successPath}`,
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
          router.push(successPath);
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
        className={`flex h-12 w-full items-center justify-center gap-2 px-3 text-center text-[14px] ${BTN_PRIMARY}`}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing…
          </>
        ) : (
          <>
            Subscribe to {planDetails.name} ·{" "}
            <span className="font-mono">
              {planDetails.firstMonthApplied ? `£${starterFirstMonthIntroGbp()} today` : `£${planDetails.price}/month`}
            </span>
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

function CheckoutPageInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlPlan = (params.plan as string)?.toLowerCase();
  const plan = PLAN_URL_MAP[urlPlan] || urlPlan?.toUpperCase();
  const offer = searchParams.get("offer") === STARTER_FIRST_MONTH_OFFER ? STARTER_FIRST_MONTH_OFFER : null;

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [planDetails, setPlanDetails] = useState<PlanDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const offerTracked = useRef(false);
  const requestKey = `${plan ?? ""}:${offer ?? ""}`;
  const [activeKey, setActiveKey] = useState(requestKey);
  // A new plan or offer must not keep the previous Payment Element on screen.
  if (activeKey !== requestKey) {
    setActiveKey(requestKey);
    setLoading(true);
    setError(null);
    setClientSecret(null);
    setPlanDetails(null);
  }

  useEffect(() => {
    if (!plan || !["STARTER", "PRO", "UNLIMITED"].includes(plan)) {
      router.push("/pricing");
      return;
    }

    let cancelled = false;

    // Create SetupIntent. `offer` is only the literal code — the server
    // decides eligibility and reads the coupon id from the environment.
    fetch("/api/stripe/create-subscription-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, ...(offer ? { offer } : {}) }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
        } else {
          const firstMonthApplied = data.firstMonthOffer?.applied === true;
          setClientSecret(data.clientSecret);
          setPlanDetails({ ...data.plan, firstMonthApplied });
          if (firstMonthApplied && !offerTracked.current) {
            offerTracked.current = true;
            track(FUNNEL.offerApplied, { offer: STARTER_FIRST_MONTH_OFFER, plan: "STARTER" });
          }
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [plan, router, offer]);


  if (loading) {
    return <PageSpinner />;
  }

  if (error) {
    return <CheckoutError message={error} />;
  }

  if (!clientSecret || !planDetails) {
    return null;
  }

  const offerApplied = planDetails.firstMonthApplied;

  return (
    <CheckoutShell
      title={`Subscribe to ${planDetails.name}`}
      subtitle={offerApplied ? "Cancel anytime from your settings." : "Monthly subscription. Cancel anytime from your settings."}
      summary={
        <>
          <SummaryCard highlight>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-[18px] font-semibold text-white">{planDetails.name} plan</h2>
                <p className="mt-0.5 text-[13px] text-[#9AA1CC]">{offerApplied ? "Cancel anytime" : "Billed monthly"}</p>
              </div>
              <CreditChip>{planDetails.credits} credits/mo</CreditChip>
            </div>
            {offerApplied ? (
              <p className="mt-5 font-sans text-[26px] font-semibold leading-tight tracking-tight text-white sm:text-[28px]">
                {starterCheckoutOfferLine()}
              </p>
            ) : (
              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="font-sans tracking-tight tabular-nums text-[32px] font-semibold leading-none text-white">£{planDetails.price}</span>
                <span className="font-mono text-[12px] text-[#9AA1CC]">/month</span>
              </div>
            )}
            <div className="mt-5 border-t border-white/[0.06] pt-2">
              <SummaryRow label="Credits" value={`${planDetails.credits} / month`} />
              {offerApplied ? (
                <>
                  <SummaryRow label="Today" value={`£${starterFirstMonthIntroGbp()}`} strong />
                  <SummaryRow label="Then" value={`£${planDetails.price} / month`} />
                </>
              ) : (
                <SummaryRow label="Price" value={`£${planDetails.price} / month`} strong />
              )}
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

export default function CheckoutPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <CheckoutPageInner />
    </Suspense>
  );
}
