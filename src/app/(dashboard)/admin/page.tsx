"use client";

// =============================================================================
// SPRITELAB — ADMIN DASHBOARD
// =============================================================================
// Counters-only view. Two questions answered at a glance:
//   1. How many people use SpriteLab?
//   2. How much does it cost vs how much do we make?
//
// User management, reports, role changes, broadcast email, image-quality
// audits, and other "admin tools" sub-pages were removed because nothing
// else in the codebase referenced them and they bloated the panel.
// Reintroduce them as fresh focused tools when there's a real need.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Users,
  UserCheck,
  UserPlus,
  Image as ImageIcon,
  PoundSterling,
  Coins,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { checkAdminAccess, fetchAdminStats } from "./page.actions";

interface AdminStats {
  totalUsers: number;
  paidUsers: number;
  activeUsers7d: number;
  newUsers7d: number;
  totalGenerations: number;
  generations7d: number;
  generations24h: number;
  totalRevenue: number;
  totalRunwareCost: number;
  profit: number;
  recentTransactions: Array<{
    id: string;
    amount: number;
    moneyAmount: number | null;
    createdAt: Date | string;
    user: { email: string; name: string | null };
  }>;
}

const REFRESH_INTERVAL_MS = 30_000;

function formatGBP(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: value < 100 ? 2 : 0,
  }).format(value);
}

function formatUSD(value: number): string {
  // Runware costs are recorded in USD on the Generation row.
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value < 10 ? 4 : 2,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-GB").format(value);
}

