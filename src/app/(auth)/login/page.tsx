"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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

/** Where to go after signing in: ?redirectTo= when it's a same-site path. */
function afterLogin(): string {
  if (typeof window === "undefined") return "/generate";
  const target = new URLSearchParams(window.location.search).get("redirectTo") ?? "";
  return target.startsWith("/") && !target.startsWith("//") && !target.startsWith("/\\") ? target : "/generate";
}

export default function LoginPage() {
  const router = useRouter();
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

    router.push(afterLogin());
    router.refresh();
  };

  const handleGoogleLogin = async () => {
    const supabase = createClient();

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(afterLogin())}`,
      },
    });
  };

  const handleDiscordLogin = async () => {
    const supabase = createClient();

    await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(afterLogin())}`,
      },
    });
  };

  return (
    <div>
      <AuthHeading title="Welcome back" subtitle="Sign in to keep creating game-ready sprites." />

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

      <p className="mt-6 text-center text-[13px] text-[#8B93A5]">
        Don&apos;t have an account?{" "}
        <Link href="/register" className={linkCls}>
          Sign up free
        </Link>
      </p>
    </div>
  );
}
