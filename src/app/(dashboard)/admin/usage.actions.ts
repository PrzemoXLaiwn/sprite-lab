"use server";

// =============================================================================
// Admin usage — daily series for the charts on /admin
// =============================================================================
// Everything comes from tables we already write:
//   generations          → what was made (kind per row) + Runware $ per row
//   credit_transactions  → credits spent / refunded / bought
//   generation_events    → Claude calls (eventType "claude_usage", see claude-usage.ts)
//   users                → signups, plans
//   operations / provider_calls / cost_reconciliations → the cost ledger
//                          (src/lib/billing/ledger-report.ts; empty until the
//                          ledger migration has run)
// Plus the live Runware wallet (accountManagement API). Anthropic has no
// balance API: the admin types the console balance once, we subtract the
// Claude spend we logged since then.
// =============================================================================

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { CLAUDE_BALANCE_EVENT, CLAUDE_USAGE_EVENT } from "@/lib/claude-usage";
import { loadLedgerStats, type LedgerStats } from "@/lib/billing/ledger-report";
import { FX_GBP_PER_USD, netPerCreditGbp, offers } from "@/config/economics";

export type GenKind = "sprite" | "anim" | "rig" | "dirs" | "edit";

export interface UsageDay {
  date: string;
  gens: Record<GenKind, number>;
  credits: number;
  refunds: number;
  runwareUsd: number;
  claudeUsd: number;
  signups: number;
  activeUsers: number;
}

export interface UsageStats {
  days: UsageDay[];
  runware: { balance: number; today: number; last7: number; last30: number } | null;
  claude: { byFeature: { feature: string; calls: number; usd: number }[]; total: number; balance: { remaining: number; setAt: string; setTo: number } | null };
  plans: { plan: string; users: number }[];
  topUsers: { email: string; plan: string; gens: number; credits: number; lastAt: string }[];
  recent: { id: string; kind: GenKind; prompt: string; style: string; email: string; costUsd: number; at: string }[];
  totals: { revenue30: number; creditsHeld: number; failedRate: number };
  ledger: LedgerStats;
  /** Lowest net revenue one credit brings (cheapest offer, no VAT), USD — the bar for cost per credit. */
  minRevenuePerCreditUsd: number;
}

function minRevenuePerCreditUsd(): number {
  try {
    return Math.min(...offers().map((o) => netPerCreditGbp(o, false))) / FX_GBP_PER_USD;
  } catch {
    return 0;
  }
}

const KIND_SQL = `case
  when subcategory_id = 'ANIMATION' and full_prompt like 'rig:%' then 'rig'
  when subcategory_id = 'ANIMATION' and (prompt like '[Animation: 4-direction%' or prompt like '[Animation: _ directions%') then 'dirs'
  when subcategory_id = 'ANIMATION' then 'anim'
  when prompt like '[Edited]%' then 'edit'
  else 'sprite' end`;

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdmin(user.id))) throw new Error("Unauthorized");
  return user;
}

async function runwareWallet(): Promise<UsageStats["runware"]> {
  const key = process.env.RUNWARE_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.runware.ai/v1", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify([{ taskType: "accountManagement", taskUUID: crypto.randomUUID(), operation: "getDetails" }]),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const d = (await res.json())?.data?.[0];
    if (typeof d?.balance !== "number") return null;
    return { balance: d.balance, today: d.usage?.today?.credits ?? 0, last7: d.usage?.last7Days?.credits ?? 0, last30: d.usage?.last30Days?.credits ?? 0 };
  } catch {
    return null;
  }
}

const maskEmail = (e: string) => {
  const [u, dom] = e.split("@");
  return dom ? `${u.slice(0, 3)}${u.length > 3 ? "…" : ""}@${dom}` : e;
};

