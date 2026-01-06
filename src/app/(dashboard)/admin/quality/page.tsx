"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Eye,
  Loader2,
  RefreshCw,
  ChevronLeft,
  Lightbulb,
  Zap,
  Target,
  AlertCircle,
  Image,
  Settings,
  ArrowRight,
  FlaskConical,
  Sparkles,
  Brain,
  Copy,
  Check,
} from "lucide-react";
import Link from "next/link";
import { VerificationPanel } from "@/components/dashboard/VerificationPanel";

interface AIOptimizationResult {
  success: boolean;
  analysis?: string;
  stats?: {
    analyzedPatterns: number;
    stylesCount: number;
    categoriesCount: number;
  };
  error?: string;
}

interface QualityData {
  overview: {
    totalAnalyses: number;
    pendingJobs: number;
    failedJobs: number;
    hallucinationCount: number;
    hallucinationRate: string;
    averageScores: {
      quality: string;
      alignment: string;
      style: string;
      confidence: string;
    };
  };
  problemsByCategory: Array<{
    categoryId: string;
    subcategoryId: string;
    styleId: string;
    totalAnalyses: number;
    avgQuality: number;
    avgAlignment: number;
    hallucinationCount: number;
    hallucinationRate: number;
    status: "good" | "warning" | "critical";
  }>;
  hallucinationTypes: Array<{
    type: string;
    count: number;
  }>;
  hallucinationPatterns: Array<{
    id: string;
    categoryId: string;
    subcategoryId: string;
    styleId: string;
    type: string;
    triggerKeywords: string[];
    occurrenceCount: number;
    preventionPrompt: string | null;
    isResolved: boolean;
  }>;
  recentProblems: Array<{
    id: string;
    generationId: string;
    imageUrl: string;
    prompt: string;
    categoryId: string;
    subcategoryId: string;
    styleId: string;
    qualityScore: number;
    promptAlignment: number;
    hasHallucination: boolean;
    hallucinationType: string | null;
    suggestedFix: string | null;
    missingElements: string[];
    extraElements: string[];
    createdAt: string;
    user: { email: string; name: string | null };
  }>;
  optimizedPrompts: Array<{
    id: string;
    categoryId: string;
    subcategoryId: string;
    styleId: string;
    promptTemplate: string;
    requiredKeywords: string[];
    avoidKeywords: string[];
    avgQualityScore: number;
    avgPromptAlignment: number;
    successCount: number;
    failureCount: number;
    successRate: number;
  }>;
  dailyStats: Array<{
    date: string;
    totalAnalyses: number;
    avgQuality: number;
    avgAlignment: number;
    hallucinationCount: number;
  }>;
  recommendations: Array<{
    priority: "high" | "medium" | "low";
    category: string;
    subcategory: string;
    style: string;
    issue: string;
    recommendation: string;
    affectedGenerations: number;
  }>;
}

