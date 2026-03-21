"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Play,
  Brain,
  CheckCircle,
  AlertTriangle,
  Zap,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

interface QueueResult {
  success: boolean;
  message: string;
  stats: {
    totalGenerations: number;
    alreadyAnalyzed: number;
    newlyQueued: number;
    totalPending: number;
    failed: number;
    coverage: string;
  };
}

interface ProcessResult {
  success: boolean;
  processed: number;
  duration: string;
  queue: { pending: number; completed: number; failed: number };
  totalAnalyzed: number;
  estimatedTimeRemaining: string;
}

interface ReportData {
  coverage: { totalGenerations: number; totalAnalyzed: number; pendingJobs: number; percentage: string };
  userDemand: Array<{ category: string; subcategory: string; style: string; count: number }>;
  qualityByCategory: Array<{
    category: string; subcategory: string; style: string; count: number;
    avgQuality: number; avgAlignment: number; hallucinationRate: string; status: string;
  }>;
  hallucinationPatterns: Array<{
    category: string; subcategory: string; style: string; type: string;
    occurrences: number; prevention: string | null;
  }>;
  worstGenerations: Array<{
    id: string; prompt: string; category: string; subcategory: string; style: string;
    imageUrl: string; qualityScore: number; promptAlignment: number;
    hallucinationType: string; suggestedFix: string;
  }>;
  recommendations: Array<{
    priority: string; category: string; subcategory: string; style: string;
    issue: string; recommendation: string; evidence: string;
  }>;
}

interface AIRecommendations {
  success: boolean;
  analysisDataUsed: { totalAnalyzed: number; worstCombinations: number; hallucinationPatterns: number; bestPrompts: number };
  recommendations: {
    fixes: Array<{
      category: string; subcategory: string; style: string; problem: string;
      objectType: string; addToAvoid: string[]; addToNegative: string[];
      compositionFix: string | null; confidence: number;
    }>;
    globalFixes: Array<{ scope: string; fix: string; reason: string }>;
    summary: string;
  };
}

