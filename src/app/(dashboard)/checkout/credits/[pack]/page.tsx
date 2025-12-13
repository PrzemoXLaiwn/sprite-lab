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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Shield, CheckCircle, ArrowLeft, CreditCard, Coins } from "lucide-react";
import Link from "next/link";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Map URL-friendly names to internal pack codes
const PACK_URL_MAP: Record<string, string> = {
  ember: "PACK_25",
  "25": "PACK_25",
  blaze: "PACK_60",
  "60": "PACK_60",
  inferno: "PACK_150",
  "150": "PACK_150",
  supernova: "PACK_400",
  "400": "PACK_400",
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
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <h3 className="text-xl font-bold mb-2">Payment Successful!</h3>
        <p className="text-muted-foreground">
          +{packDetails.total} credits added to your account!
          {packDetails.bonus > 0 && (
            <span className="block text-green-500 text-sm mt-1">
              (includes {packDetails.bonus} bonus credits!)
            </span>
          )}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={!stripe || isLoading}
        className="w-full bg-gradient-to-r from-primary to-purple-500 hover:opacity-90"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Buy {packDetails.total} Credits - £{(packDetails.price / 100).toFixed(2)}
          </>
        )}
      </Button>

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Shield className="w-3 h-3" />
        <span>Secured by Stripe. One-time payment.</span>
      </div>
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button asChild variant="outline">
              <Link href="/pricing">Back to Pricing</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!clientSecret || !packDetails) {
    return null;
  }

  const appearance = {
    theme: "night" as const,
    variables: {
      colorPrimary: "#8B5CF6",
      colorBackground: "#0f0f0f",
      colorText: "#ffffff",
      colorDanger: "#ef4444",
      fontFamily: "system-ui, sans-serif",
      borderRadius: "8px",
      spacingUnit: "4px",
    },
    rules: {
      ".Input": {
        backgroundColor: "#1a1a1a",
        border: "1px solid #333",
      },
      ".Input:focus": {
        border: "1px solid #8B5CF6",
        boxShadow: "0 0 0 1px #8B5CF6",
      },
      ".Label": {
        color: "#a1a1aa",
      },
      ".Tab": {
        backgroundColor: "#1a1a1a",
        border: "1px solid #333",
      },
      ".Tab--selected": {
        backgroundColor: "#8B5CF6",
        borderColor: "#8B5CF6",
      },
    },
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-lg mx-auto">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to pricing
        </Link>

        {/* Pack Summary */}
        <Card className="mb-6 bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border-orange-500/20">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-orange-500" />
                {packDetails.name} Pack
              </span>
              <span className="text-2xl">£{(packDetails.price / 100).toFixed(2)}</span>
            </CardTitle>
            <CardDescription>
              <span className="block">{packDetails.credits} credits</span>
              {packDetails.bonus > 0 && (
                <span className="block text-green-500 font-medium">
                  +{packDetails.bonus} FREE bonus credits!
                </span>
              )}
              <span className="block text-primary font-semibold mt-1">
                = {packDetails.total} total credits
              </span>
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Payment Form */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
            <CardDescription>
              Enter your card information to purchase credits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance,
              }}
            >
              <CreditCheckoutForm pack={pack} packDetails={packDetails} />
            </Elements>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Credits never expire and can be used anytime.</p>
        </div>
      </div>
    </div>
  );
}
