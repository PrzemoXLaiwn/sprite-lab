"use client";

// =============================================================================
// Admin → Usage: provider wallets, what's being made, credits, people
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, Pencil } from "lucide-react";
import { fetchUsageStats, saveClaudeBalance, type GenKind, type UsageStats } from "@/app/(dashboard)/admin/usage.actions";
import { Legend, SERIES_COLORS, UsageChart, type Series } from "./UsageCharts";
import type { LedgerStats } from "@/lib/billing/ledger-report";

const KINDS: { key: GenKind; label: string }[] = [
  { key: "sprite", label: "Sprites" },
  { key: "anim", label: "AI animations" },
  { key: "rig", label: "Rig idle" },
  { key: "dirs", label: "Directions / walk" },
  { key: "edit", label: "Edits" },
];
const KIND_LABEL = Object.fromEntries(KINDS.map((k) => [k.key, k.label])) as Record<GenKind, string>;
const KIND_COLOR = Object.fromEntries(KINDS.map((k, i) => [k.key, SERIES_COLORS[i]])) as Record<GenKind, string>;

const usd = (v: number, d = 2) => `$${v.toFixed(v > 0 && v < 0.1 ? 3 : d)}`;
const int = (v: number) => new Intl.NumberFormat("en-GB").format(Math.round(v));
const ago = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

