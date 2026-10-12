import Link from "next/link";
import { ArrowLeft, Check, CheckCircle2, Loader2, Lock } from "lucide-react";
import type { Appearance } from "@stripe/stripe-js";

// =============================================================================
// Presentation-only building blocks shared by the checkout + success pages.
// No payment logic lives here.
// =============================================================================

export const BTN_PRIMARY =
  "px-corners bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] text-white font-semibold hover:brightness-110 transition disabled:opacity-60 disabled:hover:brightness-100 disabled:cursor-not-allowed";
export const BTN_SECONDARY =
  "rounded-xl border border-white/[0.1] bg-white/[0.04] text-[#C9CFDB] hover:bg-white/[0.08] hover:text-white transition-colors";

/** Stripe Elements theme matching the app palette. */
export const stripeAppearance: Appearance = {
  theme: "night",
  variables: {
    colorPrimary: "#FF8A3D",
    colorBackground: "#151922",
    colorText: "#ECEEF3",
    colorTextSecondary: "#8B93A5",
    colorTextPlaceholder: "#5C6475",
    colorDanger: "#f87171",
    fontFamily: "Inter, system-ui, sans-serif",
    borderRadius: "12px",
    spacingUnit: "4px",
  },
  rules: {
    ".Input": {
      backgroundColor: "#151922",
      border: "1px solid rgba(255,255,255,0.08)",
      boxShadow: "none",
    },
    ".Input:focus": {
      border: "1px solid rgba(255,138,61,0.6)",
      boxShadow: "0 0 0 3px rgba(255,138,61,0.12)",
    },
    ".Label": {
      color: "#8B93A5",
    },
    ".Tab": {
      backgroundColor: "#151922",
      border: "1px solid rgba(255,255,255,0.08)",
      boxShadow: "none",
    },
    ".Tab:hover": {
      backgroundColor: "#1A1F2A",
    },
    ".Tab--selected": {
      backgroundColor: "rgba(255,138,61,0.10)",
      borderColor: "rgba(255,138,61,0.6)",
      color: "#FFFFFF",
    },
  },
};

export function PageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B0D12]">
      <Loader2 className="h-6 w-6 animate-spin text-[#FF8A3D]" />
    </div>
  );
}

export function CheckoutError({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B0D12] p-5">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0E1016] p-6 text-center">
        <div className="rounded-xl border border-red-400/20 bg-red-500/[0.06] px-4 py-3 text-[13px] text-red-200">
          {message}
        </div>
        <Link href="/pricing" className={`mt-5 inline-flex h-10 items-center gap-2 px-4 text-[13px] font-medium ${BTN_SECONDARY}`}>
          <ArrowLeft className="h-4 w-4" /> Back to pricing
        </Link>
      </div>
    </div>
  );
}

/** Two-column checkout layout: order summary (left) + payment card (right). */
export function CheckoutShell({
  title,
  subtitle,
  summary,
  children,
}: {
  title: string;
  subtitle: string;
  summary: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0B0D12] text-[#ECEEF3]">
      <div className="mx-auto max-w-[1000px] px-5 py-8 lg:px-8">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 -ml-2 text-[13px] text-[#8B93A5] transition-colors hover:bg-white/[0.04] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to pricing
        </Link>

        <div className="mt-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#8B93A5]">Checkout</p>
          <h1 className="mt-2 font-display text-[26px] font-semibold tracking-tight text-white">{title}</h1>
          <p className="mt-1 text-[13px] text-[#8B93A5]">{subtitle}</p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div className="space-y-4">{summary}</div>
          <div className="rounded-2xl border border-white/[0.08] bg-[#0E1016] p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-white">Payment details</h2>
              <span className="flex items-center gap-1.5 font-mono text-[11px] text-[#8B93A5]">
                <Lock className="h-3 w-3" /> Secured by Stripe
              </span>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SummaryCard({ children, highlight = false }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border bg-[#151922] p-5 ${highlight ? "border-[#FF8A3D]/60" : "border-white/[0.08]"}`}>
      {children}
    </div>
  );
}

export function SummaryRow({ label, value, strong = false }: { label: React.ReactNode; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-[13px]">
      <span className={strong ? "font-medium text-white" : "text-[#8B93A5]"}>{label}</span>
      <span className={`font-mono ${strong ? "text-[14px] font-semibold text-white" : "text-[#C9CFDB]"}`}>{value}</span>
    </div>
  );
}

export function FeatureList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-[13px] text-[#C9CFDB]">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FF8A3D]" strokeWidth={2.5} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function FormError({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-xl border border-red-400/20 bg-red-500/[0.06] px-3.5 py-2.5 text-[13px] text-red-200">
      {message}
    </div>
  );
}

export function SecureNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-1.5 text-center text-[11px] text-[#7A8294]">
      <Lock className="h-3 w-3 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

/** Inline confirmation shown inside the payment card before redirecting. */
export function InlineSuccess({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="py-8 text-center" role="status">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.06]">
        <CheckCircle2 className="h-6 w-6 text-emerald-300" />
      </div>
      <h3 className="text-[17px] font-semibold text-white">{title}</h3>
      {children && <div className="mt-1.5 text-[13px] text-[#8B93A5]">{children}</div>}
      <p className="mt-3 flex items-center justify-center gap-1.5 font-mono text-[11px] text-[#7A8294]">
        <Loader2 className="h-3 w-3 animate-spin" /> Redirecting…
      </p>
    </div>
  );
}

/** Full-page receipt card used by the three success pages. */
export function SuccessShell({
  icon,
  title,
  children,
  countdown,
  secondaryLinks,
}: {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
  countdown: number;
  secondaryLinks: { href: string; label: string }[];
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B0D12] p-5 text-[#ECEEF3]">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0E1016] p-6 text-center sm:p-8">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.06]">
          {icon ?? <CheckCircle2 className="h-7 w-7 text-emerald-300" />}
        </div>
        <h1 className="font-display text-[24px] font-semibold tracking-tight text-white">{title}</h1>
        <div className="mt-2 space-y-1.5 text-[13px] text-[#C9CFDB]">{children}</div>

        <p className="mt-6 font-mono text-[11px] text-[#7A8294]">
          Redirecting to the generator in <span className="tabular-nums text-[#FFB27A]">{countdown}s</span>
        </p>

        <Link href="/generate" className={`mt-4 flex h-11 w-full items-center justify-center gap-2 text-[14px] ${BTN_PRIMARY}`}>
          Start creating
        </Link>

        <div className="mt-4 flex justify-center gap-5 text-[13px]">
          {secondaryLinks.map((l) => (
            <Link key={l.href} href={l.href} className="text-[#8B93A5] transition-colors hover:text-white">
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CreditChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#FF8A3D]/25 bg-[#FF8A3D]/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-[#FFB27A]">
      {children}
    </span>
  );
}
