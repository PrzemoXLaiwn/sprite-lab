"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Image,
  Download,
  Share2,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Star,
  Clock,
  AlertCircle,
  Loader2,
  ChevronDown,
} from "lucide-react";

interface AnalyticsData {
  overview: {
    totalGenerations: number;
    totalUsers: number;
    period: string;
    satisfactionRate: string;
    avgRating: string;
    totalFeedback: number;
  };
  engagement: {
    downloadRate: string;
    shareRate: string;
    regenerateRate: string;
    eventBreakdown: Array<{ type: string; count: number }>;
  };
  topCategories: Array<{ category: string; count: number }>;
  topStyles: Array<{ style: string; count: number }>;
  dailyGenerations: Array<{ date: string; count: number }>;
  promptPerformance: {
    best: Array<{
      id: string;
      categoryId: string;
      subcategoryId: string;
      styleId: string;
      promptPattern: string;
      avgRating: number;
      totalGenerations: number;
      positiveCount: number;
      negativeCount: number;
    }>;
    worst: Array<{
      id: string;
      categoryId: string;
      subcategoryId: string;
      styleId: string;
      promptPattern: string;
      avgRating: number;
      totalGenerations: number;
      positiveCount: number;
      negativeCount: number;
    }>;
  };
  recentGenerations: Array<{
    id: string;
    prompt: string;
    category: string;
    subcategory: string;
    style: string;
    imageUrl: string;
    createdAt: string;
    user: string;
  }>;
  recentFeedback: Array<{
    generationId: string;
    rating: number;
    comment: string | null;
    issues: string[] | null;
    createdAt: string;
  }>;
}

