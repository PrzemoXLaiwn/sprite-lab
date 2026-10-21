"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/use-toast";
import { track, FUNNEL } from "@/lib/analytics";
import { clearGuestTokens, readGuestTokens } from "@/lib/guest-claim/local-tokens";

/** One claim per page load, even if React mounts the effect twice. */
let claimStarted = false;

interface ClaimResponse {
  success?: boolean;
  claimed?: number;
  retryable?: boolean;
  results?: { status: string; generationId?: string }[];
}

/**
 * Moves sprites the visitor made on the landing page (before signing up)
 * into their Assets. Mounted in the signed-in app shell, so it runs after
 * every kind of sign-in (email, Google, Discord, One Tap). Renders nothing;
 * failures are silent and never block the app.
 */
export function GuestSpriteClaim() {
  const router = useRouter();
  useEffect(() => {
    if (claimStarted) return;
    const tokens = readGuestTokens();
    if (tokens.length === 0) return;
    claimStarted = true;

    void (async () => {
      try {
        const res = await fetch("/api/guest/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tokens: tokens.map((t) => t.token) }),
        });
        // Rate-limited or server trouble: keep the tokens for the next visit
        // (they expire on their own after 48 h).
        if (res.status === 429 || res.status >= 500) return;
        const data: ClaimResponse = await res.json().catch(() => ({}));
        if (!res.ok || !data.retryable) clearGuestTokens();
        const claimed = data.claimed ?? 0;
        if (claimed > 0) {
          track(FUNNEL.guestSpriteClaimed, { count: claimed });
          // In the creator (where new accounts land): put the newest one on the
          // stage with its prompt, so the visitor carries on with the sprite they came for
          const newest = data.results?.find((x) => x.status === "claimed" && x.generationId)?.generationId;
          if (newest && window.location.pathname === "/generate") router.replace(`/generate?result=${encodeURIComponent(newest)}`);
          toast({
            variant: "success",
            title: claimed === 1
              ? "Your sprite from the home page is saved to Assets"
              : `Your ${claimed} sprites from the home page are saved to Assets`,
          });
        }
      } catch {
        /* offline or blocked — try again on the next page load */
        claimStarted = false;
      }
    })();
  }, [router]);

  return null;
}
