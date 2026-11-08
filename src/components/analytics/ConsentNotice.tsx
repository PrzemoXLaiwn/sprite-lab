"use client";

import { useEffect, useId, useRef, useState, type Ref } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  MEASUREMENT_CHOICE_CHANGED,
  MEASUREMENT_CHOICE_KEY,
  OPEN_MEASUREMENT_CHOICES,
  applyMeasurementChoice,
  parseMeasurementChoice,
  readCountryCookie,
  regionRequiresChoice,
  type MeasurementChoice,
} from "@/lib/analytics/consent";
import { bindPurchaseOwner, discardPurchaseQueue, flushHeldPurchases } from "@/lib/analytics/purchase";

const CHOICE_BUTTON =
  "inline-flex min-h-11 flex-1 items-center justify-center rounded-[10px] px-4 text-[14px] font-semibold";

function localStore() {
  return {
    get: (key: string) => {
      try { return localStorage.getItem(key); } catch { return null; }
    },
    set: (key: string, value: string) => {
      try { localStorage.setItem(key, value); } catch { /* private mode */ }
    },
  };
}

function ChoiceButtons({ onChoose, rejectRef }: {
  onChoose: (choice: MeasurementChoice) => void;
  rejectRef?: Ref<HTMLButtonElement>;
}) {
  return (
    <div className="flex gap-2">
      <button
        ref={rejectRef}
        type="button"
        data-consent-reject
        className={`${CHOICE_BUTTON} border border-white/20 bg-[#212B4E] text-white`}
        onClick={() => onChoose("denied")}
      >
        Reject
      </button>
      <button
        type="button"
        data-consent-accept
        className={`${CHOICE_BUTTON} bg-[#FFA300] text-[#131A31]`}
        onClick={() => onChoose("granted")}
      >
        Accept
      </button>
    </div>
  );
}

/**
 * Accept and Reject are the same size. The bar does not cover the page and
 * payment does not wait on it. Cookie choices reopens the same pair of buttons.
 */
export function ConsentNotice() {
  const titleId = useId();
  const rejectRef = useRef<HTMLButtonElement>(null);
  const [choice, setChoice] = useState<MeasurementChoice | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCountry(readCountryCookie(document.cookie));
      setChoice(parseMeasurementChoice(localStorage.getItem(MEASUREMENT_CHOICE_KEY)));
      setReady(true);
    }, 0);
    const openChoices = () => setOpen(true);
    window.addEventListener(OPEN_MEASUREMENT_CHOICES, openChoices);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(OPEN_MEASUREMENT_CHOICES, openChoices);
    };
  }, []);

  useEffect(() => {
    if (open) rejectRef.current?.focus();
  }, [open]);

  const retryRef = useRef(0);
  function choose(next: MeasurementChoice) {
    applyMeasurementChoice(next, { store: localStore(), gtag: window.gtag });
    setChoice(next);
    setOpen(false);
    window.dispatchEvent(new Event(MEASUREMENT_CHOICE_CHANGED));
    window.clearInterval(retryRef.current);
    if (next === "denied") discardPurchaseQueue();
    if (next !== "granted") return;
    let attempts = 0;
    retryRef.current = window.setInterval(() => {
      flushHeldPurchases();
      attempts += 1;
      if (attempts >= 10) window.clearInterval(retryRef.current);
    }, 500);
  }

  useEffect(() => () => window.clearInterval(retryRef.current), []);

  useEffect(() => {
    const supabase = createClient();
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) bindPurchaseOwner(data.session?.user.id ?? null);
    }).catch(() => {});
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      bindPurchaseOwner(session?.user.id ?? null);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const showBar = ready && regionRequiresChoice(country) && choice === null;
  const status = choice === "granted"
    ? "Analytics and ads are on."
    : choice === "denied"
      ? "Analytics and ads are off."
      : "Analytics and ads are waiting for a choice.";

  return (
    <>
      {showBar && (
        <div
          data-consent-bar
          className="fixed inset-x-3 z-50 rounded-2xl border border-white/10 bg-[#19223F] p-3 shadow-lg bottom-20 md:bottom-4 md:left-auto md:right-4 md:w-[380px]"
          role="region"
          aria-label="Analytics and ads"
        >
          <p className="text-[13px] leading-relaxed text-[#C8CCE8]">
            Analytics and ads are optional. Paying, login and Stripe&apos;s fraud checks do not use this choice.
          </p>
          <div className="mt-3">
            <ChoiceButtons onChoose={choose} />
          </div>
        </div>
      )}

      {!showBar && (
        <button
          type="button"
          data-cookie-choices
          className="fixed left-3 z-50 inline-flex min-h-10 items-center rounded-full border border-white/15 bg-[#131A31] px-3 text-[12px] font-semibold text-[#C8CCE8] bottom-20 md:bottom-4"
          onClick={() => setOpen(true)}
        >
          Cookie choices
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 md:items-center" onMouseDown={() => { if (choice) setOpen(false); }}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#19223F] p-4"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id={titleId} className="font-display text-[20px] text-white">Cookie choices</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-[#C8CCE8]">{status} This does not change payment. Reject leaves analytics and ads off.</p>
            <div className="mt-4">
              <ChoiceButtons onChoose={choose} rejectRef={rejectRef} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function CookieChoicesButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new Event(OPEN_MEASUREMENT_CHOICES))}
    >
      Cookie choices
    </button>
  );
}
