"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Download,
  RefreshCw,
  Loader2,
  Dices,
  Copy,
  Check,
  ChevronRight,
  Wand2,
  Rocket,
  Flame,
  Crown,
  Sparkles,
  Gem,
  Zap,
  Lightbulb,
  Box,
  Image as ImageIcon,
  Cuboid,
  Clock,
  FileBox,
  ExternalLink,
  Play,
  Upload,
  X,
  Camera,
  MessageSquare,
  Bug,
  Star,
  Send,
  AlertCircle,
} from "lucide-react";
import { triggerCreditsRefresh } from "@/components/dashboard/CreditsDisplay";
import { generateRandomPrompt, generatePromptSuggestions } from "@/lib/random-prompts";
import { FeedbackPopup } from "@/components/dashboard/FeedbackPopup";
import { PremiumFeatures } from "@/components/generate/PremiumFeatures";
import {
  ALL_CATEGORIES,
  STYLES_2D_UI,
  STYLES_3D,
  MODELS_3D,
  ICON_MAP,
} from "@/config";

// ===========================================
// 3D FILE FORMAT HELPERS
// ===========================================
const is3DFormat = (url: string | null): boolean => {
  if (!url) return false;
  const lower = url.toLowerCase();
  return [".ply", ".glb", ".gltf", ".obj", ".fbx", ".usdz"].some(ext => lower.includes(ext));
};

const get3DFormat = (url: string | null): string => {
  if (!url) return "GLB";
  const lower = url.toLowerCase();
  if (lower.includes(".ply")) return "PLY";
  if (lower.includes(".glb") || lower.includes(".gltf")) return "GLB";
  if (lower.includes(".obj")) return "OBJ";
  if (lower.includes(".fbx")) return "FBX";
  if (lower.includes(".usdz")) return "USDZ";
  return "GLB";
};

