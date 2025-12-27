"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Play,
  Loader2,
  FlaskConical,
  Sparkles,
  RotateCcw,
} from "lucide-react";

interface VerificationStats {
  totalPatterns: number;
  activePatterns: number;
  verifiedFixed: number;
  stillBroken: number;
  pendingVerification: number;
  fixSuccessRate: number;
}

interface PatternToVerify {
  id: string;
  categoryId: string;
  subcategoryId: string;
  styleId: string;
  hallucinationType: string;
  occurrenceCount: number;
  preventionPrompt: string | null;
}

interface VerificationResult {
  patternId: string;
  hallucinationType: string;
  category: string;
  status: string;
  message: string;
}

interface RecentVerification {
  id: string;
  status: string;
  message: string;
  originalHallucination: string;
  newAlignment: number;
  createdAt: string;
  generation: {
    prompt: string;
    categoryId: string;
    subcategoryId: string;
    styleId: string;
  };
}

export function VerificationPanel() {
  const [stats, setStats] = useState<VerificationStats | null>(null);
  const [patterns, setPatterns] = useState<PatternToVerify[]>([]);
  const [recentVerifications, setRecentVerifications] = useState<RecentVerification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [verificationResults, setVerificationResults] = useState<VerificationResult[] | null>(null);
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/admin/verify-fix");
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setPatterns(data.patternsToVerify);
        setRecentVerifications(data.recentVerifications);
      }
    } catch (error) {
      console.error("Failed to fetch verification data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Verify single pattern
  const verifySinglePattern = async (patternId: string) => {
    setSelectedPatternId(patternId);
    setIsVerifying(true);
    setVerificationResults(null);

    try {
      const response = await fetch("/api/admin/verify-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hallucinationPatternId: patternId }),
      });

      const data = await response.json();

      if (data.success) {
        setVerificationResults([{
          patternId,
          hallucinationType: data.details.originalHallucination,
          category: patterns.find(p => p.id === patternId)?.categoryId || "",
          status: data.status,
          message: data.message,
        }]);
        // Refresh data
        fetchData();
      } else {
        alert(data.error || "Verification failed");
      }
    } catch (error) {
      console.error("Verification error:", error);
      alert("Verification failed");
    } finally {
      setIsVerifying(false);
      setSelectedPatternId(null);
    }
  };

  // Batch verify
  const runBatchVerification = async (limit: number = 5) => {
    setIsVerifying(true);
    setVerificationResults(null);

    try {
      const response = await fetch("/api/admin/batch-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit }),
      });

      const data = await response.json();

      if (data.success) {
        setVerificationResults(data.results);
        // Refresh data
        fetchData();
      } else {
        alert(data.error || "Batch verification failed");
      }
    } catch (error) {
      console.error("Batch verification error:", error);
      alert("Batch verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  // Cleanup verified fixes
  const cleanupVerified = async (mode: "verified_only" | "all_inactive" | "reset_all") => {
    if (mode === "reset_all") {
      const confirmed = confirm(
        "⚠️ This will DELETE ALL verification data, patterns, and optimizations!\n\n" +
        "This action cannot be undone. Are you sure?"
      );
      if (!confirmed) return;
    }

    setIsCleaning(true);

    try {
      const response = await fetch(`/api/admin/batch-verify?mode=${mode}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ ${data.message}\n\nDeleted patterns: ${data.deletedPatterns || 0}\nCleared analyses: ${data.clearedAnalyses || 0}`);
        // Refresh data
        fetchData();
      } else {
        alert(data.error || "Cleanup failed");
      }
    } catch (error) {
      console.error("Cleanup error:", error);
      alert("Cleanup failed");
    } finally {
      setIsCleaning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "VERIFIED_FIXED":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "STILL_BROKEN":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "DIFFERENT_ISSUE":
      case "IMPROVED":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "VERIFIED_FIXED":
        return "bg-green-500/10 text-green-500 border-green-500/30";
      case "STILL_BROKEN":
        return "bg-red-500/10 text-red-500 border-red-500/30";
      case "DIFFERENT_ISSUE":
      case "IMPROVED":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/30";
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#00ff88]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FlaskConical className="w-6 h-6 text-[#00ff88]" />
          <h2 className="text-xl font-bold text-white">Fix Verification System</h2>
        </div>
        <Button
          onClick={() => fetchData()}
          variant="outline"
          size="sm"
          className="border-[#2a2a3d] hover:bg-white/5"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#0a0a0f] border border-[#2a2a3d]">
            <div className="text-2xl font-bold text-white">{stats.activePatterns}</div>
            <div className="text-sm text-[#a0a0b0]">Active Issues</div>
          </div>
          <div className="p-4 rounded-xl bg-[#0a0a0f] border border-[#2a2a3d]">
            <div className="text-2xl font-bold text-green-500">{stats.verifiedFixed}</div>
            <div className="text-sm text-[#a0a0b0]">Verified Fixed</div>
          </div>
          <div className="p-4 rounded-xl bg-[#0a0a0f] border border-[#2a2a3d]">
            <div className="text-2xl font-bold text-red-500">{stats.stillBroken}</div>
            <div className="text-sm text-[#a0a0b0]">Still Broken</div>
          </div>
          <div className="p-4 rounded-xl bg-[#0a0a0f] border border-[#2a2a3d]">
            <div className="text-2xl font-bold text-[#00ff88]">{stats.fixSuccessRate}%</div>
            <div className="text-sm text-[#a0a0b0]">Success Rate</div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => runBatchVerification(5)}
          disabled={isVerifying || patterns.length === 0}
          className="bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-black font-bold"
        >
          {isVerifying ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Play className="w-4 h-4 mr-2" />
          )}
          Verify Top 5 Fixes
        </Button>

        <Button
          onClick={() => runBatchVerification(10)}
          disabled={isVerifying || patterns.length === 0}
          variant="outline"
          className="border-[#00ff88]/30 text-[#00ff88] hover:bg-[#00ff88]/10"
        >
          Verify Top 10
        </Button>

        <div className="flex-1" />

        <Button
          onClick={() => cleanupVerified("verified_only")}
          disabled={isCleaning || stats?.verifiedFixed === 0}
          variant="outline"
          className="border-green-500/30 text-green-500 hover:bg-green-500/10"
        >
          {isCleaning ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          Clean Verified
        </Button>

        <Button
          onClick={() => cleanupVerified("reset_all")}
          disabled={isCleaning}
          variant="outline"
          className="border-red-500/30 text-red-500 hover:bg-red-500/10"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset All
        </Button>
      </div>

      {/* Verification Results */}
      {verificationResults && verificationResults.length > 0 && (
        <div className="p-4 rounded-xl bg-[#0a0a0f] border border-[#2a2a3d]">
          <h3 className="font-bold text-white mb-4">Verification Results</h3>
          <div className="space-y-2">
            {verificationResults.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${getStatusColor(result.status)}`}
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <div className="font-medium">{result.hallucinationType}</div>
                    <div className="text-sm opacity-80">{result.category}</div>
                  </div>
                  <span className="text-xs font-mono px-2 py-1 rounded bg-black/20">
                    {result.status}
                  </span>
                </div>
                <p className="mt-2 text-sm">{result.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Patterns Pending Verification */}
      <div className="p-4 rounded-xl bg-[#0a0a0f] border border-[#2a2a3d]">
        <h3 className="font-bold text-white mb-4">
          Patterns with Fixes ({patterns.length} pending)
        </h3>
        
        {patterns.length === 0 ? (
          <div className="text-center py-8 text-[#a0a0b0]">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500/50" />
            <p>No patterns need verification!</p>
            <p className="text-sm mt-1">All fixes have been verified or there are no active patterns.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {patterns.map((pattern) => (
              <div
                key={pattern.id}
                className="p-3 rounded-lg bg-white/5 border border-[#2a2a3d] hover:border-[#00ff88]/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{pattern.hallucinationType}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">
                        {pattern.occurrenceCount}x
                      </span>
                    </div>
                    <div className="text-sm text-[#a0a0b0] mt-1">
                      {pattern.categoryId} / {pattern.subcategoryId} / {pattern.styleId}
                    </div>
                    {pattern.preventionPrompt && (
                      <div className="text-xs text-[#00ff88] mt-2 font-mono bg-[#00ff88]/10 px-2 py-1 rounded">
                        Fix: {pattern.preventionPrompt}
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => verifySinglePattern(pattern.id)}
                    disabled={isVerifying}
                    size="sm"
                    variant="outline"
                    className="border-[#00ff88]/30 text-[#00ff88] hover:bg-[#00ff88]/10"
                  >
                    {isVerifying && selectedPatternId === pattern.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FlaskConical className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Verifications */}
      {recentVerifications.length > 0 && (
        <div className="p-4 rounded-xl bg-[#0a0a0f] border border-[#2a2a3d]">
          <h3 className="font-bold text-white mb-4">Recent Verifications</h3>
          <div className="space-y-2">
            {recentVerifications.map((verification) => (
              <div
                key={verification.id}
                className="p-3 rounded-lg bg-white/5 flex items-center gap-3"
              >
                {getStatusIcon(verification.status)}
                <div className="flex-1">
                  <div className="text-sm text-white">{verification.originalHallucination}</div>
                  <div className="text-xs text-[#a0a0b0]">
                    {verification.generation.categoryId}/{verification.generation.subcategoryId}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-[#00ff88]">{verification.newAlignment.toFixed(0)}%</div>
                  <div className="text-xs text-[#606070]">
                    {new Date(verification.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="p-4 rounded-xl bg-[#c084fc]/10 border border-[#c084fc]/30">
        <h3 className="font-bold text-[#c084fc] mb-2">How Verification Works</h3>
        <ul className="text-sm text-[#a0a0b0] space-y-1">
          <li>• <strong>Verify</strong> - Re-generates image with same prompt + applied fixes</li>
          <li>• <strong>VERIFIED_FIXED</strong> - Hallucination is gone, pattern deactivated ✅</li>
          <li>• <strong>STILL_BROKEN</strong> - Same issue persists, fix cleared for re-learning 🔄</li>
          <li>• <strong>Clean Verified</strong> - Removes fixed patterns from database</li>
          <li>• <strong>Reset All</strong> - Nuclear option, clears all learning data ⚠️</li>
        </ul>
      </div>
    </div>
  );
}