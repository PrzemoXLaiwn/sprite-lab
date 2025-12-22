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
import { Loader2, Shield, CheckCircle, ArrowLeft, CreditCard } from "lucide-react";
import Link from "next/link";
import { trackCheckoutStart, trackPurchase } from "@/lib/tiktok";

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
          return_url: `${window.location.origin}/checkout/success`,
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
        trackPurchase(planDetails.name, planDetails.price);

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
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <h3 className="text-xl font-bold mb-2">Payment Successful!</h3>
        <p className="text-muted-foreground">Redirecting to your dashboard...</p>
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
            Subscribe to {planDetails.name} - £{planDetails.price}/month
          </>
        )}
      </Button>

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Shield className="w-3 h-3" />
        <span>Secured by Stripe. Cancel anytime.</span>
      </div>
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
          trackCheckoutStart(data.plan.name, data.plan.price);
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

  if (!clientSecret || !planDetails) {
    return null;
  }

  // Stripe Elements appearance customization
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
        {/* Back Link */}
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to pricing
        </Link>

        {/* Plan Summary */}
        <Card className="mb-6 bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{planDetails.name} Plan</span>
              <span className="text-2xl">£{planDetails.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></span>
            </CardTitle>
            <CardDescription>
              {planDetails.credits} credits per month
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Payment Form */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
            <CardDescription>
              Enter your card information to start your subscription
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
              <CheckoutForm plan={plan} planDetails={planDetails} />
            </Elements>
          </CardContent>
        </Card>

        {/* Features reminder */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Your subscription includes:</p>
          <ul className="mt-2 space-y-1">
            <li>• {planDetails.credits} credits per month</li>
            <li>• All asset categories & art styles</li>
            <li>• Background removal & editing tools</li>
            <li>• Cancel anytime</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
