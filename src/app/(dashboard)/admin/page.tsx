"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Users,
  DollarSign,
  TrendingUp,
  Gift,
  Loader2,
  Check,
  X,
  Crown,
  Ban,
  CheckCircle,
  Circle,
  Wifi,
  RefreshCw,
  Search,
  Eye,
  LogOut,
  Flag,
  Image,
  AlertTriangle,
  MessageSquare,
  ChevronLeft,
  ExternalLink,
  Calendar,
  Mail,
  User as UserIcon,
  Globe,
  Github,
  Twitter,
  Target,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  checkAdminAccess,
  fetchAllUsers,
  grantCredits,
  fetchAdminStats,
  toggleUserActive,
  changeUserRole,
  fetchUserDetails,
  fetchUserGenerations,
  kickUserSession,
  fetchReports,
  handleReport,
} from "./page.actions";

interface User {
  id: string;
  email: string;
  name: string | null;
  credits: number;
  plan: string;
  role: string;
  isActive: boolean;
  totalSpent: number;
  createdAt: Date;
  avatarUrl?: string | null;
  username?: string | null;
  bio?: string | null;
  website?: string | null;
  socialTwitter?: string | null;
  socialGithub?: string | null;
  isProfilePublic?: boolean;
  totalLikesReceived?: number;
  totalGenerationsPublic?: number;
  _count: {
    generations: number;
    creditTransactions: number;
  };
}

interface UserGeneration {
  id: string;
  prompt: string;
  imageUrl: string;
  categoryId: string;
  subcategoryId: string;
  styleId: string;
  isPublic: boolean;
  likes: number;
  createdAt: Date;
}

interface Report {
  id: string;
  reporterId: string;
  reportedUserId: string | null;
  postId: string | null;
  generationId: string | null;
  reason: string;
  description: string | null;
  status: string;
  moderatorNote: string | null;
  createdAt: Date;
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

interface AdminStats {
  totalUsers: number;
  totalGenerations: number;
  totalRevenue: number;
  totalReplicateCost: number;
  profit: number;
  recentTransactions: Array<{
    id: string;
    amount: number;
    moneyAmount: number | null;
    createdAt: Date;
    user: {
      email: string;
      name: string | null;
    };
  }>;
}

type AdminView = "users" | "user-profile" | "reports";

// Skeleton components for instant loading feedback
function StatSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
          <div className="h-5 w-5 bg-white/10 rounded animate-pulse" />
        </div>
        <div className="h-9 w-16 bg-white/10 rounded animate-pulse" />
      </CardContent>
    </Card>
  );
}

