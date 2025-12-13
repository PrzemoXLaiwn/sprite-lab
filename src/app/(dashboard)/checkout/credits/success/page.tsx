"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Sparkles, Coins } from "lucide-react";
import Link from "next/link";

function SuccessContent() {
  const searchParams = useSearchParams();
  const credits = searchParams.get("credits") || "25";
  const packName = searchParams.get("pack") || "Credit Pack";
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
          <h1 className="text-2xl font-bold mb-2">Credits Added!</h1>

          {/* Description */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <Coins className="w-5 h-5 text-orange-500" />
            <span className="text-lg font-semibold text-orange-500">+{credits} credits</span>
          </div>
          <p className="text-muted-foreground mb-6">
            Your {packName} pack has been added to your account.
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
              Buy More Credits
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CreditSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Coins className="w-8 h-8 animate-pulse text-orange-500" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
