"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  Flag,
  MessageSquare,
  Image as ImageIcon,
  User,
  Clock,
  Search,
  Filter,
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

// Skeleton components
function StatSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/10 animate-pulse" />
          <div>
            <div className="h-8 w-16 bg-white/10 rounded animate-pulse" />
            <div className="h-4 w-24 bg-white/10 rounded animate-pulse mt-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReportSkeleton() {
  return (
    <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-5 w-24 bg-white/10 rounded animate-pulse" />
        <div className="h-6 w-16 bg-white/10 rounded animate-pulse" />
      </div>
      <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
      <div className="h-4 w-2/3 bg-white/10 rounded animate-pulse" />
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
    if (isMod) {
      loadReports();
    }
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
          <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
            <Clock className="w-3 h-3 mr-1" /> Pending
          </Badge>
        );
      case "REVIEWED":
        return (
          <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">
            <Eye className="w-3 h-3 mr-1" /> Reviewed
          </Badge>
        );
      case "RESOLVED":
        return (
          <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Resolved
          </Badge>
        );
      case "DISMISSED":
        return (
          <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
            <XCircle className="w-3 h-3 mr-1" /> Dismissed
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getReasonBadge = (reason: string) => {
    const colors: Record<string, string> = {
      SPAM: "bg-orange-500/20 text-orange-500 border-orange-500/30",
      INAPPROPRIATE: "bg-red-500/20 text-red-500 border-red-500/30",
      HARASSMENT: "bg-purple-500/20 text-purple-500 border-purple-500/30",
      COPYRIGHT: "bg-blue-500/20 text-blue-500 border-blue-500/30",
      OTHER: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    };
    return (
      <Badge className={colors[reason] || colors.OTHER}>
        {reason.toLowerCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#c084fc] animate-spin mx-auto mb-4" />
          <p className="text-white/60">Checking access...</p>
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
    <div className="min-h-screen bg-[#030305] p-6 lg:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#c084fc] to-[#a855f7] flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              Moderator Panel
            </h1>
            <p className="text-white/60 mt-1">
              Manage reports and community content
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-[#c084fc]/20 text-[#c084fc] border-[#c084fc]/30">
              {role}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadStats();
                loadReports();
              }}
              className="border-white/20"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statsLoading ? (
            <>
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
            </>
          ) : (
            <>
              <Card className="border-yellow-500/30 bg-yellow-500/5">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-white">
                        {stats?.pendingReports || 0}
                      </p>
                      <p className="text-sm text-white/60">Pending Reports</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                      <Flag className="w-6 h-6 text-white/60" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-white">
                        {stats?.totalReports || 0}
                      </p>
                      <p className="text-sm text-white/60">Total Reports</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                      <MessageSquare className="w-6 h-6 text-white/60" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-white">
                        {stats?.totalPosts || 0}
                      </p>
                      <p className="text-sm text-white/60">Community Posts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-white/60" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-white">
                        {stats?.publicGenerations || 0}
                      </p>
                      <p className="text-sm text-white/60">Public Assets</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Reports Section */}
      <div className="max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Flag className="w-5 h-5" />
                Reports
              </CardTitle>

              <div className="flex flex-col sm:flex-row gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    placeholder="Search reports..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 w-full sm:w-64"
                  />
                </div>

                {/* Status Filter */}
                <div className="flex gap-1">
                  {["PENDING", "REVIEWED", "RESOLVED", "DISMISSED", ""].map(
                    (status) => (
                      <Button
                        key={status || "all"}
                        variant="outline"
                        size="sm"
                        onClick={() => setStatusFilter(status)}
                        className={
                          statusFilter === status
                            ? "bg-[#c084fc]/20 border-[#c084fc]/50 text-[#c084fc]"
                            : "border-white/10"
                        }
                      >
                        {status || "All"}
                      </Button>
                    )
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {reportsLoading ? (
              <div className="space-y-3">
                <ReportSkeleton />
                <ReportSkeleton />
                <ReportSkeleton />
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-green-500/50 mx-auto mb-3" />
                <p className="text-white/60">No reports found</p>
                <p className="text-white/40 text-sm">
                  {statusFilter === "PENDING"
                    ? "All pending reports have been handled!"
                    : "Try changing the filter"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReports.map((report) => (
                  <div
                    key={report.id}
                    className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {getReasonBadge(report.reason)}
                          {getStatusBadge(report.status)}
                          <span className="text-xs text-white/40">
                            {new Date(report.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Description */}
                        {report.description && (
                          <p className="text-white/80 text-sm mb-3">
                            {report.description}
                          </p>
                        )}

                        {/* Reporter & Reported */}
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-white/40">Reporter:</span>
                            <div className="flex items-center gap-1">
                              {report.reporter.avatarUrl ? (
                                <img
                                  src={report.reporter.avatarUrl}
                                  alt=""
                                  className="w-5 h-5 rounded-full"
                                />
                              ) : (
                                <User className="w-4 h-4 text-white/40" />
                              )}
                              <span className="text-white">
                                {report.reporter.name || report.reporter.email}
                              </span>
                            </div>
                          </div>

                          {report.reportedUser && (
                            <div className="flex items-center gap-2">
                              <span className="text-white/40">Reported:</span>
                              <div className="flex items-center gap-1">
                                {report.reportedUser.avatarUrl ? (
                                  <img
                                    src={report.reportedUser.avatarUrl}
                                    alt=""
                                    className="w-5 h-5 rounded-full"
                                  />
                                ) : (
                                  <User className="w-4 h-4 text-white/40" />
                                )}
                                <span className="text-white">
                                  {report.reportedUser.name ||
                                    report.reportedUser.email}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Post preview if any */}
                        {report.post && (
                          <div className="mt-3 p-3 rounded-lg bg-black/30 border border-white/5">
                            <p className="text-xs text-white/40 mb-1">
                              Reported Content:
                            </p>
                            <p className="text-white text-sm font-medium">
                              {report.post.title}
                            </p>
                            {report.post.content && (
                              <p className="text-white/60 text-sm mt-1 line-clamp-2">
                                {report.post.content}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {report.status === "PENDING" && (
                        <div className="flex gap-2 md:flex-col">
                          <Button
                            size="sm"
                            onClick={() =>
                              handleReportAction(report.id, "RESOLVED")
                            }
                            disabled={processingReport === report.id}
                            className="bg-green-500 hover:bg-green-600 text-white"
                          >
                            {processingReport === report.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Resolve
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleReportAction(report.id, "DISMISSED")
                            }
                            disabled={processingReport === report.id}
                            className="border-white/20"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Dismiss
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
