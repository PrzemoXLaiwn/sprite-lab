"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { track, FUNNEL } from "@/lib/analytics";
import { toast } from "@/components/ui/use-toast";

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
  prompt(momentListener?: (moment: {
    isNotDisplayed(): boolean;
    getNotDisplayedReason(): string;
    isSkippedMoment(): boolean;
    getSkippedReason(): string;
  }) => void): void;
  cancel(): void;
}
declare global {
  interface Window {
    google?: { accounts?: { id?: GsiIdApi } };
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const GSI_SRC = "https://accounts.google.com/gsi/client";
/** Portrait phones. The One Tap prompt covers a large slice of that first screen. */
const SMALL_SCREEN_QUERY = "(max-width: 767px)";
const BLOCKED_PREFIXES = ["/login", "/register", "/auth", "/reset-password", "/update-password"];

function oneTapAllowed(pathname: string): boolean {
  return !BLOCKED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

let gsiPromise: Promise<void> | null = null;

function loadGsi(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gsiPromise) return gsiPromise;
  gsiPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    script.dataset.slGsi = "1";
    script.onload = () => resolve();
    script.onerror = () => {
      gsiPromise = null;
      reject(new Error("gsi failed"));
    };
    document.body.appendChild(script);
  });
  return gsiPromise;
}

const SYNC_RETRY_DELAYS_MS = [0, 400, 1200];

/**
 * Profile + referral. Retries transient failures so a dropped response does
 * not lose the referral. 401/403/429 are not retried.
 */
async function syncAccount(ref: string | null): Promise<{ isNewUser: boolean }> {
  let lastStatus = 0;
  for (let attempt = 0; attempt < SYNC_RETRY_DELAYS_MS.length; attempt++) {
    const wait = SYNC_RETRY_DELAYS_MS[attempt];
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    try {
      const res = await fetch("/api/auth/sync", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref }),
      });
      if (res.ok) {
        const body = (await res.json().catch(() => null)) as { isNewUser?: unknown } | null;
        return { isNewUser: body?.isNewUser === true };
      }
      lastStatus = res.status;
      if (res.status === 401 || res.status === 403 || res.status === 429) break;
    } catch {
      lastStatus = 0;
    }
  }
  throw new Error(lastStatus ? `account sync failed (${lastStatus})` : "account sync failed");
}

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
            let sync: { isNewUser: boolean };
            try {
              sync = await syncAccount(ref);
            } catch (err) {
              console.error("[OneTap]", err instanceof Error ? err.message : "account sync failed");
              toast({
                variant: "destructive",
                title: "Account setup didn't finish",
                description: "You're signed in, but your referral wasn't saved after several tries. Open the app from the menu, and contact support if you used a referral link.",
              });
              return;
            }
            track(FUNNEL.oneTapSignIn, { isNew: sync.isNewUser });
            if (sync.isNewUser && window.gtag) {
              window.gtag("event", "sign_up", { method: "google_one_tap", send_to: "AW-17802754923" });
            }
            window.location.href = sync.isNewUser ? "/generate?welcome=1&categoryId=CHARACTERS" : "/generate";
          } catch (err) {
            // The regular "Sign up" buttons still work; don't interrupt the visitor.
            console.error("[OneTap] sign-in failed:", err instanceof Error ? err.message : "sign-in failed");
          }
        },
      });
      // Empty Google account list and FedCM NetworkError show up as a
      // not-displayed or skipped moment. Do not prompt again.
      gsi.prompt((moment) => {
        if (!moment.isNotDisplayed() && !moment.isSkippedMoment()) return;
        const reason = moment.isNotDisplayed() ? moment.getNotDisplayedReason() : moment.getSkippedReason();
        if (reason === "unregistered_origin") {
          console.warn("[OneTap] Google client is not allowed on this origin");
        }
      });
    } catch (err) {
      console.warn("[OneTap] prompt skipped:", err instanceof Error ? err.message : err);
    }
  }, []);

  const pathname = usePathname();

  useEffect(() => {
    if (!CLIENT_ID || !oneTapAllowed(pathname)) return;

    let cancelled = false;
    let idleId = 0;
    let timerId = 0;

    const scheduleIdle = () => {
      if (cancelled) return;
      if (typeof window.requestIdleCallback === "function") {
        idleId = window.requestIdleCallback(() => void begin(), { timeout: 4000 });
      } else {
        timerId = window.setTimeout(() => void begin(), 1500);
      }
    };

    const onInteract = () => {
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
      if (document.readyState === "complete") scheduleIdle();
      else window.addEventListener("load", scheduleIdle, { once: true });
    };

    async function begin() {
      if (cancelled) return;
      try {
        const { data: { session } } = await createClient().auth.getSession();
        if (cancelled || session) return;
        await loadGsi();
        if (!cancelled) await init();
      } catch (err) {
        console.warn("[OneTap] load skipped:", err instanceof Error ? err.message : err);
      }
    }

    const smallScreen = window.matchMedia(SMALL_SCREEN_QUERY).matches;
    if (smallScreen) {
      // No download and no prompt until a gesture, so the first screen stays clear.
      window.addEventListener("pointerdown", onInteract, { passive: true });
      window.addEventListener("keydown", onInteract);
    } else if (window.google?.accounts?.id) {
      void init();
    } else if (document.readyState === "complete") {
      scheduleIdle();
    } else {
      window.addEventListener("load", scheduleIdle, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
      window.removeEventListener("load", scheduleIdle);
      if (idleId) window.cancelIdleCallback(idleId);
      if (timerId) window.clearTimeout(timerId);
      try {
        window.google?.accounts?.id?.cancel();
      } catch {
        /* ignore */
      }
      started.current = false;
    };
  }, [init, pathname]);

  return null;
}
