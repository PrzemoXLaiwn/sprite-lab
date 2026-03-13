"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Images,
  CreditCard,
  TrendingUp,
  ArrowRight,
  Loader2,
  Cuboid,
  Zap,
  Download,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { fetchDashboardData } from "./page.actions";
import { CommunityShowcase } from "@/components/dashboard/CommunityShowcase";

interface DashboardData {
  stats: {
    totalGenerations: number;
    recentGenerations: number;
    credits: number;
    plan: string;
    memberSince: Date;
  } | null;
  recentGenerations: Array<{
    id: string;
    prompt: string;
    imageUrl: string;
    createdAt: Date;
  }>;
}

interface PendingJob {
  id: string;
  prompt: string;
  mode: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  progressMessage: string | null;
  creditsUsed: number;
}

function StatSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="h-4 w-24 bg-muted rounded animate-pulse mb-2" />
        <div className="h-9 w-16 bg-muted rounded animate-pulse" />
        <div className="h-3 w-20 bg-muted rounded animate-pulse mt-1" />
      </CardContent>
    </Card>
  );
}

// ── New User Welcome — shown when 0 generations ─────────────────────────────
function NewUserWelcome({ credits }: { credits: number }) {
  return (
    <div className="mb-8 rounded-2xl border border-primary/20 bg-linear-to-br from-primary/5 to-purple-500/5 p-6 md:p-8">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Ready to start</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold mb-2">
            You have <span className="text-primary">{credits} credits</span> — generate your first asset
          </h2>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            Pick a type, choose a style, describe what you want. Your asset generates in about 5 seconds.
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-5">
            {["⚔️ Weapons", "🧪 Potions", "👾 Enemies", "🎮 Icons", "🛡️ Armor"].map((tag) => (
              <span key={tag} className="px-2.5 py-1 rounded-full border border-border bg-background">{tag}</span>
            ))}
          </div>
          <Button size="lg" asChild className="gap-2">
            <Link href="/generate">
              <Sparkles className="w-4 h-4" />
              Generate Now — Free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>

        {/* Quick example tiles */}
        <div className="grid grid-cols-3 sm:grid-cols-3 gap-1.5 sm:gap-2 shrink-0">
          {["⚔️", "🧪", "👾", "💎", "🛡️", "🔮"].map((emoji, i) => (
            <div
              key={i}
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl border border-border bg-background/60 flex items-center justify-center text-2xl hover:scale-105 transition-transform"
            >
              {emoji}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingJobs, setPendingJobs] = useState<PendingJob[]>([]);
  const isMounted = useRef(true);
  const previousCompletedRef = useRef<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    try {
      const result = await fetchDashboardData();
      if (result.success && result.data && isMounted.current) {
        setData(result.data);
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  const loadPendingJobs = useCallback(async () => {
    try {
      const response = await fetch("/api/queue/status");
      if (response.ok && isMounted.current) {
        const result = await response.json();
        const jobs: PendingJob[] = result.jobs || [];
        const newlyCompleted = jobs.filter(
          (job) => job.status === "completed" && !previousCompletedRef.current.has(job.id)
        );
        jobs.forEach((job) => {
          if (job.status === "completed") previousCompletedRef.current.add(job.id);
        });
        setPendingJobs(jobs);
        if (newlyCompleted.length > 0) loadData();
      }
    } catch (error) {
      console.error("Failed to load pending jobs:", error);
    }
  }, [loadData]);

  useEffect(() => {
    isMounted.current = true;
    loadData();
    loadPendingJobs();
    const interval = setInterval(loadPendingJobs, 3000);
    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [loadData, loadPendingJobs]);

  const activePendingJobs = pendingJobs.filter(
    (job) => job.status === "pending" || job.status === "processing"
  );

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="h-8 w-40 bg-muted rounded animate-pulse mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map((i) => <StatSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const stats = data?.stats;
  const isNewUser = !stats?.totalGenerations || stats.totalGenerations === 0;
  const recentGens = data?.recentGenerations ?? [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">

      {/* ── Active Generations ───────────────────────────────────────── */}
      {activePendingJobs.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <CardTitle className="text-base">
                Generating ({activePendingJobs.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activePendingJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-background/50 border border-border"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    {job.mode === "3d"
                      ? <Cuboid className="w-5 h-5 text-purple-400" />
                      : <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{job.prompt}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-linear-to-r from-primary to-purple-500 transition-all duration-500"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {job.progressMessage || (job.status === "processing" ? "Processing…" : "Queued")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── New user welcome ─────────────────────────────────────────── */}
      {isNewUser && <NewUserWelcome credits={stats?.credits ?? 0} />}

      {/* ── Stats ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Credits</p>
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <p className="text-3xl font-bold">{stats?.credits ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stats?.plan ?? "FREE"} plan</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Generated</p>
              <Images className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold">{stats?.totalGenerations ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">This Week</p>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-3xl font-bold">{stats?.recentGenerations ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Last 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Main grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Generations */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Generations</CardTitle>
                {recentGens.length > 0 && (
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/gallery" className="gap-1.5">
                      View all <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {recentGens.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {recentGens.map((gen) => (
                    <div
                      key={gen.id}
                      className="relative aspect-square rounded-xl overflow-hidden border border-border hover:border-primary/40 transition-colors group cursor-pointer"
                      style={{
                        backgroundImage: "repeating-conic-gradient(#80808010 0% 25%, transparent 0% 50%)",
                        backgroundSize: "16px 16px",
                      }}
                    >
                      <Image
                        src={gen.imageUrl}
                        alt={gen.prompt}
                        fill
                        sizes="(max-width: 640px) 50vw, 200px"
                        className="object-contain p-1"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                        <p className="text-xs text-white text-center line-clamp-2">{gen.prompt}</p>
                        <a
                          href={gen.imageUrl}
                          download
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Empty state */
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-border flex items-center justify-center mb-4">
                    <Sparkles className="w-7 h-7 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-medium mb-1">No assets yet</p>
                  <p className="text-xs text-muted-foreground mb-5 max-w-[200px]">
                    Generate your first sprite, icon, or enemy in seconds
                  </p>
                  <Button asChild>
                    <Link href="/generate" className="gap-2">
                      <Sparkles className="w-4 h-4" />
                      Generate now
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* Quick actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link
                href="/generate"
                className="flex items-center gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Generate Asset</p>
                  <p className="text-xs text-muted-foreground">1 credit · ~5 seconds</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="/gallery"
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-border/80 hover:bg-muted/40 transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Images className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold">My Gallery</p>
                  <p className="text-xs text-muted-foreground">All your assets</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="/pricing"
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-border/80 hover:bg-muted/40 transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Get Credits</p>
                  <p className="text-xs text-muted-foreground">Top up anytime</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </CardContent>
          </Card>

          {/* Upgrade card — only for free users */}
          {stats?.plan === "FREE" && (
            <Card className="bg-linear-to-br from-primary to-purple-600 text-white border-0">
              <CardContent className="pt-5">
                <Zap className="w-6 h-6 mb-2 text-white/80" />
                <h3 className="font-bold mb-1">Upgrade to Pro</h3>
                <p className="text-sm text-white/70 mb-4">
                  500 credits/month + higher quality + commercial rights
                </p>
                <Button variant="secondary" size="sm" className="w-full font-semibold" asChild>
                  <Link href="/pricing">View Plans →</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Community */}
          <CommunityShowcase />
        </div>
      </div>
    </div>
  );
}
