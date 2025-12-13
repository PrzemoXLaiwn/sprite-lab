"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import Link from "next/link";
import {
  Download,
  Loader2,
  Wand2,
  ArrowLeft,
  Sparkles,
  Flame,
  Zap,
  Check,
  Info,
} from "lucide-react";
import { triggerCreditsRefresh } from "@/components/dashboard/CreditsDisplay";

function EditPageContent() {
  const searchParams = useSearchParams();
  const generationId = searchParams.get("id");

  const [loading, setLoading] = useState(false);
  const [loadingOriginal, setLoadingOriginal] = useState(true);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
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

  const handleEdit = async () => {
    if (!editPrompt.trim()) {
      setError("Please describe what you want to change");
      return;
    }

    if (!originalImage) {
      setError("No original image loaded");
      return;
    }

    setLoading(true);
    setError("");
    setEditedImage(null);

    try {
      const response = await fetch("/api/edit-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: originalImage,
          editPrompt: editPrompt.trim(),
          originalGeneration: originalData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Edit failed");
      }

      setEditedImage(data.imageUrl);
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
      a.download = `edited-${Date.now()}.png`;
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
          <p className="text-[#a0a0b0] mb-6">Please select an image from your gallery to edit.</p>
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
      <div className="fixed top-20 left-10 w-96 h-96 bg-[#c084fc]/10 rounded-full blur-[120px] animate-glow-pulse pointer-events-none" />

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
            EDIT IMAGE
          </h1>
          <p className="text-[#a0a0b0]">Transform your image with AI-powered editing</p>
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

          {/* Edited Image */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-[#2a2a3d]">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-[#c084fc]" />
                Edited Result
              </h3>
            </div>
            <div className="aspect-square bg-[#0a0a0f] flex items-center justify-center relative">
              <div className="absolute inset-0 grid-pattern-dense opacity-30" />
              {loading ? (
                <div className="text-center p-6 relative z-10">
                  <div className="relative w-24 h-24 mx-auto mb-4">
                    <div className="absolute inset-0 bg-[#c084fc] rounded-full blur-xl opacity-50 animate-pulse" />
                    <div className="relative w-full h-full rounded-full border-4 border-[#2a2a3d] border-t-[#c084fc] animate-spin" />
                    <Wand2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-[#c084fc]" />
                  </div>
                  <p className="font-display font-bold text-white">Editing Image...</p>
                  <p className="text-sm text-[#a0a0b0] mt-1">This may take 30-60 seconds</p>
                </div>
              ) : editedImage ? (
                <>
                  <img
                    src={editedImage}
                    alt="Edited"
                    className="w-full h-full object-contain p-4 relative z-10"
                  />
                  <Button
                    onClick={() => handleDownload(editedImage)}
                    className="absolute bottom-4 right-4 btn-primary z-20"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </>
              ) : (
                <div className="text-center p-8 relative z-10">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#c084fc]/20 to-[#00d4ff]/20 flex items-center justify-center border border-[#c084fc]/20">
                    <Wand2 className="w-12 h-12 text-[#c084fc]/50" />
                  </div>
                  <p className="text-[#a0a0b0]">Your edited image will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Edit Controls */}
        <div className="mt-6 glass-card rounded-2xl p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#c084fc]" />
            Describe Your Edit
          </h3>

          <div className="space-y-4">
            <div className="relative">
              <Input
                placeholder="e.g., add fire effects, make it golden, add glowing runes..."
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                className="h-14 text-base input-gaming pr-12"
                disabled={loading || !originalImage}
              />
              <Wand2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#c084fc]" />
            </div>

            {/* Quick Edit Suggestions */}
            <div className="flex flex-wrap gap-2">
              {[
                "add fire effects",
                "make it golden",
                "add glowing runes",
                "add ice effects",
                "make it magical",
                "add lightning",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setEditPrompt(suggestion)}
                  className="text-xs px-3 py-1.5 rounded-full bg-[#c084fc]/10 text-[#c084fc] hover:bg-[#c084fc]/20 transition-colors border border-[#c084fc]/20"
                  disabled={loading}
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <div className="p-3 rounded-lg bg-[#00d4ff]/10 border border-[#00d4ff]/20 flex items-start gap-2">
              <Info className="w-4 h-4 text-[#00d4ff] mt-0.5 shrink-0" />
              <p className="text-xs text-[#00d4ff]">
                <strong>Pro tip:</strong> Be specific about what you want to change. The AI will preserve the original image and only apply your requested changes.
              </p>
            </div>

            <Button
              onClick={handleEdit}
              disabled={loading || !originalImage || !editPrompt.trim()}
              className="w-full h-12 bg-gradient-to-r from-[#c084fc] to-[#00d4ff] hover:opacity-90 text-white font-display font-bold text-base disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Editing...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5 mr-2" />
                  EDIT IMAGE (1 credit)
                </>
              )}
            </Button>

            {error && (
              <div className="p-4 rounded-xl bg-[#ff4444]/10 border border-[#ff4444]/30 text-[#ff4444] text-sm flex items-center gap-3">
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

export default function EditPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#030305] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#00ff88] animate-spin" />
      </div>
    }>
      <EditPageContent />
    </Suspense>
  );
}
