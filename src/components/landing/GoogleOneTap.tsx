"use client";

import { useCallback, useEffect, useRef } from "react";
import Script from "next/script";
import { createClient } from "@/lib/supabase/client";
import { track, FUNNEL } from "@/lib/analytics";

// Google Identity Services — just the parts we call (no extra dependency).
interface GsiCredentialResponse {
  credential: string;
}
interface GsiIdApi {
  initialize(config: {
    client_id: string;
    callback: (response: GsiCredentialResponse) => void;
    nonce?: string;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    itp_support?: boolean;
    use_fedcm_for_prompt?: boolean;
    context?: "signin" | "signup" | "use";
  }): void;
  prompt(): void;
  cancel(): void;
}
declare global {
  interface Window {
    google?: { accounts?: { id?: GsiIdApi } };
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

/** An account created this recently is treated as a new signup. */
const NEW_ACCOUNT_WINDOW_MS = 2 * 60 * 1000;

/**
 * Raw nonce for Supabase, SHA-256 hex of it for Google: Supabase hashes the
 * raw value and compares it with the `nonce` claim in Google's ID token.
 */
async function createNonce(): Promise<{ raw: string; hashed: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const raw = btoa(String.fromCharCode(...bytes));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return { raw, hashed };
}

/**
 * Google One Tap for signed-out visitors on the landing page. Renders nothing
 * (and loads no script) unless NEXT_PUBLIC_GOOGLE_CLIENT_ID is set. On
 * success the visitor goes where a normal Google sign-in goes: /auth/confirm
 * for a brand-new account, /generate otherwise.
 */
export function GoogleOneTap() {
  const started = useRef(false);

  const init = useCallback(async () => {
    const gsi = window.google?.accounts?.id;
    if (!gsi || started.current) return;
    started.current = true;

    try {
      const supabase = createClient();
      // Already signed in in another tab — nothing to offer.
      const { data: { session } } = await supabase.auth.getSession();
      if (session) return;

      const nonce = await createNonce();
      gsi.initialize({
        client_id: CLIENT_ID,
        nonce: nonce.hashed,
        use_fedcm_for_prompt: true,
        itp_support: true,
        cancel_on_tap_outside: true,
        context: "signup",
        callback: async (response) => {
          try {
            const { data, error } = await supabase.auth.signInWithIdToken({
              provider: "google",
              token: response.credential,
              nonce: nonce.raw,
            });
            if (error || !data.user) throw error ?? new Error("No user");
            // Same account setup as the normal Google button (/auth/callback):
            // profile row, referral code from ?ref=, welcome email for new accounts.
            const ref = new URLSearchParams(window.location.search).get("ref");
            const sync = await fetch("/api/auth/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ref }) })
              .then((r) => (r.ok ? r.json() : null))
              .catch(() => null);
            const createdAt = Date.parse(data.user.created_at);
            const isNew = sync?.isNewUser === true || (Number.isFinite(createdAt) && Date.now() - createdAt < NEW_ACCOUNT_WINDOW_MS);
            track(FUNNEL.oneTapSignIn, { isNew });
            if (isNew && window.gtag) {
              window.gtag("event", "sign_up", { method: "google_one_tap", send_to: "AW-17802754923" });
            }
            window.location.href = isNew ? "/auth/confirm" : "/generate";
          } catch (err) {
            // The regular "Sign up" buttons still work; don't interrupt the visitor.
            console.error("[OneTap] sign-in failed:", err instanceof Error ? err.message : err);
          }
        },
      });
      gsi.prompt();
    } catch (err) {
      console.error("[OneTap] init failed:", err instanceof Error ? err.message : err);
    }
  }, []);

  useEffect(() => {
    // Client-side navigation back to the page: the script is already loaded.
    if (CLIENT_ID && window.google?.accounts?.id) void init();
    return () => {
      try {
        window.google?.accounts?.id?.cancel();
      } catch {
        /* ignore */
      }
      started.current = false;
    };
  }, [init]);

  if (!CLIENT_ID) return null;
  return (
    <Script
      src="https://accounts.google.com/gsi/client"
      strategy="afterInteractive"
      onReady={() => void init()}
    />
  );
}
