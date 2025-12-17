"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Mail, Lock, Eye, EyeOff, Check } from "lucide-react";

// Declare gtag for TypeScript
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Enhanced password validation
  const passwordChecks = {
    length: password.length >= 8,
    maxLength: password.length <= 128,
    number: /\d/.test(password),
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    noSpaces: !/\s/.test(password),
    match: password === confirmPassword && password.length > 0,
  };

  // Check for common weak passwords
  const commonPasswords = [
    "password", "12345678", "qwerty123", "admin123", "letmein",
    "welcome1", "password1", "123456789", "iloveyou1", "sunshine1"
  ];
  const isCommonPassword = commonPasswords.some(p =>
    password.toLowerCase().includes(p)
  );

  const isPasswordStrong = passwordChecks.length && passwordChecks.number &&
    passwordChecks.uppercase && passwordChecks.lowercase &&
    passwordChecks.noSpaces && !isCommonPassword;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!passwordChecks.length) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (!passwordChecks.maxLength) {
      setError("Password is too long (max 128 characters)");
      return;
    }

    if (!passwordChecks.number) {
      setError("Password must contain at least one number");
      return;
    }

    if (!passwordChecks.uppercase || !passwordChecks.lowercase) {
      setError("Password must contain both uppercase and lowercase letters");
      return;
    }

    if (!passwordChecks.noSpaces) {
      setError("Password cannot contain spaces");
      return;
    }

    if (isCommonPassword) {
      setError("This password is too common. Please choose a stronger password.");
      return;
    }

    setLoading(true);
    setError("");

    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/generate`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Track sign_up event for Google Ads remarketing
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "sign_up", {
        method: "email",
        send_to: "AW-17802754923",
      });
      console.log("[SpriteLab] Sign up tracked for remarketing");
    }

    setSuccess(true);
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    // Track OAuth sign_up attempt for remarketing
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "sign_up", {
        method: "google",
        send_to: "AW-17802754923",
      });
    }

    const supabase = createClient();

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/generate`,
      },
    });
  };

  const handleDiscordLogin = async () => {
    // Track OAuth sign_up attempt for remarketing
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "sign_up", {
        method: "discord",
        send_to: "AW-17802754923",
      });
    }

    const supabase = createClient();

    await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/generate`,
      },
    });
  };

  if (success) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Check your email</h2>
        <p className="text-muted-foreground mb-6">
          We&apos;ve sent a confirmation link to <strong>{email}</strong>. 
          Click the link to activate your account.
        </p>
        <p className="text-sm text-muted-foreground">
          Didn&apos;t receive the email?{" "}
          <button
            onClick={() => {
              setSuccess(false);
              setEmail("");
              setPassword("");
              setConfirmPassword("");
            }}
            className="text-primary hover:underline"
          >
            Try again
          </button>
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Create your account</h2>
        <p className="text-muted-foreground">
          Start creating game assets in seconds
        </p>
      </div>

      {/* OAuth Buttons */}
      <div className="space-y-3 mb-6">
        <Button
          variant="outline"
          className="w-full h-11"
          onClick={handleGoogleLogin}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </Button>

        <Button
          variant="outline"
          className="w-full h-11"
          onClick={handleDiscordLogin}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
          </svg>
          Continue with Discord
        </Button>
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with email
          </span>
        </div>
      </div>

      {/* Email Form */}
      <form onSubmit={handleRegister} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-11"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10 h-11"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          
          {/* Password requirements */}
          <div className="space-y-1 text-xs">
            <div className={`flex items-center gap-2 ${passwordChecks.length ? "text-green-500" : "text-muted-foreground"}`}>
              <div className={`w-3 h-3 rounded-full border ${passwordChecks.length ? "bg-green-500 border-green-500" : "border-muted-foreground"}`} />
              At least 8 characters
            </div>
            <div className={`flex items-center gap-2 ${passwordChecks.number ? "text-green-500" : "text-muted-foreground"}`}>
              <div className={`w-3 h-3 rounded-full border ${passwordChecks.number ? "bg-green-500 border-green-500" : "border-muted-foreground"}`} />
              Contains a number
            </div>
            <div className={`flex items-center gap-2 ${passwordChecks.uppercase && passwordChecks.lowercase ? "text-green-500" : "text-muted-foreground"}`}>
              <div className={`w-3 h-3 rounded-full border ${passwordChecks.uppercase && passwordChecks.lowercase ? "bg-green-500 border-green-500" : "border-muted-foreground"}`} />
              Uppercase and lowercase letters
            </div>
            {password && isCommonPassword && (
              <div className="flex items-center gap-2 text-destructive">
                <div className="w-3 h-3 rounded-full border border-destructive" />
                Password is too common
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 h-11"
              required
            />
          </div>
          {confirmPassword && (
            <div className={`flex items-center gap-2 text-xs ${passwordChecks.match ? "text-green-500" : "text-destructive"}`}>
              <div className={`w-3 h-3 rounded-full border ${passwordChecks.match ? "bg-green-500 border-green-500" : "border-destructive"}`} />
              {passwordChecks.match ? "Passwords match" : "Passwords do not match"}
            </div>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-11 bg-gradient-to-r from-primary to-purple-500 hover:opacity-90"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Create account"
          )}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground mt-6">
        By creating an account, you agree to our{" "}
        <Link href="/terms" className="text-primary hover:underline">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-primary hover:underline">
          Privacy Policy
        </Link>
      </p>

      <p className="text-center text-sm text-muted-foreground mt-4">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
