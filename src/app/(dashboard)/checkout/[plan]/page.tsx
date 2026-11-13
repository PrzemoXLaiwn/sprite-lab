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
  SecureNote,
  InlineSuccess,
  CreditChip,
} from "../_components/checkout-ui";
import {
  STARTER_FIRST_MONTH_OFFER,
  starterCheckoutOfferLine,
  starterFirstMonthIntroGbp,
} from "@/config/starter-first-month";
import { ANIMATION_FRAME_OPTIONS } from "@/config/animations";
import { fourFrameAnimationsPerMonth } from "@/config/animation-affordability";
import { FUNNEL } from "@/lib/analytics";
import { recordFunnel } from "@/lib/funnel-client";
import { track } from "@/lib/analytics";
import { reportServerPurchase } from "@/lib/analytics/purchase";
import { PaymentRecovery } from "@/components/billing/PaymentRecovery";

// Load Stripe outside of component to avoid recreating on every render
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PlanDetails {
  name: string;
  price: number;
  credits: number;
  firstMonthApplied: boolean;
}

function CheckoutForm({
  plan,
  planDetails,
  createIntent,
}: {
  plan: string;
  planDetails: PlanDetails;
  createIntent: () => Promise<string>;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardFailed, setCardFailed] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsLoading(true);
    setError(null);
    setCardFailed(false);

    try {
      // Validates the Payment Element. The SetupIntent is created after this,
      // so opening the page does not create one.
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || "Payment failed");
        setCardFailed(true);
        recordFunnel("payment_failed", { stage: "setup", plan });
        return;
      }

      const clientSecret = await createIntent();
      const successPath = planDetails.firstMonthApplied
        ? `/checkout/success?plan=${encodeURIComponent(plan)}&offer=${STARTER_FIRST_MONTH_OFFER}`
        : `/checkout/success?plan=${encodeURIComponent(plan)}`;

      const { error: confirmError, setupIntent } = await stripe.confirmSetup({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}${successPath}`,
        },
        redirect: "if_required",
      });

      if (confirmError) {
        setError(confirmError.message || "Payment failed");
        setCardFailed(true);
        recordFunnel("payment_failed", { stage: "setup", plan });
        return;
      }

      if (setupIntent && setupIntent.status === "succeeded") {
        const response = await fetch("/api/stripe/confirm-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            setupIntentId: setupIntent.id,
            plan,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 402) setCardFailed(true);
          throw new Error(data.error || "Failed to create subscription");
        }

        reportServerPurchase(data);
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
    <form onSubmit={handleSubmit} className="space-y-5" data-setup-intent="on-submit">
      <PaymentElement options={{ layout: "tabs" }} />

      {error && cardFailed ? (
        <PaymentRecovery message={error} onTryAnother={() => { setError(null); setCardFailed(false); }} />
      ) : error ? (
        <p role="alert" className="rounded-xl border border-red-400/20 bg-red-500/[0.06] px-3.5 py-2.5 text-[13px] text-red-200">{error}</p>
      ) : null}

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

  const [planDetails, setPlanDetails] = useState<PlanDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const offerTracked = useRef(false);
  const checkoutTracked = useRef<string | null>(null);
  const requestKey = `${plan ?? ""}:${offer ?? ""}`;
  const [activeKey, setActiveKey] = useState(requestKey);
  if (activeKey !== requestKey) {
    setActiveKey(requestKey);
    setLoading(true);
    setError(null);
    setPlanDetails(null);
  }

  useEffect(() => {
    if (!plan || !["STARTER", "PRO", "UNLIMITED"].includes(plan)) {
      router.push("/pricing");
      return;
    }

    let cancelled = false;
    const query = new URLSearchParams({ plan });
    if (offer) query.set("offer", offer);

    // Summary only. The SetupIntent is created in CheckoutForm on submit.
    fetch(`/api/stripe/plan-preview?${query.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
        } else {
          const firstMonthApplied = data.firstMonthApplied === true;
          setPlanDetails({ ...data.plan, firstMonthApplied });
          const trackKey = `${plan}:${offer ?? ""}`;
          if (checkoutTracked.current !== trackKey) {
            checkoutTracked.current = trackKey;
            recordFunnel("checkout_opened", { plan, kind: "subscription" });
          }
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

  const createIntent = async () => {
    const response = await fetch("/api/stripe/create-subscription-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, ...(offer ? { offer } : {}) }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || typeof data.clientSecret !== "string") {
      throw new Error(data.error || "Couldn't start the payment");
    }
    return data.clientSecret as string;
  };

  if (loading) return <PageSpinner />;
  if (error) return <CheckoutError message={error} />;
  if (!planDetails) return null;

  const offerApplied = planDetails.firstMonthApplied;
  const animations = fourFrameAnimationsPerMonth(planDetails.credits);

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
              <SummaryRow label="Commercial licence" value="Included" />
              <SummaryRow label="Animations" value={`About ${animations} / month`} />
              {offerApplied ? (
                <>
                  <SummaryRow label="Today" value={`£${starterFirstMonthIntroGbp()}`} strong />
                  <SummaryRow label="Then" value={`£${planDetails.price} / month`} />
                </>
              ) : (
                <SummaryRow label="Price" value={`£${planDetails.price} / month`} strong />
              )}
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-[#9AA1CC]">
              About {animations} four-frame animations a month, at {ANIMATION_FRAME_OPTIONS[0].credits} credits each. Smooth motion costs more.
            </p>
          </SummaryCard>

          <SummaryCard>
            <p className="mb-3 text-[13px] font-medium text-white">Your subscription includes</p>
            <FeatureList
              items={[
                `${planDetails.credits} credits per month`,
                "Commercial licence",
                `About ${animations} four-frame animations a month`,
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
          mode: "setup",
          currency: "gbp",
          appearance: stripeAppearance,
        }}
      >
        <CheckoutForm plan={plan} planDetails={planDetails} createIntent={createIntent} />
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
