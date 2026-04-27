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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
          <div className="h-5 w-5 bg-white/10 rounded animate-pulse" />
        </div>
        <div className="h-9 w-20 bg-white/10 rounded animate-pulse" />
        <div className="h-3 w-32 bg-white/10 rounded animate-pulse mt-3" />
      </CardContent>
    </Card>
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
    emphasis === "positive" ? "text-emerald-400" :
    emphasis === "negative" ? "text-rose-400" :
    "text-foreground";
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            {label}
          </p>
          <Icon className="w-4 h-4 text-muted-foreground/70" />
        </div>
        <p className={`text-3xl font-bold tabular-nums ${emphasisClass}`}>{value}</p>
        {hint && <p className="text-xs text-muted-foreground mt-2">{hint}</p>}
      </CardContent>
    </Card>
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
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="mb-8 flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Admin</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  const margin = stats && stats.totalRevenue > 0
    ? ((stats.profit / stats.totalRevenue) * 100).toFixed(0)
    : null;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Admin</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            People &amp; cost overview. Auto-refreshes every 30 seconds.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Updated {formatRelative(lastUpdated)}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing
              ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-lg border border-rose-500/30 bg-rose-500/5 text-sm text-rose-200">
          {error}
        </div>
      )}

      {/* People */}
      <section className="mb-8">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
          People
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Money
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent purchases</CardTitle>
            <CardDescription>Last 10 paid credit / subscription transactions.</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.recentTransactions?.length ? (
              <ul className="divide-y divide-border">
                {stats.recentTransactions.map((tx) => (
                  <li
                    key={tx.id}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">
                        {tx.user.name || tx.user.email}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {tx.user.name ? tx.user.email : null}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold tabular-nums">
                        {tx.moneyAmount != null
                          ? formatGBP(tx.moneyAmount)
                          : `${tx.amount > 0 ? "+" : ""}${tx.amount} credits`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelative(tx.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No purchases yet.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
