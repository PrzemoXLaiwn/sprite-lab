"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Loader2,
  RefreshCw,
  Flag,
  MessageSquare,
  Image as ImageIcon,
  User,
  Clock,
  Search,
} from "lucide-react";
import {
  checkAdminAccess,
  fetchReports,
  handleReport,
  fetchModeratorStats,
} from "../admin/page.actions";
interface Report {
  id: string;
  reason: string;
  description: string | null;
  status: string;
  moderatorNote: string | null;
  createdAt: string;
  reporter: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
  reportedUser: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  } | null;
  post: {
    id: string;
    title: string;
    content: string | null;
    imageUrl: string | null;
  } | null;
}

interface ModStats {
  pendingReports: number;
  totalReports: number;
  totalPosts: number;
  hiddenPosts: number;
  totalGenerations: number;
  publicGenerations: number;
}

const CHIP = "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium";

// Skeleton components
function StatSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0E1016] p-5">
      <div className="mb-3 h-3 w-24 animate-pulse rounded bg-white/[0.06]" />
      <div className="h-8 w-14 animate-pulse rounded bg-white/[0.06]" />
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-3 rounded-xl border border-white/[0.08] bg-[#151922] p-4">
      <div className="flex items-center gap-2">
        <div className="h-5 w-20 animate-pulse rounded-full bg-white/[0.06]" />
        <div className="h-5 w-20 animate-pulse rounded-full bg-white/[0.06]" />
      </div>
      <div className="h-3.5 w-full animate-pulse rounded bg-white/[0.05]" />
      <div className="h-3.5 w-2/3 animate-pulse rounded bg-white/[0.05]" />
    </div>
  );
}