export default function QualityDashboardPage() {
  const [data, setData] = useState<QualityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<QualityData["recentProblems"][0] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // AI Optimization state
  const [aiOptResult, setAiOptResult] = useState<AIOptimizationResult | null>(null);
  const [generatingOpt, setGeneratingOpt] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setRefreshing(!showLoading);
    try {
      const res = await fetch("/api/admin/quality");
      if (!res.ok) throw new Error("Failed to fetch quality data");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Generate AI optimizations
  const generateAIOptimizations = async () => {
    setGeneratingOpt(true);
    setAiOptResult(null);
    try {
      const res = await fetch("/api/admin/generate-optimizations", {
        method: "POST",
      });
      const json = await res.json();
      setAiOptResult(json);
      // Refresh main data to show updated optimizations
      if (json.success) {
        fetchData(false);
      }
    } catch (err) {
      setAiOptResult({
        success: false,
        error: err instanceof Error ? err.message : "Failed to generate optimizations",
      });
    } finally {
      setGeneratingOpt(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTemplate(id);
    setTimeout(() => setCopiedTemplate(null), 2000);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3">Loading quality data...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <Card className="border-red-500/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-500">
              <AlertCircle className="w-6 h-6" />
              <div>
                <p className="font-medium">Failed to load quality data</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
            <Button onClick={() => fetchData()} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "good": return "bg-green-500/20 text-green-500 border-green-500/30";
      case "warning": return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
      case "critical": return "bg-red-500/20 text-red-500 border-red-500/30";
      default: return "bg-gray-500/20 text-gray-500";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-500/20 text-red-500 border-red-500/30";
      case "medium": return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
      case "low": return "bg-blue-500/20 text-blue-500 border-blue-500/30";
      default: return "bg-gray-500/20 text-gray-500";
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/admin" className="text-muted-foreground hover:text-foreground">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Target className="w-6 h-6 text-primary" />
              Quality Dashboard
            </h1>
          </div>
          <p className="text-muted-foreground">
            Monitor image quality, detect issues, and get recommendations for fixes
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => fetchData(false)}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Overview & Problems
          </TabsTrigger>
          <TabsTrigger value="ai-optimize" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            AI Optimizations
          </TabsTrigger>
          <TabsTrigger value="verification" className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4" />
            Fix Verification
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Analyzed</p>
              <Image className="w-5 h-5 text-primary" />
            </div>
            <p className="text-3xl font-bold">{data.overview.totalAnalyses}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Pending</p>
              <Loader2 className="w-5 h-5 text-yellow-500" />
            </div>
            <p className="text-3xl font-bold">{data.overview.pendingJobs}</p>
          </CardContent>
        </Card>

        <Card className={data.overview.hallucinationCount > 0 ? "border-red-500/30" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Hallucinations</p>
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-3xl font-bold text-red-500">{data.overview.hallucinationCount}</p>
            <p className="text-xs text-muted-foreground">{data.overview.hallucinationRate}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Avg Quality</p>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold">{data.overview.averageScores.quality}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Alignment</p>
              <Target className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold">{data.overview.averageScores.alignment}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Style Match</p>
              <Zap className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-3xl font-bold">{data.overview.averageScores.style}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Recommendations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Priority Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                Recommendations ({data.recommendations.length})
              </CardTitle>
              <CardDescription>
                Konkretne sugestie co naprawic w promptach
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.recommendations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                  <p>Wszystko dziala dobrze! Brak problemow do naprawy.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border ${
                        rec.priority === "high" ? "border-red-500/30 bg-red-500/5" :
                        rec.priority === "medium" ? "border-yellow-500/30 bg-yellow-500/5" :
                        "border-blue-500/30 bg-blue-500/5"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={getPriorityColor(rec.priority)}>
                            {rec.priority.toUpperCase()}
                          </Badge>
                          <span className="text-sm font-medium">
                            {rec.category} / {rec.subcategory} / {rec.style}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {rec.affectedGenerations} affected
                        </span>
                      </div>

                      <div className="mb-3">
                        <p className="text-sm font-medium text-red-400 flex items-center gap-1">
                          <XCircle className="w-4 h-4" />
                          Problem: {rec.issue}
                        </p>
                      </div>

                      <div className="p-3 bg-green-500/10 rounded border border-green-500/20">
                        <p className="text-sm flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>
                            <strong>Rekomendacja:</strong> {rec.recommendation}
                          </span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Problems by Category */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Quality by Category
              </CardTitle>
              <CardDescription>
                Status jakosci dla kazdej kombinacji kategoria/subkategoria/styl
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.problemsByCategory.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No analysis data yet. Generate some images first.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">Category</th>
                        <th className="text-left py-2 px-2">Subcategory</th>
                        <th className="text-left py-2 px-2">Style</th>
                        <th className="text-center py-2 px-2">Analyzed</th>
                        <th className="text-center py-2 px-2">Quality</th>
                        <th className="text-center py-2 px-2">Alignment</th>
                        <th className="text-center py-2 px-2">Halluc.</th>
                        <th className="text-center py-2 px-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.problemsByCategory.map((cat, idx) => (
                        <tr key={idx} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-2 font-medium">{cat.categoryId}</td>
                          <td className="py-2 px-2">{cat.subcategoryId}</td>
                          <td className="py-2 px-2">{cat.styleId}</td>
                          <td className="py-2 px-2 text-center">{cat.totalAnalyses}</td>
                          <td className="py-2 px-2 text-center">
                            <span className={cat.avgQuality < 50 ? "text-red-500" : cat.avgQuality < 70 ? "text-yellow-500" : "text-green-500"}>
                              {cat.avgQuality}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span className={cat.avgAlignment < 50 ? "text-red-500" : cat.avgAlignment < 70 ? "text-yellow-500" : "text-green-500"}>
                              {cat.avgAlignment}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span className={cat.hallucinationRate > 20 ? "text-red-500" : cat.hallucinationRate > 10 ? "text-yellow-500" : "text-green-500"}>
                              {cat.hallucinationRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <Badge className={getStatusColor(cat.status)}>
                              {cat.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Problems */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Recent Problems ({data.recentProblems.length})
              </CardTitle>
              <CardDescription>
                Ostatnie generacje z problemami - kliknij aby zobaczyc szczegoly
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.recentProblems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                  <p>No recent problems detected!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {data.recentProblems.slice(0, 12).map((problem) => (
                    <div
                      key={problem.id}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all hover:scale-105 ${
                        problem.hasHallucination ? "border-red-500" :
                        problem.promptAlignment < 50 ? "border-yellow-500" :
                        "border-orange-500"
                      }`}
                      onClick={() => setSelectedProblem(problem)}
                    >
                      <img
                        src={problem.imageUrl}
                        alt={problem.prompt}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <div className="flex items-center gap-1 mb-1">
                          {problem.hasHallucination && (
                            <Badge variant="destructive" className="text-xs">
                              Hallucination
                            </Badge>
                          )}
                          {problem.promptAlignment < 60 && (
                            <Badge variant="secondary" className="text-xs bg-yellow-500/20 text-yellow-500">
                              Low align
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-white/80 line-clamp-1">
                          {problem.categoryId}/{problem.subcategoryId}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Details & Patterns */}
        <div className="space-y-6">
          {/* Selected Problem Detail */}
          {selectedProblem && (
            <Card className="border-primary">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Problem Details</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedProblem(null)}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <img
                  src={selectedProblem.imageUrl}
                  alt={selectedProblem.prompt}
                  className="w-full rounded-lg"
                />

                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Prompt:</p>
                    <p className="font-medium">{selectedProblem.prompt}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-muted-foreground">Category:</p>
                      <p className="font-medium">{selectedProblem.categoryId}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Subcategory:</p>
                      <p className="font-medium">{selectedProblem.subcategoryId}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Style:</p>
                      <p className="font-medium">{selectedProblem.styleId}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">User:</p>
                      <p className="font-medium">{selectedProblem.user.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded bg-muted">
                      <p className="text-xs text-muted-foreground">Quality</p>
                      <p className={`text-lg font-bold ${selectedProblem.qualityScore < 50 ? "text-red-500" : "text-green-500"}`}>
                        {selectedProblem.qualityScore}
                      </p>
                    </div>
                    <div className="p-2 rounded bg-muted">
                      <p className="text-xs text-muted-foreground">Alignment</p>
                      <p className={`text-lg font-bold ${selectedProblem.promptAlignment < 50 ? "text-red-500" : "text-green-500"}`}>
                        {selectedProblem.promptAlignment}
                      </p>
                    </div>
                  </div>

                  {selectedProblem.hasHallucination && (
                    <div className="p-3 rounded bg-red-500/10 border border-red-500/30">
                      <p className="text-xs text-red-500 font-medium mb-1">Hallucination Detected</p>
                      <p className="text-sm">{selectedProblem.hallucinationType}</p>
                    </div>
                  )}

                  {selectedProblem.missingElements.length > 0 && (
                    <div>
                      <p className="text-muted-foreground text-xs">Missing elements:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedProblem.missingElements.map((el, i) => (
                          <Badge key={i} variant="destructive" className="text-xs">
                            {el}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedProblem.extraElements.length > 0 && (
                    <div>
                      <p className="text-muted-foreground text-xs">Extra (unwanted) elements:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedProblem.extraElements.map((el, i) => (
                          <Badge key={i} variant="secondary" className="text-xs bg-yellow-500/20 text-yellow-500">
                            {el}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedProblem.suggestedFix && (
                    <div className="p-3 rounded bg-green-500/10 border border-green-500/30">
                      <p className="text-xs text-green-500 font-medium mb-1">Suggested Fix</p>
                      <p className="text-sm">{selectedProblem.suggestedFix}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Hallucination Types */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Hallucination Types
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.hallucinationTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hallucinations detected
                </p>
              ) : (
                <div className="space-y-2">
                  {data.hallucinationTypes.map((type, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded bg-muted">
                      <span className="text-sm">{type.type || "unknown"}</span>
                      <Badge variant="destructive">{type.count}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Learned Optimizations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-5 h-5 text-green-500" />
                Learned Optimizations
              </CardTitle>
              <CardDescription>
                System automatycznie nauczyl sie tych ulepszeni
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.optimizedPrompts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No optimizations learned yet. Need more data.
                </p>
              ) : (
                <div className="space-y-3">
                  {data.optimizedPrompts.slice(0, 5).map((opt) => (
                    <div key={opt.id} className="p-3 rounded border text-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-xs">
                          {opt.categoryId}/{opt.subcategoryId}
                        </span>
                        <Badge className="bg-green-500/20 text-green-500 text-xs">
                          {opt.successRate.toFixed(0)}% success
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>Quality: {opt.avgQualityScore.toFixed(1)} | Alignment: {opt.avgPromptAlignment.toFixed(1)}</p>
                        {opt.requiredKeywords.length > 0 && (
                          <p className="flex items-start gap-1">
                            <ArrowRight className="w-3 h-3 mt-0.5 text-green-500" />
                            Required: {opt.requiredKeywords.slice(0, 3).join(", ")}
                          </p>
                        )}
                        {opt.avoidKeywords.length > 0 && (
                          <p className="flex items-start gap-1">
                            <ArrowRight className="w-3 h-3 mt-0.5 text-red-500" />
                            Avoid: {opt.avoidKeywords.slice(0, 3).join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">System Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Anthropic API</span>
                <Badge className="bg-green-500/20 text-green-500">Active</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pending analyses</span>
                <span className="font-medium">{data.overview.pendingJobs}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Failed jobs</span>
                <span className="font-medium text-red-500">{data.overview.failedJobs}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Learned patterns</span>
                <span className="font-medium">{data.hallucinationPatterns.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
        </TabsContent>

        {/* AI Optimizations Tab */}
        <TabsContent value="ai-optimize" className="space-y-6">
          {/* Generate Button */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-500" />
                AI-Powered Prompt Optimization
              </CardTitle>
              <CardDescription>
                Claude AI analizuje halucynacje i generuje rekomendacje zmian w kodzie do skopiowania
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Button
                  onClick={generateAIOptimizations}
                  disabled={generatingOpt}
                  size="lg"
                  className="gap-2 bg-purple-600 hover:bg-purple-700"
                >
                  {generatingOpt ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate AI Optimizations
                    </>
                  )}
                </Button>
                <p className="text-sm text-muted-foreground">
                  Analizuje {data?.hallucinationPatterns.length || 0} wzorcow halucynacji
                </p>
              </div>

              {/* Progress */}
              {generatingOpt && (
                <div className="mt-4 p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                    <div>
                      <p className="font-medium">Claude AI analizuje halucynacje...</p>
                      <p className="text-sm text-muted-foreground">
                        Generowanie rekomendacji zmian w kodzie
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {aiOptResult?.error && (
                <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                  <div className="flex items-center gap-3 text-red-500">
                    <AlertCircle className="w-5 h-5" />
                    <p>{aiOptResult.error}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Analysis Results - Markdown to copy */}
          {aiOptResult?.success && aiOptResult.analysis && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-yellow-500" />
                    Rekomendacje AI ({aiOptResult.stats?.analyzedPatterns || 0} wzorcow)
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => copyToClipboard(aiOptResult.analysis || "", "full-analysis")}
                  >
                    {copiedTemplate === "full-analysis" ? (
                      <>
                        <Check className="w-4 h-4 text-green-500" />
                        Skopiowano!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Kopiuj wszystko
                      </>
                    )}
                  </Button>
                </div>
                <CardDescription>
                  Skopiuj ponizsze rekomendacje i wklej do Claude w VSCode
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-lg bg-muted/50 border overflow-auto max-h-[600px]">
                  <pre className="text-sm whitespace-pre-wrap font-mono">{aiOptResult.analysis}</pre>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!aiOptResult && !generatingOpt && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Brain className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                  <h3 className="text-lg font-medium mb-2">Brak wygenerowanych optymalizacji</h3>
                  <p className="text-muted-foreground mb-4">
                    Kliknij "Generate AI Optimizations" aby przeanalizowac halucynacje i wygenerowac rekomendacje
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="verification">
          <VerificationPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
