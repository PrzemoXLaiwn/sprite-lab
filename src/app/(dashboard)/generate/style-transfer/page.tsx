"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  Download,
  Wand2,
  Check,
  ChevronDown,
  Upload,
  X,
  ArrowRight,
  Image as ImageIcon,
  Paintbrush,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { triggerCreditsRefresh } from "@/components/dashboard/CreditsDisplay";
import { STYLES_2D_UI } from "@/config";
import type { StyleUI } from "@/config/types";

// ===========================================
// TYPES
// ===========================================

interface GenerationResult {
  success: boolean;
  id: string;
  imageUrl: string;
  originalImageUrl: string;
  targetStyleId: string;
  strength: number;
  creditsUsed: number;
  creditsRemaining: number;
}

// ===========================================
// MAIN COMPONENT
// ===========================================

export default function StyleTransferPage() {
  // Form state
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [targetStyleId, setTargetStyleId] = useState("");
  const [strength, setStrength] = useState(0.75);

  // UI state
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [showStyles, setShowStyles] = useState(false);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current style
  const currentStyle = STYLES_2D_UI.find((s) => s.id === targetStyleId);

  // Handle file upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be less than 10MB");
      return;
    }

    setUploading(true);
    setError("");

    try {
      // Convert to base64 or upload to temporary storage
      const reader = new FileReader();
      reader.onloadend = () => {
        setSourceImage(reader.result as string);
        setUploading(false);
      };
      reader.onerror = () => {
        setError("Failed to read file");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError("Failed to upload image");
      setUploading(false);
    }
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const input = fileInputRef.current;
      if (input) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;
        handleFileSelect({ target: { files: dataTransfer.files } } as any);
      }
    }
  };

  // Handle generation
  const handleGenerate = async () => {
    if (!sourceImage) {
      setError("Please upload an image");
      return;
    }

    if (!description.trim()) {
      setError("Please describe the image content");
      return;
    }

    if (!targetStyleId) {
      setError("Please select a target style");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/style-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: sourceImage,
          description: description.trim(),
          targetStyleId,
          strength,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Style transfer failed");
      }

      setResult(data);
      triggerCreditsRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Style transfer failed");
    } finally {
      setLoading(false);
    }
  };

  // Download result
  const handleDownload = async () => {
    if (!result?.imageUrl) return;

    try {
      const response = await fetch(result.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `style-transfer-${targetStyleId.toLowerCase()}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  // Clear source image
  const clearSourceImage = () => {
    setSourceImage(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-[#030305] relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      <div className="fixed inset-0 grid-pattern pointer-events-none opacity-50" />
      <div className="fixed top-20 left-10 w-96 h-96 bg-[#c084fc]/10 rounded-full blur-[120px] animate-glow-pulse pointer-events-none" />
      <div
        className="fixed bottom-20 right-10 w-80 h-80 bg-[#00d4ff]/10 rounded-full blur-[100px] animate-glow-pulse pointer-events-none"
        style={{ animationDelay: "1s" }}
      />

      <div className="relative z-10 p-4 lg:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/generate"
            className="inline-flex items-center gap-2 text-[#a0a0b0] hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Generator
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#c084fc] to-[#ff6b6b] flex items-center justify-center">
              <Paintbrush className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-black gradient-text neon-text">
                STYLE TRANSFER
              </h1>
              <p className="text-[#a0a0b0]">
                Transform any image into your chosen art style
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Settings */}
          <div className="space-y-6">
            {/* Image Upload */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#00ff88]" />
                Source Image
              </h3>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              {sourceImage ? (
                <div className="relative rounded-xl overflow-hidden bg-[#0a0a0f]">
                  <img
                    src={sourceImage}
                    alt="Source"
                    className="w-full h-48 object-contain"
                  />
                  <button
                    onClick={clearSourceImage}
                    className="absolute top-2 right-2 p-2 rounded-lg bg-black/50 hover:bg-black/80 transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="border-2 border-dashed border-[#2a2a3d] rounded-xl p-8 text-center cursor-pointer hover:border-[#00ff88]/50 transition-colors"
                >
                  {uploading ? (
                    <Loader2 className="w-10 h-10 text-[#00ff88] animate-spin mx-auto mb-4" />
                  ) : (
                    <Upload className="w-10 h-10 text-[#a0a0b0] mx-auto mb-4" />
                  )}
                  <p className="text-white font-medium mb-2">
                    {uploading ? "Uploading..." : "Drop image here or click to upload"}
                  </p>
                  <p className="text-xs text-[#a0a0b0]">
                    PNG, JPG up to 10MB
                  </p>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-[#00d4ff]" />
                Image Description
              </h3>
              <p className="text-sm text-[#a0a0b0] mb-3">
                Describe what's in the image to help guide the style transfer
              </p>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., a warrior character with sword and shield..."
                className="input-gaming"
              />
            </div>

            {/* Target Style */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-[#c084fc]" />
                Target Style
              </h3>

              <div className="relative">
                <button
                  onClick={() => setShowStyles(!showStyles)}
                  className="w-full p-4 rounded-xl bg-[#1a1a28] border border-[#2a2a3d] hover:border-[#c084fc]/50 transition-all flex items-center justify-between"
                >
                  {currentStyle ? (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{currentStyle.emoji}</span>
                      <div className="text-left">
                        <p className="font-medium text-white">{currentStyle.name}</p>
                        <p className="text-xs text-[#a0a0b0]">
                          {currentStyle.description}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <span className="text-[#a0a0b0]">Select target style...</span>
                  )}
                  <ChevronDown
                    className={`w-5 h-5 text-[#a0a0b0] transition-transform ${
                      showStyles ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showStyles && (
                  <div className="absolute top-full left-0 right-0 mt-2 glass-card rounded-xl p-2 z-40 max-h-[300px] overflow-y-auto">
                    {STYLES_2D_UI.map((style: StyleUI) => (
                      <button
                        key={style.id}
                        onClick={() => {
                          setTargetStyleId(style.id);
                          setShowStyles(false);
                        }}
                        className={`w-full p-3 rounded-lg flex items-center gap-3 transition-all ${
                          targetStyleId === style.id
                            ? "bg-[#c084fc]/20 border border-[#c084fc]"
                            : "hover:bg-white/5"
                        }`}
                      >
                        {/* Color preview bar */}
                        {style.preview?.colors && (
                          <div className="flex gap-0.5 h-8 w-8 rounded-lg overflow-hidden flex-shrink-0">
                            {style.preview.colors.map((color, i) => (
                              <div
                                key={i}
                                className="flex-1 h-full"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        )}
                        {!style.preview?.colors && (
                          <span className="text-2xl w-8 text-center">{style.emoji}</span>
                        )}
                        <div className="flex-1 text-left">
                          <p
                            className={
                              targetStyleId === style.id
                                ? "text-white"
                                : "text-[#e0e0e0]"
                            }
                          >
                            {style.name}
                          </p>
                          <p className="text-xs text-[#a0a0b0]">
                            {style.preview?.example || style.description}
                          </p>
                        </div>
                        {targetStyleId === style.id && (
                          <Check className="w-5 h-5 text-[#c084fc]" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Strength Slider */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#ffd93d]" />
                  Transfer Strength
                </span>
                <span className="text-[#ffd93d] font-mono">
                  {Math.round(strength * 100)}%
                </span>
              </h3>
              <p className="text-sm text-[#a0a0b0] mb-4">
                Higher = more stylized, Lower = closer to original
              </p>
              <Slider
                value={[strength]}
                onValueChange={([value]) => setStrength(value)}
                min={0.3}
                max={1.0}
                step={0.05}
              />
              <div className="flex justify-between text-xs text-[#a0a0b0] mt-2">
                <span>Subtle</span>
                <span>Balanced</span>
                <span>Strong</span>
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={loading || !sourceImage || !description.trim() || !targetStyleId}
              className="w-full btn-primary h-14 text-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Transforming Style...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Transform Style (2 Credits)
                </>
              )}
            </Button>

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
                {error}
              </div>
            )}
          </div>

          {/* Right Column - Preview */}
          <div className="space-y-6">
            {/* Before/After Preview */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Paintbrush className="w-5 h-5 text-[#c084fc]" />
                  Result
                </h3>
                {result && (
                  <Button
                    onClick={handleDownload}
                    variant="outline"
                    size="sm"
                    className="border-[#00ff88] text-[#00ff88]"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                )}
              </div>

              {result ? (
                <div className="space-y-4">
                  {/* Before/After comparison */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-xs text-[#a0a0b0] text-center">Original</p>
                      <div className="aspect-square rounded-xl overflow-hidden bg-[#0a0a0f]">
                        <img
                          src={sourceImage!}
                          alt="Original"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-[#c084fc] text-center font-medium">
                        {currentStyle?.name}
                      </p>
                      <div className="aspect-square rounded-xl overflow-hidden bg-[#0a0a0f] border-2 border-[#c084fc]/30">
                        <img
                          src={result.imageUrl}
                          alt="Transformed"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Arrow indicator */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 hidden lg:flex items-center justify-center">
                    <ArrowRight className="w-8 h-8 text-[#c084fc]" />
                  </div>
                </div>
              ) : loading ? (
                <div className="aspect-video flex items-center justify-center bg-[#0a0a0f] rounded-xl">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 text-[#c084fc] animate-spin mx-auto mb-4" />
                    <p className="text-[#a0a0b0]">Applying style transfer...</p>
                    <p className="text-xs text-[#a0a0b0] mt-2">
                      This may take a moment
                    </p>
                  </div>
                </div>
              ) : (
                <div className="aspect-video flex items-center justify-center bg-[#0a0a0f] rounded-xl border border-[#2a2a3d]">
                  <div className="text-center p-8">
                    <Paintbrush className="w-16 h-16 text-[#2a2a3d] mx-auto mb-4" />
                    <p className="text-[#a0a0b0]">
                      Upload an image and select a style
                    </p>
                    <p className="text-xs text-[#a0a0b0] mt-2">
                      Your transformed image will appear here
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Info Card */}
            {result && (
              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">
                  Transfer Details
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[#a0a0b0]">Target Style</p>
                    <p className="text-white font-medium">
                      {currentStyle?.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#a0a0b0]">Strength</p>
                    <p className="text-white font-medium">
                      {Math.round(result.strength * 100)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[#a0a0b0]">Credits Used</p>
                    <p className="text-[#ffd93d] font-medium">
                      {result.creditsUsed} credits
                    </p>
                  </div>
                  <div>
                    <p className="text-[#a0a0b0]">Credits Remaining</p>
                    <p className="text-[#00ff88] font-medium">
                      {result.creditsRemaining}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tips */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Tips</h3>
              <ul className="space-y-2 text-sm text-[#a0a0b0]">
                <li className="flex items-start gap-2">
                  <span className="text-[#c084fc]">•</span>
                  Use clear, high-quality source images for best results
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#c084fc]">•</span>
                  Describe the image content accurately to guide the AI
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#c084fc]">•</span>
                  Start with 75% strength, adjust if needed
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#c084fc]">•</span>
                  Some styles work better with certain image types
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
