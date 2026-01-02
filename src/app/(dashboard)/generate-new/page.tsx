"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Download,
  Loader2,
  Sparkles,
  Dices,
  RefreshCw,
  Check,
  Copy,
} from "lucide-react";
import { ASSET_CATEGORIES, getRandomSuggestion } from "@/lib/generate/categories";
import { ART_STYLES } from "@/lib/generate/styles";
import { triggerCreditsRefresh } from "@/components/dashboard/CreditsDisplay";

// ===========================================
// GENERATE PAGE - SIMPLIFIED V2
// ===========================================

export default function GeneratePage() {
  // Form state
  const [categoryId, setCategoryId] = useState<string>("");
  const [styleId, setStyleId] = useState<string>("pixel-16");
  const [prompt, setPrompt] = useState<string>("");
  const [seed, setSeed] = useState<string>("");

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{
    imageUrl: string;
    seed: number;
    category: string;
    style: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [copied, setCopied] = useState(false);

  // Get current category for suggestions
  const currentCategory = ASSET_CATEGORIES.find((c) => c.id === categoryId);

  // Handle category selection
  const handleCategorySelect = (id: string) => {
    setCategoryId(id);
    // Auto-fill suggestion if prompt is empty
    if (!prompt.trim()) {
      setPrompt(getRandomSuggestion(id));
    }
  };

  // Random prompt
  const handleRandomPrompt = () => {
    if (categoryId) {
      setPrompt(getRandomSuggestion(categoryId));
    }
  };

  // Random seed
  const handleRandomSeed = () => {
    setSeed(Math.floor(Math.random() * 2147483647).toString());
  };

  // Copy seed
  const handleCopySeed = () => {
    if (result?.seed) {
      navigator.clipboard.writeText(result.seed.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Generate
  const handleGenerate = useCallback(async () => {
    if (!categoryId || !prompt.trim()) {
      setError("Please select a category and enter a description.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/generate-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          categoryId,
          styleId,
          seed: seed || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setResult({
        imageUrl: data.imageUrl,
        seed: data.seed,
        category: data.category,
        style: data.style,
      });

      // Refresh credits display
      triggerCreditsRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsGenerating(false);
    }
  }, [categoryId, styleId, prompt, seed]);

  // Download
  const handleDownload = async () => {
    if (!result?.imageUrl) return;

    try {
      const response = await fetch(result.imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `spritelab-${categoryId}-${result.seed}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab
      window.open(result.imageUrl, "_blank");
    }
  };

  // Regenerate with same settings
  const handleRegenerate = () => {
    setSeed(""); // Clear seed to get new variation
    handleGenerate();
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-primary" />
          Generate Asset
        </h1>
        <p className="text-muted-foreground">
          Create game-ready sprites in seconds
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT SIDE - Form */}
        <div className="space-y-6">
          {/* Step 1: Category */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">
              1. WHAT DO YOU WANT TO CREATE?
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ASSET_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.id)}
                  className={`
                    p-3 rounded-lg border-2 text-center transition-all
                    hover:border-primary/50 hover:bg-primary/5
                    ${categoryId === cat.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card"
                    }
                  `}
                >
                  <div className="text-2xl mb-1">{cat.icon}</div>
                  <div className="text-xs font-medium">{cat.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Style */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">
              2. CHOOSE A STYLE
            </h2>
            <div className="flex flex-wrap gap-2">
              {ART_STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setStyleId(style.id)}
                  className={`
                    px-3 py-2 rounded-lg border text-sm transition-all
                    hover:border-primary/50
                    ${styleId === style.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-foreground"
                    }
                  `}
                >
                  {style.name}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Prompt */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground">
                3. DESCRIBE YOUR ASSET
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRandomPrompt}
                disabled={!categoryId}
              >
                <Dices className="w-4 h-4 mr-1" />
                Random
              </Button>
            </div>
            <Textarea
              placeholder={
                currentCategory
                  ? `e.g. ${currentCategory.suggestions[0]}`
                  : "First select a category above..."
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px] resize-none"
              disabled={!categoryId}
            />
            {/* Suggestions */}
            {currentCategory && (
              <div className="mt-2 flex flex-wrap gap-1">
                {currentCategory.suggestions.slice(0, 3).map((sug) => (
                  <button
                    key={sug}
                    onClick={() => setPrompt(sug)}
                    className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 text-muted-foreground"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Seed (optional) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                Seed (optional)
              </span>
              <Button variant="ghost" size="sm" onClick={handleRandomSeed}>
                <Dices className="w-3 h-3 mr-1" />
                Random
              </Button>
            </div>
            <input
              type="text"
              placeholder="Leave empty for random"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            />
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={!categoryId || !prompt.trim() || isGenerating}
            className="w-full h-12 text-lg font-semibold"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Generate (1 credit)
              </>
            )}
          </Button>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}
        </div>

        {/* RIGHT SIDE - Result */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            RESULT
          </h2>
          <div className="aspect-square rounded-xl border-2 border-dashed border-border bg-card overflow-hidden relative">
            {isGenerating ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-sm text-muted-foreground">Creating your asset...</p>
              </div>
            ) : result ? (
              <Image
                src={result.imageUrl}
                alt="Generated asset"
                fill
                className="object-contain p-4"
                unoptimized
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                <Sparkles className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm">Your asset will appear here</p>
              </div>
            )}
          </div>

          {/* Result Actions */}
          {result && (
            <div className="mt-4 space-y-3">
              {/* Info */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {result.category} • {result.style}
                </span>
                <button
                  onClick={handleCopySeed}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  {copied ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  Seed: {result.seed}
                </button>
              </div>

              {/* Buttons */}
              <div className="flex gap-2">
                <Button onClick={handleDownload} className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Download PNG
                </Button>
                <Button variant="outline" onClick={handleRegenerate}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Regenerate
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
