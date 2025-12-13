"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, Download, Loader2, Wand2, ArrowRight, Gift } from "lucide-react";

const EXAMPLE_PROMPTS = [
  "a brave knight with golden armor",
  "cute slime monster with big eyes",
  "magical fire sword with flames",
  "treasure chest full of gold coins",
  "small dragon breathing fire",
  "wizard with purple robe and staff",
];

export function TryItNow() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<"pixel" | "cartoon">("pixel");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  // Check remaining generations on mount
  useEffect(() => {
    fetch("/api/generate-guest")
      .then((res) => res.json())
      .then((data) => {
        setRemaining(data.remaining);
        if (data.remaining === 0) {
          setLimitReached(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const res = await fetch("/api/generate-guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), style }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.limitReached) {
          setLimitReached(true);
        }
        setError(data.error || "Generation failed");
        return;
      }

      setGeneratedImage(data.imageUrl);
      setRemaining(data.remaining);

      if (data.remaining === 0) {
        setLimitReached(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedImage) return;

    try {
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `spritelab-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      console.error("Download failed");
    }
  };

  const setRandomPrompt = () => {
    const randomPrompt = EXAMPLE_PROMPTS[Math.floor(Math.random() * EXAMPLE_PROMPTS.length)];
    setPrompt(randomPrompt);
  };

  return (
    <section id="try-it" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00ff88]/5 to-transparent" />

      <div className="max-w-4xl mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/20 text-[#00ff88] text-sm font-medium mb-6">
            <Wand2 className="w-4 h-4" />
            Try It Free - No Account Required
          </div>

          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Create Your First <span className="text-[#00ff88]">Sprite</span>
          </h2>
          <p className="text-white/60 max-w-xl mx-auto">
            See the magic in action. Generate {remaining !== null ? remaining : 2} free sprite{remaining !== 1 ? "s" : ""} right now!
          </p>
        </div>

        <div className="bg-[#0a0a0f]/80 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-xl">
          {/* Generator UI */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left - Input */}
            <div className="space-y-6">
              {/* Style Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setStyle("pixel")}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    style === "pixel"
                      ? "bg-[#00ff88] text-black"
                      : "bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  Pixel Art
                </button>
                <button
                  onClick={() => setStyle("cartoon")}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    style === "cartoon"
                      ? "bg-[#00ff88] text-black"
                      : "bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  Cartoon
                </button>
              </div>

              {/* Prompt Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm text-white/60">Describe your sprite</label>
                  <button
                    onClick={setRandomPrompt}
                    className="text-xs text-[#00ff88] hover:underline"
                  >
                    Random idea
                  </button>
                </div>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., a brave knight with golden armor"
                  maxLength={200}
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#00ff88]/50 resize-none"
                  disabled={limitReached || isGenerating}
                />
                <p className="text-xs text-white/40 text-right">{prompt.length}/200</p>
              </div>

              {/* Generate Button */}
              {limitReached ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/20 text-center">
                    <Gift className="w-6 h-6 text-[#00ff88] mx-auto mb-2" />
                    <p className="text-white font-medium mb-1">Want more?</p>
                    <p className="text-white/60 text-sm mb-3">
                      Sign up free and get 15 credits instantly!
                    </p>
                    <Link href="/register">
                      <Button className="w-full bg-[#00ff88] text-black hover:bg-[#00ff88]/90">
                        Get 15 Free Credits
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isGenerating}
                  className="w-full bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-black font-semibold hover:opacity-90 h-12"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating magic...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Sprite
                      {remaining !== null && (
                        <span className="ml-2 text-xs opacity-70">({remaining} left)</span>
                      )}
                    </>
                  )}
                </Button>
              )}

              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}
            </div>

            {/* Right - Preview */}
            <div className="flex flex-col items-center justify-center">
              <div className="w-full aspect-square max-w-[300px] rounded-xl border-2 border-dashed border-white/10 bg-[#0a0a0f]/50 flex items-center justify-center relative overflow-hidden">
                {isGenerating ? (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full border-4 border-[#00ff88]/20 border-t-[#00ff88] animate-spin mx-auto mb-4" />
                    <p className="text-white/60 text-sm">Generating your sprite...</p>
                    <p className="text-white/40 text-xs mt-1">This takes ~15-30 seconds</p>
                  </div>
                ) : generatedImage ? (
                  <Image
                    src={generatedImage}
                    alt="Generated sprite"
                    fill
                    className="object-contain p-4"
                    unoptimized
                  />
                ) : (
                  <div className="text-center p-6">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                      <Wand2 className="w-8 h-8 text-white/20" />
                    </div>
                    <p className="text-white/40 text-sm">
                      Your sprite will appear here
                    </p>
                  </div>
                )}
              </div>

              {generatedImage && (
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={handleDownload}
                    variant="outline"
                    size="sm"
                    className="border-white/10"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Link href="/register">
                    <Button size="sm" className="bg-[#00ff88] text-black hover:bg-[#00ff88]/90">
                      Sign Up for More
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-8">
          <p className="text-white/40 text-sm mb-2">
            Love what you see? Create unlimited sprites with a free account.
          </p>
          <Link href="/register" className="text-[#00ff88] hover:underline text-sm font-medium">
            Sign up and get 15 free credits →
          </Link>
        </div>
      </div>
    </section>
  );
}
