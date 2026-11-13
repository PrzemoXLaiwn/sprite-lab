"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, X } from "lucide-react";
import { CANCEL_REASONS, type CancelReasonId } from "@/lib/billing/cancellation";

type Step = "reason" | "offer" | "saved";

interface Offer {
  kind: "pause_30" | "discount";
  days?: number;
}

export function CancelPlanDialog({
  open,
  planName,
  onClose,
  onContinueToPortal,
}: {
  open: boolean;
  planName: string;
  onClose: () => void;
  onContinueToPortal: () => void;
}) {
  const [step, setStep] = useState<Step>("reason");
  const [reason, setReason] = useState<CancelReasonId | "">("");
  const [note, setNote] = useState("");
  const [rowId, setRowId] = useState<string | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setStep("reason");
    setReason("");
    setNote("");
    setRowId(null);
    setOffer(null);
    setBusy(false);
    setError("");
  };

  const close = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const submitReason = async () => {
    if (!reason || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/billing/cancellation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.id !== "string") throw new Error(data.error || "Couldn't save that. Try again.");
      setRowId(data.id);
      setOffer(data.offer?.kind === "discount" ? { kind: "discount" } : { kind: "pause_30", days: 30 });
      setStep("offer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const acceptOffer = async () => {
    if (!rowId || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/billing/cancellation/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rowId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "We couldn't apply that offer.");
      setStep("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't apply that offer.");
    } finally {
      setBusy(false);
    }
  };

  const continueToPortal = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (rowId) {
        const res = await fetch("/api/billing/cancellation/decline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: rowId }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Couldn't continue. Try again.");
        }
      }
      reset();
      onContinueToPortal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't continue. Try again.");
      setBusy(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/70" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] max-h-[90vh] w-[min(480px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#19223F] p-5 text-[#FFF1E8] shadow-2xl outline-none sm:p-6">
          <Dialog.Close asChild>
            <button type="button" aria-label="Close" className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-lg text-[#9AA1CC] hover:bg-white/[0.06] hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </Dialog.Close>

          {step === "reason" && (
            <>
              <Dialog.Title className="pr-10 font-display text-[22px] font-semibold text-white">Cancel {planName}</Dialog.Title>
              <Dialog.Description className="mt-2 text-[14px] leading-relaxed text-[#C8CCE8]">
                Tell us why you are leaving. You will get one offer to stay, then billing opens in Stripe.
              </Dialog.Description>
              <fieldset className="mt-4 space-y-2">
                <legend className="sr-only">Reason for cancelling</legend>
                {CANCEL_REASONS.map((item) => (
                  <label key={item.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-white/[0.08] bg-[#212B4E] px-3 py-2 text-[14px] has-[:checked]:border-[#FFA300]/60">
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
              </fieldset>
              <label className="mt-3 block text-[13px] text-[#9AA1CC]">
                Anything else
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={500}
                  rows={3}
                  className="mt-1 w-full resize-none rounded-xl border border-white/[0.08] bg-[#212B4E] px-3 py-2 text-[16px] text-white outline-none focus:border-[#FFA300]/50 sm:text-[14px]"
                />
              </label>
            </>
          )}

          {step === "offer" && (
            <>
              <Dialog.Title className="pr-10 font-display text-[22px] font-semibold text-white">Stay a bit longer</Dialog.Title>
              <Dialog.Description className="mt-2 text-[14px] leading-relaxed text-[#C8CCE8]">
                {offer?.kind === "discount"
                  ? "We can apply a discount to your next invoice instead of cancelling."
                  : "Pause billing for 30 days. You keep this plan and the credits you have, and the next charge waits until the pause ends."}
              </Dialog.Description>
            </>
          )}

          {step === "saved" && (
            <>
              <Dialog.Title className="pr-10 font-display text-[22px] font-semibold text-white">You are staying</Dialog.Title>
              <Dialog.Description className="mt-2 text-[14px] leading-relaxed text-[#C8CCE8]">
                {offer?.kind === "discount"
                  ? "The discount is on your next invoice. Your plan is unchanged."
                  : "Billing is paused for 30 days. Your plan keeps working, and we will not charge you until the pause ends."}
              </Dialog.Description>
            </>
          )}

          {error && <p role="alert" className="mt-3 text-[13px] text-[#FFC857]">{error}</p>}

          <div className="mt-5 flex flex-col gap-2">
            {step === "reason" && (
              <button type="button" disabled={!reason || busy} onClick={submitReason} className="px-corners flex h-11 items-center justify-center bg-[#FFA300] text-[14px] font-semibold text-[#131A31] hover:bg-[#FFB733] disabled:opacity-50">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
              </button>
            )}
            {step === "offer" && (
              <>
                <button type="button" disabled={busy} onClick={acceptOffer} className="px-corners flex h-11 items-center justify-center bg-[#FFA300] text-[14px] font-semibold text-[#131A31] hover:bg-[#FFB733] disabled:opacity-50">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : offer?.kind === "discount" ? "Apply the discount and stay" : "Pause for 30 days"}
                </button>
                <button type="button" disabled={busy} onClick={continueToPortal} className="flex h-11 items-center justify-center rounded-xl border border-white/[0.1] text-[14px] text-[#C8CCE8] hover:bg-white/[0.06] disabled:opacity-50">
                  Continue to cancel
                </button>
              </>
            )}
            {step === "saved" && (
              <button type="button" onClick={close} className="px-corners flex h-11 items-center justify-center bg-[#FFA300] text-[14px] font-semibold text-[#131A31] hover:bg-[#FFB733]">
                Back to settings
              </button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
