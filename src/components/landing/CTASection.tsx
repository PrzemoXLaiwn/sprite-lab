"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, ArrowRight, Check, Loader2 } from "lucide-react";

export function CTASection() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) return;
    
    setStatus("loading");
    
    // Simulating API call - replace with actual waitlist API
    try {
      // In production, this would be an API call to save the email
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStatus("success");
      setMessage("You're on the list! We'll notify you when we launch.");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-primary/10 to-primary/5" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-3xl" />
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center mx-auto mb-8 animate-pulse-glow">
          <Sparkles className="w-8 h-8 text-white" />
        </div>

        {/* Headline */}
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
          Ready to Transform Your
          <span className="gradient-text"> Game Development?</span>
        </h2>

        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Join thousands of indie developers who are already creating stunning game assets 
          in seconds. Start with 5 free credits - no credit card required.
        </p>

        {/* Email Form */}
        <form onSubmit={handleSubmit} className="max-w-md mx-auto mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 bg-background/50 border-primary/20 focus:border-primary"
              disabled={status === "loading" || status === "success"}
            />
            <Button
              type="submit"
              size="lg"
              className="bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 h-12 px-8"
              disabled={status === "loading" || status === "success"}
            >
              {status === "loading" ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : status === "success" ? (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Joined!
                </>
              ) : (
                <>
                  Get Early Access
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </div>
          
          {message && (
            <p className={`mt-3 text-sm ${status === "success" ? "text-green-500" : "text-red-500"}`}>
              {message}
            </p>
          )}
        </form>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            <span>No credit card required</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            <span>5 free credits on signup</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            <span>Cancel anytime</span>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: "500+", label: "Assets Generated" },
            { value: "~5s", label: "Avg Generation Time" },
            { value: "£0.02", label: "Per Asset" },
            { value: "100%", label: "Commercial License" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold gradient-text">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
