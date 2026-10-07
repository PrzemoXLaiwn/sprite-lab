"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  AuthHeading,
  Field,
  PrimaryButton,
  StatusMessage,
  TextInput,
  linkCls,
  secondaryBtnCls,
} from "../_components/auth-ui";

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
      <div>
        <AuthHeading
          icon={<MailCheck className="h-5 w-5" />}
          title="Check your email"
          subtitle={
            <>
              We sent a password reset link to <span className="font-medium text-[#ECEEF3]">{email}</span>.
            </>
          }
        />
        <p className="font-mono text-[11px] leading-relaxed text-[#7A8294]">
          Didn&apos;t receive it? Check your spam folder or try again.
        </p>
        <div className="mt-6 space-y-2.5">
          <button type="button" className={secondaryBtnCls} onClick={() => setSuccess(false)}>
            Try another email
          </button>
          <Link
            href="/login"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[14px] text-[#8B93A5] transition-colors hover:bg-white/[0.04] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/login"
        className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-[#8B93A5] transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </Link>

      <AuthHeading
        icon={<KeyRound className="h-5 w-5" />}
        title="Reset your password"
        subtitle="Enter your email and we'll send you a link to reset your password."
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <StatusMessage>{error}</StatusMessage>}

        <Field id="email" label="Email address">
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

        <PrimaryButton
          type="submit"
          disabled={isLoading || !email}
          loading={isLoading}
          loadingText="Sending link..."
          className="mt-2"
        >
          Send reset link
        </PrimaryButton>
      </form>

      <p className="mt-6 text-center text-[13px] text-[#8B93A5]">
        Remember your password?{" "}
        <Link href="/login" className={linkCls}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