function formatRelative(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0E1016] p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="h-3 w-20 animate-pulse rounded bg-white/[0.06]" />
        <div className="h-4 w-4 animate-pulse rounded bg-white/[0.06]" />
      </div>
      <div className="h-8 w-20 animate-pulse rounded bg-white/[0.06]" />
      <div className="mt-3 h-3 w-28 animate-pulse rounded bg-white/[0.04]" />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-[#8B93A5]">{children}</h2>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  emphasis,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  emphasis?: "positive" | "negative" | "neutral";
}) {
  const emphasisClass =
    emphasis === "positive" ? "text-emerald-300" :
    emphasis === "negative" ? "text-red-300" :
    "text-white";
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0E1016] p-5">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[12px] text-[#8B93A5]">{label}</p>
        <Icon className="h-4 w-4 text-[#7A8294]" />
      </div>
      <p className={`font-sans tracking-tight text-[28px] font-semibold leading-tight tabular-nums ${emphasisClass}`}>{value}</p>
      {hint && <p className="mt-2 font-mono text-[11px] text-[#7A8294]">{hint}</p>}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const loadStats = useCallback(async () => {
    try {
      const result = await fetchAdminStats();
      if (!isMounted.current) return;
      if (result.success && result.stats) {
        setStats(result.stats as AdminStats);
        setError(null);
      } else {
        setError(typeof result.error === "string" ? result.error : "Failed to load stats");
      }
    } catch (err) {
      if (!isMounted.current) return;
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      if (isMounted.current) setLastUpdated(new Date());
    }
  }, []);

  // Initial load + access gate
  useEffect(() => {
    isMounted.current = true;
    (async () => {
      const access = await checkAdminAccess();
      if (!isMounted.current) return;
      if (!access.isAdmin) {
        router.replace("/generate");
        return;
      }
      setAuthChecked(true);
      await loadStats();
      if (isMounted.current) setLoading(false);
    })();
    return () => {
      isMounted.current = false;
    };
  }, [router, loadStats]);

  // Auto-refresh
  useEffect(() => {
    if (!authChecked) return;
    const id = setInterval(() => loadStats(), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [authChecked, loadStats]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  if (!authChecked || loading) {
    return (
      <div className="mx-auto max-w-[1100px] px-5 py-6 lg:px-8">
        <div className="mb-8 flex items-center gap-2.5">
          <Shield className="h-5 w-5 text-[#FF8A3D]" />
          <h1 className="font-display text-[22px] font-semibold tracking-tight text-white">Admin</h1>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  const margin = stats && stats.totalRevenue > 0
    ? ((stats.profit / stats.totalRevenue) * 100).toFixed(0)
    : null;

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-6 text-[#ECEEF3] lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Shield className="h-5 w-5 text-[#FF8A3D]" />
            <h1 className="font-display text-[22px] font-semibold tracking-tight text-white">Admin</h1>
          </div>
          <p className="mt-1 text-[13px] text-[#8B93A5]">
            People &amp; cost overview. Auto-refreshes every 30 seconds.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="hidden font-mono text-[11px] text-[#7A8294] sm:inline">
              updated {formatRelative(lastUpdated)}
            </span>
          )}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3.5 py-2 text-[13px] font-medium text-[#C9CFDB] transition-colors hover:bg-white/[0.08] hover:text-white disabled:opacity-60"
          >
            {refreshing
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-400/20 bg-red-500/[0.06] px-4 py-3 text-[13px] text-red-200">
          {error}
        </div>
      )}

      {/* People */}
      <section className="mb-8">
        <SectionLabel>People</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total users"
            value={formatNumber(stats?.totalUsers ?? 0)}
            icon={Users}
          />
          <StatCard
            label="Paid users"
            value={formatNumber(stats?.paidUsers ?? 0)}
            hint={
              stats && stats.totalUsers > 0
                ? `${((stats.paidUsers / stats.totalUsers) * 100).toFixed(1)}% conversion`
                : undefined
            }
            icon={UserCheck}
            emphasis={stats && stats.paidUsers > 0 ? "positive" : "neutral"}
          />
          <StatCard
            label="Active (7d)"
            value={formatNumber(stats?.activeUsers7d ?? 0)}
            hint="Logged in last 7 days"
            icon={UserCheck}
          />
          <StatCard
            label="New (7d)"
            value={formatNumber(stats?.newUsers7d ?? 0)}
            hint="Signups last 7 days"
            icon={UserPlus}
          />
        </div>
      </section>

      {/* Costs / revenue */}
      <section className="mb-8">
        <SectionLabel>Money</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total revenue"
            value={formatGBP(stats?.totalRevenue ?? 0)}
            icon={PoundSterling}
            emphasis="positive"
          />
          <StatCard
            label="Runware cost"
            value={formatUSD(stats?.totalRunwareCost ?? 0)}
            hint="API spend (USD)"
            icon={Coins}
            emphasis="negative"
          />
          <StatCard
            label="Profit"
            value={formatGBP(stats?.profit ?? 0)}
            hint={margin ? `${margin}% margin` : "Revenue − provider cost"}
            icon={(stats?.profit ?? 0) >= 0 ? TrendingUp : TrendingDown}
            emphasis={(stats?.profit ?? 0) >= 0 ? "positive" : "negative"}
          />
          <StatCard
            label="Generations"
            value={formatNumber(stats?.totalGenerations ?? 0)}
            hint={
              stats
                ? `${formatNumber(stats.generations24h)} in last 24h`
                : undefined
            }
            icon={ImageIcon}
          />
        </div>
      </section>

      {/* Recent purchases — small, optional, just for "did anyone pay today?" */}
      <section className="rounded-2xl border border-white/[0.06] bg-[#0E1016] p-6">
        <div className="mb-4">
          <h2 className="text-[15px] font-semibold text-white">Recent purchases</h2>
          <p className="mt-1 text-[13px] text-[#8B93A5]">Last 10 paid credit / subscription transactions.</p>
        </div>
        {stats?.recentTransactions?.length ? (
          <ul className="-mx-2 divide-y divide-white/[0.06]">
            {stats.recentTransactions.map((tx) => (
              <li
                key={tx.id}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-white/[0.03]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-[#ECEEF3]">
                    {tx.user.name || tx.user.email}
                  </p>
                  {tx.user.name && (
                    <p className="truncate text-[12px] text-[#8B93A5]">{tx.user.email}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-[13px] font-semibold tabular-nums text-white">
                    {tx.moneyAmount != null
                      ? formatGBP(tx.moneyAmount)
                      : `${tx.amount > 0 ? "+" : ""}${tx.amount} credits`}
                  </p>
                  <p className="font-mono text-[11px] text-[#7A8294]">
                    {formatRelative(tx.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-white/[0.08] py-8 text-center text-[13px] text-[#8B93A5]">
            No purchases yet.
          </div>
        )}
      </section>
    </div>
  );
}