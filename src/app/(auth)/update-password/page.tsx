"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, CheckCircle, Loader2, AlertCircle, Eye, EyeOff, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Password validation
  const passwordChecks = {
    length: password.length >= 8,
    maxLength: password.length <= 128,
    number: /\d/.test(password),
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    match: password === confirmPassword && password.length > 0,
  };

  const isPasswordValid =
    passwordChecks.length &&
    passwordChecks.maxLength &&
    passwordChecks.number &&
    passwordChecks.uppercase &&
    passwordChecks.lowercase &&
    passwordChecks.match;

  // Check if user has a valid session (came from email link)
  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();

      // First, try to get session from URL hash (for direct recovery links)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Session error:", sessionError);
        setError("Invalid or expired reset link. Please request a new one.");
        return;
      }

      if (!session) {
        // No session means the reset link is invalid or expired
        setError("Invalid or expired reset link. Please request a new one.");
      }
    };

    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isPasswordValid) {
      setError("Please meet all password requirements.");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/login");
        }, 3000);
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

            <h1 className="text-2xl font-bold mb-2">Password updated!</h1>
            <p className="text-white/60 mb-6">
              Your password has been successfully updated. Redirecting you to login...
            </p>

            <Link href="/login">
              <Button className="w-full bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-black font-semibold">
                Go to login
              </Button>
            </Link>
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

        {/* Update Form */}
        <div className="bg-[#0a0a0f]/80 border border-white/10 rounded-2xl p-8 backdrop-blur-xl">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-full bg-[#00d4ff]/20 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-[#00d4ff]" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Set new password</h1>
            <p className="text-white/60">
              Enter your new password below.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex flex-col gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
                {error.includes("expired") && (
                  <Link
                    href="/reset-password"
                    className="text-[#00ff88] hover:underline text-xs mt-1"
                  >
                    Request a new reset link →
                  </Link>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white/5 border-white/10 focus:border-[#00ff88]/50 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Password requirements */}
            {password.length > 0 && (
              <div className="space-y-2 p-3 rounded-lg bg-white/5 border border-white/10">
                <p className="text-xs text-white/60 font-medium mb-2">Password requirements:</p>
                <div className="grid grid-cols-2 gap-2">
                  <PasswordCheck passed={passwordChecks.length} label="8+ characters" />
                  <PasswordCheck passed={passwordChecks.uppercase} label="Uppercase letter" />
                  <PasswordCheck passed={passwordChecks.lowercase} label="Lowercase letter" />
                  <PasswordCheck passed={passwordChecks.number} label="Number" />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="bg-white/5 border-white/10 focus:border-[#00ff88]/50"
              />
              {confirmPassword.length > 0 && (
                <div className="flex items-center gap-1.5 mt-1">
                  {passwordChecks.match ? (
                    <Check className="w-3.5 h-3.5 text-[#00ff88]" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-red-400" />
                  )}
                  <span className={`text-xs ${passwordChecks.match ? "text-[#00ff88]" : "text-red-400"}`}>
                    {passwordChecks.match ? "Passwords match" : "Passwords don't match"}
                  </span>
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-black font-semibold hover:opacity-90"
              disabled={isLoading || !isPasswordValid}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating password...
                </>
              ) : (
                "Update password"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function PasswordCheck({ passed, label }: { passed: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {passed ? (
        <Check className="w-3.5 h-3.5 text-[#00ff88]" />
      ) : (
        <X className="w-3.5 h-3.5 text-white/30" />
      )}
      <span className={`text-xs ${passed ? "text-[#00ff88]" : "text-white/40"}`}>{label}</span>
    </div>
  );
}