function ModStat({
  label,
  value,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        highlight ? "border-amber-400/20 bg-amber-500/[0.06]" : "border-white/[0.06] bg-[#0E1016]"
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <p className={`text-[12px] ${highlight ? "text-amber-200" : "text-[#8B93A5]"}`}>{label}</p>
        <Icon className={`h-4 w-4 ${highlight ? "text-amber-300" : "text-[#7A8294]"}`} />
      </div>
      <p className="font-sans tracking-tight text-[28px] font-semibold leading-tight tabular-nums text-white">{value}</p>
    </div>
  );
}
export default function ModeratorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isMod, setIsMod] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  const [stats, setStats] = useState<ModStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [searchQuery, setSearchQuery] = useState("");

  const [processingReport, setProcessingReport] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    const result = await fetchModeratorStats();
    if (result.success && result.stats) {
      setStats(result.stats);
    }
    setStatsLoading(false);
  }, []);

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    const result = await fetchReports(statusFilter || undefined);
    if (result.success) {
      setReports(result.reports as Report[]);
    }
    setReportsLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    const init = async () => {
      const result = await checkAdminAccess();
      if (!result.isModerator) {
        router.push("/dashboard");
        return;
      }
      setIsMod(true);
      setRole(result.role);
      setLoading(false);

      await Promise.all([loadStats(), loadReports()]);
    };
    init();
  }, [router, loadStats, loadReports]);

  useEffect(() => {
    if (!isMod) return;
    const t = setTimeout(loadReports, 0);
    return () => clearTimeout(t);
  }, [statusFilter, isMod, loadReports]);

  const handleReportAction = async (
    reportId: string,
    action: "REVIEWED" | "RESOLVED" | "DISMISSED"
  ) => {
    setProcessingReport(reportId);
    const result = await handleReport(reportId, action);
    if (result.success) {
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: action } : r))
      );
      loadStats();
    }
    setProcessingReport(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <span className={`${CHIP} border-amber-400/20 bg-amber-500/[0.06] text-amber-200`}>
            <Clock className="h-3 w-3" /> Pending
          </span>
        );
      case "REVIEWED":
        return (
          <span className={`${CHIP} border-sky-400/20 bg-sky-500/[0.06] text-sky-200`}>
            <Eye className="h-3 w-3" /> Reviewed
          </span>
        );
      case "RESOLVED":
        return (
          <span className={`${CHIP} border-emerald-400/20 bg-emerald-500/[0.06] text-emerald-200`}>
            <CheckCircle2 className="h-3 w-3" /> Resolved
          </span>
        );
      case "DISMISSED":
        return (
          <span className={`${CHIP} border-white/[0.08] bg-white/[0.04] text-[#8B93A5]`}>
            <XCircle className="h-3 w-3" /> Dismissed
          </span>
        );
      default:
        return <span className={`${CHIP} border-white/[0.08] bg-white/[0.04] text-[#C9CFDB]`}>{status}</span>;
    }
  };

  const getReasonBadge = (reason: string) => {
    const colors: Record<string, string> = {
      SPAM: "border-orange-400/20 bg-orange-500/[0.06] text-orange-200",
      INAPPROPRIATE: "border-red-400/20 bg-red-500/[0.06] text-red-200",
      HARASSMENT: "border-rose-400/20 bg-rose-500/[0.06] text-rose-200",
      COPYRIGHT: "border-sky-400/20 bg-sky-500/[0.06] text-sky-200",
      OTHER: "border-white/[0.08] bg-white/[0.04] text-[#C9CFDB]",
    };
    return (
      <span className={`${CHIP} font-mono ${colors[reason] || colors.OTHER}`}>
        {reason.toLowerCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-[#FF8A3D]" />
          <p className="text-[13px] text-[#8B93A5]">Checking access...</p>
        </div>
      </div>
    );
  }

  if (!isMod) {
    return null;
  }

  const filteredReports = reports.filter((report) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      report.reason.toLowerCase().includes(query) ||
      report.description?.toLowerCase().includes(query) ||
      report.reporter.email.toLowerCase().includes(query) ||
      report.reportedUser?.email.toLowerCase().includes(query)
    );
  });

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-6 text-[#ECEEF3] lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Shield className="h-5 w-5 text-[#FF8A3D]" />
            <h1 className="font-display text-[22px] font-semibold tracking-tight text-white">Moderator</h1>
          </div>
          <p className="mt-1 text-[13px] text-[#8B93A5]">Manage reports and community content</p>
        </div>
        <div className="flex items-center gap-2">
          {role && (
            <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-[#C9CFDB]">
              {role.toLowerCase()}
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              loadStats();
              loadReports();
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3.5 py-2 text-[13px] font-medium text-[#C9CFDB] transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${statsLoading || reportsLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {statsLoading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <ModStat label="Pending reports" value={stats?.pendingReports || 0} icon={AlertTriangle} highlight={(stats?.pendingReports || 0) > 0} />
            <ModStat label="Total reports" value={stats?.totalReports || 0} icon={Flag} />
            <ModStat label="Community posts" value={stats?.totalPosts || 0} icon={MessageSquare} />
            <ModStat label="Public assets" value={stats?.publicGenerations || 0} icon={ImageIcon} />
          </>
        )}
      </div>

      {/* Reports Section */}
      <section className="rounded-2xl border border-white/[0.06] bg-[#0E1016] p-6">
        <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-[15px] font-semibold text-white">Reports</h2>
            <p className="mt-1 text-[13px] text-[#8B93A5]">Review flagged posts and users</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {/* Search */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A8294]" />
              <input
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-[#151922] py-2 pl-9 pr-3 text-[13px] text-white outline-none placeholder:text-[#7A8294] focus:border-[#FF8A3D]/50 sm:w-60"
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-1 overflow-x-auto rounded-xl bg-white/[0.04] p-1">
              {["PENDING", "REVIEWED", "RESOLVED", "DISMISSED", ""].map(
                (status) => (
                  <button
                    key={status || "all"}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[12px] font-medium capitalize transition-colors ${
                      statusFilter === status
                        ? "bg-white/[0.09] text-white shadow-sm"
                        : "text-[#8B93A5] hover:text-white"
                    }`}
                  >
                    {status ? status.toLowerCase() : "All"}
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {reportsLoading ? (
          <div className="space-y-3">
            <ReportSkeleton />
            <ReportSkeleton />
            <ReportSkeleton />
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-white/[0.08] py-12 text-center">
            <CheckCircle2 className="mb-3 h-6 w-6 text-emerald-300/70" />
            <p className="text-[14px] font-medium text-white">No reports found</p>
            <p className="mt-1 text-[12px] text-[#8B93A5]">
              {statusFilter === "PENDING"
                ? "All pending reports have been handled."
                : "Try changing the filter"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="rounded-xl border border-white/[0.08] bg-[#151922] p-4 transition-colors hover:border-white/20"
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div className="min-w-0 flex-1">
                    {/* Header */}
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      {getReasonBadge(report.reason)}
                      {getStatusBadge(report.status)}
                      <span className="font-mono text-[11px] text-[#7A8294]">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Description */}
                    {report.description && (
                      <p className="mb-3 text-[13px] text-[#ECEEF3]">
                        {report.description}
                      </p>
                    )}

                    {/* Reporter & Reported */}
                    <div className="flex flex-wrap gap-x-5 gap-y-2 text-[12px]">
                      <div className="flex items-center gap-2">
                        <span className="text-[#7A8294]">Reporter</span>
                        <div className="flex items-center gap-1.5">
                          {report.reporter.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={report.reporter.avatarUrl}
                              alt=""
                              className="h-5 w-5 rounded-full"
                            />
                          ) : (
                            <User className="h-4 w-4 text-[#7A8294]" />
                          )}
                          <span className="text-[#C9CFDB]">
                            {report.reporter.name || report.reporter.email}
                          </span>
                        </div>
                      </div>

                      {report.reportedUser && (
                        <div className="flex items-center gap-2">
                          <span className="text-[#7A8294]">Reported</span>
                          <div className="flex items-center gap-1.5">
                            {report.reportedUser.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={report.reportedUser.avatarUrl}
                                alt=""
                                className="h-5 w-5 rounded-full"
                              />
                            ) : (
                              <User className="h-4 w-4 text-[#7A8294]" />
                            )}
                            <span className="text-[#C9CFDB]">
                              {report.reportedUser.name ||
                                report.reportedUser.email}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Post preview if any */}
                    {report.post && (
                      <div className="mt-3 rounded-lg border border-white/[0.06] bg-[#0E1016] p-3">
                        <p className="mb-1 font-mono text-[11px] text-[#7A8294]">
                          reported content
                        </p>
                        <p className="text-[13px] font-medium text-white">
                          {report.post.title}
                        </p>
                        {report.post.content && (
                          <p className="mt-1 line-clamp-2 text-[13px] text-[#8B93A5]">
                            {report.post.content}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {report.status === "PENDING" && (
                    <div className="flex shrink-0 gap-2 md:flex-col">
                      <button
                        type="button"
                        onClick={() =>
                          handleReportAction(report.id, "RESOLVED")
                        }
                        disabled={processingReport === report.id}
                        className="inline-flex min-w-[96px] items-center justify-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.08] px-3 py-2 text-[13px] font-medium text-emerald-200 transition-colors hover:bg-emerald-500/[0.14] disabled:opacity-60"
                      >
                        {processingReport === report.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            Resolve
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleReportAction(report.id, "DISMISSED")
                        }
                        disabled={processingReport === report.id}
                        className="inline-flex min-w-[96px] items-center justify-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-[13px] font-medium text-[#C9CFDB] transition-colors hover:bg-white/[0.08] hover:text-white disabled:opacity-60"
                      >
                        <XCircle className="h-4 w-4" />
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}