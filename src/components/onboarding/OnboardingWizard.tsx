"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Zap,
  Rocket,
  ChevronRight,
  X,
  Loader2,
  Download,
  ArrowRight,
  Wand2,
  Check,
} from "lucide-react";
import { triggerCreditsRefresh } from "@/components/dashboard/CreditsDisplay";

// Pre-defined onboarding prompts per category - simple, guaranteed to work
const ONBOARDING_PRESETS = [
  {
    id: "weapon",
    categoryId: "WEAPONS",
    subcategoryId: "SWORDS",
    styleId: "PIXEL_ART_16",
    prompt: "golden sword with glowing blue blade",
    emoji: "⚔️",
    label: "Epic Sword",
    description: "A classic pixel art sword",
  },
  {
    id: "potion",
    categoryId: "CONSUMABLES",
    subcategoryId: "POTIONS",
    styleId: "PIXEL_ART_16",
    prompt: "red health potion in glass bottle with cork",
    emoji: "🧪",
    label: "Health Potion",
    description: "Essential RPG item",
  },
  {
    id: "monster",
    categoryId: "CREATURES",
    subcategoryId: "SLIMES",
    styleId: "PIXEL_ART_16",
    prompt: "cute blue slime monster with happy face",
    emoji: "🟦",
    label: "Cute Slime",
    description: "Adorable game enemy",
  },
  {
    id: "character",
    categoryId: "CHARACTERS",
    subcategoryId: "KNIGHTS",
    styleId: "PIXEL_ART_16",
    prompt: "brave knight in silver armor with red cape",
    emoji: "🛡️",
    label: "Knight Hero",
    description: "Your game protagonist",
  },
];