function Card({ title, sub, children, className = "" }: { title: string; sub?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-white/[0.06] bg-[#19223F] p-4 sm:p-5 ${className}`}>
      <div className="mb-3">
        <h3 className="text-[14px] font-semibold text-white">{title}</h3>
        {sub && <p className="mt-0.5 text-[12px] text-[#9AA1CC]">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

function Tile({ label, value, hint, tone }: { label: string; value: string; hint?: React.ReactNode; tone?: "good" | "warn" | "bad" }) {
  const dot = tone === "good" ? "bg-emerald-400" : tone === "warn" ? "bg-amber-400" : tone === "bad" ? "bg-red-400" : "";
  return (
    <div className="min-w-0 rounded-2xl border border-white/[0.06] bg-[#19223F] p-4">
      <p className="flex items-center gap-1.5 truncate text-[12px] text-[#9AA1CC]">
        {dot && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden />}
        {label}
      </p>
      <p className="mt-1.5 truncate text-[22px] font-semibold leading-tight tracking-tight tabular-nums text-white sm:text-[26px]">{value}</p>
      {hint && <div className="mt-1 truncate font-mono text-[11px] text-[#8A92BF]">{hint}</div>}
    </div>
  );
}

/** Days of runway at the last-7-days burn rate. */
function runway(balance: number, burn7: number) {
  if (burn7 <= 0) return null;
  return balance / (burn7 / 7);
}
const toneFor = (days: number | null) => (days === null ? "good" : days < 3 ? "bad" : days < 10 ? "warn" : "good");

const pct = (v: number) => `${(v * 100).toFixed(v > 0 && v < 0.1 ? 1 : 0)}%`;
const usdFine = (v: number) => (v === 0 ? "$0" : v < 0.01 ? `${v.toFixed(4)}` : usd(v));
const LEDGER_SERIES = [
  { key: "rep", label: "Reported by provider", color: SERIES_COLORS[0] },
  { key: "est", label: "Our estimate (not reported)", color: SERIES_COLORS[1] },
];

/** Cost ledger: paid operations, provider calls and the Runware reconciliation. */
function LedgerSection({ ledger, dates, range, minRev }: { ledger: LedgerStats; dates: string[]; range: number; minRev: number }) {
  if (!ledger.available) {
    return (
      <Card title="Cost ledger" sub="Per-operation charges, refunds and provider calls">
        <p className="text-[12.5px] text-[#9AA1CC]">
          No ledger data on this database yet. The <span className="font-mono text-[#C8CCE8]">operations</span> and <span className="font-mono text-[#C8CCE8]">provider_calls</span> tables
          appear after <span className="font-mono text-[#C8CCE8]">prisma/sql/2026-10-13_cost_ledger.sql</span> runs (see docs/cost-guards-rollout.md).
        </p>
      </Card>
    );
  }
  const reported = ledger.days.reduce((a, x) => a + x.reportedUsd, 0);
  const estimated = ledger.days.reduce((a, x) => a + x.estimatedUsd, 0);
  const rc = ledger.reconciliation;
  const gap = rc?.gapUsd ?? null;
  // A gap within 10% of what Runware reported (or under $0.50) is timing noise
  const gapTone = gap === null ? undefined : Math.abs(gap) <= Math.max(0.5, Math.abs(rc?.reportedDeltaUsd ?? 0) * 0.1) ? "good" : "warn";
  const h = ledger.health;
  const series: Series[] = [
    { ...LEDGER_SERIES[0], values: ledger.days.map((x) => x.reportedUsd) },
    { ...LEDGER_SERIES[1], values: ledger.days.map((x) => x.estimatedUsd) },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Tile label={`Logged cost (${range}d)`} value={usd(reported + estimated)} hint={`rep. ${usd(reported)} · est. ${usd(estimated)}`} />
        <Tile label="Runware gap" value={gap === null ? "—" : `${gap < 0 ? "−" : ""}${usd(Math.abs(gap))}`} tone={gapTone}
          hint={rc ? <>unlogged · {ago(rc.checkedAt)} ago</> : "no snapshot yet"} />
        <Tile label="Stuck > 15 min" value={h ? int(h.stuckRunning) : "—"} tone={h ? (h.stuckRunning > 0 ? "bad" : "good") : undefined}
          hint={h ? "still running" : "unavailable"} />
        <Tile label="Refunds pending" value={h ? int(h.refundsPending) : "—"} tone={h ? (h.refundsPending > 0 ? "warn" : "good") : undefined}
          hint={h ? `${int(h.creditsDue)} cr owed back` : "unavailable"} />
      </div>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <Card title="Provider spend (ledger)" sub="USD per day from logged provider calls · the price the provider reported, or our list-price estimate when it reported none">
          <div className="mb-3"><Legend series={series} /></div>
          <UsageChart title="Ledger provider spend per day" dates={dates} series={series}
            format={(v) => `${v < 1 && v > 0 ? v.toFixed(2) : v.toFixed(v >= 10 ? 0 : 1)}`} />
          {ledger.providers.length > 0 && (
            <table className="mt-3 w-full text-[12.5px]">
              <thead><tr className="text-[#9AA1CC]"><th className="pb-1 text-left font-medium">Provider</th><th className="pb-1 text-right font-medium">Calls</th><th className="pb-1 text-right font-medium">Not ok</th><th className="pb-1 text-right font-medium">Cost</th></tr></thead>
              <tbody>
                {ledger.providers.map((p) => (
                  <tr key={p.provider} className="text-[#C8CCE8]">
                    <td className="py-0.5">{p.provider}</td>
                    <td className="py-0.5 text-right font-mono tabular-nums">{int(p.calls)}</td>
                    <td className="py-0.5 text-right font-mono tabular-nums">{int(p.failed)}</td>
                    <td className="py-0.5 text-right font-mono tabular-nums text-white">{usd(p.reportedUsd + p.estimatedUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Operations by feature" sub={`Paid operations, last ${range}d · provider cost per credit kept vs. ${usdFine(minRev)}, what one credit nets on the cheapest offer`}>
          {ledger.features.length ? (
            <div className="-mx-1 overflow-x-auto px-1">
              <table className="w-full min-w-[480px] text-[12.5px]">
                <thead>
                  <tr className="text-[#9AA1CC]">
                    <th className="pb-1 text-left font-medium">Feature</th>
                    <th className="pb-1 text-right font-medium">Ops</th>
                    <th className="pb-1 text-right font-medium">Failed</th>
                    <th className="pb-1 text-right font-medium">Refunded</th>
                    <th className="pb-1 text-right font-medium">Avg cost</th>
                    <th className="pb-1 text-right font-medium">Avg credits</th>
                    <th className="pb-1 text-right font-medium">$/credit</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.features.map((f) => {
                    const kept = f.creditsCharged - f.creditsRefunded;
                    const perCredit = kept > 0 ? f.costUsd / kept : null;
                    const losing = perCredit !== null && minRev > 0 && perCredit > minRev;
                    return (
                      <tr key={f.feature} className="border-t border-white/[0.04] text-[#C8CCE8]">
                        <td className="py-1 font-mono text-[12px]">{f.feature}{f.incomplete > 0 && <span className="ml-1 text-amber-300" title={`${f.incomplete} with an incomplete cost log`}>*</span>}</td>
                        <td className="py-1 text-right font-mono tabular-nums text-white">{int(f.ops)}</td>
                        <td className={`py-1 text-right font-mono tabular-nums ${f.ops && f.failed / f.ops > 0.15 ? "text-red-300" : ""}`}>{f.ops ? pct(f.failed / f.ops) : "—"}<span className="text-[#8A92BF]"> ({int(f.failed)})</span></td>
                        <td className="py-1 text-right font-mono tabular-nums">{int(f.creditsRefunded)}<span className="text-[#8A92BF]"> cr</span></td>
                        <td className="py-1 text-right font-mono tabular-nums text-white">{usdFine(f.ops ? f.costUsd / f.ops : 0)}</td>
                        <td className="py-1 text-right font-mono tabular-nums">{f.ops ? (kept / f.ops).toFixed(1) : "—"}</td>
                        <td className={`py-1 text-right font-mono tabular-nums ${losing ? "text-red-300" : "text-emerald-300"}`}>{perCredit === null ? "—" : usdFine(perCredit)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <p className="text-[12px] text-[#9AA1CC]">No paid operations in this range yet.</p>}
          <p className="mt-2 text-[11px] text-[#8A92BF]">Red $/credit: provider cost above what one credit nets on the cheapest offer. * cost log incomplete.</p>
        </Card>
      </div>
    </>
  );
}

/** `preview` renders fixed data without fetching (design checks only). */
export function UsagePanel({ preview }: { preview?: UsageStats } = {}) {
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [stats, setStats] = useState<UsageStats | null>(preview ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editBal, setEditBal] = useState(false);
  const [balInput, setBalInput] = useState("");

  const load = useCallback(async (r: 7 | 30 | 90) => {
    if (preview) return;
    setLoading(true);
    try {
      const res = await fetchUsageStats(r);
      if (res.success) { setStats(res.stats); setError(""); } else setError(res.error);
    } catch {
      setError("Couldn't load usage");
    } finally {
      setLoading(false);
    }
  }, [preview]);

  useEffect(() => { load(range); }, [range, load]);
  useEffect(() => {
    const id = setInterval(() => load(range), 60_000);
    return () => clearInterval(id);
  }, [range, load]);

  const saveBal = async () => {
    const v = Number(balInput.replace(",", "."));
    if (!Number.isFinite(v)) return;
    const r = await saveClaudeBalance(v);
    if (r.success) { setEditBal(false); setBalInput(""); load(range); }
  };

  const header = (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-[12.5px] text-[#9AA1CC] font-semibold">Usage {loading && stats && <Loader2 className="ml-1 inline h-3 w-3 animate-spin" />}</h2>
      <div role="radiogroup" aria-label="Range" className="flex rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5">
        {([7, 30, 90] as const).map((r) => (
          <button key={r} type="button" role="radio" aria-checked={range === r} onClick={() => setRange(r)}
            className={`h-8 rounded-md px-3 font-mono text-[12px] transition-colors ${range === r ? "bg-white/[0.1] text-white" : "text-[#9AA1CC] hover:text-white"}`}>{r}d</button>
        ))}
      </div>
    </div>
  );

  if (!stats) {
    return (
      <section className="mb-6 sm:mb-8">
        {header}
        {error ? <p className="text-[13px] text-red-300">{error}</p> : <div className="h-40 animate-pulse rounded-2xl bg-white/[0.03]" />}
      </section>
    );
  }

  const d = stats.days;
  const dates = d.map((x) => x.date);
  const sum = (f: (x: (typeof d)[number]) => number) => d.reduce((a, x) => a + f(x), 0);
  const last7 = d.slice(-7);
  const claude7 = last7.reduce((a, x) => a + x.claudeUsd, 0);
  const genSeries: Series[] = KINDS.map((k, i) => ({ key: k.key, label: k.label, color: SERIES_COLORS[i], values: d.map((x) => x.gens[k.key]) }));
  const genTotals = KINDS.map((k) => ({ ...k, n: sum((x) => x.gens[k.key]) }));
  const totalGens = genTotals.reduce((a, k) => a + k.n, 0);
  const rw = stats.runware;
  const rwDays = rw ? runway(rw.balance, rw.last7) : null;
  const cb = stats.claude.balance;
  const cDays = cb ? runway(cb.remaining, claude7) : null;
  const providerUsd = sum((x) => x.runwareUsd) + sum((x) => x.claudeUsd);
  const totalUsers = stats.plans.reduce((a, p) => a + p.users, 0);

  return (
    <section className="mb-6 space-y-3 sm:mb-8 sm:space-y-4">
      {header}

      {/* Wallets + headline numbers */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Tile label="Runware balance" value={rw ? usd(rw.balance) : "—"} tone={rw ? toneFor(rwDays) : undefined}
          hint={rw ? <>today {usd(rw.today)} · {rwDays !== null ? `≈${Math.floor(rwDays)}d left` : "no spend"}</> : "API unavailable"} />
        <div className="min-w-0 rounded-2xl border border-white/[0.06] bg-[#19223F] p-4">
          <p className="flex items-center gap-1.5 truncate text-[12px] text-[#9AA1CC]">
            {cb && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${toneFor(cDays) === "bad" ? "bg-red-400" : toneFor(cDays) === "warn" ? "bg-amber-400" : "bg-emerald-400"}`} aria-hidden />}
            Claude balance
            <button type="button" onClick={() => setEditBal((v) => !v)} aria-label="Set Claude balance" className="ml-auto rounded p-1 text-[#8A92BF] hover:text-white"><Pencil className="h-3 w-3" /></button>
          </p>
          {editBal ? (
            <form onSubmit={(e) => { e.preventDefault(); saveBal(); }} className="mt-1.5 flex gap-1.5">
              <input autoFocus inputMode="decimal" value={balInput} onChange={(e) => setBalInput(e.target.value)} placeholder="19.99"
                className="h-9 w-full min-w-0 rounded-lg border border-white/[0.1] bg-[#212B4E] px-2 font-mono text-[14px] text-white outline-none focus:border-[#FFA300]" />
              <button type="submit" className="h-9 shrink-0 rounded-lg bg-[#FFA300] px-3 text-[12px] font-semibold text-black">Save</button>
            </form>
          ) : (
            <p className="mt-1.5 truncate text-[22px] font-semibold leading-tight tracking-tight tabular-nums text-white sm:text-[26px]">{cb ? `≈${usd(cb.remaining)}` : "Set it"}</p>
          )}
          <p className="mt-1 truncate font-mono text-[11px] text-[#8A92BF]">
            {cb ? <>{cDays !== null ? `≈${Math.floor(cDays)}d left · ` : ""}set {ago(cb.setAt)} ago</> : <>type the console balance ✎</>}
            {" · "}<a href="https://console.anthropic.com/settings/billing" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-[#9AA1CC] underline-offset-2 hover:text-white hover:underline">console<ExternalLink className="h-2.5 w-2.5" /></a>
          </p>
        </div>
        <Tile label={`Provider cost (${range}d)`} value={usd(providerUsd)} hint={`Runware ${usd(sum((x) => x.runwareUsd))} · Claude ${usd(stats.claude.total)}`} />
        <Tile label={`Revenue (${range}d)`} value={usd(stats.totals.revenue30)} tone={stats.totals.revenue30 >= providerUsd ? "good" : "warn"}
          hint={`${stats.totals.revenue30 - providerUsd >= 0 ? "+" : "−"}${usd(Math.abs(stats.totals.revenue30 - providerUsd))} after providers`} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Tile label={`Generations (${range}d)`} value={int(totalGens)} hint={`${int(sum((x) => x.activeUsers) / Math.max(1, d.length))} creators/day avg`} />
        <Tile label={`Credits spent (${range}d)`} value={int(sum((x) => x.credits))} hint={`${int(stats.totals.creditsHeld)} held by users`} />
        <Tile label="Failed → refunded" value={`${(stats.totals.failedRate * 100).toFixed(1)}%`} tone={stats.totals.failedRate > 0.15 ? "bad" : stats.totals.failedRate > 0.07 ? "warn" : "good"}
          hint={`${int(sum((x) => x.refunds))} refunds`} />
        <Tile label={`Signups (${range}d)`} value={int(sum((x) => x.signups))} hint={`${int(totalUsers)} users total`} />
      </div>

      {/* What's being made */}
      <Card title="What people make" sub="Generations per day by type · hover a day for details">
        <div className="mb-3"><Legend series={genSeries} /></div>
        <UsageChart title="Generations per day by type" dates={dates} series={genSeries} />
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {genTotals.map((k) => (
            <div key={k.key} className="rounded-lg bg-white/[0.03] px-2.5 py-2">
              <p className="flex items-center gap-1.5 truncate text-[11.5px] text-[#9AA1CC]"><span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: KIND_COLOR[k.key] }} />{k.label}</p>
              <p className="font-mono text-[15px] tabular-nums text-white">{int(k.n)} <span className="text-[11px] text-[#8A92BF]">{totalGens ? Math.round((k.n / totalGens) * 100) : 0}%</span></p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <Card title="Provider spend" sub="USD per day · Runware images + Claude (planner, rig joints)">
          <div className="mb-3"><Legend series={[{ key: "rw", label: "Runware", color: SERIES_COLORS[0], values: [] }, { key: "cl", label: "Claude", color: SERIES_COLORS[1], values: [] }]} /></div>
          <UsageChart title="Provider spend per day" dates={dates} format={(v) => `$${v < 1 && v > 0 ? v.toFixed(2) : v.toFixed(v >= 10 ? 0 : 1)}`}
            series={[
              { key: "rw", label: "Runware", color: SERIES_COLORS[0], values: d.map((x) => x.runwareUsd) },
              { key: "cl", label: "Claude", color: SERIES_COLORS[1], values: d.map((x) => x.claudeUsd) },
            ]} />
        </Card>
        <Card title="Credits spent" sub="Charged minus refunds, per day">
          <UsageChart title="Credits spent per day" dates={dates} series={[{ key: "cr", label: "Credits", color: SERIES_COLORS[0], values: d.map((x) => x.credits) }]} />
        </Card>
      </div>

      <LedgerSection ledger={stats.ledger} dates={dates} range={range} minRev={stats.minRevenuePerCreditUsd} />

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <Card title="People" sub="New signups vs. people who generated something">
          <div className="mb-3"><Legend series={[{ key: "a", label: "Active creators", color: SERIES_COLORS[0], values: [] }, { key: "s", label: "Signups", color: SERIES_COLORS[1], values: [] }]} /></div>
          <UsageChart kind="lines" title="Signups and active creators per day" dates={dates}
            series={[
              { key: "a", label: "Active creators", color: SERIES_COLORS[0], values: d.map((x) => x.activeUsers) },
              { key: "s", label: "Signups", color: SERIES_COLORS[1], values: d.map((x) => x.signups) },
            ]} />
        </Card>
        <Card title="Plans & Claude" sub="Who pays · where Claude money goes">
          <ul className="space-y-1.5">
            {stats.plans.map((p) => (
              <li key={p.plan} className="flex items-center gap-2 text-[12.5px]">
                <span className="w-20 shrink-0 text-[#C8CCE8]">{p.plan}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                  <span className="block h-full rounded-full bg-[#3987e5]" style={{ width: `${Math.max(1.5, (p.users / Math.max(1, totalUsers)) * 100)}%` }} />
                </span>
                <span className="w-12 shrink-0 text-right font-mono tabular-nums text-white">{int(p.users)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-white/[0.06] pt-3">
            {stats.claude.byFeature.length ? (
              <table className="w-full text-[12.5px]">
                <thead><tr className="text-[#9AA1CC]"><th className="pb-1 text-left font-medium">Claude use</th><th className="pb-1 text-right font-medium">Calls</th><th className="pb-1 text-right font-medium">Cost</th></tr></thead>
                <tbody>
                  {stats.claude.byFeature.map((f) => (
                    <tr key={f.feature} className="text-[#C8CCE8]"><td className="py-0.5">{f.feature}</td><td className="py-0.5 text-right font-mono tabular-nums">{int(f.calls)}</td><td className="py-0.5 text-right font-mono tabular-nums text-white">{usd(f.usd)}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-[12px] text-[#9AA1CC]">Claude calls are logged from now on — numbers appear after the next animation.</p>}
          </div>
        </Card>
      </div>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <Card title="Top creators" sub="Last 7 days">
          {stats.topUsers.length ? (
            <ul className="-mx-1 divide-y divide-white/[0.05]">
              {stats.topUsers.map((u) => (
                <li key={u.email + u.lastAt} className="flex items-center gap-2 px-1 py-2 text-[12.5px]">
                  <span className="min-w-0 flex-1 truncate text-[#FFF1E8]">{u.email}</span>
                  {u.plan !== "FREE" && <span className="shrink-0 rounded bg-emerald-400/10 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300">{u.plan}</span>}
                  <span className="w-14 shrink-0 text-right font-mono tabular-nums text-white">{int(u.gens)}<span className="text-[#8A92BF]"> gen</span></span>
                  <span className="w-14 shrink-0 text-right font-mono tabular-nums text-[#C8CCE8]">{int(u.credits)}<span className="text-[#8A92BF]"> cr</span></span>
                  <span className="w-8 shrink-0 text-right font-mono text-[11px] text-[#8A92BF]">{ago(u.lastAt)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-[12px] text-[#9AA1CC]">Nobody generated this week.</p>}
        </Card>
        <Card title="Live feed" sub="Latest generations">
          <ul className="-mx-1 divide-y divide-white/[0.05]">
            {stats.recent.map((r) => (
              <li key={r.id} className="flex items-center gap-2 px-1 py-2 text-[12.5px]">
                <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: KIND_COLOR[r.kind] }} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[#FFF1E8]">{r.prompt || "—"}</span>
                  <span className="block truncate font-mono text-[10.5px] text-[#8A92BF]">{KIND_LABEL[r.kind]} · {r.style.toLowerCase().replace(/_/g, " ")} · {r.email}</span>
                </span>
                <span className="shrink-0 text-right font-mono text-[11px] tabular-nums text-[#9AA1CC]">{r.costUsd ? usd(r.costUsd) : ""}<span className="block text-[#8A92BF]">{ago(r.at)}</span></span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </section>
  );
}