// ===========================================
// 3D MODEL VIEWER COMPONENT
// ===========================================
function Model3DViewer({ 
  modelUrl, 
  thumbnailUrl, 
  videoUrl,
  format 
}: { 
  modelUrl: string; 
  thumbnailUrl?: string;
  videoUrl?: string;
  format: string;
}) {
  const [showVideo, setShowVideo] = useState(false);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center relative">
      {/* Thumbnail or Video Preview */}
      {thumbnailUrl && !showVideo && (
        <div className="absolute inset-0 overflow-hidden">
          <img 
            src={thumbnailUrl} 
            alt="3D Preview" 
            className="w-full h-full object-contain opacity-30"
          />
        </div>
      )}

      {/* Video Preview */}
      {videoUrl && showVideo && (
        <div className="absolute inset-0 overflow-hidden">
          <video 
            src={videoUrl} 
            autoPlay 
            loop 
            muted 
            className="w-full h-full object-contain"
          />
        </div>
      )}

      {/* Content Overlay */}
      <div className="relative z-10">
        <div className="relative mb-4">
          <div className="absolute inset-0 bg-[#c084fc]/30 rounded-full blur-xl animate-pulse" />
          <FileBox className="relative w-20 h-20 text-[#c084fc]" />
        </div>
        
        <h3 className="text-xl font-bold text-white mb-2">
          3D Model Ready!
        </h3>
        
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#c084fc]/20 border border-[#c084fc]/40 mb-4">
          <Cuboid className="w-4 h-4 text-[#c084fc]" />
          <span className="text-[#c084fc] font-mono font-bold">{format}</span>
        </div>
        
        <p className="text-sm text-[#a0a0b0] max-w-xs mb-4">
          Download to view in Unity, Unreal, Blender, or Godot
        </p>

        {/* Video toggle button */}
        {videoUrl && (
          <button
            onClick={() => setShowVideo(!showVideo)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors mx-auto"
          >
            <Play className="w-4 h-4" />
            {showVideo ? "Hide Preview" : "Show 360° Preview"}
          </button>
        )}
        
        {/* Compatibility badges */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-[#a0a0b0]">
          <div className="flex items-center gap-1 justify-center">
            <Check className="w-3 h-3 text-[#00ff88]" />
            Unity
          </div>
          <div className="flex items-center gap-1 justify-center">
            <Check className="w-3 h-3 text-[#00ff88]" />
            Unreal
          </div>
          <div className="flex items-center gap-1 justify-center">
            <Check className="w-3 h-3 text-[#00ff88]" />
            Blender
          </div>
          <div className="flex items-center gap-1 justify-center">
            <Check className="w-3 h-3 text-[#00ff88]" />
            Godot
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================
// MAIN COMPONENT
// ===========================================
export default function GeneratePage() {
  const [mode, setMode] = useState<"2d" | "3d">("2d");
  const [categoryId, setCategoryId] = useState<string>("");
  const [subcategoryId, setSubcategoryId] = useState<string>("");
  const [styleId, setStyleId] = useState<string>("PIXEL_ART_16");
  const [style3DId, setStyle3DId] = useState<string>("STYLIZED");
  const [model3D, setModel3D] = useState<string>("rodin");
  const [prompt, setPrompt] = useState<string>("");
  const [seed, setSeed] = useState<string>("");
  
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [error, setError] = useState<string>("");

  // Result state
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [generatedFormat, setGeneratedFormat] = useState<string | null>(null);
  const [is3DModel, setIs3DModel] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [lastSeed, setLastSeed] = useState<number | null>(null);
  const [copiedSeed, setCopiedSeed] = useState(false);

  // 3D Generation streaming state
  const [currentStep, setCurrentStep] = useState(0);
  const [stepTitle, setStepTitle] = useState("");
  const [stepDescription, setStepDescription] = useState("");
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Image upload state (for 3D from custom image)
  const [inputMode, setInputMode] = useState<"text" | "image">("text");
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Feedback modal state
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"bug" | "feature" | "other">("bug");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  // No credits modal state
  const [showNoCredits, setShowNoCredits] = useState(false);

  // Random prompt suggestions
  const [promptSuggestions, setPromptSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Generation count for smart feedback popup
  const [sessionGenerationCount, setSessionGenerationCount] = useState(0);

  // Prompt mismatch warning
  const [promptMismatchWarning, setPromptMismatchWarning] = useState<string | null>(null);

  // Premium Features State
  const [enableSpriteSheet, setEnableSpriteSheet] = useState(false);
  const [animationTypeId, setAnimationTypeId] = useState("WALK");
  const [enableStyleMix, setEnableStyleMix] = useState(false);
  const [style2Id, setStyle2Id] = useState("");
  const [style1Weight, setStyle1Weight] = useState(70);
  const [colorPaletteId, setColorPaletteId] = useState("");

  const currentCategory = ALL_CATEGORIES.find(c => c.id === categoryId);
  const currentSubcategory = currentCategory?.subcategories.find(s => s.id === subcategoryId);
  const categorySupports3D = currentCategory?.supports3D ?? true;
  const selected3DModel = MODELS_3D.find(m => m.id === model3D) || MODELS_3D[0];

  // Load generation count from localStorage on mount
  useEffect(() => {
    const savedCount = localStorage.getItem("spritelab_generation_count");
    if (savedCount) {
      setSessionGenerationCount(parseInt(savedCount, 10));
    }
  }, []);

  // Generate prompt suggestions when subcategory changes
  useEffect(() => {
    if (categoryId && subcategoryId) {
      const suggestions = generatePromptSuggestions(categoryId, subcategoryId, 6);
      setPromptSuggestions(suggestions);
    } else {
      setPromptSuggestions([]);
    }
  }, [categoryId, subcategoryId]);

  // Check prompt vs category mismatch
  useEffect(() => {
    if (!prompt.trim() || !categoryId) {
      setPromptMismatchWarning(null);
      return;
    }

    const lowerPrompt = prompt.toLowerCase();

    // Keywords that suggest different categories
    const categoryKeywords: Record<string, string[]> = {
      WEAPONS: ["sword", "axe", "bow", "staff", "wand", "gun", "pistol", "rifle", "dagger", "spear", "hammer", "mace", "blade"],
      ARMOR: ["helmet", "armor", "shield", "gauntlet", "boots", "gloves", "ring", "amulet", "cape", "crown"],
      CONSUMABLES: ["potion", "food", "scroll", "bread", "apple", "drink", "elixir"],
      RESOURCES: ["gem", "ore", "wood", "stone", "crystal", "herb", "flower", "mushroom", "diamond", "ruby"],
      QUEST_ITEMS: ["key", "chest", "artifact", "coin", "trophy", "crate", "backpack"],
      CHARACTERS: ["knight", "mage", "wizard", "warrior", "rogue", "archer", "hero", "villager", "guard", "merchant", "npc", "person", "man", "woman", "boy", "girl"],
      CREATURES: ["dragon", "wolf", "bear", "cat", "dog", "phoenix", "griffin", "slime", "elemental", "golem", "animal", "beast", "monster"],
      ENVIRONMENT: ["tree", "rock", "house", "building", "bridge", "tower", "dungeon", "grass", "bush", "fence"],
      VEHICLES: ["ship", "spaceship", "car", "boat", "plane", "rocket", "wagon", "cart", "vehicle", "flying"],
      UI_ELEMENTS: ["button", "icon", "frame", "bar", "cursor", "interface", "menu", "hud"],
      EFFECTS: ["fire", "explosion", "lightning", "magic effect", "spark", "smoke", "particle"],
      ISOMETRIC: ["isometric", "iso building", "iso house", "strategy game", "city builder", "clash of clans", "age of empires", "iso tree", "iso prop"],
    };

    // Find which category the prompt likely belongs to
    let suggestedCategory: string | null = null;
    let matchedKeyword: string | null = null;

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      for (const keyword of keywords) {
        if (lowerPrompt.includes(keyword)) {
          if (category !== categoryId) {
            suggestedCategory = category;
            matchedKeyword = keyword;
            break;
          }
        }
      }
      if (suggestedCategory) break;
    }

    if (suggestedCategory && matchedKeyword) {
      const suggestedCatName = ALL_CATEGORIES.find(c => c.id === suggestedCategory)?.name || suggestedCategory;
      const currentCatName = ALL_CATEGORIES.find(c => c.id === categoryId)?.name || categoryId;
      setPromptMismatchWarning(`Your prompt mentions "${matchedKeyword}" which sounds like ${suggestedCatName}, but you selected ${currentCatName}. The result may not match your expectation.`);
    } else {
      setPromptMismatchWarning(null);
    }
  }, [prompt, categoryId]);

  // Progress simulation for 2D only (3D uses real streaming)
  useEffect(() => {
    if (loading && mode === "2d") {
      const messages = [
        "Initializing...",
        "Generating sprite...",
        "Applying style...",
        "Finalizing...",
      ];
      let messageIndex = 0;

      const messageInterval = setInterval(() => {
        if (messageIndex < messages.length - 1) {
          messageIndex++;
          setProgressMessage(messages[messageIndex]);
        }
      }, 4000);

      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) return prev;
          return Math.min(prev + Math.random() * 4, 95);
        });
      }, 1000);

      return () => {
        clearInterval(messageInterval);
        clearInterval(progressInterval);
      };
    }
  }, [loading, mode]);

  const handleCategoryChange = (newCategoryId: string) => {
    setCategoryId(newCategoryId);
    setSubcategoryId("");
    const newCategory = ALL_CATEGORIES.find(c => c.id === newCategoryId);
    if (mode === "3d" && !newCategory?.supports3D) {
      setMode("2d");
    }
  };

  const handleModeChange = (newMode: "2d" | "3d") => {
    if (newMode === "3d" && !categorySupports3D) return;
    setMode(newMode);
    // Reset results when switching mode
    setGeneratedUrl(null);
    setIs3DModel(false);
    setThumbnailUrl(null);
    setVideoUrl(null);
    setError("");
  };

  const generateRandomSeed = () => {
    const newSeed = Math.floor(Math.random() * 2147483647);
    setSeed(newSeed.toString());
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to server
    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setUploadedImageUrl(data.url);
      setInputMode("image");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploadedImagePreview(null);
    } finally {
      setUploading(false);
    }
  };

  const clearUploadedImage = () => {
    setUploadedImageUrl(null);
    setUploadedImagePreview(null);
    setInputMode("text");
  };

  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) return;

    setFeedbackSending(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: feedbackType,
          message: feedbackText.trim(),
          email: feedbackEmail.trim() || undefined,
          context: JSON.stringify({
            page: "generate",
            mode,
            categoryId,
            subcategoryId,
            styleId: mode === "2d" ? styleId : style3DId,
            error: error || undefined,
          }),
        }),
      });

      if (response.ok) {
        setFeedbackSent(true);
        setTimeout(() => {
          setShowFeedback(false);
          setFeedbackText("");
          setFeedbackEmail("");
          setFeedbackSent(false);
        }, 2000);
      }
    } catch (err) {
      console.error("Failed to send feedback:", err);
    } finally {
      setFeedbackSending(false);
    }
  };

  const handleGenerate = async () => {
    if (!categoryId) { setError("Select a category!"); return; }
    if (!subcategoryId) { setError("Select a subcategory!"); return; }
    // For 3D mode with image upload, prompt is optional
    if (mode === "2d" && !prompt.trim()) { setError("Enter a description!"); return; }
    if (mode === "3d" && !prompt.trim() && !uploadedImageUrl) { setError("Enter a description or upload an image!"); return; }

    setLoading(true);
    setProgress(0);
    setError("");
    setGeneratedUrl(null);
    setGeneratedFormat(null);
    setIs3DModel(false);
    setThumbnailUrl(null);
    setVideoUrl(null);
    setLastSeed(null);
    setProgressMessage("Initializing...");
    setCurrentStep(0);
    setStepTitle("");
    setStepDescription("");
    setReferenceImageUrl(null);
    setCompletedSteps([]);

    try {
      if (mode === "2d") {
        // 2D generation - standard fetch
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: prompt.trim(),
            categoryId,
            subcategoryId,
            styleId,
            seed: seed ? Number(seed) : undefined,
            // Premium features
            enableStyleMix,
            style2Id: enableStyleMix ? style2Id : undefined,
            style1Weight: enableStyleMix ? style1Weight : undefined,
            colorPaletteId: colorPaletteId || undefined,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          // Check if it's a no-credits error
          if (data.noCredits || response.status === 402) {
            setShowNoCredits(true);
            return;
          }
          throw new Error(data.error || "Generation failed");
        }

        setProgress(100);
        setProgressMessage("Complete!");
        setGeneratedUrl(data.imageUrl);
        setGeneratedFormat("png");
        setIs3DModel(false);
        setLastSeed(data.seed);
        if (data.seed) setSeed(data.seed.toString());
      } else {
        // 3D generation - use streaming SSE
        const response = await fetch("/api/generate-3d-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: prompt.trim() || undefined,
            categoryId,
            subcategoryId,
            modelId: model3D,
            styleId: style3DId,
            seed: seed ? Number(seed) : undefined,
            customImageUrl: uploadedImageUrl || undefined,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          // Check if it's a no-credits error
          if (errorData.noCredits || response.status === 402) {
            setShowNoCredits(true);
            return;
          }
          throw new Error(errorData.error || "Generation failed");
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error("No response stream");

        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              const eventType = line.slice(7);
              const dataLineIndex = lines.indexOf(line) + 1;
              if (dataLineIndex < lines.length && lines[dataLineIndex].startsWith("data: ")) {
                try {
                  const data = JSON.parse(lines[dataLineIndex].slice(6));

                  switch (eventType) {
                    case "step":
                      setCurrentStep(data.step);
                      setStepTitle(data.title);
                      setStepDescription(data.description);
                      setProgress((data.step / data.total) * 100 * (data.completed ? 1 : 0.8));
                      setProgressMessage(data.title);
                      if (data.completed) {
                        setCompletedSteps(prev => [...prev, data.step]);
                      }
                      break;

                    case "reference":
                      setReferenceImageUrl(data.imageUrl);
                      setLastSeed(data.seed);
                      if (data.seed) setSeed(data.seed.toString());
                      break;

                    case "complete":
                      setProgress(100);
                      setProgressMessage("Complete!");
                      setGeneratedUrl(data.modelUrl);
                      setGeneratedFormat(data.format || "glb");
                      setIs3DModel(true);
                      setThumbnailUrl(data.referenceImageUrl);
                      break;

                    case "error":
                      if (data.noCredits) {
                        setShowNoCredits(true);
                        setLoading(false);
                        return;
                      }
                      throw new Error(data.message);
                  }
                } catch (parseError) {
                  // Skip parse errors for incomplete data
                }
              }
            }
          }
        }
      }

      triggerCreditsRefresh();

      // Increment generation count for smart feedback popup
      const newCount = sessionGenerationCount + 1;
      setSessionGenerationCount(newCount);
      localStorage.setItem("spritelab_generation_count", newCount.toString());

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong";
      setError(errorMessage);
      setProgressMessage("");
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
      
      // Use correct extension
      const ext = generatedFormat?.toLowerCase() || (mode === "2d" ? "png" : "glb");
      a.download = `spritelab-${mode}-${categoryId}-${lastSeed || Date.now()}.${ext}`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed:", err);
      window.open(generatedUrl, "_blank");
    }
  };

  const copySeed = () => {
    if (lastSeed) {
      navigator.clipboard.writeText(lastSeed.toString());
      setCopiedSeed(true);
      setTimeout(() => setCopiedSeed(false), 2000);
    }
  };

  const getCredits = () => mode === "2d" ? 1 : selected3DModel.credits;

  return (
    <div className="min-h-screen bg-[#030305] relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      <div className="fixed inset-0 grid-pattern pointer-events-none opacity-50" />
      <div className="fixed top-20 left-10 w-96 h-96 bg-[#00ff88]/10 rounded-full blur-[120px] animate-glow-pulse pointer-events-none" />
      <div className="fixed bottom-20 right-10 w-80 h-80 bg-[#00d4ff]/10 rounded-full blur-[100px] animate-glow-pulse pointer-events-none" style={{ animationDelay: "1s" }} />

      <div className="relative z-10 p-4 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-4 mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[#00ff88] to-[#00d4ff] rounded-xl blur-lg opacity-60 animate-pulse-glow" />
              <div className="relative w-14 h-14 rounded-xl gradient-primary flex items-center justify-center">
                <Zap className="w-8 h-8 text-[#030305]" />
              </div>
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-display font-black gradient-text neon-text">
                ASSET GENERATOR
              </h1>
              <p className="text-sm text-[#a0a0b0]">Create 2D sprites & 3D models for your games</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-3 space-y-5">

            {/* MODE SELECTOR */}
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#00ff88] to-[#c084fc] flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-semibold text-white">Output Type</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* 2D Button */}
                <button
                  onClick={() => handleModeChange("2d")}
                  className={`relative p-4 rounded-xl border-2 transition-all ${
                    mode === "2d"
                      ? "border-[#00ff88] bg-[#00ff88]/10"
                      : "border-[#2a2a3d] hover:border-[#00ff88]/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      mode === "2d" ? "bg-[#00ff88] text-[#030305]" : "bg-[#1a1a28] text-[#00ff88]"
                    }`}>
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <span className={`font-bold block ${mode === "2d" ? "text-[#00ff88]" : "text-white"}`}>2D Sprite</span>
                      <span className="text-xs text-[#a0a0b0]">PNG image • 1 credit</span>
                    </div>
                  </div>
                  {mode === "2d" && (
                    <div className="absolute top-2 right-2">
                      <Check className="w-5 h-5 text-[#00ff88]" />
                    </div>
                  )}
                </button>

                {/* 3D Button */}
                <button
                  onClick={() => handleModeChange("3d")}
                  disabled={!categorySupports3D && categoryId !== ""}
                  className={`relative p-4 rounded-xl border-2 transition-all ${
                    mode === "3d"
                      ? "border-[#c084fc] bg-[#c084fc]/10"
                      : !categorySupports3D && categoryId !== ""
                        ? "border-[#2a2a3d] opacity-50 cursor-not-allowed"
                        : "border-[#2a2a3d] hover:border-[#c084fc]/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      mode === "3d" ? "bg-[#c084fc] text-[#030305]" : "bg-[#1a1a28] text-[#c084fc]"
                    }`}>
                      <Cuboid className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <span className={`font-bold block ${mode === "3d" ? "text-[#c084fc]" : "text-white"}`}>3D Model</span>
                      <span className="text-xs text-[#a0a0b0]">GLB file • {selected3DModel.credits} credits</span>
                    </div>
                  </div>
                  {mode === "3d" && (
                    <div className="absolute top-2 right-2">
                      <Check className="w-5 h-5 text-[#c084fc]" />
                    </div>
                  )}
                </button>
              </div>

              {!categorySupports3D && categoryId !== "" && (
                <div className="mt-3 p-3 rounded-lg bg-[#ffd93d]/10 border border-[#ffd93d]/30 flex items-start gap-2">
                  <Flame className="w-4 h-4 text-[#ffd93d] mt-0.5 shrink-0" />
                  <span className="text-xs text-[#ffd93d]">
                    {currentCategory?.name} doesn't support 3D. Choose Weapons, Armor, Characters, etc.
                  </span>
                </div>
              )}
            </div>

            {/* STEP 1: Category */}
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-[#030305] font-bold text-sm">1</div>
                <h3 className="font-semibold text-white">Select Category</h3>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {ALL_CATEGORIES.map((cat) => {
                  const Icon = ICON_MAP[cat.icon] || Box;
                  const isSelected = categoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryChange(cat.id)}
                      className={`group relative p-3 rounded-xl text-center transition-all duration-300 ${
                        isSelected
                          ? "neon-border bg-[#00ff88]/10"
                          : "border border-transparent hover:border-[#00ff88]/30 hover:bg-white/5"
                      }`}
                    >
                      {cat.supports3D && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#c084fc] flex items-center justify-center" title="Supports 3D">
                          <Box className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                      <div className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center mb-2 transition-all ${
                        isSelected
                          ? "gradient-primary shadow-lg neon-glow"
                          : "bg-[#1a1a28] group-hover:bg-[#2a2a3d]"
                      }`}>
                        <Icon className={`w-5 h-5 ${isSelected ? "text-[#030305]" : "text-[#00ff88]"}`} />
                      </div>
                      <span className={`text-xs font-medium ${isSelected ? "text-[#00ff88]" : "text-[#a0a0b0] group-hover:text-white"}`}>
                        {cat.name}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="text-xs text-[#a0a0b0] mt-3 flex items-center gap-1">
                <Box className="w-3 h-3 text-[#c084fc]" />
                Purple badge = supports 3D generation
              </div>
            </div>

            {/* STEP 2: Subcategory */}
            {currentCategory && (
              <div className="glass-card rounded-2xl p-5 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#00d4ff] flex items-center justify-center text-[#030305] font-bold text-sm">2</div>
                  <h3 className="font-semibold text-white">Select Type</h3>
                  <ChevronRight className="w-4 h-4 text-[#a0a0b0]" />
                  <span className="text-sm text-[#00ff88]">{currentCategory.name}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {currentCategory.subcategories.map((sub) => {
                    const isSelected = subcategoryId === sub.id;
                    return (
                      <button
                        key={sub.id}
                        onClick={() => setSubcategoryId(sub.id)}
                        className={`p-3 rounded-xl text-left transition-all duration-200 border ${
                          isSelected
                            ? "border-[#00d4ff] bg-[#00d4ff]/10"
                            : "border-[#2a2a3d] hover:border-[#00d4ff]/50 hover:bg-white/5"
                        }`}
                      >
                        <span className={`font-medium text-sm ${isSelected ? "text-[#00d4ff]" : "text-white"}`}>{sub.name}</span>
                        <span className="text-xs text-[#a0a0b0] block mt-1 truncate">
                          {sub.examples.slice(0, 3).join(", ")}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 3: Style (2D) or Model (3D) */}
            {mode === "2d" ? (
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#00ff88] to-[#00d4ff] flex items-center justify-center text-[#030305] font-bold text-sm">3</div>
                  <h3 className="font-semibold text-white">Art Style</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {STYLES_2D_UI.map((style) => {
                    const isSelected = styleId === style.id;
                    return (
                      <button
                        key={style.id}
                        onClick={() => setStyleId(style.id)}
                        className={`p-3 rounded-xl text-center transition-all duration-200 border ${
                          isSelected
                            ? "border-[#00ff88] bg-[#00ff88]/10 neon-glow"
                            : "border-[#2a2a3d] hover:border-[#00ff88]/50 hover:bg-white/5"
                        }`}
                      >
                        <div className="text-2xl mb-1">{style.emoji}</div>
                        <span className={`text-xs font-medium block ${isSelected ? "text-[#00ff88]" : "text-white"}`}>
                          {style.name}
                        </span>
                        <span className="text-[10px] text-[#a0a0b0] block mt-0.5">{style.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                {/* 3D Style Selection */}
                <div className="glass-card rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#c084fc] to-[#00d4ff] flex items-center justify-center text-white font-bold text-sm">3</div>
                    <h3 className="font-semibold text-white">Visual Style</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {STYLES_3D.map((style) => {
                      const isSelected = style3DId === style.id;
                      return (
                        <button
                          key={style.id}
                          onClick={() => setStyle3DId(style.id)}
                          className={`p-3 rounded-xl text-center transition-all duration-200 border ${
                            isSelected
                              ? "border-[#c084fc] bg-[#c084fc]/10"
                              : "border-[#2a2a3d] hover:border-[#c084fc]/50 hover:bg-white/5"
                          }`}
                        >
                          <div className="text-2xl mb-1">{style.emoji}</div>
                          <span className={`text-xs font-medium block ${isSelected ? "text-[#c084fc]" : "text-white"}`}>
                            {style.name}
                          </span>
                          <span className="text-[10px] text-[#a0a0b0] block mt-0.5">{style.description}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3D Engine Selection */}
                <div className="glass-card rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-[#c084fc] flex items-center justify-center text-white font-bold text-sm">4</div>
                    <h3 className="font-semibold text-white">3D Engine</h3>
                  </div>
                  <div className="space-y-3">
                    {MODELS_3D.map((model) => {
                      const isSelected = model3D === model.id;
                      return (
                        <button
                          key={model.id}
                          onClick={() => setModel3D(model.id)}
                          className={`w-full p-4 rounded-xl text-left transition-all duration-200 border-2 ${
                            isSelected
                              ? "border-[#c084fc] bg-[#c084fc]/10"
                              : "border-[#2a2a3d] hover:border-[#c084fc]/50"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${isSelected ? "text-[#c084fc]" : "text-white"}`}>{model.name}</span>
                              {model.recommended && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-[#00ff88]/20 text-[#00ff88]">Best</span>
                              )}
                              {model.online ? (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-[#00ff88]/20 text-[#00ff88] flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
                                  Online
                                </span>
                              ) : (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-[#ff4444]/20 text-[#ff4444]">Offline</span>
                              )}
                            </div>
                            <span className="text-xs text-[#a0a0b0]">{model.credits} credits</span>
                          </div>
                          <p className="text-xs text-[#a0a0b0] mb-2">{model.description}</p>
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-[#a0a0b0]" />
                              <span className="text-[#a0a0b0]">{model.time}</span>
                            </div>
                            <div className="flex gap-1">
                              {model.formats.map(fmt => (
                                <span key={fmt} className="px-2 py-0.5 rounded bg-[#c084fc]/20 text-[#c084fc] font-mono font-bold">{fmt}</span>
                              ))}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Workflow info */}
                  <div className="mt-4 p-3 rounded-lg bg-[#c084fc]/10 border border-[#c084fc]/20">
                    <div className="flex items-center gap-2 text-xs text-[#c084fc]">
                      <Sparkles className="w-3 h-3" />
                      <span className="font-medium">How it works:</span>
                    </div>
                    <p className="text-xs text-[#a0a0b0] mt-1">
                      Your text → AI generates styled reference image → Converts to 3D model with textures
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* PREMIUM FEATURES - Only for 2D mode */}
            {mode === "2d" && (
              <PremiumFeatures
                styleId={styleId}
                enableSpriteSheet={enableSpriteSheet}
                onSpriteSheetChange={setEnableSpriteSheet}
                animationTypeId={animationTypeId}
                onAnimationTypeChange={setAnimationTypeId}
                enableStyleMix={enableStyleMix}
                onStyleMixChange={setEnableStyleMix}
                style2Id={style2Id}
                onStyle2Change={setStyle2Id}
                style1Weight={style1Weight}
                onStyle1WeightChange={setStyle1Weight}
                colorPaletteId={colorPaletteId}
                onColorPaletteChange={setColorPaletteId}
              />
            )}

            {/* STEP 4/5: Prompt or Image Upload */}
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#00d4ff] to-[#00ff88] flex items-center justify-center text-[#030305] font-bold text-sm">{mode === "3d" ? "5" : "4"}</div>
                  <h3 className="font-semibold text-white">
                    {mode === "3d" ? "Describe or Upload Image" : "Describe Your Asset"}
                  </h3>
                </div>

                {/* Input mode toggle for 3D */}
                {mode === "3d" && (
                  <div className="flex rounded-lg bg-[#1a1a28] p-1">
                    <button
                      onClick={() => setInputMode("text")}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        inputMode === "text"
                          ? "bg-[#c084fc] text-white"
                          : "text-[#a0a0b0] hover:text-white"
                      }`}
                    >
                      <Wand2 className="w-3 h-3 inline mr-1" />
                      Text
                    </button>
                    <button
                      onClick={() => setInputMode("image")}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        inputMode === "image"
                          ? "bg-[#c084fc] text-white"
                          : "text-[#a0a0b0] hover:text-white"
                      }`}
                    >
                      <Camera className="w-3 h-3 inline mr-1" />
                      Image
                    </button>
                  </div>
                )}
              </div>

              {/* Text input mode */}
              {(mode === "2d" || inputMode === "text") && (
                <>
                  <div className="relative">
                    <Input
                      placeholder={currentSubcategory ? `e.g. ${currentSubcategory.examples[0]}` : "Select category first..."}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="h-14 text-base input-gaming pr-12"
                      disabled={!subcategoryId}
                    />
                    <Wand2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#00ff88]" />
                  </div>

                  {/* Prompt Category Mismatch Warning */}
                  {promptMismatchWarning && (
                    <div className="mt-2 p-3 rounded-lg bg-[#ff9500]/10 border border-[#ff9500]/30 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-[#ff9500] flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-[#ff9500]">{promptMismatchWarning}</p>
                    </div>
                  )}

                  {currentSubcategory && (
                    <div className="mt-4 space-y-3">
                      {/* Random Prompt Generator Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Dices className="w-4 h-4 text-[#c084fc]" />
                          <span className="text-sm font-medium text-white">Prompt Ideas</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowSuggestions(!showSuggestions)}
                            className="text-xs px-2 py-1 rounded-lg bg-[#1a1a28] text-[#a0a0b0] hover:text-white hover:bg-[#2a2a3d] transition-colors"
                          >
                            {showSuggestions ? "Hide" : "Show"} Ideas
                          </button>
                          <button
                            onClick={() => {
                              const suggestions = generatePromptSuggestions(categoryId, subcategoryId, 6);
                              setPromptSuggestions(suggestions);
                            }}
                            className="text-xs px-2 py-1 rounded-lg bg-[#c084fc]/20 text-[#c084fc] hover:bg-[#c084fc]/30 transition-colors flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            New Ideas
                          </button>
                        </div>
                      </div>

                      {/* Quick Examples - Always Visible */}
                      <div className="flex flex-wrap gap-2">
                        {currentSubcategory.examples.slice(0, 3).map((ex) => (
                          <button
                            key={ex}
                            onClick={() => setPrompt(ex)}
                            className="text-xs px-3 py-1.5 rounded-full bg-[#00ff88]/10 text-[#00ff88] hover:bg-[#00ff88]/20 transition-colors border border-[#00ff88]/20"
                          >
                            {ex}
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            const randomPrompt = generateRandomPrompt(categoryId, subcategoryId, "complex");
                            setPrompt(randomPrompt);
                          }}
                          className="text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-[#c084fc]/20 to-[#00d4ff]/20 text-[#c084fc] hover:from-[#c084fc]/30 hover:to-[#00d4ff]/30 transition-colors border border-[#c084fc]/30 flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          Random Epic
                        </button>
                      </div>

                      {/* Expanded Suggestions Panel */}
                      {showSuggestions && promptSuggestions.length > 0 && (
                        <div className="p-3 rounded-xl bg-[#0a0a0f] border border-[#2a2a3d] space-y-2 animate-in slide-in-from-top-2 duration-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Lightbulb className="w-3 h-3 text-[#ffd93d]" />
                            <span className="text-xs text-[#a0a0b0]">Click to use, or refresh for more</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {promptSuggestions.map((suggestion, index) => (
                              <button
                                key={index}
                                onClick={() => {
                                  setPrompt(suggestion);
                                  setShowSuggestions(false);
                                }}
                                className="group text-left p-2 rounded-lg bg-[#1a1a28] hover:bg-[#2a2a3d] border border-[#2a2a3d] hover:border-[#00ff88]/50 transition-all"
                              >
                                <span className="text-xs text-[#a0a0b0] group-hover:text-white transition-colors line-clamp-2">
                                  {suggestion}
                                </span>
                              </button>
                            ))}
                          </div>
                          {/* Complexity Buttons */}
                          <div className="flex items-center gap-2 pt-2 border-t border-[#2a2a3d]">
                            <span className="text-xs text-[#606070]">Generate:</span>
                            <button
                              onClick={() => setPrompt(generateRandomPrompt(categoryId, subcategoryId, "simple"))}
                              className="text-xs px-2 py-1 rounded bg-[#00ff88]/10 text-[#00ff88] hover:bg-[#00ff88]/20 transition-colors"
                            >
                              Simple
                            </button>
                            <button
                              onClick={() => setPrompt(generateRandomPrompt(categoryId, subcategoryId, "medium"))}
                              className="text-xs px-2 py-1 rounded bg-[#00d4ff]/10 text-[#00d4ff] hover:bg-[#00d4ff]/20 transition-colors"
                            >
                              Medium
                            </button>
                            <button
                              onClick={() => setPrompt(generateRandomPrompt(categoryId, subcategoryId, "complex"))}
                              className="text-xs px-2 py-1 rounded bg-[#c084fc]/10 text-[#c084fc] hover:bg-[#c084fc]/20 transition-colors"
                            >
                              Epic
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Image upload mode (3D only) */}
              {mode === "3d" && inputMode === "image" && (
                <div className="space-y-3">
                  {uploadedImagePreview ? (
                    // Show uploaded image preview
                    <div className="relative rounded-xl overflow-hidden border-2 border-[#c084fc]/50 bg-[#0a0a0f]">
                      <img
                        src={uploadedImagePreview}
                        alt="Uploaded"
                        className="w-full h-48 object-contain"
                      />
                      <button
                        onClick={clearUploadedImage}
                        className="absolute top-2 right-2 p-2 rounded-full bg-[#ff4444] text-white hover:bg-[#ff4444]/80 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      {uploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f]/80">
                          <Loader2 className="w-8 h-8 text-[#c084fc] animate-spin" />
                        </div>
                      )}
                      {uploadedImageUrl && !uploading && (
                        <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-[#00ff88]/90 text-[#030305] text-xs font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Ready
                        </div>
                      )}
                    </div>
                  ) : (
                    // Upload dropzone with drag & drop
                    <div
                      className="border-2 border-dashed border-[#c084fc]/30 rounded-xl p-8 text-center hover:border-[#c084fc]/60 hover:bg-[#c084fc]/5 transition-all cursor-pointer"
                      onClick={() => document.getElementById("image-upload-input")?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.currentTarget.classList.add("border-[#c084fc]", "bg-[#c084fc]/10");
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.currentTarget.classList.remove("border-[#c084fc]", "bg-[#c084fc]/10");
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.currentTarget.classList.remove("border-[#c084fc]", "bg-[#c084fc]/10");
                        const files = e.dataTransfer.files;
                        if (files && files.length > 0) {
                          const input = document.getElementById("image-upload-input") as HTMLInputElement;
                          if (input) {
                            const dataTransfer = new DataTransfer();
                            dataTransfer.items.add(files[0]);
                            input.files = dataTransfer.files;
                            input.dispatchEvent(new Event("change", { bubbles: true }));
                          }
                        }
                      }}
                    >
                      <Upload className="w-12 h-12 mx-auto text-[#c084fc]/50 mb-3" />
                      <p className="text-white font-medium mb-1">Drop your image here</p>
                      <p className="text-sm text-[#a0a0b0]">or click to browse</p>
                      <p className="text-xs text-[#a0a0b0] mt-2">JPG, PNG, WebP • Max 10MB</p>
                    </div>
                  )}
                  <input
                    id="image-upload-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  {/* Optional prompt for image mode */}
                  <div className="relative">
                    <Input
                      placeholder="Optional: add description to guide 3D generation..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="h-12 text-sm input-gaming"
                    />
                  </div>
                </div>
              )}

              <div className="mt-4 p-3 rounded-lg bg-[#00d4ff]/10 border border-[#00d4ff]/20 flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-[#00d4ff] mt-0.5 shrink-0" />
                <span className="text-xs text-[#00d4ff]">
                  {mode === "2d"
                    ? 'Be specific! "golden sword with ruby gems, glowing blade" works better than "sword"'
                    : inputMode === "image"
                      ? "Upload a clear image of a single object with good lighting. White or simple backgrounds work best!"
                      : 'Simple single objects work best. "medieval iron sword" > "battle scene"'
                  }
                </span>
              </div>
            </div>

            {/* Seed & Generate */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Input
                  placeholder="Seed (optional)"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value.replace(/\D/g, ""))}
                  className="h-12 font-mono input-gaming"
                />
                <button
                  onClick={generateRandomSeed}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title="Generate random seed"
                >
                  <Dices className="w-4 h-4 text-[#a0a0b0]" />
                </button>
              </div>
              <Button
                onClick={handleGenerate}
                disabled={
                  loading ||
                  !categoryId ||
                  !subcategoryId ||
                  (mode === "2d" && !prompt.trim()) ||
                  (mode === "3d" && inputMode === "text" && !prompt.trim()) ||
                  (mode === "3d" && inputMode === "image" && !uploadedImageUrl)
                }
                className={`h-12 px-8 font-display font-bold text-base disabled:opacity-50 ${
                  mode === "2d"
                    ? "btn-primary"
                    : "bg-gradient-to-r from-[#c084fc] to-[#00d4ff] hover:opacity-90 text-white"
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    {mode === "2d" ? <Rocket className="w-5 h-5 mr-2" /> : <Cuboid className="w-5 h-5 mr-2" />}
                    GENERATE ({getCredits()} {getCredits() === 1 ? "credit" : "credits"})
                  </>
                )}
              </Button>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-[#ff4444]/10 border border-[#ff4444]/30 text-[#ff4444] text-sm flex items-center gap-3">
                <Flame className="w-5 h-5 shrink-0" />
                {error}
              </div>
            )}

            {/* Progress Bar - Enhanced for 3D */}
            {loading && (
              <div className="glass-card rounded-xl p-4">
                {mode === "3d" ? (
                  // Enhanced 3D Progress with Steps
                  <div className="space-y-4">
                    {/* Step indicators */}
                    <div className="flex items-center justify-between">
                      {[
                        { step: 1, label: "Reference", icon: ImageIcon },
                        { step: 2, label: "3D Mesh", icon: Box },
                        { step: 3, label: "Complete", icon: Check },
                      ].map(({ step, label, icon: Icon }, index) => (
                        <div key={step} className="flex items-center">
                          <div className={`flex flex-col items-center ${index > 0 ? "flex-1" : ""}`}>
                            {index > 0 && (
                              <div className={`h-0.5 w-full mb-2 transition-all duration-500 ${
                                completedSteps.includes(step - 1)
                                  ? "bg-gradient-to-r from-[#c084fc] to-[#00d4ff]"
                                  : "bg-[#2a2a3d]"
                              }`} />
                            )}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                              completedSteps.includes(step)
                                ? "bg-[#00ff88] text-[#030305]"
                                : currentStep === step
                                  ? "bg-[#c084fc] text-white animate-pulse"
                                  : "bg-[#1a1a28] text-[#a0a0b0]"
                            }`}>
                              {completedSteps.includes(step) ? (
                                <Check className="w-5 h-5" />
                              ) : (
                                <Icon className="w-5 h-5" />
                              )}
                            </div>
                            <span className={`text-xs mt-1 ${
                              currentStep === step ? "text-[#c084fc]" : "text-[#a0a0b0]"
                            }`}>{label}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Current step info */}
                    <div className="text-center py-2">
                      <h4 className="text-white font-semibold">{stepTitle || progressMessage}</h4>
                      <p className="text-sm text-[#a0a0b0]">{stepDescription}</p>
                    </div>

                    {/* Reference image preview */}
                    {referenceImageUrl && (
                      <div className="relative rounded-lg overflow-hidden border border-[#c084fc]/30 bg-[#0a0a0f]">
                        <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded bg-[#00ff88]/90 text-[#030305] text-xs font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Reference Ready
                        </div>
                        <img
                          src={referenceImageUrl}
                          alt="Reference"
                          className="w-full h-32 object-contain"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] to-transparent opacity-50" />
                      </div>
                    )}

                    {/* Progress bar */}
                    <div>
                      <div className="flex justify-between text-xs text-[#a0a0b0] mb-1">
                        <span>Step {currentStep}/3</span>
                        <span className="font-mono text-[#c084fc]">{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full h-2 bg-[#1a1a28] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#c084fc] to-[#00d4ff] transition-all duration-500 ease-out"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  // Simple 2D progress
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">{progressMessage}</span>
                      <span className="text-sm font-mono text-[#00ff88]">{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full h-2 bg-[#1a1a28] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#00ff88] to-[#00d4ff] transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-[#a0a0b0] mt-2">Estimated time: 15-30s</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN - Preview */}
          <div className="lg:col-span-2 lg:sticky lg:top-4 space-y-4">
            <div className="relative">
              <div className={`absolute -inset-0.5 rounded-2xl blur opacity-30 animate-pulse-glow ${
                mode === "2d" 
                  ? "bg-gradient-to-r from-[#00ff88] to-[#00d4ff]" 
                  : "bg-gradient-to-r from-[#c084fc] to-[#00d4ff]"
              }`} />
              <div className="relative glass-card rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-[#2a2a3d] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ff4444]" />
                    <div className="w-3 h-3 rounded-full bg-[#ffd93d]" />
                    <div className="w-3 h-3 rounded-full bg-[#00ff88]" />
                  </div>
                  <span className="text-xs text-[#a0a0b0] font-mono">
                    {mode === "2d" 
                      ? "sprite.png" 
                      : `model.${generatedFormat?.toLowerCase() || "glb"}`
                    }
                  </span>
                </div>

                <div className="aspect-square bg-[#0a0a0f] flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 grid-pattern-dense opacity-30" />

                  {loading ? (
                    <div className="text-center p-6 relative z-10 w-full h-full flex flex-col items-center justify-center">
                      {/* Show reference image during 3D generation */}
                      {mode === "3d" && referenceImageUrl ? (
                        <div className="relative w-full h-full">
                          <img
                            src={referenceImageUrl}
                            alt="Reference"
                            className="w-full h-full object-contain opacity-40"
                          />
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0f]/70">
                            <div className="relative w-20 h-20 mb-4">
                              <div className="absolute inset-0 rounded-full bg-[#c084fc]/30 blur-xl animate-pulse" />
                              <div className="relative w-full h-full rounded-full border-4 border-[#2a2a3d] animate-spin border-t-[#c084fc]" />
                              <Cuboid className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-[#c084fc]" />
                            </div>
                            <span className="font-display font-bold text-white block">
                              Converting to 3D...
                            </span>
                            <span className="text-sm text-[#a0a0b0] mt-1 block">
                              {stepDescription || progressMessage}
                            </span>
                            <div className="mt-3 px-3 py-1 rounded-full bg-[#c084fc]/20 text-[#c084fc] text-xs">
                              Step {currentStep}/3
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Default loading with Coreling working
                        <>
                          <div className="relative w-32 h-32 mx-auto mb-4">
                            {/* Glow effect */}
                            <div className={`absolute inset-0 rounded-full blur-2xl opacity-40 animate-pulse ${
                              mode === "2d" ? "bg-[#00ff88]" : "bg-[#c084fc]"
                            }`} />
                            {/* Coreling working mascot */}
                            <img
                              src="/coreling-working.png"
                              alt="Coreling Working"
                              className="relative w-full h-full object-contain animate-bounce drop-shadow-xl"
                              style={{ animationDuration: "1.5s" }}
                            />
                            {/* Spinning ring around Coreling */}
                            <div className={`absolute inset-0 rounded-full border-4 border-transparent animate-spin ${
                              mode === "2d" ? "border-t-[#00ff88] border-r-[#00ff88]/30" : "border-t-[#c084fc] border-r-[#c084fc]/30"
                            }`} style={{ animationDuration: "2s" }} />
                          </div>
                          <span className="font-display font-bold text-white block">
                            {mode === "2d" ? "Generating Sprite..." : "Creating 3D Model..."}
                          </span>
                          <span className="text-sm text-[#a0a0b0] mt-1 block">
                            {progressMessage}
                          </span>
                        </>
                      )}
                    </div>
                  ) : generatedUrl ? (
                    is3DModel ? (
                      <Model3DViewer 
                        modelUrl={generatedUrl} 
                        thumbnailUrl={thumbnailUrl || undefined}
                        videoUrl={videoUrl || undefined}
                        format={get3DFormat(generatedUrl)} 
                      />
                    ) : (
                      <img
                        src={generatedUrl}
                        alt="Generated sprite"
                        className="w-full h-full object-contain p-4"
                      />
                    )
                  ) : (
                    <div className="text-center p-8 relative z-10">
                      {/* Coreling waving as empty state */}
                      <div className="w-28 h-28 mx-auto mb-4 relative">
                        <div className="absolute inset-0 bg-[#c084fc]/20 rounded-full blur-xl" />
                        <img
                          src="/coreling-wave.png"
                          alt="Coreling Waving"
                          className="relative w-full h-full object-contain opacity-60 hover:opacity-100 hover:scale-110 transition-all duration-300 cursor-pointer animate-float"
                        />
                      </div>
                      <div className="hidden">
                        {mode === "2d" ? (
                          <ImageIcon className="w-12 h-12 text-[#00ff88]/50" />
                        ) : (
                          <Cuboid className="w-12 h-12 text-[#c084fc]/50" />
                        )}
                      </div>
                      <span className="text-[#a0a0b0]">
                        {mode === "2d" ? "Your sprite will appear here" : "Your 3D model will appear here"}
                      </span>
                    </div>
                  )}
                </div>

                {generatedUrl && (
                  <div className="p-4 border-t border-[#2a2a3d] space-y-3">
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleDownload} 
                        className={`flex-1 ${is3DModel ? "bg-gradient-to-r from-[#c084fc] to-[#00d4ff] hover:opacity-90 text-white" : "btn-primary"}`}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download {is3DModel ? get3DFormat(generatedUrl) : "PNG"}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={handleGenerate} 
                        disabled={loading}
                        className="border-[#00ff88]/30 hover:bg-[#00ff88]/10"
                      >
                        <RefreshCw className={`w-4 h-4 text-[#00ff88] ${loading ? "animate-spin" : ""}`} />
                      </Button>
                      {generatedUrl && (
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => window.open(generatedUrl, "_blank")}
                          className="border-[#00d4ff]/30 hover:bg-[#00d4ff]/10"
                          title="Open in new tab"
                        >
                          <ExternalLink className="w-4 h-4 text-[#00d4ff]" />
                        </Button>
                      )}
                    </div>

                    {lastSeed && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-[#0a0a0f] border border-[#2a2a3d] text-sm">
                        <Dices className="w-4 h-4 text-[#a0a0b0]" />
                        <code className="flex-1 text-[#00ff88] font-mono">{lastSeed}</code>
                        <button onClick={copySeed} className="p-1 hover:bg-white/10 rounded">
                          {copiedSeed ? <Check className="w-3 h-3 text-[#00ff88]" /> : <Copy className="w-3 h-3 text-[#a0a0b0]" />}
                        </button>
                      </div>
                    )}

                    {/* 3D Format Info */}
                    {is3DModel && (
                      <div className="p-3 rounded-lg bg-[#c084fc]/10 border border-[#c084fc]/30">
                        <div className="flex items-center gap-2 mb-2">
                          <FileBox className="w-4 h-4 text-[#c084fc]" />
                          <span className="text-sm font-medium text-[#c084fc]">Game-Ready 3D Model</span>
                        </div>
                        <p className="text-xs text-[#a0a0b0]">
                          {get3DFormat(generatedUrl)} file with textures. Import directly into Unity, Unreal, Godot, or Blender.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Pro Tips */}
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-4 h-4 text-[#ffd93d]" />
                <span className="font-display font-semibold text-sm text-[#ffd93d]">PRO TIPS</span>
              </div>
              <ul className="text-xs text-[#a0a0b0] space-y-2">
                {mode === "2d" ? (
                  <>
                    <li className="flex items-start gap-2">
                      <Sparkles className="w-3 h-3 text-[#00ff88] mt-0.5 shrink-0" />
                      <span>Be detailed: <span className="text-[#00ff88]">"golden sword with ruby gems"</span></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Flame className="w-3 h-3 text-[#00d4ff] mt-0.5 shrink-0" />
                      <span>Add effects: <span className="text-[#00d4ff]">glowing, magical, enchanted</span></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Gem className="w-3 h-3 text-[#c084fc] mt-0.5 shrink-0" />
                      <span>Output: <span className="text-[#c084fc]">High-res PNG with transparency</span></span>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-start gap-2">
                      <Box className="w-3 h-3 text-[#c084fc] mt-0.5 shrink-0" />
                      <span>Single objects work best - <span className="text-[#c084fc]">avoid complex scenes</span></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Zap className="w-3 h-3 text-[#00ff88] mt-0.5 shrink-0" />
                      <span><span className="text-[#00ff88]">TRELLIS</span> gives best quality for final assets</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <FileBox className="w-3 h-3 text-[#00d4ff] mt-0.5 shrink-0" />
                      <span>GLB format works with <span className="text-[#00d4ff]">all major game engines</span></span>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Button - Left side vertical tab (non-intrusive) */}
      <button
        onClick={() => setShowFeedback(true)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-40 flex items-center gap-2 px-2 py-4 rounded-r-xl bg-gradient-to-b from-[#c084fc] to-[#00d4ff] text-white font-medium shadow-lg hover:shadow-xl hover:pl-3 transition-all duration-200 group"
      >
        <MessageSquare className="w-4 h-4" />
        <span className="writing-vertical text-xs tracking-wider opacity-80 group-hover:opacity-100">FEEDBACK</span>
      </button>

      {/* Periodic Feedback Popup - Shows automatically based on time */}
      <FeedbackPopup />

      {/* Feedback Modal */}
      {showFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md glass-card rounded-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              onClick={() => setShowFeedback(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 text-[#a0a0b0] hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {feedbackSent ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-[#00ff88]/20 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-[#00ff88]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Thank you!</h3>
                <p className="text-[#a0a0b0]">Your feedback helps us improve.</p>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold text-white mb-1">Send Feedback</h3>
                <p className="text-sm text-[#a0a0b0] mb-6">Help us improve Sprite Lab</p>

                {/* Feedback Type */}
                <div className="flex gap-2 mb-4">
                  {[
                    { id: "bug", icon: Bug, label: "Bug", color: "#ff4444" },
                    { id: "feature", icon: Star, label: "Feature", color: "#ffd93d" },
                    { id: "other", icon: MessageSquare, label: "Other", color: "#00d4ff" },
                  ].map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setFeedbackType(type.id as "bug" | "feature" | "other")}
                      className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                        feedbackType === type.id
                          ? `border-[${type.color}] bg-[${type.color}]/10`
                          : "border-[#2a2a3d] hover:border-[#3a3a4d]"
                      }`}
                      style={{
                        borderColor: feedbackType === type.id ? type.color : undefined,
                        backgroundColor: feedbackType === type.id ? `${type.color}15` : undefined,
                      }}
                    >
                      <type.icon className="w-4 h-4" style={{ color: type.color }} />
                      <span className={`text-sm font-medium ${feedbackType === type.id ? "text-white" : "text-[#a0a0b0]"}`}>
                        {type.label}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Message */}
                <div className="mb-4">
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder={
                      feedbackType === "bug"
                        ? "Describe what went wrong..."
                        : feedbackType === "feature"
                        ? "What feature would you like to see?"
                        : "Tell us anything..."
                    }
                    className="w-full h-32 px-4 py-3 rounded-xl bg-[#0a0a0f] border border-[#2a2a3d] text-white placeholder:text-[#606070] focus:outline-none focus:border-[#c084fc] resize-none"
                    maxLength={2000}
                  />
                  <div className="text-xs text-[#606070] text-right mt-1">
                    {feedbackText.length}/2000
                  </div>
                </div>

                {/* Email (optional) */}
                <div className="mb-6">
                  <Input
                    type="email"
                    value={feedbackEmail}
                    onChange={(e) => setFeedbackEmail(e.target.value)}
                    placeholder="Email (optional - for follow-up)"
                    className="h-12 bg-[#0a0a0f] border-[#2a2a3d] text-white placeholder:text-[#606070]"
                  />
                </div>

                {/* Error context info */}
                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-[#ff4444]/10 border border-[#ff4444]/30">
                    <div className="flex items-center gap-2 text-xs text-[#ff4444]">
                      <AlertCircle className="w-4 h-4" />
                      <span>Current error will be included: {error.slice(0, 50)}...</span>
                    </div>
                  </div>
                )}

                {/* Submit */}
                <Button
                  onClick={handleSendFeedback}
                  disabled={!feedbackText.trim() || feedbackSending}
                  className="w-full h-12 bg-gradient-to-r from-[#c084fc] to-[#00d4ff] hover:opacity-90 text-white font-semibold"
                >
                  {feedbackSending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Feedback
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* No Credits Modal */}
      {showNoCredits && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md glass-card rounded-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200 text-center">
            {/* Close button */}
            <button
              onClick={() => setShowNoCredits(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 text-[#a0a0b0] hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Sad Coreling */}
            <div className="w-32 h-32 mx-auto mb-4 relative">
              <div className="absolute inset-0 bg-[#ff4444]/20 rounded-full blur-xl animate-pulse" />
              <img
                src="/coreling-sad.png"
                alt="Sad Coreling"
                className="relative w-full h-full object-contain"
              />
            </div>

            <h3 className="text-2xl font-bold text-white mb-2">Out of Credits!</h3>
            <p className="text-[#a0a0b0] mb-6">
              You don't have enough credits to generate.
              <br />
              <span className="text-sm">Get more credits to continue creating!</span>
            </p>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={() => window.location.href = "/pricing"}
                className="w-full h-12 bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-[#030305] font-bold hover:opacity-90"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Get More Credits
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowNoCredits(false)}
                className="w-full h-10 border-[#2a2a3d] hover:bg-white/5"
              >
                Maybe Later
              </Button>
            </div>

            {/* Current plan info */}
            <p className="text-xs text-[#606070] mt-4">
              Tip: Upgrade to a subscription for monthly credits!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
