import { Mail } from "lucide-react";
import type { LifecycleRunResult } from "@/lib/email/lifecycle/run";
import type { SequenceId, SkipReason } from "@/lib/email/lifecycle/rules";
import { EmailFrame } from "./EmailFrame";
import { EmailSwitchboardPanel, type EmailSwitchboard } from "./EmailSwitchboardPanel";

export interface EmailPreview {
  sequence: SequenceId;
  subject: string;
  preview: string;
  html: string;
  text: string;
}

export const SEQUENCE_INFO: Record<SequenceId, { name: string; rule: string }> = {
  bring_to_life: { name: "Bring your sprite to life", rule: "Account 1–7 days old, made a sprite, never animated. Once." },
  unfinished: { name: "Unfinished work", rule: "Made something in the last 7 days, nothing for 2+ days. Max once a week, never the same item twice." },
  unused_credits: { name: "Unused credits", rule: "Away 5–20 days with credits left. Once per absence." },
  winback: { name: "Win-back", rule: "Away 21+ days. Once per absence." },
  inspiration: { name: "Weekly inspiration", rule: "Active in the last 60 days and no other marketing email in 7 days. 3+ community picks, otherwise curated examples from /showcase labelled as examples." },
};

const SKIP_LABELS: Record<SkipReason, string> = {
  invalid_email: "Invalid address",
  opted_out: "Marketing off / unsubscribed",
  suppressed: "Bounced / complained",
  quiet_period: "First 24 h after signup",
  already_today: "Already emailed today",
  weekly_cap: "3 emails in 7 days",
  no_match: "No sequence fits",
};

export function EmailPreviewPanel({
  previews,
  dryRun,
  dryRunError,
  sendingEnabled,
  switchboard,
}: {
  previews: EmailPreview[];
  dryRun: LifecycleRunResult | null;
  dryRunError: string | null;
  sendingEnabled: boolean;
  switchboard: EmailSwitchboard;
}) {
  const sequences = previews.map((p) => p.sequence);
  return (
    <div className="mx-auto max-w-[1100px] px-4 py-5 text-[#ECEEF3] sm:px-5 sm:py-6 lg:px-8">
      <div className="mb-6">
        <div className="flex items-center gap-2.5">
          <Mail className="h-5 w-5 text-[#FF8A3D]" />
          <h1 className="font-display text-[22px] font-semibold tracking-tight text-white">Lifecycle emails</h1>
        </div>
        <p className="mt-1 text-[13px] text-[#8B93A5]">
          Preview with sample data and today&apos;s dry run. Nothing on this page sends email.
        </p>
      </div>

      <EmailSwitchboardPanel s={switchboard} />

      <section className="mb-8 rounded-2xl border border-white/[0.06] bg-[#0E1016] p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#8B93A5]">Dry run · today</h2>
          <span
            className={`rounded-full border px-2.5 py-1 font-mono text-[11px] ${
              sendingEnabled ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300" : "border-white/[0.1] bg-white/[0.04] text-[#C9CFDB]"
            }`}
          >
            MARKETING_EMAILS_ENABLED {sendingEnabled ? "on" : "off"}
          </span>
        </div>

        {dryRunError && (
          <p className="rounded-xl border border-red-400/20 bg-red-500/[0.06] px-4 py-3 text-[13px] text-red-200">
            Couldn&apos;t compute the dry run: {dryRunError}
          </p>
        )}

        {dryRun && (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Users scanned" value={dryRun.scanned} />
              <Stat label="Would get one today" value={Object.values(dryRun.planned).reduce((a, b) => a + b, 0)} />
              <Stat label="Over daily cap" value={dryRun.deferred} hint={`cap ${dryRun.dailyCap}/day`} />
              <Stat
                label={dryRun.inspirationSource === "showcase" ? "Inspiration examples" : "Community picks"}
                value={dryRun.inspirationItems}
                hint={dryRun.inspirationSource === "showcase" ? "curated /showcase fallback" : undefined}
              />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="min-w-0">
                <h3 className="mb-2 text-[13px] font-semibold text-white">By sequence</h3>
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="font-mono text-[11px] text-[#8B93A5]">
                      <th className="py-1.5 pr-2 font-normal">Sequence</th>
                      <th className="py-1.5 pr-2 text-right font-normal">Qualify</th>
                      <th className="py-1.5 text-right font-normal">Today</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sequences.map((s) => (
                      <tr key={s} className="border-t border-white/[0.05]">
                        <td className="py-2 pr-2 text-[#C9CFDB]">{SEQUENCE_INFO[s].name}</td>
                        <td className="py-2 pr-2 text-right font-mono tabular-nums">{dryRun.eligible[s]}</td>
                        <td className="py-2 text-right font-mono tabular-nums text-[#FF9F43]">{dryRun.planned[s]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="min-w-0">
                <h3 className="mb-2 text-[13px] font-semibold text-white">Not emailed today</h3>
                <table className="w-full text-left text-[13px]">
                  <tbody>
                    {(Object.keys(SKIP_LABELS) as SkipReason[]).map((r) => (
                      <tr key={r} className="border-t border-white/[0.05] first:border-t-0">
                        <td className="py-2 pr-2 text-[#C9CFDB]">{SKIP_LABELS[r]}</td>
                        <td className="py-2 text-right font-mono tabular-nums">{dryRun.skipped[r] ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>

      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Templates">
        {previews.map((p) => (
          <a
            key={p.sequence}
            href={`#${p.sequence}`}
            className="inline-flex h-10 items-center rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-[13px] text-[#C9CFDB] hover:text-white"
          >
            {SEQUENCE_INFO[p.sequence].name}
          </a>
        ))}
      </nav>

      {previews.map((p) => (
        <section key={p.sequence} id={p.sequence} className="mb-10 scroll-mt-6">
          <h2 className="font-display text-[18px] font-semibold text-white">{SEQUENCE_INFO[p.sequence].name}</h2>
          <p className="mt-1 text-[13px] text-[#8B93A5]">{SEQUENCE_INFO[p.sequence].rule}</p>
          <dl className="my-3 grid gap-1 rounded-xl border border-white/[0.06] bg-[#151922] p-3 text-[13px]">
            <div className="flex min-w-0 gap-2">
              <dt className="w-16 shrink-0 font-mono text-[11px] leading-5 text-[#8B93A5]">Subject</dt>
              <dd className="min-w-0 break-words text-white">{p.subject}</dd>
            </div>
            <div className="flex min-w-0 gap-2">
              <dt className="w-16 shrink-0 font-mono text-[11px] leading-5 text-[#8B93A5]">Preview</dt>
              <dd className="min-w-0 break-words text-[#C9CFDB]">{p.preview}</dd>
            </div>
          </dl>
          <EmailFrame html={p.html} title={`${SEQUENCE_INFO[p.sequence].name} email preview`} />
          <details className="mt-3 rounded-xl border border-white/[0.06] bg-[#0E1016] p-3">
            <summary className="cursor-pointer text-[13px] text-[#C9CFDB]">Plain-text version</summary>
            <pre className="mt-3 whitespace-pre-wrap break-words font-mono text-[12px] leading-5 text-[#C9CFDB]">{p.text}</pre>
          </details>
        </section>
      ))}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/[0.06] bg-[#151922] p-3">
      <p className="truncate text-[12px] text-[#8B93A5]">{label}</p>
      <p className="mt-1 font-mono text-[22px] font-semibold tabular-nums text-white">{value.toLocaleString("en-US")}</p>
      {hint && <p className="mt-0.5 font-mono text-[11px] text-[#8B93A5]">{hint}</p>}
    </div>
  );
}
