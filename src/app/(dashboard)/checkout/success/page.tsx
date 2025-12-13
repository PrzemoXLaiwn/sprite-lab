"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Sparkles, Rocket } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

const planNames: Record<string, string> = {
  STARTER: "Forge",
  PRO: "Apex",
  UNLIMITED: "Titan",
};

const planCredits: Record<string, number> = {
  STARTER: 75,
  PRO: 250,
  UNLIMITED: 750,
};

function SuccessContent() {
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan")?.toUpperCase() || "STARTER";
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = "/generate";
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold mb-2">Welcome to {planNames[plan] || "Your Plan"}!</h1>

          {/* Description */}
          <p className="text-muted-foreground mb-2">
            Your subscription is now active.
          </p>
          <p className="text-primary font-semibold mb-6">
            +{planCredits[plan] || 75} credits added to your account
          </p>

          {/* Countdown */}
          <p className="text-sm text-muted-foreground mb-6">
            Redirecting to generator in <span className="text-primary font-medium">{countdown}</span> seconds...
          </p>

          {/* CTA Button */}
          <Button asChild className="w-full bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 mb-4">
            <Link href="/generate">
              <Sparkles className="w-4 h-4 mr-2" />
              Start Creating
            </Link>
          </Button>

          {/* Secondary Links */}
          <div className="flex gap-4 justify-center text-sm">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
              Go to Dashboard
            </Link>
            <Link href="/pricing" className="text-muted-foreground hover:text-foreground">
              View Plans
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Rocket className="w-8 h-8 animate-pulse text-primary" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
