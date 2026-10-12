"use client";

// =============================================================================
// Admin → Usage: provider wallets, what's being made, credits, people
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, Pencil } from "lucide-react";
import { fetchUsageStats, saveClaudeBalance, type GenKind, type UsageStats } from "@/app/(dashboard)/admin/usage.actions";
import { Legend, SERIES_COLORS, UsageChart, type Series } from "./UsageCharts";

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
    <section className={`min-w-0 rounded-2xl border border-white/[0.06] bg-[#0E1016] p-4 sm:p-5 ${className}`}>
      <div className="mb-3">
        <h3 className="text-[14px] font-semibold text-white">{title}</h3>
        {sub && <p className="mt-0.5 text-[12px] text-[#8B93A5]">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

function Tile({ label, value, hint, tone }: { label: string; value: string; hint?: React.ReactNode; tone?: "good" | "warn" | "bad" }) {
  const dot = tone === "good" ? "bg-emerald-400" : tone === "warn" ? "bg-amber-400" : tone === "bad" ? "bg-red-400" : "";
  return (
    <div className="min-w-0 rounded-2xl border border-white/[0.06] bg-[#0E1016] p-4">
      <p className="flex items-center gap-1.5 truncate text-[12px] text-[#8B93A5]">
        {dot && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden />}
        {label}
      </p>
      <p className="mt-1.5 truncate text-[22px] font-semibold leading-tight tracking-tight tabular-nums text-white sm:text-[26px]">{value}</p>
      {hint && <div className="mt-1 truncate font-mono text-[11px] text-[#7A8294]">{hint}</div>}
    </div>
  );
}

/** Days of runway at the last-7-days burn rate. */
function runway(balance: number, burn7: number) {
  if (burn7 <= 0) return null;
  return balance / (burn7 / 7);
}
const toneFor = (days: number | null) => (days === null ? "good" : days < 3 ? "bad" : days < 10 ? "warn" : "good");

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
      <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#8B93A5]">Usage {loading && stats && <Loader2 className="ml-1 inline h-3 w-3 animate-spin" />}</h2>
      <div role="radiogroup" aria-label="Range" className="flex rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5">
        {([7, 30, 90] as const).map((r) => (
          <button key={r} type="button" role="radio" aria-checked={range === r} onClick={() => setRange(r)}
            className={`h-8 rounded-md px-3 font-mono text-[12px] transition-colors ${range === r ? "bg-white/[0.1] text-white" : "text-[#8B93A5] hover:text-white"}`}>{r}d</button>
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
        <div className="min-w-0 rounded-2xl border border-white/[0.06] bg-[#0E1016] p-4">
          <p className="flex items-center gap-1.5 truncate text-[12px] text-[#8B93A5]">
            {cb && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${toneFor(cDays) === "bad" ? "bg-red-400" : toneFor(cDays) === "warn" ? "bg-amber-400" : "bg-emerald-400"}`} aria-hidden />}
            Claude balance
            <button type="button" onClick={() => setEditBal((v) => !v)} aria-label="Set Claude balance" className="ml-auto rounded p-1 text-[#7A8294] hover:text-white"><Pencil className="h-3 w-3" /></button>
          </p>
          {editBal ? (
            <form onSubmit={(e) => { e.preventDefault(); saveBal(); }} className="mt-1.5 flex gap-1.5">
              <input autoFocus inputMode="decimal" value={balInput} onChange={(e) => setBalInput(e.target.value)} placeholder="19.99"
                className="h-9 w-full min-w-0 rounded-lg border border-white/[0.1] bg-[#151922] px-2 font-mono text-[14px] text-white outline-none focus:border-[#FF8A3D]" />
              <button type="submit" className="h-9 shrink-0 rounded-lg bg-[#FF8A3D] px-3 text-[12px] font-semibold text-black">Save</button>
            </form>
          ) : (
            <p className="mt-1.5 truncate text-[22px] font-semibold leading-tight tracking-tight tabular-nums text-white sm:text-[26px]">{cb ? `≈${usd(cb.remaining)}` : "Set it"}</p>
          )}
          <p className="mt-1 truncate font-mono text-[11px] text-[#7A8294]">
            {cb ? <>{cDays !== null ? `≈${Math.floor(cDays)}d left · ` : ""}set {ago(cb.setAt)} ago</> : <>type the console balance ✎</>}
            {" · "}<a href="https://console.anthropic.com/settings/billing" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-[#8B93A5] underline-offset-2 hover:text-white hover:underline">console<ExternalLink className="h-2.5 w-2.5" /></a>
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
              <p className="flex items-center gap-1.5 truncate text-[11.5px] text-[#8B93A5]"><span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: KIND_COLOR[k.key] }} />{k.label}</p>
              <p className="font-mono text-[15px] tabular-nums text-white">{int(k.n)} <span className="text-[11px] text-[#7A8294]">{totalGens ? Math.round((k.n / totalGens) * 100) : 0}%</span></p>
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
                <span className="w-20 shrink-0 text-[#C9CFDB]">{p.plan}</span>
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
                <thead><tr className="text-[#8B93A5]"><th className="pb-1 text-left font-medium">Claude use</th><th className="pb-1 text-right font-medium">Calls</th><th className="pb-1 text-right font-medium">Cost</th></tr></thead>
                <tbody>
                  {stats.claude.byFeature.map((f) => (
                    <tr key={f.feature} className="text-[#C9CFDB]"><td className="py-0.5">{f.feature}</td><td className="py-0.5 text-right font-mono tabular-nums">{int(f.calls)}</td><td className="py-0.5 text-right font-mono tabular-nums text-white">{usd(f.usd)}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-[12px] text-[#8B93A5]">Claude calls are logged from now on — numbers appear after the next animation.</p>}
          </div>
        </Card>
      </div>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <Card title="Top creators" sub="Last 7 days">
          {stats.topUsers.length ? (
            <ul className="-mx-1 divide-y divide-white/[0.05]">
              {stats.topUsers.map((u) => (
                <li key={u.email + u.lastAt} className="flex items-center gap-2 px-1 py-2 text-[12.5px]">
                  <span className="min-w-0 flex-1 truncate text-[#ECEEF3]">{u.email}</span>
                  {u.plan !== "FREE" && <span className="shrink-0 rounded bg-emerald-400/10 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300">{u.plan}</span>}
                  <span className="w-14 shrink-0 text-right font-mono tabular-nums text-white">{int(u.gens)}<span className="text-[#7A8294]"> gen</span></span>
                  <span className="w-14 shrink-0 text-right font-mono tabular-nums text-[#C9CFDB]">{int(u.credits)}<span className="text-[#7A8294]"> cr</span></span>
                  <span className="w-8 shrink-0 text-right font-mono text-[11px] text-[#7A8294]">{ago(u.lastAt)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-[12px] text-[#8B93A5]">Nobody generated this week.</p>}
        </Card>
        <Card title="Live feed" sub="Latest generations">
          <ul className="-mx-1 divide-y divide-white/[0.05]">
            {stats.recent.map((r) => (
              <li key={r.id} className="flex items-center gap-2 px-1 py-2 text-[12.5px]">
                <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: KIND_COLOR[r.kind] }} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[#ECEEF3]">{r.prompt || "—"}</span>
                  <span className="block truncate font-mono text-[10.5px] text-[#7A8294]">{KIND_LABEL[r.kind]} · {r.style.toLowerCase().replace(/_/g, " ")} · {r.email}</span>
                </span>
                <span className="shrink-0 text-right font-mono text-[11px] tabular-nums text-[#8B93A5]">{r.costUsd ? usd(r.costUsd) : ""}<span className="block text-[#7A8294]">{ago(r.at)}</span></span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </section>
  );
}