function UserSkeleton() {
  return (
    <div className="p-4 rounded-lg border border-border animate-pulse">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/10" />
          <div className="space-y-1">
            <div className="h-4 w-32 bg-white/10 rounded" />
            <div className="h-3 w-24 bg-white/10 rounded" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-5 w-16 bg-white/10 rounded-full" />
          <div className="h-5 w-12 bg-white/10 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-4 bg-white/10 rounded" />
        ))}
      </div>
      <div className="flex gap-2">
        <div className="h-8 w-28 bg-white/10 rounded" />
        <div className="h-8 w-8 bg-white/10 rounded" />
      </div>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [initialLoading, setInitialLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [creditsAmount, setCreditsAmount] = useState("");
  const [creditsReason, setCreditsReason] = useState("");
  const [granting, setGranting] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [fixingCosts, setFixingCosts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const isMounted = useRef(true);

  // New state for views and user profile
  const [currentView, setCurrentView] = useState<AdminView>("users");
  const [viewedUser, setViewedUser] = useState<User | null>(null);
  const [viewedUserGenerations, setViewedUserGenerations] = useState<UserGeneration[]>([]);
  const [userProfileLoading, setUserProfileLoading] = useState(false);
  const [kicking, setKicking] = useState<string | null>(null);

  // Reports state
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportFilter, setReportFilter] = useState<string>("PENDING");
  const [processingReport, setProcessingReport] = useState<string | null>(null);

  // Fetch online users - lightweight poll
  const fetchOnlineUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/presence", { cache: "no-store" });
      if (res.ok && isMounted.current) {
        const data = await res.json();
        setOnlineUsers(data.onlineUsers || []);
      }
    } catch (error) {
      console.error("Failed to fetch online users:", error);
    }
  }, []);

  // Independent stats fetch
  const loadStats = useCallback(async (showLoading = true) => {
    if (showLoading) setStatsLoading(true);
    try {
      const statsResult = await fetchAdminStats();
      if (statsResult.success && statsResult.stats && isMounted.current) {
        setStats(statsResult.stats);
      }
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      if (isMounted.current) setStatsLoading(false);
    }
  }, []);

  // Independent users fetch
  const loadUsers = useCallback(async (showLoading = true) => {
    if (showLoading) setUsersLoading(true);
    try {
      const usersResult = await fetchAllUsers(100, 0);
      if (usersResult.success && isMounted.current) {
        setUsers(usersResult.users);
      }
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      if (isMounted.current) setUsersLoading(false);
    }
  }, []);

  // Initial parallel load
  useEffect(() => {
    isMounted.current = true;
    const init = async () => {
      const result = await checkAdminAccess();
      if (!result.isAdmin) {
        router.push("/dashboard");
        return;
      }
      // Parallel fetch all data
      await Promise.all([loadStats(true), loadUsers(true), fetchOnlineUsers()]);
      if (isMounted.current) {
        setInitialLoading(false);
        setLastUpdated(new Date());
      }
    };
    init();
    return () => { isMounted.current = false; };
  }, [router, loadStats, loadUsers, fetchOnlineUsers]);

  // Fast online status polling (5s)
  useEffect(() => {
    const interval = setInterval(fetchOnlineUsers, 5000);
    return () => clearInterval(interval);
  }, [fetchOnlineUsers]);

  // Auto-refresh stats (30s)
  useEffect(() => {
    const interval = setInterval(() => loadStats(false), 30000);
    return () => clearInterval(interval);
  }, [loadStats]);

  // Manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadStats(false), loadUsers(false), fetchOnlineUsers()]);
    setLastUpdated(new Date());
    setIsRefreshing(false);
  };

  const handleGrantCredits = async () => {
    if (!selectedUser || !creditsAmount) return;
    setGranting(true);
    const result = await grantCredits(selectedUser, parseInt(creditsAmount), creditsReason || undefined);
    if (result.success) {
      setCreditsAmount("");
      setCreditsReason("");
      setSelectedUser(null);
      // Optimistic update
      setUsers(prev => prev.map(u => u.id === selectedUser ? { ...u, credits: u.credits + parseInt(creditsAmount) } : u));
    }
    setGranting(false);
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    // Optimistic update
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: !currentStatus } : u));
    await toggleUserActive(userId, !currentStatus);
  };

  const handleChangeRole = async (userId: string, newRole: "USER" | "ADMIN" | "OWNER") => {
    if (confirm(`Change user role to ${newRole}?`)) {
      // Optimistic update
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      await changeUserRole(userId, newRole);
    }
  };

  // View user profile
  const handleViewUser = async (userId: string) => {
    setUserProfileLoading(true);
    setCurrentView("user-profile");
    try {
      const [userResult, gensResult] = await Promise.all([
        fetchUserDetails(userId),
        fetchUserGenerations(userId),
      ]);
      if (userResult.success && userResult.user) {
        setViewedUser(userResult.user as User);
      }
      if (gensResult.success) {
        setViewedUserGenerations(gensResult.generations || []);
      }
    } catch (error) {
      console.error("Failed to load user details:", error);
    }
    setUserProfileLoading(false);
  };

  // Kick user session (force logout)
  const handleKickUser = async (userId: string) => {
    if (!confirm("This will force the user to log out. Continue?")) return;
    setKicking(userId);
    try {
      const result = await kickUserSession(userId);
      if (result.success) {
        alert("User session invalidated. They will need to log in again.");
      } else {
        alert("Failed to kick user: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      alert("Error kicking user");
    }
    setKicking(null);
  };

  // Load reports
  const loadReports = useCallback(async (status?: string) => {
    setReportsLoading(true);
    try {
      const result = await fetchReports(status);
      if (result.success) {
        setReports(result.reports || []);
      }
    } catch (error) {
      console.error("Failed to load reports:", error);
    }
    setReportsLoading(false);
  }, []);

  // Handle report action
  const handleReportAction = async (
    reportId: string,
    status: "REVIEWED" | "RESOLVED" | "DISMISSED",
    note?: string
  ) => {
    setProcessingReport(reportId);
    try {
      const result = await handleReport(reportId, status, note);
      if (result.success) {
        // Update local state
        setReports(prev => prev.map(r =>
          r.id === reportId ? { ...r, status } : r
        ));
      }
    } catch (error) {
      console.error("Failed to handle report:", error);
    }
    setProcessingReport(null);
  };

  // Load reports when switching to reports view
  useEffect(() => {
    if (currentView === "reports") {
      loadReports(reportFilter === "ALL" ? undefined : reportFilter);
    }
  }, [currentView, reportFilter, loadReports]);

  const handleFixCosts = async () => {
    if (!confirm("This will calculate and update Replicate costs for all historical generations. Continue?")) return;
    setFixingCosts(true);
    try {
      const res = await fetch("/api/admin/fix-costs", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert(`Updated ${data.updated} generations. Total cost: $${data.totalCost.toFixed(4)}`);
        await loadStats(false);
      } else {
        alert("Failed to fix costs: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      alert("Error fixing costs");
    }
    setFixingCosts(false);
  };

  // Filter users by search
  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Initial skeleton loading
  if (initialLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Admin Panel
          </h1>
          <p className="text-muted-foreground">Loading admin data...</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          {[1, 2, 3, 4, 5, 6].map((i) => <StatSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
                <CardDescription>Loading users...</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => <UserSkeleton key={i} />)}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Render User Profile View
  const renderUserProfile = () => {
    if (userProfileLoading) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!viewedUser) return null;

    return (
      <div className="space-y-6">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => { setCurrentView("users"); setViewedUser(null); }}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Users
        </Button>

        {/* User Info Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center text-3xl font-bold overflow-hidden">
                {viewedUser.avatarUrl ? (
                  <img src={viewedUser.avatarUrl} alt={viewedUser.name || "User"} className="w-full h-full object-cover" />
                ) : (
                  viewedUser.email[0].toUpperCase()
                )}
              </div>

              {/* User Details */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold">{viewedUser.name || "No name"}</h2>
                  <Badge variant="outline">{viewedUser.role}</Badge>
                  <Badge>{viewedUser.plan}</Badge>
                  {!viewedUser.isActive && <Badge variant="destructive">Banned</Badge>}
                  {onlineUsers.includes(viewedUser.id) && (
                    <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Online</Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {viewedUser.email}
                  </div>
                  {viewedUser.username && (
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4" />
                      @{viewedUser.username}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Joined: {new Date(viewedUser.createdAt).toLocaleDateString()}
                  </div>
                  {viewedUser.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      <a href={viewedUser.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {viewedUser.website}
                      </a>
                    </div>
                  )}
                  {viewedUser.socialTwitter && (
                    <div className="flex items-center gap-2">
                      <Twitter className="w-4 h-4" />
                      @{viewedUser.socialTwitter}
                    </div>
                  )}
                  {viewedUser.socialGithub && (
                    <div className="flex items-center gap-2">
                      <Github className="w-4 h-4" />
                      {viewedUser.socialGithub}
                    </div>
                  )}
                </div>

                {viewedUser.bio && (
                  <p className="mt-3 text-sm text-muted-foreground">{viewedUser.bio}</p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-5 gap-4 mt-6 pt-6 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold">{viewedUser.credits}</p>
                <p className="text-xs text-muted-foreground">Credits</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{viewedUser._count.generations}</p>
                <p className="text-xs text-muted-foreground">Generations</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">${viewedUser.totalSpent.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Total Spent</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{viewedUser.totalLikesReceived || 0}</p>
                <p className="text-xs text-muted-foreground">Likes Received</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{viewedUser.totalGenerationsPublic || 0}</p>
                <p className="text-xs text-muted-foreground">Public Gens</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => { setSelectedUser(viewedUser.id); }}
              >
                <Gift className="w-4 h-4 mr-2" />
                Grant Credits
              </Button>
              <Button
                variant={viewedUser.isActive ? "destructive" : "default"}
                onClick={() => {
                  handleToggleActive(viewedUser.id, viewedUser.isActive);
                  setViewedUser({ ...viewedUser, isActive: !viewedUser.isActive });
                }}
              >
                {viewedUser.isActive ? (
                  <>
                    <Ban className="w-4 h-4 mr-2" />
                    Ban User
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Unban User
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleKickUser(viewedUser.id)}
                disabled={kicking === viewedUser.id}
              >
                {kicking === viewedUser.id ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <LogOut className="w-4 h-4 mr-2" />
                )}
                Kick Session
              </Button>
              {viewedUser.role !== "OWNER" && (
                <select
                  value={viewedUser.role}
                  onChange={(e) => {
                    const newRole = e.target.value as "USER" | "ADMIN" | "OWNER";
                    handleChangeRole(viewedUser.id, newRole);
                    setViewedUser({ ...viewedUser, role: newRole });
                  }}
                  className="border rounded px-3 py-2 text-sm"
                >
                  <option value="USER">USER</option>
                  <option value="SUPPORT">SUPPORT</option>
                  <option value="MODERATOR">MODERATOR</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="OWNER">OWNER</option>
                </select>
              )}
              <a
                href={`/u/${viewedUser.username || viewedUser.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 border rounded text-sm hover:bg-muted"
              >
                <ExternalLink className="w-4 h-4" />
                View Public Profile
              </a>
            </div>
          </CardContent>
        </Card>

        {/* User Generations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Image className="w-5 h-5" />
              User Generations ({viewedUserGenerations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {viewedUserGenerations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No generations yet</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {viewedUserGenerations.map((gen) => (
                  <div key={gen.id} className="group relative aspect-square rounded-lg overflow-hidden border">
                    <img
                      src={gen.imageUrl}
                      alt={gen.prompt}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                      <p className="text-xs text-white line-clamp-2">{gen.prompt}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={gen.isPublic ? "default" : "secondary"} className="text-xs">
                          {gen.isPublic ? "Public" : "Private"}
                        </Badge>
                        <span className="text-xs text-white/70">{gen.likes} likes</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render Reports View
  const renderReports = () => {
    return (
      <div className="space-y-6">
        {/* Filter */}
        <div className="flex gap-2">
          {["PENDING", "REVIEWED", "RESOLVED", "DISMISSED", "ALL"].map((status) => (
            <Button
              key={status}
              variant={reportFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setReportFilter(status)}
            >
              {status}
            </Button>
          ))}
        </div>

        {/* Reports List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="w-5 h-5" />
              Reports ({reports.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reportsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : reports.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No reports found</p>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report.id} className="p-4 rounded-lg border">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={
                            report.status === "PENDING" ? "destructive" :
                            report.status === "RESOLVED" ? "default" :
                            "secondary"
                          }>
                            {report.status}
                          </Badge>
                          <Badge variant="outline">{report.reason}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Reported {new Date(report.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {report.status === "PENDING" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReportAction(report.id, "REVIEWED")}
                            disabled={processingReport === report.id}
                          >
                            Review
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleReportAction(report.id, "RESOLVED")}
                            disabled={processingReport === report.id}
                          >
                            Resolve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleReportAction(report.id, "DISMISSED")}
                            disabled={processingReport === report.id}
                          >
                            Dismiss
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Reporter Info */}
                    <div className="flex items-center gap-4 mb-3 p-2 bg-muted/50 rounded">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Reporter:</span>
                        <button
                          onClick={() => handleViewUser(report.reporter.id)}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {report.reporter.name || report.reporter.email}
                        </button>
                      </div>
                      {report.reportedUser && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Reported:</span>
                          <button
                            onClick={() => handleViewUser(report.reportedUser!.id)}
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            {report.reportedUser.name || report.reportedUser.email}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    {report.description && (
                      <p className="text-sm mb-3">{report.description}</p>
                    )}

                    {/* Post preview if exists */}
                    {report.post && (
                      <div className="flex items-start gap-3 p-2 bg-muted/30 rounded">
                        {report.post.imageUrl && (
                          <img
                            src={report.post.imageUrl}
                            alt="Reported content"
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <div>
                          <p className="text-sm font-medium">{report.post.title}</p>
                          {report.post.content && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{report.post.content}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Admin Panel
            <span className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full bg-green-500/20 text-green-500 border border-green-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live
            </span>
          </h1>
          <p className="text-muted-foreground">
            Manage users, credits, and system stats
            {lastUpdated && <span className="ml-2 text-xs">• Updated {lastUpdated.toLocaleTimeString()}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={currentView === "users" ? "default" : "outline"}
          onClick={() => setCurrentView("users")}
          className="gap-2"
        >
          <Users className="w-4 h-4" />
          Users
        </Button>
        <Button
          variant={currentView === "reports" ? "default" : "outline"}
          onClick={() => setCurrentView("reports")}
          className="gap-2"
        >
          <Flag className="w-4 h-4" />
          Reports
          {reports.filter(r => r.status === "PENDING").length > 0 && (
            <Badge variant="destructive" className="ml-1">
              {reports.filter(r => r.status === "PENDING").length}
            </Badge>
          )}
        </Button>
        <Link href="/admin/quality">
          <Button variant="outline" className="gap-2">
            <Target className="w-4 h-4" />
            Quality Dashboard
          </Button>
        </Link>
        <Link href="/admin/email">
          <Button variant="outline" className="gap-2">
            <Mail className="w-4 h-4" />
            Email Marketing
          </Button>
        </Link>
      </div>

      {/* Conditional Rendering Based on View */}
      {currentView === "user-profile" ? (
        renderUserProfile()
      ) : currentView === "reports" ? (
        renderReports()
      ) : (
        <>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        {/* Online Now - Real-time */}
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Online Now</p>
              <Wifi className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-green-500">{onlineUsers.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Total Users</p>
              <Users className="w-5 h-5 text-primary" />
            </div>
            <p className="text-3xl font-bold">{stats?.totalUsers || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Generations</p>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold">{stats?.totalGenerations || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Revenue</p>
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold">${stats?.totalRevenue.toFixed(2) || "0.00"}</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-red-500/50 transition-colors" onClick={handleFixCosts}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Replicate Cost</p>
              <DollarSign className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-3xl font-bold">${stats?.totalReplicateCost.toFixed(2) || "0.00"}</p>
            {stats?.totalReplicateCost === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {fixingCosts ? "Calculating..." : "Click to fix"}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-600/10 to-emerald-600/10 border-green-600/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Profit</p>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">
              ${stats?.profit.toFixed(2) || "0.00"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Users ({stats?.totalUsers || filteredUsers.length})</CardTitle>
                  <CardDescription>Manage user accounts and credits</CardDescription>
                </div>
              </div>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by email or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => <UserSkeleton key={i} />)}
                </div>
              ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="p-4 rounded-lg border border-border hover:border-primary/50 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">
                          {user.email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{user.email}</p>
                          {user.name && (
                            <p className="text-xs text-muted-foreground">{user.name}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Online Status - Real-time */}
                        {onlineUsers.includes(user.id) ? (
                          <Badge className="bg-green-500/20 text-green-500 border-green-500/30 flex items-center gap-1">
                            <Circle className="w-2 h-2 fill-green-500" />
                            Online
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="flex items-center gap-1 text-muted-foreground">
                            <Circle className="w-2 h-2" />
                            Offline
                          </Badge>
                        )}
                        {/* Account Status */}
                        {!user.isActive && (
                          <Badge variant="destructive">Blocked</Badge>
                        )}
                        <Badge variant="outline">{user.role}</Badge>
                        <Badge>{user.plan}</Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground mb-2">
                      <div>Credits: <span className="font-bold">{user.credits}</span></div>
                      <div>Gens: <span className="font-bold">{user._count.generations}</span></div>
                      <div>Spent: <span className="font-bold">${user.totalSpent.toFixed(2)}</span></div>
                      <div>Joined: <span className="font-bold">{new Date(user.createdAt).toLocaleDateString()}</span></div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleViewUser(user.id)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View Profile
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedUser(user.id)}
                      >
                        <Gift className="w-3 h-3 mr-1" />
                        Credits
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleActive(user.id, user.isActive)}
                        title={user.isActive ? "Ban user" : "Unban user"}
                      >
                        {user.isActive ? <Ban className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleKickUser(user.id)}
                        disabled={kicking === user.id}
                        title="Kick session (force logout)"
                      >
                        {kicking === user.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                      </Button>
                      {user.role !== "OWNER" && (
                        <select
                          value={user.role}
                          onChange={(e) => handleChangeRole(user.id, e.target.value as any)}
                          className="text-xs border rounded px-2"
                        >
                          <option value="USER">USER</option>
                          <option value="SUPPORT">SUPPORT</option>
                          <option value="MODERATOR">MODERATOR</option>
                          <option value="ADMIN">ADMIN</option>
                          <option value="OWNER">OWNER</option>
                        </select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Grant Credits Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Gift className="w-5 h-5" />
                Grant Credits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedUser ? (
                <>
                  <div>
                    <Label>Selected User</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {users.find((u) => u.id === selectedUser)?.email}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="credits">Credits Amount</Label>
                    <Input
                      id="credits"
                      type="number"
                      value={creditsAmount}
                      onChange={(e) => setCreditsAmount(e.target.value)}
                      placeholder="100"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="reason">Reason (Optional)</Label>
                    <Input
                      id="reason"
                      value={creditsReason}
                      onChange={(e) => setCreditsReason(e.target.value)}
                      placeholder="Testing, promotion, etc."
                      className="mt-1.5"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleGrantCredits}
                      disabled={granting || !creditsAmount}
                      className="flex-1"
                    >
                      {granting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Granting...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Grant
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedUser(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Select a user to grant credits
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Purchases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {stats?.recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-2 rounded border border-border text-xs"
                  >
                    <p className="font-medium">{tx.user.email}</p>
                    <div className="flex justify-between text-muted-foreground">
                      <span>{tx.amount} credits</span>
                      <span className="font-bold text-green-600">
                        ${tx.moneyAmount?.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
