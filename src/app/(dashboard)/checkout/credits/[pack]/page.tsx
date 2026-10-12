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
import { Loader2, Coins } from "lucide-react";
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

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Map URL-friendly names to internal pack codes
const PACK_URL_MAP: Record<string, string> = {
  ember: "PACK_25",
  "25": "PACK_25",
  blaze: "PACK_75",
  "75": "PACK_75",
  inferno: "PACK_200",
  "200": "PACK_200",
  supernova: "PACK_500",
  "500": "PACK_500",
};

interface PackDetails {
  name: string;
  price: number;
  credits: number;
  bonus: number;
  total: number;
}

function CreditCheckoutForm({ pack, packDetails }: { pack: string; packDetails: PackDetails }) {
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
          return_url: `${window.location.origin}/checkout/credits/success`,
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
        const response = await fetch("/api/stripe/confirm-credit-purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to confirm purchase");
        }

        setSuccess(true);
        setTimeout(() => {
          router.push(`/checkout/credits/success?credits=${packDetails.credits}&pack=${packDetails.name}`);
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
      <InlineSuccess title="Payment successful">
        <span className="font-mono text-[#FFB27A]">+{packDetails.total} credits</span> added to your account
        {packDetails.bonus > 0 && (
          <span className="mt-1 block text-[12px] text-emerald-200">Includes {packDetails.bonus} bonus credits</span>
        )}
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
            Buy {packDetails.total} credits · <span className="font-mono">£{(packDetails.price / 100).toFixed(2)}</span>
          </>
        )}
      </button>

      <SecureNote>Payments processed securely by Stripe. One-time payment.</SecureNote>
    </form>
  );
}

export default function CreditPackCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const urlPack = (params.pack as string)?.toLowerCase();
  const pack = PACK_URL_MAP[urlPack];

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [packDetails, setPackDetails] = useState<PackDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pack) {
      router.push("/pricing");
      return;
    }

    fetch("/api/stripe/create-credit-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pack }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setClientSecret(data.clientSecret);
          setPackDetails(data.pack);
        }
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [pack, router]);

  if (loading) {
    return <PageSpinner />;
  }

  if (error) {
    return <CheckoutError message={error} />;
  }

  if (!clientSecret || !packDetails) {
    return null;
  }

  const priceLabel = `£${(packDetails.price / 100).toFixed(2)}`;

  return (
    <CheckoutShell
      title={`${packDetails.name} credit pack`}
      subtitle="One-time purchase. No subscription."
      summary={
        <>
          <SummaryCard highlight>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-[#FF8A3D]" />
                <h2 className="font-display text-[18px] font-semibold text-white">{packDetails.name} pack</h2>
              </div>
              <CreditChip>{packDetails.total} credits</CreditChip>
            </div>
            <div className="mt-5 flex items-baseline gap-1.5">
              <span className="font-sans tracking-tight tabular-nums text-[32px] font-semibold leading-none text-white">{priceLabel}</span>
              <span className="font-mono text-[12px] text-[#8B93A5]">one-time</span>
            </div>
            <div className="mt-5 border-t border-white/[0.06] pt-2">
              <SummaryRow label="Credits" value={packDetails.credits} />
              {packDetails.bonus > 0 && (
                <SummaryRow
                  label={<span className="text-emerald-200">Bonus credits</span>}
                  value={<span className="text-emerald-200">+{packDetails.bonus}</span>}
                />
              )}
              <SummaryRow label="Total credits" value={packDetails.total} strong />
            </div>
          </SummaryCard>

          <SummaryCard>
            <FeatureList items={["Credits never expire", "Use them anytime", "One-time payment — no renewals"]} />
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
        <CreditCheckoutForm pack={pack} packDetails={packDetails} />
      </Elements>
    </CheckoutShell>
  );
}
