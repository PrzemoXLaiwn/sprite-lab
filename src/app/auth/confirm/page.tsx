"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function EmailConfirmedPage() {
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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full mx-4">
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold mb-2">Email Confirmed!</h1>

          {/* Description */}
          <p className="text-muted-foreground mb-6">
            Your account is now active. You have <span className="text-primary font-semibold">3 free credits</span> to start creating amazing game assets!
          </p>

          {/* Countdown */}
          <p className="text-sm text-muted-foreground mb-6">
            Redirecting to generator in <span className="text-primary font-medium">{countdown}</span> seconds...
          </p>

          {/* CTA Button */}
          <Button asChild className="w-full bg-gradient-to-r from-primary to-purple-500 hover:opacity-90">
            <Link href="/generate">
              <Sparkles className="w-4 h-4 mr-2" />
              Start Creating Now
            </Link>
          </Button>

          {/* Secondary Link */}
          <p className="mt-4 text-sm text-muted-foreground">
            or{" "}
            <Link href="/dashboard" className="text-primary hover:underline">
              go to dashboard
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