interface OnboardingWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const [step, setStep] = useState<"welcome" | "select" | "generating" | "result">("welcome");
  const [selectedPreset, setSelectedPreset] = useState(ONBOARDING_PRESETS[0]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Progress animation during generation
  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setProgress((prev) => Math.min(prev + Math.random() * 8, 90));
      }, 500);
      return () => clearInterval(interval);
    }
  }, [loading]);

  const handleGenerate = async () => {
    setStep("generating");
    setLoading(true);
    setProgress(0);
    setError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: selectedPreset.prompt,
          categoryId: selectedPreset.categoryId,
          subcategoryId: selectedPreset.subcategoryId,
          styleId: selectedPreset.styleId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setProgress(100);
      setGeneratedUrl(data.imageUrl);
      setStep("result");
      triggerCreditsRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("select"); // Go back to selection on error
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedUrl) return;

    try {
      const response = await fetch(generatedUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `spritelab-first-asset.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      window.open(generatedUrl, "_blank");
    }
  };

  const handleComplete = () => {
    // Mark onboarding as complete in localStorage
    localStorage.setItem("spritelab_onboarding_complete", "true");
    localStorage.setItem("spritelab_onboarding_date", new Date().toISOString());
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#030305]/95 backdrop-blur-xl">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00ff88]/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#c084fc]/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      {/* Skip button */}
      <button
        onClick={() => {
          localStorage.setItem("spritelab_onboarding_complete", "true");
          onSkip();
        }}
        className="absolute top-4 right-4 p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all z-10"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="relative w-full max-w-2xl mx-4">
        {/* STEP: Welcome */}
        {step === "welcome" && (
          <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Mascot */}
            <div className="w-32 h-32 mx-auto mb-6 relative">
              <div className="absolute inset-0 bg-[#00ff88]/30 rounded-full blur-2xl animate-pulse" />
              <img
                src="/coreling-wave.png"
                alt="Coreling"
                className="relative w-full h-full object-contain animate-bounce"
                style={{ animationDuration: "2s" }}
              />
            </div>

            <h1 className="text-4xl font-display font-black text-white mb-3">
              Welcome to <span className="gradient-text">SpriteLab!</span>
            </h1>
            <p className="text-lg text-[#a0a0b0] mb-8 max-w-md mx-auto">
              Create your first game asset in <span className="text-[#00ff88] font-semibold">30 seconds</span>.
              No experience needed!
            </p>

            {/* Credits indicator */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] mb-8">
              <Sparkles className="w-4 h-4" />
              <span className="font-medium">You have 5 free credits to start</span>
            </div>

            <Button
              onClick={() => setStep("select")}
              className="h-14 px-8 text-lg font-display font-bold bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-[#030305] hover:opacity-90 rounded-xl"
            >
              Let's Create Something!
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        )}

        {/* STEP: Select preset */}
        {step === "select" && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-display font-bold text-white mb-2">
                Pick your first asset
              </h2>
              <p className="text-[#a0a0b0]">
                Choose one below, or create your own later
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-[#ff4444]/10 border border-[#ff4444]/30 text-[#ff4444] text-center">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-8">
              {ONBOARDING_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    selectedPreset.id === preset.id
                      ? "border-[#00ff88] bg-[#00ff88]/10 scale-[1.02]"
                      : "border-[#2a2a3d] hover:border-[#00ff88]/50 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{preset.emoji}</span>
                    <div>
                      <span className={`font-bold block ${selectedPreset.id === preset.id ? "text-[#00ff88]" : "text-white"}`}>
                        {preset.label}
                      </span>
                      <span className="text-xs text-[#a0a0b0]">{preset.description}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#606070] mt-2 p-2 rounded-lg bg-[#0a0a0f]">
                    <Wand2 className="w-3 h-3" />
                    <span className="truncate italic">"{preset.prompt}"</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Selected preset preview */}
            <div className="p-4 rounded-2xl bg-[#0a0a0f] border border-[#2a2a3d] mb-6">
              <div className="flex items-center gap-2 text-sm text-[#a0a0b0] mb-2">
                <Zap className="w-4 h-4 text-[#00ff88]" />
                Your prompt:
              </div>
              <p className="text-white font-medium">
                "{selectedPreset.prompt}"
              </p>
              <div className="flex items-center gap-2 mt-3 text-xs text-[#606070]">
                <span className="px-2 py-1 rounded bg-[#00ff88]/10 text-[#00ff88]">Pixel Art 16-bit</span>
                <span className="px-2 py-1 rounded bg-[#c084fc]/10 text-[#c084fc]">{selectedPreset.label}</span>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              className="w-full h-14 text-lg font-display font-bold bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-[#030305] hover:opacity-90 rounded-xl"
            >
              <Rocket className="w-5 h-5 mr-2" />
              Generate My Asset (1 credit)
            </Button>
          </div>
        )}

        {/* STEP: Generating */}
        {step === "generating" && (
          <div className="text-center animate-in fade-in duration-300">
            {/* Mascot working */}
            <div className="w-40 h-40 mx-auto mb-6 relative">
              <div className="absolute inset-0 bg-[#00ff88]/30 rounded-full blur-2xl animate-pulse" />
              <img
                src="/coreling-working.png"
                alt="Coreling Working"
                className="relative w-full h-full object-contain animate-bounce"
                style={{ animationDuration: "1.5s" }}
              />
              {/* Spinning ring */}
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#00ff88] border-r-[#00ff88]/30 animate-spin"
                   style={{ animationDuration: "1.5s" }} />
            </div>

            <h2 className="text-2xl font-display font-bold text-white mb-2">
              Creating your {selectedPreset.label}...
            </h2>
            <p className="text-[#a0a0b0] mb-8">
              AI is painting your masterpiece
            </p>

            {/* Progress bar */}
            <div className="max-w-md mx-auto">
              <div className="flex justify-between text-xs text-[#a0a0b0] mb-2">
                <span>Generating...</span>
                <span className="font-mono text-[#00ff88]">{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-3 bg-[#1a1a28] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#00ff88] to-[#00d4ff] transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-[#606070] mt-3">
                Usually takes 10-20 seconds
              </p>
            </div>
          </div>
        )}

        {/* STEP: Result */}
        {step === "result" && generatedUrl && (
          <div className="animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] mb-4">
                <Check className="w-4 h-4" />
                <span className="font-medium">Your first asset is ready!</span>
              </div>
              <h2 className="text-2xl font-display font-bold text-white">
                You created a <span className="gradient-text">{selectedPreset.label}</span>!
              </h2>
            </div>

            {/* Generated image */}
            <div className="relative rounded-2xl overflow-hidden border-2 border-[#00ff88]/50 mb-6 bg-[#0a0a0f]">
              <div className="absolute inset-0 grid-pattern opacity-30" />
              <img
                src={generatedUrl}
                alt="Generated asset"
                className="relative w-full aspect-square object-contain p-4"
              />
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#00ff88]/10 to-transparent pointer-events-none" />
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 mb-6">
              <Button
                onClick={handleDownload}
                variant="outline"
                className="flex-1 h-12 border-[#00ff88]/30 hover:bg-[#00ff88]/10 text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PNG
              </Button>
              <Button
                onClick={handleComplete}
                className="flex-1 h-12 bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-[#030305] font-bold hover:opacity-90"
              >
                Continue to App
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* What's next */}
            <div className="p-4 rounded-xl bg-[#c084fc]/10 border border-[#c084fc]/30">
              <div className="flex items-center gap-2 text-[#c084fc] font-medium mb-2">
                <Sparkles className="w-4 h-4" />
                What's next?
              </div>
              <ul className="text-sm text-[#a0a0b0] space-y-1">
                <li>• Try different styles: Hand-drawn, Isometric, Vector...</li>
                <li>• Create characters, monsters, items, environments</li>
                <li>• Generate 3D models for your game</li>
                <li>• Export to Unity, Godot, or any game engine</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Hook to check if user needs onboarding
// Priority: Server data (generations count) > localStorage
export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkIfNeedsOnboarding = async () => {
      try {
        // FIRST: Check server - this is the source of truth
        const response = await fetch("/api/user/stats");

        if (response.ok) {
          const data = await response.json();

          // If user has ANY generations, they don't need onboarding
          if (data.totalGenerations > 0) {
            localStorage.setItem("spritelab_onboarding_complete", "true");
            setShowOnboarding(false);
            setIsChecking(false);
            return;
          }

          // User has 0 generations - they NEED onboarding regardless of localStorage
          // This handles the case where localStorage has stale data
          setShowOnboarding(true);
          setIsChecking(false);
          return;
        }
      } catch (err) {
        // API failed - fall back to localStorage (but this is rare)
        console.warn("[Onboarding] API check failed, using localStorage fallback");
      }

      // Fallback: only if API fails, check localStorage
      const completed = localStorage.getItem("spritelab_onboarding_complete");
      setShowOnboarding(!completed);
      setIsChecking(false);
    };

    checkIfNeedsOnboarding();
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem("spritelab_onboarding_complete", "true");
    setShowOnboarding(false);
  };

  const skipOnboarding = () => {
    localStorage.setItem("spritelab_onboarding_complete", "true");
    setShowOnboarding(false);
  };

  return {
    showOnboarding,
    isChecking,
    completeOnboarding,
    skipOnboarding,
  };
}
