"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Gift, MailCheck } from "lucide-react";
import {
  AuthHeading,
  DiscordButton,
  Field,
  GoogleButton,
  OrDivider,
  PasswordInput,
  PrimaryButton,
  RuleItem,
  StatusMessage,
  TextInput,
  linkCls,
  secondaryBtnCls,
} from "../_components/auth-ui";

// Declare gtag for TypeScript
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  // Check for referral code in URL
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      setReferralCode(ref.toUpperCase());
      // Store in sessionStorage for OAuth flows
      sessionStorage.setItem("referralCode", ref.toUpperCase());
    } else {
      // Check sessionStorage (in case of OAuth redirect)
      const storedRef = sessionStorage.getItem("referralCode");
      if (storedRef) {
        setReferralCode(storedRef);
      }
    }
  }, [searchParams]);

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
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/generate${referralCode ? `&ref=${referralCode}` : ""}`,
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
        redirectTo: `${window.location.origin}/auth/callback?next=/generate${referralCode ? `&ref=${referralCode}` : ""}`,
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
        redirectTo: `${window.location.origin}/auth/callback?next=/generate${referralCode ? `&ref=${referralCode}` : ""}`,
      },
    });
  };

  if (success) {
    return (
      <div>
        <AuthHeading
          icon={<MailCheck className="h-5 w-5" />}
          title="Check your email"
          subtitle={
            <>
              We&apos;ve sent a confirmation link to <span className="font-medium text-[#ECEEF3]">{email}</span>.
              Click the link to activate your account.
            </>
          }
        />
        <p className="text-[13px] text-[#8B93A5]">
          Didn&apos;t receive the email? Check your spam folder or{" "}
          <button
            type="button"
            onClick={() => {
              setSuccess(false);
              setEmail("");
              setPassword("");
              setConfirmPassword("");
            }}
            className={linkCls}
          >
            try again
          </button>
          .
        </p>
        <Link href="/login" className={`${secondaryBtnCls} mt-6`}>
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <AuthHeading title="Create your account" subtitle="Start with 10 free credits. No card required." />

      {/* Referral Code Banner */}
      {referralCode && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-[#FF8A3D]/20 bg-[#FF8A3D]/[0.06] px-3.5 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FF8A3D]/[0.12] text-[#FF8A3D]">
            <Gift className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-white">You&apos;ve been invited</p>
            <p className="text-[12px] text-[#8B93A5]">
              Code <span className="font-mono text-[#FFB27A]">{referralCode}</span> will be applied after signup
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2.5">
        <GoogleButton onClick={handleGoogleLogin} />
        <DiscordButton onClick={handleDiscordLogin} />
      </div>

      <OrDivider />

      <form onSubmit={handleRegister} className="space-y-4">
        {error && <StatusMessage>{error}</StatusMessage>}

        <Field id="email" label="Email">
          <TextInput
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>

        <Field id="password" label="Password">
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            visible={showPassword}
            onToggle={() => setShowPassword(!showPassword)}
            required
          />
          {/* Password requirements */}
          <div className="grid grid-cols-1 gap-1.5 pt-1.5 sm:grid-cols-2">
            <RuleItem passed={passwordChecks.length}>At least 8 characters</RuleItem>
            <RuleItem passed={passwordChecks.number}>Contains a number</RuleItem>
            <RuleItem passed={passwordChecks.uppercase && passwordChecks.lowercase}>Upper &amp; lowercase</RuleItem>
            {password && isCommonPassword && (
              <RuleItem passed={false} tone="error">Password is too common</RuleItem>
            )}
          </div>
        </Field>

        <Field id="confirmPassword" label="Confirm password">
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            visible={showPassword}
            onToggle={() => setShowPassword(!showPassword)}
            required
          />
          {confirmPassword && (
            <div className="pt-1.5">
              <RuleItem passed={passwordChecks.match} tone={passwordChecks.match ? undefined : "error"}>
                {passwordChecks.match ? "Passwords match" : "Passwords do not match"}
              </RuleItem>
            </div>
          )}
        </Field>

        <PrimaryButton type="submit" disabled={loading} loading={loading} loadingText="Creating account..." className="mt-2">
          Create account
        </PrimaryButton>
      </form>

      <p className="mt-5 text-center font-mono text-[11px] leading-relaxed text-[#7A8294]">
        By creating an account, you agree to our{" "}
        <Link href="/terms" className="text-[#C9CFDB] underline underline-offset-2 hover:text-white">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-[#C9CFDB] underline underline-offset-2 hover:text-white">
          Privacy Policy
        </Link>
      </p>

      <p className="mt-4 text-center text-[13px] text-[#8B93A5]">
        Already have an account?{" "}
        <Link href="/login" className={linkCls}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
