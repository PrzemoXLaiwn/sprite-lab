"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  AuthHeading,
  Field,
  PasswordInput,
  PrimaryButton,
  RuleItem,
  StatusMessage,
  linkCls,
  primaryBtnCls,
} from "../_components/auth-ui";

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
      <div>
        <AuthHeading
          icon={<CheckCircle2 className="h-5 w-5" />}
          title="Password updated"
          subtitle="Your password has been changed. Redirecting you to sign in..."
        />
        <Link href="/login" className={primaryBtnCls}>
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <AuthHeading
        icon={<Lock className="h-5 w-5" />}
        title="Set a new password"
        subtitle="Choose a strong password you haven't used before."
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <StatusMessage>
            {error}
            {error.includes("expired") && (
              <Link href="/reset-password" className={`mt-1 block text-[12px] ${linkCls}`}>
                Request a new reset link
              </Link>
            )}
          </StatusMessage>
        )}

        <Field id="password" label="New password">
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
          {password.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5 pt-1.5">
              <RuleItem passed={passwordChecks.length}>8+ characters</RuleItem>
              <RuleItem passed={passwordChecks.uppercase}>Uppercase letter</RuleItem>
              <RuleItem passed={passwordChecks.lowercase}>Lowercase letter</RuleItem>
              <RuleItem passed={passwordChecks.number}>Number</RuleItem>
            </div>
          )}
        </Field>

        <Field id="confirmPassword" label="Confirm new password">
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {confirmPassword.length > 0 && (
            <div className="pt-1.5">
              <RuleItem passed={passwordChecks.match} tone={passwordChecks.match ? undefined : "error"}>
                {passwordChecks.match ? "Passwords match" : "Passwords don't match"}
              </RuleItem>
            </div>
          )}
        </Field>

        <PrimaryButton
          type="submit"
          disabled={isLoading || !isPasswordValid}
          loading={isLoading}
          loadingText="Updating password..."
          className="mt-2"
        >
          Update password
        </PrimaryButton>
      </form>
    </div>
  );
}
