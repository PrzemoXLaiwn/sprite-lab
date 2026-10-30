"use client";

import { useCallback, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { Loader2, X } from "lucide-react";
import { CANCEL_REASONS, type CancelReason } from "@/config/retention";
import { formatGbp } from "@/config/starter-first-month";
import type { BillingSubscriptionView } from "@/lib/billing/billing-view";
import { formatLongDate, planDisplayName, type RetentionOffer } from "@/lib/billing/retention";

const BTN_PRIMARY =
  "px-corners inline-flex min-h-11 w-full items-center justify-center gap-2 bg-[#FFA300] px-4 py-2.5 text-[13px] font-semibold text-[#131A31] transition hover:bg-[#FFB733] disabled:cursor-not-allowed disabled:opacity-50";
const BTN_SECONDARY =
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/[0.14] bg-white/[0.04] px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50";
const BTN_DANGER =
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-300/40 bg-red-500/[0.12] px-4 py-2.5 text-[13px] font-semibold text-red-50 transition-colors hover:bg-red-500/[0.2] disabled:cursor-not-allowed disabled:opacity-50";

type Step = "losses" | "survey" | "offers" | "confirm";

interface StartResult {
  attemptId: string;
  offers: RetentionOffer[];
  periodEnd: string | null;
  planLabel: string;
  reason: CancelReason;
  note: string;
}

async function readError(res: Response): Promise<string> {
  const data = await res.json().catch(() => null);
  return data?.error || "Something went wrong. Please try again.";
}

export function ManageSubscription() {
  const [view, setView] = useState<BillingSubscriptionView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("losses");
  const [reason, setReason] = useState<CancelReason | null>(null);
  const [note, setNote] = useState("");
  const [attempt, setAttempt] = useState<StartResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [flowError, setFlowError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/subscription");
      if (res.status === 401) {
        setView(null);
        setError(null);
        return;
      }
      if (!res.ok) {
        setError(await readError(res));
        return;
      }
      const data = await res.json();
      setView(data.subscription as BillingSubscriptionView);
      setError(null);
    } catch {
      setError("We couldn't load your subscription.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const resetFlow = () => {
    setStep("losses");
    setReason(null);
    setNote("");
    setAttempt(null);
    setFlowError(null);
    setBusy(false);
  };

  const onOpenChange = (next: boolean) => {
    if (!next && busy) return;
    setOpen(next);
    if (!next) resetFlow();
  };

  const openPortal = async () => {
    setPortalBusy(true);
    setBanner(null);
    try {
      const res = await fetch("/api/stripe/create-portal", { method: "POST" });
      if (!res.ok) {
        setBanner(await readError(res));
        return;
      }
      const data = await res.json();
      if (data.url) window.location.assign(data.url);
      else setBanner("We couldn't open the billing page.");
    } catch {
      setBanner("We couldn't open the billing page.");
    } finally {
      setPortalBusy(false);
    }
  };

  const resume = async (action: "resume_cancel" | "resume_pause") => {
    setPortalBusy(true);
    setBanner(null);
    try {
      const res = await fetch("/api/billing/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setBanner(data?.error || "We couldn't update your subscription.");
        return;
      }
      setBanner(data.message);
      await load();
    } catch {
      setBanner("We couldn't update your subscription.");
    } finally {
      setPortalBusy(false);
    }
  };

  const keep = async () => {
    setBusy(true);
    setFlowError(null);
    try {
      const res = await fetch("/api/billing/cancellation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "keep", attemptId: attempt?.attemptId }),
      });
      if (!res.ok) {
        setFlowError(await readError(res));
        return;
      }
      setBanner("Your subscription stays as it is.");
      setOpen(false);
      resetFlow();
      await load();
    } catch {
      setFlowError("We couldn't save that. Your subscription was not changed.");
    } finally {
      setBusy(false);
    }
  };

  const continueFromSurvey = async () => {
    if (!reason) return;
    if (attempt && attempt.reason === reason && attempt.note === note.trim()) {
      setStep(attempt.offers.length > 0 ? "offers" : "confirm");
      return;
    }
    setBusy(true);
    setFlowError(null);
    try {
      const res = await fetch("/api/billing/cancellation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", reason, note: note.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFlowError(data?.error || "We couldn't continue. Try again.");
        return;
      }
      const next: StartResult = {
        attemptId: data.attemptId,
        offers: data.offers ?? [],
        periodEnd: data.periodEnd ?? null,
        planLabel: data.planLabel,
        reason,
        note: note.trim(),
      };
      setAttempt(next);
      setStep(next.offers.length > 0 ? "offers" : "confirm");
    } catch {
      setFlowError("We couldn't continue. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const accept = async (offer: "discount" | "downgrade" | "pause") => {
    if (!attempt) return;
    setBusy(true);
    setFlowError(null);
    try {
      const res = await fetch("/api/billing/cancellation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept", attemptId: attempt.attemptId, offer }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFlowError(data?.error || "We couldn't apply that offer.");
        return;
      }
      setBanner(data.message);
      setOpen(false);
      resetFlow();
      await load();
    } catch {
      setFlowError("We couldn't apply that offer. Your subscription was not changed.");
    } finally {
      setBusy(false);
    }
  };

  const confirmCancel = async () => {
    if (!attempt) return;
    setBusy(true);
    setFlowError(null);
    try {
      const res = await fetch("/api/billing/cancellation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", attemptId: attempt.attemptId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFlowError(data?.error || "We couldn't cancel. Your subscription was not changed.");
        return;
      }
      setBanner(data.message);
      setOpen(false);
      resetFlow();
      await load();
    } catch {
      setFlowError("We couldn't cancel. Your subscription was not changed.");
    } finally {
      setBusy(false);
    }
  };

  if (loading && !view) {
    return (
      <div className="mt-4 h-28 animate-pulse rounded-xl border border-white/[0.08] bg-[#212B4E]" />
    );
  }

  if (error) {
    return (
      <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/[0.06] px-4 py-3 text-[13px] text-red-100">
        <p>{error}</p>
        <button type="button" onClick={() => void load()} className="mt-2 min-h-10 font-medium text-white underline-offset-2 hover:underline">
          Try again
        </button>
      </div>
    );
  }

  if (!view || (view.status === "free" && !view.canOpenPortal)) return null;

  const until = formatLongDate(view.periodEnd);
  const price =
    view.priceGbp != null
      ? view.percentOff
        ? `${formatGbp(Math.round(view.priceGbp * (100 - view.percentOff)) / 100)} next month (${view.percentOff}% off), then ${formatGbp(view.priceGbp)} / month`
        : view.amountOffGbp
          ? `${formatGbp(Math.max(0, view.priceGbp - view.amountOffGbp))} next month, then ${formatGbp(view.priceGbp)} / month`
          : `${formatGbp(view.priceGbp)} / month`
      : null;

  return (
    <div className="mt-4 rounded-xl border border-white/[0.08] bg-[#212B4E] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-white">Manage subscription</h3>
          <p className="mt-1 text-[13px] text-[#FFF1E8]">
            {view.planLabel}
            {price ? ` · ${price}` : ""}
          </p>
          <p className="mt-1 text-[13px] text-[#C8CCE8]">{view.statusLabel}</p>
          {view.isLifetime && view.canCancel && (
            <p className="mt-1 text-[12px] text-[#9AA1CC]">Lifetime access stays if you cancel this monthly plan.</p>
          )}
        </div>
      </div>

      {banner && (
        <p className="mt-3 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[13px] text-[#FFF1E8]" role="status">
          {banner}
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {view.canResume && (
          <button type="button" className={`${BTN_PRIMARY} sm:col-span-3`} disabled={portalBusy} onClick={() => void resume("resume_cancel")}>
            {portalBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resume subscription"}
          </button>
        )}
        {view.canResumePause && (
          <button type="button" className={BTN_SECONDARY} disabled={portalBusy} onClick={() => void resume("resume_pause")}>
            Resume billing
          </button>
        )}
        {view.canOpenPortal && (
          <>
            <button type="button" className={BTN_SECONDARY} disabled={portalBusy} onClick={() => void openPortal()}>
              Payment method
            </button>
            <button type="button" className={BTN_SECONDARY} disabled={portalBusy} onClick={() => void openPortal()}>
              Invoices
            </button>
          </>
        )}
        {view.canCancel && (
          <button type="button" className={BTN_DANGER} onClick={() => { setFlowError(null); setOpen(true); }}>
            Cancel subscription
          </button>
        )}
      </div>

      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/70" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] flex max-h-[min(90vh,720px)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#19223F] text-[#FFF1E8] shadow-2xl outline-none">
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-lg text-[#C8CCE8] hover:bg-white/[0.06] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
            <div className="min-h-0 flex-1 overflow-y-auto p-5 pr-12 sm:p-6 sm:pr-14">
              <Dialog.Title className="font-display text-[20px] font-semibold text-white">Cancel subscription</Dialog.Title>
              <Dialog.Description className="mt-1 text-[13px] text-[#9AA1CC]">
                {step === "losses" && "What changes if you cancel"}
                {step === "survey" && "Why are you cancelling?"}
                {step === "offers" && "Before you cancel"}
                {step === "confirm" && "Confirm cancellation"}
              </Dialog.Description>

              {step === "losses" && view && (
                <div className="mt-4 space-y-4 text-[13px] leading-relaxed">
                  <p className="text-[#C8CCE8]">
                    You can cancel here. It takes effect at the end of this billing period{until ? `, on ${until}` : ""}, not today.
                  </p>
                  <div>
                    <p className="font-medium text-white">You keep</p>
                    <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[#C8CCE8]">
                      {view.consequences.keep.map((line) => <li key={line}>{line}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-white">What ends</p>
                    <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[#C8CCE8]">
                      {view.consequences.ends.map((line) => <li key={line}>{line}</li>)}
                    </ul>
                  </div>
                </div>
              )}

              {step === "survey" && (
                <fieldset className="mt-4" disabled={busy}>
                  <legend className="text-[13px] text-[#C8CCE8]">Choose one. You can still cancel whatever you pick.</legend>
                  <div className="mt-3 space-y-2">
                    {CANCEL_REASONS.map((item) => (
                      <label key={item.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-white/[0.08] bg-[#212B4E] px-3 py-2 text-[13px] text-white has-[:checked]:border-[#FFA300]/50">
                        <input
                          type="radio"
                          name="cancel-reason"
                          value={item.id}
                          checked={reason === item.id}
                          onChange={() => setReason(item.id)}
                          className="h-4 w-4 accent-[#FFA300]"
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
                  <label htmlFor="cancel-note" className="mb-1.5 mt-4 block text-[12px] font-medium text-[#C8CCE8]">
                    Anything else? Optional
                  </label>
                  <textarea
                    id="cancel-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value.slice(0, 2000))}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-white/[0.08] bg-[#212B4E] px-3 py-2.5 text-[13px] text-white outline-none focus:border-[#FFA300]/50"
                  />
                </fieldset>
              )}

              {step === "offers" && attempt && (
                <div className="mt-4 space-y-3">
                  {attempt.offers.map((offer) => (
                    <OfferCard key={offer.type} offer={offer} busy={busy} onAccept={(kind) => void accept(kind)} />
                  ))}
                </div>
              )}

              {step === "confirm" && (
                <div className="mt-4 space-y-3 text-[13px] leading-relaxed text-[#C8CCE8]">
                  <p>
                    {attempt?.planLabel || view.planLabel} stays active until {formatLongDate(attempt?.periodEnd || view.periodEnd) || "the end of this period"}. You will not be charged again. You can resume from this page until that date.
                  </p>
                  <p>
                    This stops the next renewal. It does not refund the current month.{" "}
                    <Link href="/refunds" className="font-medium text-[#FFC857] hover:text-[#FFA300]">
                      Cooling-off refunds
                    </Link>{" "}
                    are requested by email within 14 days.
                  </p>
                </div>
              )}

              {flowError && <p className="mt-3 text-[13px] text-red-200" role="alert">{flowError}</p>}
            </div>

            <div className="sticky bottom-0 space-y-2 border-t border-white/[0.06] bg-[#19223F] p-4">
              {step === "losses" && (
                <button type="button" className={BTN_SECONDARY} onClick={() => setStep("survey")}>
                  Continue to cancel
                </button>
              )}
              {step === "survey" && (
                <button type="button" className={BTN_SECONDARY} disabled={!reason || busy} onClick={() => void continueFromSurvey()}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue to cancel"}
                </button>
              )}
              {step === "offers" && (
                <button type="button" className={BTN_SECONDARY} disabled={busy} onClick={() => setStep("confirm")}>
                  Continue to cancel
                </button>
              )}
              {step === "confirm" && (
                <button type="button" className={BTN_DANGER} disabled={busy} onClick={() => void confirmCancel()}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel subscription"}
                </button>
              )}
              <button type="button" className={BTN_SECONDARY} disabled={busy} onClick={() => void keep()}>
                Keep my subscription
              </button>
              {step !== "losses" && (
                <button
                  type="button"
                  className="min-h-10 w-full text-[13px] text-[#9AA1CC] hover:text-white"
                  disabled={busy}
                  onClick={() => {
                    if (step === "survey") setStep("losses");
                    else if (step === "offers") setStep("survey");
                    else setStep(attempt && attempt.offers.length > 0 ? "offers" : "survey");
                  }}
                >
                  Back
                </button>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function OfferCard({
  offer,
  busy,
  onAccept,
}: {
  offer: RetentionOffer;
  busy: boolean;
  onAccept: (offer: "discount" | "downgrade" | "pause") => void;
}) {
  if (offer.type === "discount") {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-[#212B4E] p-3">
        <p className="text-[13px] font-medium text-white">{offer.percent}% off your next month</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#C8CCE8]">
          The discount applies to the next renewal only. The month after that is the normal price.
        </p>
        <button type="button" className={`${BTN_PRIMARY} mt-3`} disabled={busy} onClick={() => onAccept("discount")}>
          Apply {offer.percent}% off
        </button>
      </div>
    );
  }
  if (offer.type === "downgrade") {
    const name = planDisplayName(offer.toPlan);
    return (
      <div className="rounded-xl border border-white/[0.08] bg-[#212B4E] p-3">
        <p className="text-[13px] font-medium text-white">Move to {name} ({formatGbp(offer.priceGbp)} / month)</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#C8CCE8]">
          The plan changes now. You are not charged today. The next renewal is {formatGbp(offer.priceGbp)}, with {offer.credits.toLocaleString("en-GB")} credits.
        </p>
        <button type="button" className={`${BTN_PRIMARY} mt-3`} disabled={busy} onClick={() => onAccept("downgrade")}>
          Switch to {name}
        </button>
      </div>
    );
  }
  if (offer.type === "pause") {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-[#212B4E] p-3">
        <p className="text-[13px] font-medium text-white">Pause billing for {offer.days} days</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#C8CCE8]">
          We skip charges for {offer.days} days. Your plan and the credits you have stay. You will not get a new credit grant until billing resumes.
        </p>
        <button type="button" className={`${BTN_PRIMARY} mt-3`} disabled={busy} onClick={() => onAccept("pause")}>
          Pause billing
        </button>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#212B4E] p-3">
      <p className="text-[13px] font-medium text-white">Tell us what went wrong</p>
      <p className="mt-1 text-[12px] leading-relaxed text-[#C8CCE8]">
        Email {offer.email} and we will look at it. You can still cancel below.
      </p>
      <a href={`mailto:${offer.email}?subject=Help%20with%20my%20SpriteLab%20subscription`} className={`${BTN_SECONDARY} mt-3`}>
        Email support
      </a>
    </div>
  );
}
