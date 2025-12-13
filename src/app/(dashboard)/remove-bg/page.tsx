"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import {
  Download,
  Loader2,
  ArrowLeft,
  Scissors,
  Flame,
  Info,
  Sparkles,
} from "lucide-react";
import { triggerCreditsRefresh } from "@/components/dashboard/CreditsDisplay";

function RemoveBgPageContent() {
  const searchParams = useSearchParams();
  const generationId = searchParams.get("id");

  const [loading, setLoading] = useState(false);
  const [loadingOriginal, setLoadingOriginal] = useState(true);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [originalData, setOriginalData] = useState<any>(null);

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

  const [savedToGallery, setSavedToGallery] = useState(false);

  const handleRemoveBackground = async () => {
    if (!originalImage) {
      setError("No original image loaded");
      return;
    }

    setLoading(true);
    setError("");
    setProcessedImage(null);
    setSavedToGallery(false);

    try {
      const response = await fetch("/api/remove-bg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: originalImage,
          originalPrompt: originalData?.prompt,
          categoryId: originalData?.categoryId,
          subcategoryId: originalData?.subcategoryId,
          styleId: originalData?.styleId,
          generationId: generationId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.noCredits) {
          setError("Not enough credits. Background removal costs 1 credit.");
        } else {
          throw new Error(data.error || "Background removal failed");
        }
        return;
      }

      setProcessedImage(data.imageUrl);
      setSavedToGallery(data.savedToGallery || false);
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
      a.download = `no-background-${Date.now()}.png`;
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
      <div className="min-h-screen bg-[#030305] flex items-center justify-center p-4">
        <div className="glass-card rounded-2xl p-8 text-center max-w-md">
          <Flame className="w-16 h-16 text-[#ff4444] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">No Image Selected</h2>
          <p className="text-[#a0a0b0] mb-6">Please select an image from your gallery to remove its background.</p>
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
    <div className="min-h-screen bg-[#030305] relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      <div className="fixed inset-0 grid-pattern pointer-events-none opacity-50" />
      <div className="fixed top-20 left-10 w-96 h-96 bg-[#00ff88]/10 rounded-full blur-[120px] animate-glow-pulse pointer-events-none" />

      <div className="relative z-10 p-4 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/gallery">
            <Button variant="outline" className="mb-4 border-[#2a2a3d]">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Gallery
            </Button>
          </Link>
          <h1 className="text-3xl font-display font-black gradient-text neon-text mb-2">
            REMOVE BACKGROUND
          </h1>
          <p className="text-[#a0a0b0]">Remove background with AI precision</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Original Image */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-[#2a2a3d]">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#00ff88]" />
                Original Image
              </h3>
            </div>
            <div className="aspect-square bg-[#0a0a0f] flex items-center justify-center relative">
              <div className="absolute inset-0 grid-pattern-dense opacity-30" />
              {loadingOriginal ? (
                <Loader2 className="w-12 h-12 text-[#00ff88] animate-spin" />
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

          {/* Processed Image */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-[#2a2a3d]">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Scissors className="w-4 h-4 text-[#00ff88]" />
                No Background
              </h3>
            </div>
            <div className="aspect-square bg-[#0a0a0f] flex items-center justify-center relative">
              {/* Checkerboard pattern for transparency */}
              <div 
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `
                    linear-gradient(45deg, #2a2a3d 25%, transparent 25%),
                    linear-gradient(-45deg, #2a2a3d 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #2a2a3d 75%),
                    linear-gradient(-45deg, transparent 75%, #2a2a3d 75%)
                  `,
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                }}
              />
              {loading ? (
                <div className="text-center p-6 relative z-10">
                  <div className="relative w-24 h-24 mx-auto mb-4">
                    <div className="absolute inset-0 bg-[#00ff88] rounded-full blur-xl opacity-50 animate-pulse" />
                    <div className="relative w-full h-full rounded-full border-4 border-[#2a2a3d] border-t-[#00ff88] animate-spin" />
                    <Scissors className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-[#00ff88]" />
                  </div>
                  <p className="font-display font-bold text-white">Removing Background...</p>
                  <p className="text-sm text-[#a0a0b0] mt-1">This may take 20-40 seconds</p>
                </div>
              ) : processedImage ? (
                <>
                  <img
                    src={processedImage}
                    alt="No Background"
                    className="w-full h-full object-contain p-4 relative z-10"
                  />
                  <Button
                    onClick={() => handleDownload(processedImage)}
                    className="absolute bottom-4 right-4 btn-primary z-20"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PNG
                  </Button>
                </>
              ) : (
                <div className="text-center p-8 relative z-10">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#00ff88]/20 to-[#00d4ff]/20 flex items-center justify-center border border-[#00ff88]/20">
                    <Scissors className="w-12 h-12 text-[#00ff88]/50" />
                  </div>
                  <p className="text-[#a0a0b0]">Transparent background will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-6 glass-card rounded-2xl p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Scissors className="w-5 h-5 text-[#00ff88]" />
            Background Removal
          </h3>

          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-[#00d4ff]/10 border border-[#00d4ff]/20">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-[#00d4ff] mt-0.5 shrink-0" />
                <div className="text-sm text-[#00d4ff]">
                  <p className="font-bold mb-2">How it works:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• AI automatically detects and removes the background</li>
                    <li>• Preserves fine details like hair and edges</li>
                    <li>• Outputs transparent PNG perfect for game engines</li>
                    <li>• Works best with clear subject separation</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button
              onClick={handleRemoveBackground}
              disabled={loading || !originalImage}
              className="w-full h-12 btn-primary font-display font-bold text-base disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Removing Background...
                </>
              ) : (
                <>
                  <Scissors className="w-5 h-5 mr-2" />
                  REMOVE BACKGROUND (1 credit)
                </>
              )}
            </Button>

            {error && (
              <div className="p-4 rounded-xl bg-[#ff4444]/10 border border-[#ff4444]/30 text-[#ff4444] text-sm flex items-center gap-3">
                <Flame className="w-5 h-5 shrink-0" />
                {error}
              </div>
            )}

            {processedImage && (
              <div className="p-4 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/30">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-[#00ff88] mt-0.5 shrink-0" />
                  <div className="text-sm text-[#00ff88]">
                    <p className="font-bold mb-1">Success!</p>
                    <p className="text-xs">
                      Background removed. The image is now transparent and ready to use in your game engine.
                      {savedToGallery && " Auto-saved to your gallery!"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RemoveBgPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#030305] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#00ff88] animate-spin" />
      </div>
    }>
      <RemoveBgPageContent />
    </Suspense>
  );
}
