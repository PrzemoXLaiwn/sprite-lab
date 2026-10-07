"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { fetchDashboardData } from "./page.actions";
import { CommunityShowcase } from "@/components/dashboard/CommunityShowcase";
import { SHOWCASE, isPixelShowcase } from "@/data/showcase";

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

const BTN_PRIMARY =
  "px-corners inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:brightness-110";
const CARD = "rounded-2xl border border-white/[0.06] bg-[#0E1016]";
const CHECKER = {
  backgroundImage: "repeating-conic-gradient(#ffffff08 0% 25%, transparent 0% 50%)",
  backgroundSize: "16px 16px",
};

function planLabel(plan?: string) {
  const p = (plan || "FREE").toUpperCase();
  if (p === "UNLIMITED") return "Studio";
  if (p === "PRO") return "Pro";
  if (p === "STARTER") return "Starter";
  if (p === "LIFETIME") return "Lifetime";
  return "Free";
}

function StatSkeleton() {
  return (
    <div className={`${CARD} p-5`}>
      <div className="mb-3 h-3 w-20 animate-pulse rounded bg-white/[0.06]" />
      <div className="h-8 w-16 animate-pulse rounded bg-white/[0.06]" />
      <div className="mt-2 h-3 w-24 animate-pulse rounded bg-white/[0.04]" />
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
}) {
  return (
    <div className={`${CARD} p-5`}>
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-[#8B93A5]">{label}</p>
        <Icon className={`h-4 w-4 ${accent ? "text-[#FF8A3D]" : "text-[#7A8294]"}`} />
      </div>
      <p className="mt-2 font-sans tracking-tight text-[28px] font-semibold leading-none tabular-nums text-white">{value}</p>
      <p className="mt-2 font-mono text-[11px] text-[#7A8294]">{hint}</p>
    </div>
  );
}

// ── New User Welcome — shown when 0 generations ─────────────────────────────
function NewUserWelcome({ credits }: { credits: number }) {
  return (
    <div className={`${CARD} pixel-grid p-6 md:p-8`}>
      <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
        <div className="flex-1">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#FF8A3D]/25 bg-[#FF8A3D]/10 px-2.5 py-1 font-mono text-[11px] text-[#FFB27A]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#FF8A3D]" />
            ready to start
          </span>
          <h2 className="text-[20px] font-semibold tracking-tight text-white md:text-[22px]">
            You have <span className="text-[#FFB27A]">{credits} credits</span> — generate your first asset
          </h2>
          <p className="mb-4 mt-2 max-w-md text-[13px] text-[#8B93A5]">
            Pick a type, choose a style, describe what you want. Your asset generates in about 5 seconds.
          </p>
          <div className="mb-5 flex flex-wrap gap-1.5">
            {["Weapons", "Potions", "Enemies", "Icons", "Armor"].map((tag) => (
              <span key={tag} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] text-[#C9CFDB]">
                {tag}
              </span>
            ))}
          </div>
          <Link href="/generate" className={BTN_PRIMARY}>
            <Sparkles className="h-4 w-4" />
            Generate now — free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Example tiles — each one opens the generator pre-filled */}
        <div className="grid shrink-0 grid-cols-3 gap-2">
          {SHOWCASE.slice(0, 6).map((ex) => (
            <Link
              key={ex.id}
              href={`/generate?${new URLSearchParams({ prompt: ex.prompt, styleId: ex.styleId, categoryId: ex.categoryId }).toString()}`}
              title={`Try: ${ex.prompt}`}
              className="group relative h-16 w-16 overflow-hidden rounded-xl border border-white/[0.06] bg-[#151922] transition-colors hover:border-[#FF8A3D]/50 sm:h-20 sm:w-20"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ex.imageUrl}
                alt={ex.prompt}
                className={`absolute inset-0 h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-110 ${isPixelShowcase(ex) ? "pixel-perfect" : ""}`}
              />
            </Link>
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

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-[22px] font-semibold tracking-tight text-white">Usage</h1>
        <p className="mt-1 text-[13px] text-[#8B93A5]">Credits, activity and your latest generations</p>
      </div>
      <Link
        href="/pricing"
        className="inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3.5 py-2 text-[13px] font-medium text-[#C9CFDB] transition-colors hover:bg-white/[0.08] hover:text-white"
      >
        <Zap className="h-4 w-4 text-[#FF8A3D]" /> Get credits
      </Link>
    </div>
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-[1100px] space-y-6 px-5 py-6 lg:px-8">
        {header}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => <StatSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-square animate-pulse rounded-xl bg-[#151922]" />
          ))}
        </div>
      </div>
    );
  }

  const stats = data?.stats;
  const isNewUser = !stats?.totalGenerations || stats.totalGenerations === 0;
  const recentGens = data?.recentGenerations ?? [];

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 px-5 py-6 text-[#ECEEF3] lg:px-8">
      {header}

      {/* ── Active Generations ───────────────────────────────────────── */}
      {activePendingJobs.length > 0 && (
        <div className="rounded-2xl border border-[#FF8A3D]/20 bg-[#FF8A3D]/[0.04] p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#FF8A3D]" />
            <h2 className="text-[15px] font-semibold text-white">Generating</h2>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 font-mono text-[11px] text-[#C9CFDB]">
              {activePendingJobs.length}
            </span>
          </div>
          <div className="space-y-2">
            {activePendingJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#151922] p-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                  {job.mode === "3d"
                    ? <Cuboid className="h-4 w-4 text-[#FFB27A]" />
                    : <Loader2 className="h-4 w-4 animate-spin text-[#FF8A3D]" />
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-white">{job.prompt}</p>
                  <div className="mt-1.5 flex items-center gap-3">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                      <div
                        className="h-full bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] transition-all duration-500"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                    <span className="shrink-0 font-mono text-[11px] text-[#8B93A5]">
                      {job.progressMessage || (job.status === "processing" ? "Processing…" : "Queued")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── New user welcome ─────────────────────────────────────────── */}
      {isNewUser && <NewUserWelcome credits={stats?.credits ?? 0} />}

      {/* ── Stats ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Credits" value={stats?.credits ?? 0} hint={`${planLabel(stats?.plan)} plan`} icon={Zap} accent />
        <StatCard label="Total generated" value={stats?.totalGenerations ?? 0} hint="all time" icon={Images} />
        <StatCard label="This week" value={stats?.recentGenerations ?? 0} hint="last 7 days" icon={TrendingUp} />
      </div>

      {/* ── Main grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Recent Generations */}
        <div className="lg:col-span-2">
          <div className={`${CARD} h-full p-6`}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[15px] font-semibold text-white">Recent generations</h2>
                <p className="mt-1 text-[13px] text-[#8B93A5]">Your latest assets</p>
              </div>
              {recentGens.length > 0 && (
                <Link href="/assets" className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-[#8B93A5] transition-colors hover:text-white">
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
            {recentGens.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {recentGens.map((gen) => (
                  <div
                    key={gen.id}
                    className="group relative aspect-square overflow-hidden rounded-xl border border-white/[0.06] bg-[#151922] transition-colors hover:border-white/20"
                    style={CHECKER}
                  >
                    <Image
                      src={gen.imageUrl}
                      alt={gen.prompt}
                      fill
                      sizes="(max-width: 640px) 50vw, 200px"
                      className="object-contain p-2"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/75 p-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <p className="line-clamp-2 text-center text-[12px] text-white">{gen.prompt}</p>
                      <a
                        href={gen.imageUrl}
                        download
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 rounded-lg border border-white/[0.1] bg-white/[0.08] px-2.5 py-1 text-[12px] text-white transition-colors hover:bg-white/[0.16]"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Empty state */
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] py-14 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.06] bg-[#151922]">
                  <Sparkles className="h-5 w-5 text-[#7A8294]" />
                </div>
                <p className="text-[14px] font-medium text-white">No assets yet</p>
                <p className="mb-5 mt-1 max-w-[240px] text-[12px] text-[#8B93A5]">
                  Generate your first sprite, icon, or enemy in seconds
                </p>
                <Link href="/generate" className={BTN_PRIMARY}>
                  <Sparkles className="h-4 w-4" />
                  Generate now
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* Quick actions */}
          <div className={`${CARD} p-3`}>
            <p className="px-2 pb-2 pt-1 font-mono text-[11px] uppercase tracking-[0.08em] text-[#8B93A5]">Quick actions</p>
            <div className="space-y-1">
              {[
                { href: "/generate", title: "Generate asset", desc: "1 credit · ~5 seconds", icon: Sparkles, accent: true },
                { href: "/assets", title: "My assets", desc: "All your assets", icon: Images, accent: false },
                { href: "/pricing", title: "Get credits", desc: "Top up anytime", icon: CreditCard, accent: false },
              ].map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="group flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-white/[0.04]"
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                      a.accent ? "border-[#FF8A3D]/25 bg-[#FF8A3D]/10" : "border-white/[0.06] bg-white/[0.04]"
                    }`}
                  >
                    <a.icon className={`h-4 w-4 ${a.accent ? "text-[#FF8A3D]" : "text-[#C9CFDB]"}`} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-white">{a.title}</span>
                    <span className="block font-mono text-[11px] text-[#7A8294]">{a.desc}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-[#7A8294] transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
                </Link>
              ))}
            </div>
          </div>

          {/* Upgrade card — only for free users */}
          {stats?.plan === "FREE" && (
            <div className="rounded-2xl border border-[#FF8A3D]/20 bg-[#FF8A3D]/[0.05] p-5">
              <Zap className="mb-2 h-5 w-5 text-[#FF8A3D]" />
              <h3 className="text-[15px] font-semibold text-white">Upgrade to Pro</h3>
              <p className="mb-4 mt-1 text-[13px] text-[#C9CFDB]">
                500 credits/month + higher quality + commercial rights
              </p>
              <Link href="/pricing" className={`${BTN_PRIMARY} w-full`}>
                View plans <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          {/* Community */}
          <CommunityShowcase />
        </div>
      </div>
    </div>
  );
}
