"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import Link from "next/link";
import {
  Download,
  Loader2,
  ArrowLeft,
  Shuffle,
  Flame,
  Info,
  Zap,
  Sparkles,
} from "lucide-react";
import { triggerCreditsRefresh } from "@/components/dashboard/CreditsDisplay";

function VariationsPageContent() {
  const searchParams = useSearchParams();
  const generationId = searchParams.get("id");

  const [loading, setLoading] = useState(false);
  const [loadingOriginal, setLoadingOriginal] = useState(true);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [variationImages, setVariationImages] = useState<string[]>([]);
  const [numVariations, setNumVariations] = useState<1 | 2 | 3 | 4>(2);
  const [similarity, setSimilarity] = useState<"low" | "medium" | "high">("medium");
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");
  const [originalData, setOriginalData] = useState<any>(null);

  const similarityLevels = [
    { id: "high", name: "High Similarity", desc: "Very similar, minor changes", emoji: "🎯" },
    { id: "medium", name: "Medium", desc: "Balanced variations", emoji: "⚖️" },
    { id: "low", name: "Low Similarity", desc: "More creative changes", emoji: "🎲" },
  ];

  // Load original generation
  useEffect(() => {
    if (generationId) {
      loadOriginalGeneration();
    }
  }, [generationId]);

  const loadOriginalGeneration = async () => {
    try {
      const response = await fetch(`/api/generations/${generationId}`);
      if (response.ok) {
        const data = await response.json();
        setOriginalImage(data.generation.imageUrl);
        setOriginalData(data.generation);
        setPrompt(data.generation.prompt || "");
      } else {
        setError("Failed to load original image");
      }
    } catch (err) {
      setError("Error loading image");
    } finally {
      setLoadingOriginal(false);
    }
  };

  const handleGenerateVariations = async () => {
    if (!originalImage) {
      setError("No original image loaded");
      return;
    }

    setLoading(true);
    setError("");
    setVariationImages([]);

    try {
      const response = await fetch("/api/variations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: originalImage,
          numVariations,
          similarity,
          prompt: prompt.trim() || undefined,
          originalGeneration: originalData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Variation generation failed");
      }

      setVariationImages(data.imageUrls);
      triggerCreditsRefresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (imageUrl: string, index: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `variation-${index + 1}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  const handleDownloadAll = async () => {
    for (let i = 0; i < variationImages.length; i++) {
      await handleDownload(variationImages[i], i);
      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  if (!generationId) {
    return (
      <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center p-4">
        <div className="glass-card rounded-2xl p-8 text-center max-w-md">
          <Flame className="w-16 h-16 text-[#ef4444] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">No Image Selected</h2>
          <p className="text-[#a0a0b0] mb-6">Please select an image from your gallery to create variations.</p>
          <Link href="/gallery">
            <Button className="btn-primary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Gallery
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0c10] relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      <div className="fixed inset-0 grid-pattern pointer-events-none opacity-50" />
      <div className="fixed top-20 left-10 w-96 h-96 bg-[#FF6B2C]/10 rounded-full blur-[120px] animate-glow-pulse pointer-events-none" />

      <div className="relative z-10 p-4 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/gallery">
            <Button variant="outline" className="mb-4 border-[rgba(255,255,255,0.06)]">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Gallery
            </Button>
          </Link>
          <h1 className="text-3xl font-display font-black gradient-text neon-text mb-2">
            CREATE VARIATIONS
          </h1>
          <p className="text-[#a0a0b0]">Generate multiple variations of your image</p>
        </div>

        {/* Original Image */}
        <div className="mb-6 glass-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-[rgba(255,255,255,0.06)]">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FF6B2C]" />
              Original Image
            </h3>
          </div>
          <div className="aspect-video bg-[#11151b] flex items-center justify-center relative">
            <div className="absolute inset-0 grid-pattern-dense opacity-30" />
            {loadingOriginal ? (
              <Loader2 className="w-12 h-12 text-[#FF6B2C] animate-spin" />
            ) : originalImage ? (
              <img
                src={originalImage}
                alt="Original"
                className="w-full h-full object-contain p-4 relative z-10"
              />
            ) : (
              <p className="text-[#a0a0b0]">Failed to load image</p>
            )}
          </div>
        </div>

        {/* Variations Grid */}
        {variationImages.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Shuffle className="w-5 h-5 text-[#FF6B2C]" />
                Generated Variations ({variationImages.length})
              </h3>
              <Button
                onClick={handleDownloadAll}
                className="bg-gradient-to-r from-[#FF6B2C] to-[#FF6B2C] hover:opacity-90 text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Download All
              </Button>
            </div>
            <div className={`grid gap-4 ${
              variationImages.length === 1 ? "grid-cols-1" :
              variationImages.length === 2 ? "grid-cols-2" :
              "grid-cols-2 lg:grid-cols-4"
            }`}>
              {variationImages.map((imageUrl, index) => (
                <div key={index} className="glass-card rounded-xl overflow-hidden group">
                  <div className="aspect-square bg-[#11151b] relative">
                    <div className="absolute inset-0 grid-pattern-dense opacity-30" />
                    <img
                      src={imageUrl}
                      alt={`Variation ${index + 1}`}
                      className="w-full h-full object-contain p-4 relative z-10"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleDownload(imageUrl, index)}
                      className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#FF6B2C] hover:bg-[#FF6B2C]/80 text-white z-20"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                  </div>
                  <div className="p-3 border-t border-[rgba(255,255,255,0.06)]">
                    <p className="text-xs text-[#a0a0b0]">Variation {index + 1}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="mb-6 glass-card rounded-2xl p-12">
            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-4">
                <div className="absolute inset-0 bg-[#FF6B2C] rounded-full blur-xl opacity-50 animate-pulse" />
                <div className="relative w-full h-full rounded-full border-4 border-[rgba(255,255,255,0.06)] border-t-[#FF6B2C] animate-spin" />
                <Shuffle className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-[#FF6B2C]" />
              </div>
              <p className="font-display font-bold text-white mb-2">Generating {numVariations} Variations...</p>
              <p className="text-sm text-[#a0a0b0]">This may take 60-120 seconds</p>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Shuffle className="w-5 h-5 text-[#FF6B2C]" />
            Variation Settings
          </h3>

          <div className="space-y-6">
            {/* Number of Variations */}
            <div>
              <label className="text-sm font-medium text-white mb-3 block">Number of Variations</label>
              <div className="grid grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((num) => (
                  <button
                    key={num}
                    onClick={() => setNumVariations(num as 1 | 2 | 3 | 4)}
                    disabled={loading}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      numVariations === num
                        ? "border-[#FF6B2C] bg-[#FF6B2C]/10"
                        : "border-[rgba(255,255,255,0.06)] hover:border-[#FF6B2C]/50"
                    }`}
                  >
                    <div className="text-2xl font-bold text-white mb-1">{num}</div>
                    <div className="text-xs text-[#a0a0b0]">{num} {num === 1 ? "image" : "images"}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Similarity Level */}
            <div>
              <label className="text-sm font-medium text-white mb-3 block">Similarity Level</label>
              <div className="grid grid-cols-3 gap-3">
                {similarityLevels.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => setSimilarity(level.id as "low" | "medium" | "high")}
                    disabled={loading}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      similarity === level.id
                        ? "border-[#FF6B2C] bg-[#FF6B2C]/10"
                        : "border-[rgba(255,255,255,0.06)] hover:border-[#FF6B2C]/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{level.emoji}</span>
                      <span className={`font-bold text-sm ${similarity === level.id ? "text-[#FF6B2C]" : "text-white"}`}>
                        {level.name}
                      </span>
                    </div>
                    <p className="text-xs text-[#a0a0b0]">{level.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Prompt */}
            <div>
              <label className="text-sm font-medium text-white mb-3 block">
                Optional: Guide the variations
              </label>
              <Input
                placeholder="e.g., different colors, add effects..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="input-gaming"
                disabled={loading}
              />
            </div>

            <div className="p-3 rounded-lg bg-[#FF6B2C]/10 border border-[#FF6B2C]/20 flex items-start gap-2">
              <Info className="w-4 h-4 text-[#FF6B2C] mt-0.5 shrink-0" />
              <p className="text-xs text-[#FF6B2C]">
                <strong>Pro tip:</strong> High similarity keeps the original look with minor tweaks. Low similarity creates more creative variations. Each variation costs 1 credit.
              </p>
            </div>

            <Button
              onClick={handleGenerateVariations}
              disabled={loading || !originalImage}
              className="w-full h-12 bg-gradient-to-r from-[#FF6B2C] to-[#FF6B2C] hover:opacity-90 text-white font-display font-bold text-base disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Shuffle className="w-5 h-5 mr-2" />
                  GENERATE {numVariations} VARIATION{numVariations > 1 ? "S" : ""} ({numVariations} {numVariations === 1 ? "credit" : "credits"})
                </>
              )}
            </Button>

            {error && (
              <div className="p-4 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] text-sm flex items-center gap-3">
                <Flame className="w-5 h-5 shrink-0" />
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VariationsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#FF6B2C] animate-spin" />
      </div>
    }>
      <VariationsPageContent />
    </Suspense>
  );
}
