"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import Link from "next/link";
import {
  Download,
  Loader2,
  ArrowLeft,
  Maximize2,
  Flame,
  Check,
  Info,
  Zap,
} from "lucide-react";
import { triggerCreditsRefresh } from "@/components/dashboard/CreditsDisplay";

function UpscalePageContent() {
  const searchParams = useSearchParams();
  const generationId = searchParams.get("id");

  const [loading, setLoading] = useState(false);
  const [loadingOriginal, setLoadingOriginal] = useState(true);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [upscaledImage, setUpscaledImage] = useState<string | null>(null);
  const [scale, setScale] = useState<2 | 3 | 4>(2);
  const [modelType, setModelType] = useState("real-esrgan");
  const [error, setError] = useState("");
  const [originalData, setOriginalData] = useState<any>(null);

  const models = [
    { id: "real-esrgan", name: "Real-ESRGAN", desc: "Best for realistic images", emoji: "📷" },
    { id: "real-esrgan-anime", name: "Anime", desc: "Optimized for anime/cartoon", emoji: "🌸" },
    { id: "pixel-art", name: "Pixel Art", desc: "Preserves pixel art style", emoji: "🎮" },
    { id: "gfpgan", name: "Face Enhance", desc: "Best for character faces", emoji: "👤" },
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
      } else {
        setError("Failed to load original image");
      }
    } catch (err) {
      setError("Error loading image");
    } finally {
      setLoadingOriginal(false);
    }
  };

  const handleUpscale = async () => {
    if (!originalImage) {
      setError("No original image loaded");
      return;
    }

    setLoading(true);
    setError("");
    setUpscaledImage(null);

    try {
      const response = await fetch("/api/upscale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: originalImage,
          scale,
          modelType,
          originalGeneration: originalData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upscale failed");
      }

      setUpscaledImage(data.imageUrl);
      triggerCreditsRefresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `upscaled-${scale}x-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  if (!generationId) {
    return (
      <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center p-4">
        <div className="glass-card rounded-2xl p-8 text-center max-w-md">
          <Flame className="w-16 h-16 text-[#ef4444] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">No Image Selected</h2>
          <p className="text-[#a0a0b0] mb-6">Please select an image from your gallery to upscale.</p>
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
      <div className="fixed top-20 left-10 w-96 h-96 bg-[#f59e0b]/10 rounded-full blur-[120px] animate-glow-pulse pointer-events-none" />

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
            UPSCALE IMAGE
          </h1>
          <p className="text-[#a0a0b0]">Enhance your image resolution with AI</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Original Image */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-[rgba(255,255,255,0.06)]">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#FF6B2C]" />
                Original Image
              </h3>
            </div>
            <div className="aspect-square bg-[#11151b] flex items-center justify-center relative">
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

          {/* Upscaled Image */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-[rgba(255,255,255,0.06)]">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-[#f59e0b]" />
                Upscaled Result ({scale}x)
              </h3>
            </div>
            <div className="aspect-square bg-[#11151b] flex items-center justify-center relative">
              <div className="absolute inset-0 grid-pattern-dense opacity-30" />
              {loading ? (
                <div className="text-center p-6 relative z-10">
                  <div className="relative w-24 h-24 mx-auto mb-4">
                    <div className="absolute inset-0 bg-[#f59e0b] rounded-full blur-xl opacity-50 animate-pulse" />
                    <div className="relative w-full h-full rounded-full border-4 border-[rgba(255,255,255,0.06)] border-t-[#f59e0b] animate-spin" />
                    <Maximize2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-[#f59e0b]" />
                  </div>
                  <p className="font-display font-bold text-white">Upscaling {scale}x...</p>
                  <p className="text-sm text-[#a0a0b0] mt-1">This may take 30-90 seconds</p>
                </div>
              ) : upscaledImage ? (
                <>
                  <img
                    src={upscaledImage}
                    alt="Upscaled"
                    className="w-full h-full object-contain p-4 relative z-10"
                  />
                  <Button
                    onClick={() => handleDownload(upscaledImage)}
                    className="absolute bottom-4 right-4 bg-gradient-to-r from-[#f59e0b] to-[#ff8c00] hover:opacity-90 text-black font-bold z-20"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </>
              ) : (
                <div className="text-center p-8 relative z-10">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#f59e0b]/20 to-[#ff8c00]/20 flex items-center justify-center border border-[#f59e0b]/20">
                    <Maximize2 className="w-12 h-12 text-[#f59e0b]/50" />
                  </div>
                  <p className="text-[#a0a0b0]">Your upscaled image will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Upscale Controls */}
        <div className="mt-6 glass-card rounded-2xl p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Maximize2 className="w-5 h-5 text-[#f59e0b]" />
            Upscale Settings
          </h3>

          <div className="space-y-6">
            {/* Scale Selection */}
            <div>
              <label className="text-sm font-medium text-white mb-3 block">Scale Factor</label>
              <div className="grid grid-cols-3 gap-3">
                {[2, 3, 4].map((s) => (
                  <button
                    key={s}
                    onClick={() => setScale(s as 2 | 3 | 4)}
                    disabled={loading}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      scale === s
                        ? "border-[#f59e0b] bg-[#f59e0b]/10"
                        : "border-[rgba(255,255,255,0.06)] hover:border-[#f59e0b]/50"
                    }`}
                  >
                    <div className="text-2xl font-bold text-white mb-1">{s}x</div>
                    <div className="text-xs text-[#a0a0b0]">
                      {s === 2 ? "Fast" : s === 3 ? "Balanced" : "Best Quality"}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Model Selection */}
            <div>
              <label className="text-sm font-medium text-white mb-3 block">Upscale Model</label>
              <div className="grid grid-cols-2 gap-3">
                {models.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => setModelType(model.id)}
                    disabled={loading}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      modelType === model.id
                        ? "border-[#f59e0b] bg-[#f59e0b]/10"
                        : "border-[rgba(255,255,255,0.06)] hover:border-[#f59e0b]/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{model.emoji}</span>
                      <span className={`font-bold text-sm ${modelType === model.id ? "text-[#f59e0b]" : "text-white"}`}>
                        {model.name}
                      </span>
                    </div>
                    <p className="text-xs text-[#a0a0b0]">{model.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#FF6B2C]/10 border border-[#FF6B2C]/20 flex items-start gap-2">
              <Info className="w-4 h-4 text-[#FF6B2C] mt-0.5 shrink-0" />
              <p className="text-xs text-[#FF6B2C]">
                <strong>Pro tip:</strong> Use Pixel Art model for retro sprites, Anime for cartoon styles, and Real-ESRGAN for realistic images. Higher scales take longer but produce better results.
              </p>
            </div>

            <Button
              onClick={handleUpscale}
              disabled={loading || !originalImage}
              className="w-full h-12 bg-gradient-to-r from-[#f59e0b] to-[#ff8c00] hover:opacity-90 text-black font-display font-bold text-base disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Upscaling...
                </>
              ) : (
                <>
                  <Maximize2 className="w-5 h-5 mr-2" />
                  UPSCALE {scale}X (2 credits)
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

export default function UpscalePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#FF6B2C] animate-spin" />
      </div>
    }>
      <UpscalePageContent />
    </Suspense>
  );
}
