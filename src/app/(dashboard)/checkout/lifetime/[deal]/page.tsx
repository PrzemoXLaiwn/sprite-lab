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
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, CheckCircle, ArrowLeft, CreditCard, Sparkles, Infinity } from "lucide-react";
import Link from "next/link";

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
          throw new Error(data.error || "Failed to confirm purchase");
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
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <h3 className="text-xl font-bold mb-2">Welcome to Lifetime Access!</h3>
        <p className="text-muted-foreground">
          {dealDetails.credits} credits/month forever!
        </p>
      </div>
    );
  }

  const savings = Math.round((1 - dealDetails.price / dealDetails.originalPrice) * 100);

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
        className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold hover:opacity-90"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Get Lifetime Access - £{(dealDetails.price / 100).toFixed(0)}
          </>
        )}
      </Button>

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Shield className="w-3 h-3" />
        <span>Secured by Stripe. One-time payment. No recurring charges.</span>
      </div>
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
          setError(data.error);
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

  if (!clientSecret || !dealDetails) {
    return null;
  }

  const savings = Math.round((1 - dealDetails.price / dealDetails.originalPrice) * 100);

  const appearance = {
    theme: "night" as const,
    variables: {
      colorPrimary: "#EAB308",
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
        border: "1px solid #EAB308",
        boxShadow: "0 0 0 1px #EAB308",
      },
      ".Label": {
        color: "#a1a1aa",
      },
      ".Tab": {
        backgroundColor: "#1a1a1a",
        border: "1px solid #333",
      },
      ".Tab--selected": {
        backgroundColor: "#EAB308",
        borderColor: "#EAB308",
        color: "#000000",
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

        {/* Deal Summary */}
        <Card className="mb-6 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                Save {savings}%
              </Badge>
              <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
                <Infinity className="w-3 h-3 mr-1" />
                Lifetime
              </Badge>
            </div>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                {dealDetails.name}
              </span>
            </CardTitle>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-lg text-muted-foreground line-through">
                £{(dealDetails.originalPrice / 100).toFixed(0)}
              </span>
              <span className="text-3xl font-bold text-yellow-500">
                £{(dealDetails.price / 100).toFixed(0)}
              </span>
              <span className="text-muted-foreground">one-time</span>
            </div>
            <CardDescription className="mt-3">
              <span className="block text-primary font-semibold text-lg">
                {dealDetails.credits} credits every month, forever!
              </span>
              <span className="block text-sm mt-1">
                No subscription. No renewals. Just pay once and enjoy forever.
              </span>
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Payment Form */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
            <CardDescription>
              Enter your card information to get lifetime access
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
              <LifetimeCheckoutForm deal={deal} dealDetails={dealDetails} />
            </Elements>
          </CardContent>
        </Card>

        {/* Benefits */}
        <div className="mt-6 p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
          <h4 className="font-semibold text-yellow-500 mb-3">What you get:</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              {dealDetails.credits} credits refreshed every month
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              All {dealDetails.basePlan === "STARTER" ? "Forge" : dealDetails.basePlan === "PRO" ? "Apex" : "Titan"} features included
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              No monthly payments, ever
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Locked-in price (immune to future price increases)
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
