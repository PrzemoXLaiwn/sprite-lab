import { AlertTriangle, Check, CircleDashed, X } from "lucide-react";
import type { DailyCap } from "@/lib/email/lifecycle/limits";

// Read-only view of every email switch (env), today's Resend budget and the
// checklist before MARKETING_EMAILS_ENABLED goes on. Nothing here can change
// a flag: they live in Vercel env.

export interface EmailSwitchboard {
  marketing: boolean;
  weeklyDigest: boolean;
  relaunch: boolean;
  resendKey: boolean;
  postalAddress: string | null;
  webhookSecret: boolean;
  baseCap: number;
  resendDailyLimit: number;
  /** From today's dry run; null when it couldn't be computed. */
  limits: DailyCap | null;
}

const SWITCHES: { key: "marketing" | "weeklyDigest" | "relaunch"; name: string; env: string; note: string }[] = [
  {
    key: "marketing",
    name: "Marketing emails",
    env: "MARKETING_EMAILS_ENABLED",
    note: "Lifecycle emails plus the older re-engagement, abandoned-cart, special-offer and daily-reminder crons. Off unless exactly \"true\".",
  },
  {
    key: "weeklyDigest",
    name: "Weekly digest",
    env: "WEEKLY_DIGEST_ENABLED",
    note: "Sundays 10:00 UTC. On when unset; set to \"false\" to stop it.",
  },
  {
    key: "relaunch",
    name: "Relaunch campaign",
    env: "RELAUNCH_EMAILS_ENABLED",
    note: "One-off \"SpriteLab is back\" batch. Keep off.",
  },
];

export function EmailSwitchboardPanel({ s }: { s: EmailSwitchboard }) {
  const checklist: { label: string; detail: string; state: "done" | "missing" | "manual" }[] = [
    {
      label: "Postal address set",
      detail: s.postalAddress ? s.postalAddress : "EMAIL_POSTAL_ADDRESS is empty. It goes in every marketing footer.",
      state: s.postalAddress ? "done" : "missing",
    },
    {
      label: "Bounce webhook secret set",
      detail: s.webhookSecret
        ? "RESEND_WEBHOOK_SECRET is set. In Resend, point the webhook at /api/webhooks/resend with bounced, complained and delivery_delayed."
        : "RESEND_WEBHOOK_SECRET is empty, so /api/webhooks/resend rejects every event and bounces aren't suppressed.",
      state: s.webhookSecret ? "done" : "missing",
    },
    {
      label: "Resend API key set",
      detail: s.resendKey ? "RESEND_API_KEY is set." : "RESEND_API_KEY is empty. Nothing can be sent.",
      state: s.resendKey ? "done" : "missing",
    },
    {
      label: "Dry-run counts reviewed",
      detail: "Check the dry run below (who'd get what, skip reasons) before switching on. Manual step.",
      state: "manual",
    },
  ];
  const l = s.limits;

  return (
    <section className="mb-8 rounded-2xl border border-white/[0.06] bg-[#0E1016] p-4 sm:p-5">
      <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#8B93A5]">Switches · read-only</h2>

      {!s.postalAddress && (
        <p role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-500/[0.07] px-4 py-3 text-[13px] text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Postal address missing — required before enabling marketing. Set EMAIL_POSTAL_ADDRESS in Vercel.</span>
        </p>
      )}

      <ul className="mb-5 divide-y divide-white/[0.05]">
        {SWITCHES.map((sw) => {
          const on = s[sw.key];
          return (
            <li key={sw.key} className="flex min-w-0 items-start justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-white">{sw.name}</p>
                <p className="break-all font-mono text-[11px] text-[#8B93A5]">{sw.env}</p>
                <p className="mt-0.5 text-[12px] text-[#8B93A5]">{sw.note}</p>
              </div>
              <span
                className={`shrink-0 rounded-full border px-2.5 py-1 font-mono text-[11px] ${
                  on ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300" : "border-white/[0.1] bg-white/[0.04] text-[#C9CFDB]"
                }`}
              >
                {on ? "on" : "off"}
              </span>
            </li>
          );
        })}
      </ul>

      <h3 className="mb-2 text-[13px] font-semibold text-white">Resend budget · today (UTC)</h3>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Sent today, all senders" value={l ? String(l.sentToday) : "–"} hint={`limit ${s.resendDailyLimit}/day`} />
        <Tile label="Left today" value={l ? String(l.providerRemaining) : "–"} hint="RESEND_DAILY_LIMIT" />
        <Tile label="Lifecycle cap today" value={l ? String(l.cap) : "–"} hint={l ? `limited by ${l.limitedBy}` : undefined} />
        <Tile
          label="Warm-up"
          value={l ? `day ${l.warmupDay}` : "–"}
          hint={`base ${s.baseCap} → ${l ? l.warmupCap : s.baseCap}/day`}
        />
      </div>

      <h3 className="mb-2 text-[13px] font-semibold text-white">Before you enable marketing</h3>
      <ul className="space-y-2">
        {checklist.map((c) => (
          <li key={c.label} className="flex min-w-0 items-start gap-2.5 rounded-xl border border-white/[0.06] bg-[#151922] px-3 py-2.5">
            {c.state === "done" ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-label="done" />
            ) : c.state === "missing" ? (
              <X className="mt-0.5 h-4 w-4 shrink-0 text-red-300" aria-label="missing" />
            ) : (
              <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-[#FF9F43]" aria-label="manual" />
            )}
            <div className="min-w-0">
              <p className="text-[13px] text-white">{c.label}</p>
              <p className="break-words text-[12px] text-[#8B93A5]">{c.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/[0.06] bg-[#151922] p-3">
      <p className="truncate text-[12px] text-[#8B93A5]">{label}</p>
      <p className="mt-1 font-mono text-[22px] font-semibold tabular-nums text-white">{value}</p>
      {hint && <p className="mt-0.5 truncate font-mono text-[11px] text-[#8B93A5]">{hint}</p>}
    </div>
  );
}