export default function AnalyticsDashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState("7d");

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/analytics/dashboard?period=${period}`);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to fetch analytics");
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#00ff88] mx-auto mb-4" />
          <p className="text-[#a0a0b0]">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-white font-semibold mb-2">Error loading analytics</p>
          <p className="text-[#a0a0b0] mb-4">{error}</p>
          <Button onClick={fetchAnalytics}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <BarChart3 className="w-7 h-7 text-[#00ff88]" />
              Generation Analytics
            </h1>
            <p className="text-[#a0a0b0] mt-1">
              Monitor quality and learn from user feedback
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-[#1a1a28] border border-[#2a2a3d] rounded-lg px-3 py-2 text-white"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>

            <Button onClick={fetchAnalytics} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Generations"
            value={data.overview.totalGenerations.toLocaleString()}
            icon={<Image className="w-5 h-5" />}
            color="blue"
          />
          <StatCard
            title="Total Users"
            value={data.overview.totalUsers.toLocaleString()}
            icon={<Users className="w-5 h-5" />}
            color="purple"
          />
          <StatCard
            title="Satisfaction Rate"
            value={`${data.overview.satisfactionRate}%`}
            icon={<ThumbsUp className="w-5 h-5" />}
            color="green"
            subtext={`${data.overview.totalFeedback} ratings`}
          />
          <StatCard
            title="Avg Rating"
            value={data.overview.avgRating}
            icon={<Star className="w-5 h-5" />}
            color="yellow"
          />
        </div>

        {/* Engagement Metrics */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#00ff88]" />
            Engagement Metrics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricBar
              label="Download Rate"
              value={parseFloat(data.engagement.downloadRate)}
              icon={<Download className="w-4 h-4" />}
              color="#00ff88"
            />
            <MetricBar
              label="Share Rate"
              value={parseFloat(data.engagement.shareRate)}
              icon={<Share2 className="w-4 h-4" />}
              color="#00d4ff"
            />
            <MetricBar
              label="Regenerate Rate"
              value={parseFloat(data.engagement.regenerateRate)}
              icon={<RefreshCw className="w-4 h-4" />}
              color="#ffd93d"
              isNegative
            />
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Categories */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Top Categories
            </h2>
            <div className="space-y-3">
              {data.topCategories.slice(0, 5).map((cat, i) => (
                <div key={cat.category} className="flex items-center gap-3">
                  <span className="text-[#a0a0b0] w-6">{i + 1}.</span>
                  <span className="flex-1 text-white capitalize">
                    {cat.category.replace(/-/g, " ")}
                  </span>
                  <span className="text-[#00ff88] font-mono">
                    {cat.count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Styles */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Top Styles
            </h2>
            <div className="space-y-3">
              {data.topStyles.slice(0, 5).map((style, i) => (
                <div key={style.style} className="flex items-center gap-3">
                  <span className="text-[#a0a0b0] w-6">{i + 1}.</span>
                  <span className="flex-1 text-white capitalize">
                    {style.style.replace(/-/g, " ")}
                  </span>
                  <span className="text-[#00d4ff] font-mono">
                    {style.count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Prompt Performance */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-[#ffd93d]" />
            Prompt Performance Analysis
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Best Performing */}
            <div>
              <h3 className="text-sm font-medium text-[#00ff88] mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Best Performing Patterns
              </h3>
              <div className="space-y-2">
                {data.promptPerformance.best.slice(0, 5).map((p) => (
                  <div
                    key={p.id}
                    className="bg-[#1a1a28] rounded-lg p-3 border border-green-500/20"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">
                          {p.promptPattern || "N/A"}
                        </p>
                        <p className="text-xs text-[#a0a0b0] mt-1">
                          {p.categoryId} / {p.subcategoryId} / {p.styleId}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-green-500 font-semibold">
                          {p.avgRating.toFixed(1)}
                          <Star className="w-3 h-3 inline ml-1" />
                        </div>
                        <div className="text-xs text-[#a0a0b0]">
                          {p.totalGenerations} gens
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {data.promptPerformance.best.length === 0 && (
                  <p className="text-[#a0a0b0] text-sm">
                    Not enough data yet
                  </p>
                )}
              </div>
            </div>

            {/* Worst Performing */}
            <div>
              <h3 className="text-sm font-medium text-red-500 mb-3 flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                Needs Improvement
              </h3>
              <div className="space-y-2">
                {data.promptPerformance.worst.slice(0, 5).map((p) => (
                  <div
                    key={p.id}
                    className="bg-[#1a1a28] rounded-lg p-3 border border-red-500/20"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">
                          {p.promptPattern || "N/A"}
                        </p>
                        <p className="text-xs text-[#a0a0b0] mt-1">
                          {p.categoryId} / {p.subcategoryId} / {p.styleId}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-red-500 font-semibold">
                          {p.avgRating.toFixed(1)}
                          <Star className="w-3 h-3 inline ml-1" />
                        </div>
                        <div className="text-xs text-[#a0a0b0]">
                          {p.negativeCount} negative
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {data.promptPerformance.worst.length === 0 && (
                  <p className="text-[#a0a0b0] text-sm">
                    Not enough data yet
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Generations with Images */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#00d4ff]" />
            Recent Generations
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {data.recentGenerations.slice(0, 12).map((gen) => (
              <div
                key={gen.id}
                className="group relative rounded-lg overflow-hidden border border-[#2a2a3d] hover:border-[#00ff88] transition-colors"
              >
                <img
                  src={gen.imageUrl}
                  alt={gen.prompt}
                  className="w-full aspect-square object-cover"
                />
                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                  <p className="text-white text-xs line-clamp-2">{gen.prompt}</p>
                  <p className="text-[#a0a0b0] text-[10px] mt-1">
                    {gen.category} • {gen.style}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Feedback */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <ThumbsUp className="w-5 h-5 text-[#00ff88]" />
            Recent Feedback
          </h2>
          <div className="space-y-3">
            {data.recentFeedback.slice(0, 10).map((fb, i) => (
              <div
                key={`${fb.generationId}-${i}`}
                className="flex items-center gap-4 p-3 bg-[#1a1a28] rounded-lg"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    fb.rating > 0
                      ? "bg-green-500/20 text-green-500"
                      : "bg-red-500/20 text-red-500"
                  }`}
                >
                  {fb.rating > 0 ? (
                    <ThumbsUp className="w-5 h-5" />
                  ) : (
                    <ThumbsDown className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-mono">
                    {fb.generationId.slice(0, 12)}...
                  </p>
                  {fb.comment && (
                    <p className="text-[#a0a0b0] text-xs mt-1">{fb.comment}</p>
                  )}
                  {fb.issues && fb.issues.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {fb.issues.map((issue) => (
                        <span
                          key={issue}
                          className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded"
                        >
                          {issue}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-xs text-[#a0a0b0]">
                  {new Date(fb.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
            {data.recentFeedback.length === 0 && (
              <p className="text-[#a0a0b0] text-center py-8">
                No feedback yet. Users can rate generations with thumbs up/down.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  icon,
  color,
  subtext,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: "blue" | "purple" | "green" | "yellow";
  subtext?: string;
}) {
  const colors = {
    blue: "from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400",
    purple:
      "from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400",
    green:
      "from-green-500/20 to-green-600/10 border-green-500/30 text-green-400",
    yellow:
      "from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 text-yellow-400",
  };

  return (
    <div
      className={`rounded-xl bg-gradient-to-br ${colors[color]} border p-4`}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm text-[#a0a0b0]">{title}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {subtext && <div className="text-xs text-[#a0a0b0] mt-1">{subtext}</div>}
    </div>
  );
}

// Metric Bar Component
function MetricBar({
  label,
  value,
  icon,
  color,
  isNegative,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  isNegative?: boolean;
}) {
  return (
    <div className="bg-[#1a1a28] rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color }}>{icon}</span>
        <span className="text-sm text-[#a0a0b0]">{label}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-xl font-bold text-white">{value.toFixed(1)}%</span>
        {isNegative && value > 20 && (
          <span className="text-xs text-yellow-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            High
          </span>
        )}
      </div>
      <div className="mt-2 h-2 bg-[#0a0a0f] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(value, 100)}%`,
            backgroundColor: isNegative && value > 20 ? "#ffd93d" : color,
          }}
        />
      </div>
    </div>
  );
}
