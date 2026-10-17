"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { checkoutPurchaseLabel } from "@/lib/checkout-intent";
import { isCheckoutReturn, safeRedirectPath } from "@/lib/safe-redirect";
import {
  AuthHeading,
  DiscordButton,
  Field,
  GoogleButton,
  OrDivider,
  PasswordInput,
  PrimaryButton,
  StatusMessage,
  TextInput,
  linkCls,
} from "../_components/auth-ui";

function subscribeToSearch(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

export default function LoginPage() {
  const router = useRouter();
  // Read the query after hydration so /login still server-renders the form.
  // useSearchParams() would bail the whole page out to a client loading shell.
  const search = useSyncExternalStore(subscribeToSearch, () => window.location.search, () => "");
  const searchParams = new URLSearchParams(search);
  const returnPath = safeRedirectPath(searchParams.get("redirectTo"));
  const purchaseLabel = checkoutPurchaseLabel(searchParams.get("redirectTo"));
  const referralCode = searchParams.get("ref");
  const registerParams = new URLSearchParams();
  if (isCheckoutReturn(returnPath)) {
    registerParams.set("next", returnPath);
    if (referralCode) registerParams.set("ref", referralCode);
  }
  const registerHref = registerParams.size > 0 ? `/register?${registerParams}` : "/register";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push(returnPath);
    router.refresh();
  };

  const handleGoogleLogin = async () => {
    const supabase = createClient();

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?${new URLSearchParams({ next: returnPath })}`,
      },
    });
  };

  const handleDiscordLogin = async () => {
    const supabase = createClient();

    await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?${new URLSearchParams({ next: returnPath })}`,
      },
    });
  };

  return (
    <div>
      <AuthHeading title="Welcome back" subtitle="Sign in to keep creating game-ready sprites." />

      {purchaseLabel && (
        <p className="mb-6 rounded-xl border border-[#FFA300]/20 bg-[#FFA300]/[0.06] px-3.5 py-3 text-[13px] leading-relaxed text-[#FFC857]">
          Sign in to buy {purchaseLabel}.
        </p>
      )}

      <div className="space-y-2.5">
        <GoogleButton onClick={handleGoogleLogin} />
        <DiscordButton onClick={handleDiscordLogin} />
      </div>

      <OrDivider />

      <form onSubmit={handleLogin} className="space-y-4">
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

        <Field
          id="password"
          label="Password"
          aside={
            <Link href="/reset-password" className={`text-[12px] ${linkCls}`}>
              Forgot password?
            </Link>
          }
        >
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            visible={showPassword}
            onToggle={() => setShowPassword(!showPassword)}
            required
          />
        </Field>

        <PrimaryButton type="submit" disabled={loading} loading={loading} loadingText="Signing in..." className="mt-2">
          Sign in
        </PrimaryButton>
      </form>

      <p className="mt-6 text-center text-[13px] text-[#9AA1CC]">
        Don&apos;t have an account?{" "}
        <Link href={registerHref} className={linkCls}>
          Sign up free
        </Link>
      </p>
    </div>
  );
}
