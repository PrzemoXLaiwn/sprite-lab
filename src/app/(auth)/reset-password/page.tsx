"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-[#0a0a0f]/80 border border-white/10 rounded-2xl p-8 backdrop-blur-xl text-center">
            <div className="w-16 h-16 rounded-full bg-[#00ff88]/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-[#00ff88]" />
            </div>

            <h1 className="text-2xl font-bold mb-2">Check your email</h1>
            <p className="text-white/60 mb-6">
              We sent a password reset link to <span className="text-white font-medium">{email}</span>
            </p>

            <div className="space-y-4">
              <p className="text-sm text-white/40">
                Didn&apos;t receive the email? Check your spam folder or try again.
              </p>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setSuccess(false)}
              >
                Try another email
              </Button>

              <Link href="/login">
                <Button variant="ghost" className="w-full text-white/60">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-8 group">
          <div className="relative">
            <div className="absolute inset-0 bg-[#00ff88]/30 rounded-lg blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
            <Image src="/logo.png" alt="SpriteLab" width={40} height={40} className="relative" />
          </div>
          <span className="font-display font-bold text-2xl tracking-tight">
            Sprite<span className="text-[#00ff88]">Lab</span>
          </span>
        </Link>

        {/* Reset Form */}
        <div className="bg-[#0a0a0f]/80 border border-white/10 rounded-2xl p-8 backdrop-blur-xl">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-full bg-[#00d4ff]/20 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-[#00d4ff]" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Reset your password</h1>
            <p className="text-white/60">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/5 border-white/10 focus:border-[#00ff88]/50"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-black font-semibold hover:opacity-90"
              disabled={isLoading || !email}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending link...
                </>
              ) : (
                "Send reset link"
              )}
            </Button>

            <div className="text-center">
              <Link
                href="/login"
                className="text-sm text-white/60 hover:text-white transition-colors inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </Link>
            </div>
          </form>
        </div>

        {/* Help text */}
        <p className="text-center text-white/40 text-sm mt-6">
          Remember your password?{" "}
          <Link href="/login" className="text-[#00ff88] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
