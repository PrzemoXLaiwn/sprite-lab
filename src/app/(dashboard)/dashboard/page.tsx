"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Sparkles,
  Images,
  CreditCard,
  TrendingUp,
  Calendar,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
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

// Skeleton components
function StatSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
          <div className="h-5 w-5 bg-white/10 rounded animate-pulse" />
        </div>
        <div className="h-9 w-16 bg-white/10 rounded animate-pulse" />
        <div className="h-3 w-20 bg-white/10 rounded animate-pulse mt-1" />
      </CardContent>
    </Card>
  );
}

function ImageSkeleton() {
  return (
    <div className="aspect-square rounded-lg bg-white/10 animate-pulse" />
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

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

  useEffect(() => {
    isMounted.current = true;
    loadData();
    return () => { isMounted.current = false; };
  }, [loadData]);

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
  };

  // Show skeleton while loading
  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-primary" />
            Dashboard
          </h1>
          <p className="text-muted-foreground">Loading your overview...</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => <StatSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Generations</CardTitle>
                <CardDescription>Loading your assets...</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => <ImageSkeleton key={i} />)}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6 text-primary" />
          Dashboard
        </h1>
        <p className="text-muted-foreground">Welcome back! Here's your overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Total Generations</p>
              <Images className="w-5 h-5 text-primary" />
            </div>
            <p className="text-3xl font-bold">{stats?.totalGenerations || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">This Week</p>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold">{stats?.recentGenerations || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Credits Left</p>
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <p className="text-3xl font-bold">{stats?.credits || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">{stats?.plan || "FREE"} Plan</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Member Since</p>
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <p className="text-lg font-bold">
              {stats?.memberSince ? formatDate(stats.memberSince) : "N/A"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Generations */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Generations</CardTitle>
                  <CardDescription>Your latest AI-generated assets</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/gallery">
                    View All
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {data?.recentGenerations && data.recentGenerations.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {data.recentGenerations.map((gen) => (
                    <div
                      key={gen.id}
                      className="relative aspect-square rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-all group"
                    >
                      <img
                        src={gen.imageUrl}
                        alt={gen.prompt}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                        <p className="text-xs text-white text-center line-clamp-3">
                          {gen.prompt}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Images className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">
                    No generations yet
                  </p>
                  <Button asChild>
                    <Link href="/generate">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Create Your First Asset
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Tips */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start" asChild>
                <Link href="/generate">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate New Asset
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/gallery">
                  <Images className="w-4 h-4 mr-2" />
                  View Gallery
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/pricing">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Get More Credits
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Tips Card */}
          <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Pro Tip
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Use specific materials and effects in your prompts for better results.
                Try words like "glowing", "metallic", "ancient", or "crystalline"!
              </p>
            </CardContent>
          </Card>

          {/* Community Showcase */}
          <CommunityShowcase />

          {/* Upgrade Prompt */}
          {stats?.plan === "FREE" && (
            <Card className="bg-gradient-to-br from-primary to-purple-600 text-white border-0">
              <CardContent className="pt-6">
                <h3 className="font-bold mb-2">Upgrade to Pro</h3>
                <p className="text-sm text-white/80 mb-4">
                  Get 500 credits/month, higher quality, and commercial use rights
                </p>
                <Button variant="secondary" className="w-full" asChild>
                  <Link href="/pricing">View Plans</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
