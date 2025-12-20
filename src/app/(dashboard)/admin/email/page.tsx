"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  Send,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
  ChevronLeft,
  Eye,
  BarChart3,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { checkAdminAccess } from "../page.actions";

interface EmailLog {
  id: string;
  email: string;
  type: string;
  subject: string;
  status: string;
  createdAt: string;
  errorMessage?: string;
}

interface EmailStats {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  recentEmails: EmailLog[];
}

interface ReEngagementPreview {
  email: string;
  name: string | null;
  credits: number;
  lastActive: string;
  daysSinceActive: number;
}

export default function AdminEmailPage() {
  const router = useRouter();
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Re-engagement preview
  const [previewUsers, setPreviewUsers] = useState<ReEngagementPreview[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [inactiveDays, setInactiveDays] = useState("7");
  const [emailLimit, setEmailLimit] = useState("50");

  // Send state
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);

  // Manual cron trigger
  const [triggeringCron, setTriggeringCron] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/email/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch email stats:", error);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      // Check admin access first
      const result = await checkAdminAccess();
      if (!result.isAdmin) {
        router.push("/dashboard");
        return;
      }
      await fetchStats();
      setLoading(false);
    };
    init();
  }, [fetchStats, router]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const handlePreview = async () => {
    setPreviewLoading(true);
    setPreviewUsers([]);
    try {
      const res = await fetch("/api/email/re-engage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inactiveDays: parseInt(inactiveDays),
          limit: parseInt(emailLimit),
          dryRun: true,
        }),
      });
      const data = await res.json();
      if (data.dryRun) {
        setPreviewUsers(data.users || []);
      }
    } catch (error) {
      console.error("Failed to preview:", error);
    }
    setPreviewLoading(false);
  };

  const handleSendReEngagement = async () => {
    if (!confirm(`Send re-engagement emails to ${previewUsers.length} users?`)) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/email/re-engage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inactiveDays: parseInt(inactiveDays),
          limit: parseInt(emailLimit),
          dryRun: false,
        }),
      });
      const data = await res.json();
      setSendResult({ sent: data.sent || 0, failed: data.failed || 0 });
      await fetchStats();
    } catch (error) {
      console.error("Failed to send:", error);
    }
    setSending(false);
  };

  const handleTriggerCron = async () => {
    if (!confirm("Manually trigger the email cron job?")) return;
    setTriggeringCron(true);
    try {
      const cronSecret = prompt("Enter CRON_SECRET:");
      if (!cronSecret) {
        setTriggeringCron(false);
        return;
      }
      const res = await fetch("/api/cron/emails", {
        headers: { Authorization: `Bearer ${cronSecret}` },
      });
      const data = await res.json();
      alert(JSON.stringify(data, null, 2));
      await fetchStats();
    } catch (error) {
      console.error("Failed to trigger cron:", error);
    }
    setTriggeringCron(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-green-500/20 text-green-500";
      case "failed":
        return "bg-red-500/20 text-red-500";
      case "opened":
        return "bg-blue-500/20 text-blue-500";
      case "clicked":
        return "bg-purple-500/20 text-purple-500";
      default:
        return "bg-gray-500/20 text-gray-500";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "WELCOME":
        return "bg-emerald-500/20 text-emerald-500";
      case "RE_ENGAGEMENT":
        return "bg-orange-500/20 text-orange-500";
      case "PROMO":
        return "bg-purple-500/20 text-purple-500";
      default:
        return "bg-gray-500/20 text-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="gap-2">
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Mail className="w-6 h-6 text-primary" />
              Email Marketing
            </h1>
            <p className="text-muted-foreground">Manage email campaigns and view logs</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTriggerCron}
            disabled={triggeringCron}
            className="gap-2"
          >
            {triggeringCron ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Run Cron
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Total Emails</p>
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <p className="text-3xl font-bold">{stats?.total || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Welcome</p>
              <Users className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-3xl font-bold">{stats?.byType?.WELCOME || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Re-engagement</p>
              <Clock className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-3xl font-bold">{stats?.byType?.RE_ENGAGEMENT || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Sent</p>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-green-500">{stats?.byStatus?.sent || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Failed</p>
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-3xl font-bold text-red-500">{stats?.byStatus?.failed || 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Re-engagement Campaign Panel */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="w-5 h-5" />
                Re-engagement Campaign
              </CardTitle>
              <CardDescription>Send emails to inactive users with credits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="days">Inactive Days</Label>
                <Input
                  id="days"
                  type="number"
                  value={inactiveDays}
                  onChange={(e) => setInactiveDays(e.target.value)}
                  placeholder="7"
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Users inactive for X+ days
                </p>
              </div>

              <div>
                <Label htmlFor="limit">Max Emails</Label>
                <Input
                  id="limit"
                  type="number"
                  value={emailLimit}
                  onChange={(e) => setEmailLimit(e.target.value)}
                  placeholder="50"
                  className="mt-1.5"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handlePreview}
                  disabled={previewLoading}
                  className="flex-1 gap-2"
                >
                  {previewLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                  Preview
                </Button>
                <Button
                  onClick={handleSendReEngagement}
                  disabled={sending || previewUsers.length === 0}
                  className="flex-1 gap-2"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Send
                </Button>
              </div>

              {sendResult && (
                <div className="p-3 rounded-lg bg-muted text-sm">
                  <p className="font-medium">Campaign Complete</p>
                  <p className="text-green-500">Sent: {sendResult.sent}</p>
                  {sendResult.failed > 0 && (
                    <p className="text-red-500">Failed: {sendResult.failed}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview Users */}
          {previewUsers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview ({previewUsers.length} users)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {previewUsers.map((user, i) => (
                    <div key={i} className="p-2 rounded border text-xs">
                      <p className="font-medium truncate">{user.email}</p>
                      <div className="flex justify-between text-muted-foreground mt-1">
                        <span>{user.credits} credits</span>
                        <span>{user.daysSinceActive} days ago</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Email Logs */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Recent Emails
              </CardTitle>
              <CardDescription>Last 50 emails sent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {stats?.recentEmails && stats.recentEmails.length > 0 ? (
                  stats.recentEmails.map((email) => (
                    <div
                      key={email.id}
                      className="p-3 rounded-lg border border-border hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{email.email}</p>
                          <p className="text-xs text-muted-foreground truncate">{email.subject}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <Badge className={getTypeColor(email.type)}>{email.type}</Badge>
                          <Badge className={getStatusColor(email.status)}>{email.status}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{new Date(email.createdAt).toLocaleString()}</span>
                        {email.errorMessage && (
                          <span className="text-red-500 truncate max-w-[200px]" title={email.errorMessage}>
                            {email.errorMessage}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">No emails sent yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Info Box */}
      <Card className="mt-6 bg-muted/50">
        <CardContent className="pt-6">
          <h3 className="font-medium mb-2">Automated Email Schedule</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>Welcome emails:</strong> Sent automatically when a user signs up</li>
            <li>• <strong>Re-engagement emails:</strong> Sent daily at 10:00 AM UTC (cron job)</li>
            <li>• <strong>Promo emails:</strong> Manual campaigns only</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-4">
            Emails are sent from: <strong>noreply@sprite-lab.com</strong> (Resend)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