export default function AnalyzeAllPage() {
  const [step, setStep] = useState<"idle" | "queuing" | "processing" | "reporting" | "recommending" | "done">("idle");
  const [queueResult, setQueueResult] = useState<QueueResult | null>(null);
  const [processLog, setProcessLog] = useState<ProcessResult[]>([]);
  const [report, setReport] = useState<ReportData | null>(null);
  const [aiRecs, setAiRecs] = useState<AIRecommendations | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [totalProcessed, setTotalProcessed] = useState(0);

  // Step 1: Queue all unanalyzed generations
  const handleQueue = useCallback(async () => {
    setStep("queuing");
    setError(null);
    try {
      const res = await fetch("/api/admin/analyze-all", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to queue");
      setQueueResult(data);
      setStep("processing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setStep("idle");
    }
  }, []);

  // Step 2: Process batch (call repeatedly)
  const handleProcessBatch = useCallback(async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/analyze-all/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchSize: 25, runLearning: false }),
      });
      const data: ProcessResult = await res.json();
      if (!res.ok) throw new Error((data as unknown as { error: string }).error || "Failed");
      setProcessLog(prev => [...prev, data]);
      setTotalProcessed(prev => prev + data.processed);

      // Auto-continue if still pending
      if (data.queue.pending > 0) {
        // Small delay to avoid hammering
        setTimeout(() => handleProcessBatch(), 2000);
      } else {
        setIsProcessing(false);
        setStep("reporting");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setIsProcessing(false);
    }
  }, []);

  // Step 3: Get report
  const handleGetReport = useCallback(async () => {
    setStep("reporting");
    setError(null);
    try {
      const res = await fetch("/api/admin/analyze-all");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }, []);

  // Step 4: Get AI recommendations
  const handleGetRecommendations = useCallback(async () => {
    setStep("recommending");
    setError(null);
    try {
      const res = await fetch("/api/admin/analyze-all/recommendations", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setAiRecs(data);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }, []);

  const latestProcess = processLog[processLog.length - 1];

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analyze All Generations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Queue, analyze, and generate prompt improvement recommendations
          </p>
        </div>
        <Link href="/admin/quality" className="text-sm text-primary hover:underline">
          ← Quality Dashboard
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive font-medium">{error}</p>
        </div>
      )}

      {/* Pipeline steps */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {[
          { num: 1, label: "Queue", desc: "Queue unanalyzed", icon: Zap, active: step === "queuing" },
          { num: 2, label: "Process", desc: "Claude Vision analysis", icon: Play, active: step === "processing" || isProcessing },
          { num: 3, label: "Report", desc: "View analysis data", icon: RefreshCw, active: step === "reporting" },
          { num: 4, label: "AI Recs", desc: "Generate fixes", icon: Brain, active: step === "recommending" },
        ].map(s => (
          <div key={s.num} className={`rounded-xl border p-3 ${s.active ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${s.active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {s.num}
              </span>
              <span className="text-sm font-medium">{s.label}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 ml-8">{s.desc}</p>
          </div>
        ))}
      </div>

      {/* Step 1: Queue */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" /> Step 1: Queue All Generations
        </h2>

        {queueResult && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <Stat label="Total Generations" value={queueResult.stats.totalGenerations} />
            <Stat label="Already Analyzed" value={queueResult.stats.alreadyAnalyzed} />
            <Stat label="Newly Queued" value={queueResult.stats.newlyQueued} />
            <Stat label="Total Pending" value={queueResult.stats.totalPending} />
            <Stat label="Failed" value={queueResult.stats.failed} />
            <Stat label="Coverage" value={queueResult.stats.coverage} />
          </div>
        )}

        <Button onClick={handleQueue} disabled={step === "queuing"}>
          {step === "queuing" ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Queuing...</> : "Queue All Unanalyzed"}
        </Button>
      </div>

      {/* Step 2: Process */}
      {(step === "processing" || processLog.length > 0) && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Play className="w-5 h-5 text-primary" /> Step 2: Process Analysis Queue
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <Stat label="Total Processed" value={totalProcessed} />
            <Stat label="Batches Run" value={processLog.length} />
            <Stat label="Pending" value={latestProcess?.queue.pending ?? "?"} />
            <Stat label="Est. Remaining" value={latestProcess?.estimatedTimeRemaining ?? "?"} />
          </div>

          {processLog.length > 0 && (
            <div className="max-h-40 overflow-y-auto text-xs font-mono bg-background rounded-lg p-3 space-y-1">
              {processLog.map((p, i) => (
                <div key={i} className="text-muted-foreground">
                  Batch {i + 1}: {p.processed} processed in {p.duration} | pending: {p.queue.pending} | analyzed: {p.totalAnalyzed}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleProcessBatch} disabled={isProcessing}>
              {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : "Start Processing (auto-continues)"}
            </Button>
            {isProcessing && (
              <Button variant="outline" onClick={() => setIsProcessing(false)}>
                Pause
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Report */}
      {(step === "reporting" || report) && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" /> Step 3: Analysis Report
          </h2>

          {!report && (
            <Button onClick={handleGetReport}>
              <RefreshCw className="w-4 h-4 mr-2" /> Load Report
            </Button>
          )}

          {report && (
            <div className="space-y-6">
              {/* Coverage */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <Stat label="Total" value={report.coverage.totalGenerations} />
                <Stat label="Analyzed" value={report.coverage.totalAnalyzed} />
                <Stat label="Pending" value={report.coverage.pendingJobs} />
                <Stat label="Coverage" value={report.coverage.percentage} />
              </div>

              {/* User demand */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Top User Demand (what people generate most)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left py-1.5 px-2">Category</th>
                        <th className="text-left py-1.5 px-2">Subcategory</th>
                        <th className="text-left py-1.5 px-2">Style</th>
                        <th className="text-right py-1.5 px-2">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.userDemand.slice(0, 15).map((d, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-1.5 px-2">{d.category}</td>
                          <td className="py-1.5 px-2">{d.subcategory}</td>
                          <td className="py-1.5 px-2">{d.style}</td>
                          <td className="py-1.5 px-2 text-right font-mono">{d.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quality by category */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Quality by Category (sorted worst first)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left py-1.5 px-2">Category</th>
                        <th className="text-left py-1.5 px-2">Sub</th>
                        <th className="text-left py-1.5 px-2">Style</th>
                        <th className="text-right py-1.5 px-2">N</th>
                        <th className="text-right py-1.5 px-2">Quality</th>
                        <th className="text-right py-1.5 px-2">Alignment</th>
                        <th className="text-right py-1.5 px-2">Halluc.</th>
                        <th className="text-center py-1.5 px-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.qualityByCategory.map((q, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-1.5 px-2">{q.category}</td>
                          <td className="py-1.5 px-2">{q.subcategory}</td>
                          <td className="py-1.5 px-2">{q.style}</td>
                          <td className="py-1.5 px-2 text-right font-mono">{q.count}</td>
                          <td className="py-1.5 px-2 text-right font-mono">{q.avgQuality}</td>
                          <td className="py-1.5 px-2 text-right font-mono">{q.avgAlignment}</td>
                          <td className="py-1.5 px-2 text-right font-mono">{q.hallucinationRate}</td>
                          <td className="py-1.5 px-2 text-center">
                            {q.status === "GOOD" ? <CheckCircle className="w-3.5 h-3.5 text-green-500 inline" /> :
                             q.status === "NEEDS_WORK" ? <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 inline" /> :
                             <AlertTriangle className="w-3.5 h-3.5 text-red-500 inline" />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recommendations */}
              {report.recommendations.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Auto-Generated Recommendations</h3>
                  <div className="space-y-2">
                    {report.recommendations.map((r, i) => (
                      <div key={i} className={`rounded-lg border p-3 text-xs ${r.priority === "HIGH" ? "border-red-500/50 bg-red-500/5" : "border-yellow-500/50 bg-yellow-500/5"}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${r.priority === "HIGH" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                            {r.priority}
                          </span>
                          <span className="font-medium">{r.category}/{r.subcategory}/{r.style}</span>
                        </div>
                        <p className="text-muted-foreground">{r.issue}</p>
                        <p className="mt-1">{r.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={handleGetRecommendations}>
                <Brain className="w-4 h-4 mr-2" /> Generate AI Prompt Fixes (Step 4)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Step 4: AI Recommendations */}
      {(step === "recommending" || aiRecs) && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" /> Step 4: AI Prompt Fix Recommendations
          </h2>

          {step === "recommending" && !aiRecs && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Claude is analyzing all data and generating fixes...
            </div>
          )}

          {aiRecs && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <Stat label="Data Analyzed" value={aiRecs.analysisDataUsed.totalAnalyzed} />
                <Stat label="Worst Combos" value={aiRecs.analysisDataUsed.worstCombinations} />
                <Stat label="Patterns Found" value={aiRecs.analysisDataUsed.hallucinationPatterns} />
                <Stat label="Fixes Generated" value={aiRecs.recommendations.fixes.length} />
              </div>

              {/* Summary */}
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                <p className="text-sm whitespace-pre-wrap">{aiRecs.recommendations.summary}</p>
              </div>

              {/* Concrete fixes */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Concrete Prompt Config Fixes</h3>
                <div className="space-y-3">
                  {aiRecs.recommendations.fixes.map((fix, i) => (
                    <div key={i} className="rounded-lg border border-border bg-background p-4 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{fix.category}/{fix.subcategory}/{fix.style}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${fix.confidence >= 80 ? "bg-green-500/20 text-green-400" : fix.confidence >= 60 ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>
                          {fix.confidence}% confident
                        </span>
                      </div>
                      <p className="text-muted-foreground">{fix.problem}</p>
                      <div className="space-y-1 font-mono text-[11px]">
                        <div><span className="text-primary font-semibold">objectType:</span> {fix.objectType}</div>
                        {fix.addToAvoid.length > 0 && (
                          <div><span className="text-yellow-400 font-semibold">+avoid:</span> {fix.addToAvoid.join(", ")}</div>
                        )}
                        {fix.addToNegative.length > 0 && (
                          <div><span className="text-red-400 font-semibold">+negative:</span> {fix.addToNegative.join(", ")}</div>
                        )}
                        {fix.compositionFix && (
                          <div><span className="text-blue-400 font-semibold">composition:</span> {fix.compositionFix}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Global fixes */}
              {aiRecs.recommendations.globalFixes.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Global Fixes</h3>
                  <div className="space-y-2">
                    {aiRecs.recommendations.globalFixes.map((g, i) => (
                      <div key={i} className="rounded-lg border border-border p-3 text-xs">
                        <span className="font-medium">{g.scope}:</span> {g.fix}
                        <p className="text-muted-foreground mt-1">Reason: {g.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-background border border-border/50 p-2.5">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold mt-0.5">{String(value)}</p>
    </div>
  );
}
