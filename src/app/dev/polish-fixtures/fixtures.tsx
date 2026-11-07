"use client";

import { useRef, useState } from "react";
import { describePlanAccess } from "@/lib/billing/plan-access";
import { requestBillingPortal } from "@/lib/billing/open-portal";
import { BillingSummary } from "@/components/settings/BillingSummary";
import { SharePrivacyPanel } from "@/components/generate/SharePrivacyPanel";
import { GettingStarted } from "@/components/dashboard/GettingStarted";
import { useDialogFocus } from "@/lib/a11y/use-dialog-focus";

const NOW = new Date("2026-11-07T22:00:00Z");
const DEC6 = new Date("2026-12-06T23:59:59Z");

const CASES = {
  free: describePlanAccess({ plan: "FREE", cancelAtPeriodEnd: null, now: NOW }),
  renewing: describePlanAccess({ plan: "UNLIMITED", periodEnd: DEC6, cancelAtPeriodEnd: false, canManageBilling: true, now: NOW }),
  ending: describePlanAccess({ plan: "UNLIMITED", periodEnd: DEC6, cancelAtPeriodEnd: true, canManageBilling: true, now: NOW }),
  providerError: describePlanAccess({ plan: "UNLIMITED", periodEnd: null, cancelAtPeriodEnd: null, canManageBilling: true, now: NOW }),
};

function PortalDemo({ label }: { label: string }) {
  const [portal, setPortal] = useState<"idle" | "opening" | "error">("idle");
  const open = async () => {
    setPortal("opening");
    const result = await requestBillingPortal();
    if (!result.ok) {
      setPortal("error");
      return;
    }
    (window as Window & { __portalUrl?: string }).__portalUrl = result.url;
    window.location.assign(result.url);
  };
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#19223F] p-4" aria-label={label}>
      <h2 className="font-display text-[20px] text-white">{label}</h2>
      <p className="mt-1 font-display text-[24px] text-white">{CASES.ending.planName}</p>
      <BillingSummary
        summary={CASES.ending.summary}
        status={CASES.ending.status}
        canManage={CASES.ending.canManageBilling}
        portal={portal}
        onManage={open}
      />
    </section>
  );
}

function ShareDemo() {
  const [isPublic, setIsPublic] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onShare = async (makePublic: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/generations/browser-fixture", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: makePublic }),
      });
      if (!res.ok) {
        setError("Couldn't update sharing.");
        return;
      }
      setIsPublic(makePublic);
    } catch {
      setError("Couldn't update sharing.");
    } finally {
      setBusy(false);
    }
  };
  return <SharePrivacyPanel isPublic={isPublic} busy={busy} error={error} onShare={onShare} />;
}

function DialogDemo() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useDialogFocus(open, dialogRef, closeRef, () => setOpen(false));
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#19223F] p-4" aria-label="Sprite dialog">
      <h2 className="font-display text-[20px] text-white">Sprite dialog</h2>
      <button id="open-sprite" type="button" onClick={() => setOpen(true)} className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-[#FFA300] px-4 text-[13px] font-semibold text-[#131A31]">
        Open sprite details
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Sprite details" className="w-full max-w-md rounded-2xl bg-[#19223F] p-4">
            <button ref={closeRef} type="button" className="inline-flex min-h-10 items-center rounded-xl border border-white/15 px-3 text-white">Close</button>
            <button type="button" className="ml-2 inline-flex min-h-10 items-center rounded-xl border border-white/15 px-3 text-white">Like</button>
            <a href="#fixture-comments" className="ml-2 inline-flex min-h-10 items-center text-[#FFC857]">Comments</a>
            <p id="fixture-comments" className="mt-3 text-[13px] text-[#C8CCE8]">Private until you share it.</p>
          </div>
        </div>
      )}
    </section>
  );
}

export function PolishFixtures() {
  return (
    <main className="min-h-screen bg-[#131A31] px-4 py-8 text-[#FFF1E8]">
      <h1 className="font-display text-[32px] font-semibold">Polish fixtures</h1>
      <p className="mt-2 max-w-xl text-[14px] text-[#A7ADD4]">Local render of onboarding, sharing, billing copy and a dialog. No account and no Stripe call until Manage billing is pressed.</p>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/[0.08] bg-[#19223F] p-4" aria-label="Free plan">
          <h2 className="font-display text-[20px] text-white">Free</h2>
          <p className="mt-1 font-display text-[24px]">{CASES.free.planName}</p>
          <BillingSummary summary={CASES.free.summary} status={CASES.free.status} canManage={false} portal="idle" onManage={() => {}} />
        </section>
        <section className="rounded-2xl border border-white/[0.08] bg-[#19223F] p-4" aria-label="Renewing Studio">
          <h2 className="font-display text-[20px] text-white">Renewing</h2>
          <p className="mt-1 font-display text-[24px]">{CASES.renewing.planName}</p>
          <BillingSummary summary={CASES.renewing.summary} status={CASES.renewing.status} canManage portal="idle" onManage={() => {}} />
        </section>
        <section className="rounded-2xl border border-white/[0.08] bg-[#19223F] p-4" aria-label="Cancelled Studio">
          <h2 className="font-display text-[20px] text-white">Cancel pending</h2>
          <p className="mt-1 font-display text-[24px]">{CASES.ending.planName}</p>
          <BillingSummary summary={CASES.ending.summary} status={CASES.ending.status} canManage portal="idle" onManage={() => {}} />
        </section>
        <section className="rounded-2xl border border-white/[0.08] bg-[#19223F] p-4" aria-label="Provider error">
          <h2 className="font-display text-[20px] text-white">Provider error</h2>
          <p className="mt-1 font-display text-[24px]">{CASES.providerError.planName}</p>
          <BillingSummary summary={CASES.providerError.summary} status={CASES.providerError.status} canManage portal="idle" onManage={() => {}} />
        </section>
        <PortalDemo label="Portal failure" />
        <PortalDemo label="Portal success" />
        <section className="rounded-2xl border border-white/[0.08] bg-[#19223F] p-4" aria-label="Portal error">
          <h2 className="font-display text-[20px] text-white">Portal error</h2>
          <BillingSummary
            summary={CASES.ending.summary}
            status={CASES.ending.status}
            canManage
            portal="error"
            onManage={() => {}}
          />
        </section>
        <section className="rounded-2xl border border-white/[0.08] bg-[#19223F] p-4 lg:col-span-2" aria-label="Share privacy">
          <h2 className="font-display text-[20px] text-white">Share</h2>
          <ShareDemo />
        </section>
        <DialogDemo />
      </div>
      <GettingStarted done={{ generate: false, animate: false, project: false }} />
    </main>
  );
}