export async function fetchUsageStats(range: 7 | 30 | 90 = 30): Promise<{ success: true; stats: UsageStats } | { success: false; error: string }> {
  try {
    await requireAdmin();
  } catch {
    return { success: false, error: "Unauthorized" };
  }
  const days = [7, 30, 90].includes(range) ? range : 30;
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const since7 = new Date(Date.now() - 7 * 864e5);
  const dates = Array.from({ length: days }, (_, i) => new Date(start.getTime() + i * 864e5).toISOString().slice(0, 10));

  type Row = Record<string, unknown>;
  const q = <T = Row>(sql: string, ...args: unknown[]) => prisma.$queryRawUnsafe<T[]>(sql, ...args);
  const day = (col: string) => `to_char(date_trunc('day', ${col} at time zone 'UTC'), 'YYYY-MM-DD')`;

  const [gens, credits, signups, active, claudeDays, claudeFeat, plans, top, recent, balanceRow, revenue, held, wallet, ledger] = await Promise.all([
    q<{ d: string; k: GenKind; n: number; cost: number }>(`select ${day("created_at")} d, ${KIND_SQL} k, count(*)::int n, coalesce(sum(replicate_cost),0)::float cost from generations where created_at >= $1 group by 1,2`, start),
    q<{ d: string; spent: number; refunded: number; refunds: number }>(`select ${day("created_at")} d,
        coalesce(sum(case when type='GENERATION' then -amount end),0)::int spent,
        coalesce(sum(case when type='REFUND' then amount end),0)::int refunded,
        count(*) filter (where type='REFUND')::int refunds
      from credit_transactions where created_at >= $1 group by 1`, start),
    q<{ d: string; n: number }>(`select ${day("created_at")} d, count(*)::int n from users where created_at >= $1 group by 1`, start),
    q<{ d: string; n: number }>(`select ${day("created_at")} d, count(distinct user_id)::int n from generations where created_at >= $1 group by 1`, start),
    q<{ d: string; usd: number }>(`select ${day("created_at")} d, coalesce(sum((metadata::jsonb->>'cost')::float),0)::float usd from generation_events where event_type=$2 and created_at >= $1 group by 1`, start, CLAUDE_USAGE_EVENT),
    q<{ feature: string; calls: number; usd: number }>(`select metadata::jsonb->>'feature' feature, count(*)::int calls, coalesce(sum((metadata::jsonb->>'cost')::float),0)::float usd from generation_events where event_type=$2 and created_at >= $1 group by 1 order by usd desc`, start, CLAUDE_USAGE_EVENT),
    q<{ plan: string; users: number }>(`select plan, count(*)::int users from users group by 1 order by users desc`),
    q<{ email: string; plan: string; gens: number; credits: number; last_at: Date }>(`select u.email, u.plan, count(g.id)::int gens,
        coalesce((select -sum(t.amount) from credit_transactions t where t.user_id=u.id and t.type in ('GENERATION','REFUND') and t.created_at >= $1),0)::int credits,
        max(g.created_at) last_at
      from generations g join users u on u.id = g.user_id where g.created_at >= $1 group by u.id, u.email, u.plan order by gens desc limit 8`, since7),
    q<{ id: string; k: GenKind; prompt: string; style_id: string; email: string; cost: number | null; created_at: Date }>(`select g.id, ${KIND_SQL.replace(/subcategory_id|full_prompt|prompt/g, (m) => `g.${m}`)} k, g.prompt, g.style_id, u.email, g.replicate_cost cost, g.created_at
      from generations g left join users u on u.id = g.user_id order by g.created_at desc limit 12`),
    prisma.generationEvent.findFirst({ where: { eventType: CLAUDE_BALANCE_EVENT }, orderBy: { createdAt: "desc" } }),
    q<{ s: number }>(`select coalesce(sum(money_amount),0)::float s from credit_transactions where type='PURCHASE' and created_at >= $1`, start),
    q<{ s: number }>(`select coalesce(sum(credits),0)::int s from users`),
    runwareWallet(),
    loadLedgerStats(q, start, dates),
  ]);

  // Claude balance = what the admin typed − logged spend since then
  let balance: UsageStats["claude"]["balance"] = null;
  if (balanceRow?.metadata) {
    const setTo = Number(JSON.parse(balanceRow.metadata).balance) || 0;
    const [{ s }] = await q<{ s: number }>(`select coalesce(sum((metadata::jsonb->>'cost')::float),0)::float s from generation_events where event_type=$1 and created_at > $2`, CLAUDE_USAGE_EVENT, balanceRow.createdAt);
    balance = { setTo, setAt: balanceRow.createdAt.toISOString(), remaining: setTo - s };
  }

  const series: UsageDay[] = [];
  for (const date of dates) {
    series.push({ date, gens: { sprite: 0, anim: 0, rig: 0, dirs: 0, edit: 0 }, credits: 0, refunds: 0, runwareUsd: 0, claudeUsd: 0, signups: 0, activeUsers: 0 });
  }
  const at = new Map(series.map((s) => [s.date, s]));
  for (const r of gens) { const s = at.get(r.d); if (s) { s.gens[r.k] += r.n; s.runwareUsd += r.cost; } }
  for (const r of credits) { const s = at.get(r.d); if (s) { s.credits = Math.max(0, r.spent - r.refunded); s.refunds = r.refunds; } }
  for (const r of signups) { const s = at.get(r.d); if (s) s.signups = r.n; }
  for (const r of active) { const s = at.get(r.d); if (s) s.activeUsers = r.n; }
  for (const r of claudeDays) { const s = at.get(r.d); if (s) s.claudeUsd = r.usd; }

  const totalGens = series.reduce((a, s) => a + Object.values(s.gens).reduce((x, y) => x + y, 0), 0);
  const totalRefunds = series.reduce((a, s) => a + s.refunds, 0);

  return {
    success: true,
    stats: {
      days: series,
      runware: wallet,
      claude: { byFeature: claudeFeat, total: claudeFeat.reduce((a, f) => a + f.usd, 0), balance },
      plans,
      topUsers: top.map((t) => ({ email: maskEmail(t.email), plan: t.plan, gens: t.gens, credits: t.credits, lastAt: new Date(t.last_at).toISOString() })),
      recent: recent.map((r) => ({ id: r.id, kind: r.k, prompt: r.prompt.replace(/^\[[^\]]*\]\s*/, "").slice(0, 80), style: r.style_id, email: r.email ? maskEmail(r.email) : "—", costUsd: r.cost ?? 0, at: new Date(r.created_at).toISOString() })),
      totals: { revenue30: revenue[0]?.s ?? 0, creditsHeld: held[0]?.s ?? 0, failedRate: totalGens + totalRefunds > 0 ? totalRefunds / (totalGens + totalRefunds) : 0 },
      ledger,
      minRevenuePerCreditUsd: minRevenuePerCreditUsd(),
    },
  };
}

/** Admin types the balance shown at console.anthropic.com → we count down from it. */
export async function saveClaudeBalance(balance: number): Promise<{ success: boolean }> {
  let user;
  try { user = await requireAdmin(); } catch { return { success: false }; }
  if (!Number.isFinite(balance) || balance < 0 || balance > 100000) return { success: false };
  await prisma.generationEvent.create({ data: { generationId: "claude", userId: user.id, eventType: CLAUDE_BALANCE_EVENT, metadata: JSON.stringify({ balance }) } });
  return { success: true };
}
