"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Lightbulb,
  Sparkles,
  Palette,
  Layers,
  Wand2,
  Target,
  Zap,
  Check,
  ArrowRight,
} from "lucide-react";

const TUTORIAL_STEPS = [
  {
    id: "category",
    title: "Step 1: Choose Your Category",
    icon: Layers,
    color: "#00ff88",
    content: "Pick what type of asset you want to create. Each category is optimized for specific game elements.",
    tips: [
      "Weapons & Armor - Items your characters use",
      "Characters & Creatures - Living beings in your game",
      "Environment & Tilesets - World building blocks",
      "UI & Effects - Interface and visual effects",
    ],
    highlight: "Categories with purple badges support 3D generation!",
  },
  {
    id: "type",
    title: "Step 2: Select the Type",
    icon: Target,
    color: "#00d4ff",
    content: "Narrow down to a specific type. This helps AI understand exactly what you want.",
    tips: [
      "Each type shows example prompts to inspire you",
      "The more specific, the better results",
      "Example: 'Swords' instead of just 'Weapons'",
    ],
    highlight: "Click on example prompts to auto-fill your description!",
  },
  {
    id: "style",
    title: "Step 3: Pick Your Art Style",
    icon: Palette,
    color: "#c084fc",
    content: "Choose the visual style that matches your game's aesthetic.",
    tips: [
      "Pixel Art 16-bit - Classic retro games",
      "Hand Painted - Hollow Knight style",
      "Vector - Clean mobile game look",
      "Isometric - For top-down or strategy games",
      "Anime/Chibi - Japanese game style",
    ],
    highlight: "Each style uses different AI models optimized for that look!",
  },
  {
    id: "prompt",
    title: "Step 4: Describe Your Asset",
    icon: Wand2,
    color: "#ffd93d",
    content: "This is where the magic happens! Write what you want to see.",
    tips: [
      "Be specific: 'golden sword' → 'golden sword with glowing blue runes'",
      "Add materials: metallic, wooden, crystal, bone",
      "Add effects: glowing, flaming, frozen, enchanted",
      "Add style words: ancient, futuristic, cursed, holy",
    ],
    highlight: "The AI will enhance your prompt automatically - you don't need to be perfect!",
  },
  {
    id: "generate",
    title: "Step 5: Generate!",
    icon: Zap,
    color: "#00ff88",
    content: "Hit the generate button and watch AI create your asset in ~15 seconds.",
    tips: [
      "Each generation costs 1 credit",
      "Use the same seed number to get similar results",
      "Download as PNG with transparent background",
      "Save favorites to your gallery",
    ],
    highlight: "Pro tip: Try different styles with the same prompt to find what works best!",
  },
];

const PRO_TIPS = [
  {
    emoji: "🎯",
    title: "Be Specific",
    description: "Instead of 'sword', try 'ancient elven longsword with emerald gems and silver engravings'",
  },
  {
    emoji: "✨",
    title: "Add Effects",
    description: "Words like 'glowing', 'magical', 'on fire', 'frozen' make assets more interesting",
  },
  {
    emoji: "🎨",
    title: "Mention Materials",
    description: "'Crystal', 'obsidian', 'gold-plated', 'rusted iron' help define the look",
  },
  {
    emoji: "🔄",
    title: "Iterate",
    description: "Generate multiple times with slight prompt changes to find the perfect result",
  },
  {
    emoji: "🌱",
    title: "Use Seeds",
    description: "Found something close? Note the seed and tweak your prompt to refine it",
  },
  {
    emoji: "📦",
    title: "Match Your Game",
    description: "Choose a style that fits your game's aesthetic - consistency is key!",
  },
];

interface GeneratorTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function GeneratorTutorial({ onComplete, onSkip }: GeneratorTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showProTips, setShowProTips] = useState(false);

  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const StepIcon = step.icon;

  const handleNext = () => {
    if (isLastStep) {
      setShowProTips(true);
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (showProTips) {
      setShowProTips(false);
    } else if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem("spritelab_tutorial_complete", "true");
    onComplete();
  };

  // Pro Tips Screen
  if (showProTips) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#030305]/95 backdrop-blur-xl">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#ffd93d]/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#00ff88]/10 rounded-full blur-[100px]" />
        </div>

        {/* Skip button */}
        <button
          onClick={() => {
            localStorage.setItem("spritelab_tutorial_complete", "true");
            onSkip();
          }}
          className="absolute top-4 right-4 p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ffd93d]/10 border border-[#ffd93d]/30 text-[#ffd93d] mb-4">
              <Lightbulb className="w-4 h-4" />
              <span className="font-medium">Pro Tips for Best Results</span>
            </div>
            <h2 className="text-2xl font-display font-bold text-white">
              Master the Art of Prompting
            </h2>
          </div>

          {/* Tips Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {PRO_TIPS.map((tip, index) => (
              <div
                key={index}
                className="p-4 rounded-xl bg-[#0a0a0f]/80 border border-[#2a2a3d] hover:border-[#ffd93d]/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{tip.emoji}</span>
                  <div>
                    <h4 className="font-semibold text-white mb-1">{tip.title}</h4>
                    <p className="text-sm text-[#a0a0b0]">{tip.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Example Prompt */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#00ff88]/10 to-[#00d4ff]/10 border border-[#00ff88]/30 mb-6">
            <div className="flex items-center gap-2 text-[#00ff88] font-medium mb-2">
              <Sparkles className="w-4 h-4" />
              Example of a Great Prompt
            </div>
            <p className="text-white font-mono text-sm bg-[#0a0a0f] rounded-lg p-3">
              "ancient dwarven battle axe with glowing red runes, obsidian blade, gold and bronze handle wrapped in leather, magical fire particles"
            </p>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              onClick={handlePrev}
              variant="ghost"
              className="text-[#a0a0b0] hover:text-white"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <Button
              onClick={handleComplete}
              className="h-12 px-6 bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-[#030305] font-bold hover:opacity-90"
            >
              <Check className="w-4 h-4 mr-2" />
              Got It, Let's Create!
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Main Tutorial Steps
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#030305]/95 backdrop-blur-xl">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px] transition-colors duration-500"
          style={{ backgroundColor: `${step.color}20` }}
        />
      </div>

      {/* Skip button */}
      <button
        onClick={() => {
          localStorage.setItem("spritelab_tutorial_complete", "true");
          onSkip();
        }}
        className="absolute top-4 right-4 p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all z-10"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="relative w-full max-w-xl mx-4">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {TUTORIAL_STEPS.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentStep
                  ? "w-8 bg-gradient-to-r from-[#00ff88] to-[#00d4ff]"
                  : index < currentStep
                  ? "bg-[#00ff88]"
                  : "bg-[#2a2a3d]"
              }`}
            />
          ))}
          <div
            className={`w-2 h-2 rounded-full transition-all ${
              showProTips ? "w-8 bg-[#ffd93d]" : "bg-[#2a2a3d]"
            }`}
          />
        </div>

        {/* Step content */}
        <div className="glass-card rounded-2xl p-6 border border-[#2a2a3d]">
          {/* Step icon */}
          <div
            className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: `${step.color}20` }}
          >
            <StepIcon className="w-8 h-8" style={{ color: step.color }} />
          </div>

          {/* Title */}
          <h2 className="text-xl font-display font-bold text-white text-center mb-2">
            {step.title}
          </h2>

          {/* Description */}
          <p className="text-[#a0a0b0] text-center mb-6">{step.content}</p>

          {/* Tips */}
          <div className="space-y-2 mb-4">
            {step.tips.map((tip, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-sm text-white/80"
              >
                <ArrowRight
                  className="w-4 h-4 flex-shrink-0 mt-0.5"
                  style={{ color: step.color }}
                />
                <span>{tip}</span>
              </div>
            ))}
          </div>

          {/* Highlight */}
          <div
            className="p-3 rounded-xl text-sm font-medium text-center"
            style={{
              backgroundColor: `${step.color}15`,
              borderColor: `${step.color}30`,
              color: step.color,
            }}
          >
            <Lightbulb className="w-4 h-4 inline mr-2" />
            {step.highlight}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            onClick={handlePrev}
            variant="ghost"
            className="text-[#a0a0b0] hover:text-white"
            disabled={currentStep === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <span className="text-sm text-[#606070]">
            {currentStep + 1} of {TUTORIAL_STEPS.length + 1}
          </span>

          <Button
            onClick={handleNext}
            className="bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-[#030305] font-bold hover:opacity-90"
          >
            {isLastStep ? "Pro Tips" : "Next"}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Hook to check if user needs the tutorial
export function useGeneratorTutorial() {
  const [showTutorial, setShowTutorial] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkTutorial = async () => {
      // Check if tutorial was completed
      const tutorialComplete = localStorage.getItem("spritelab_tutorial_complete");

      // Check if onboarding was just completed (first generation done)
      const onboardingComplete = localStorage.getItem("spritelab_onboarding_complete");

      // Only show tutorial if:
      // 1. Onboarding is complete (user did their first generation)
      // 2. Tutorial is not complete yet
      if (onboardingComplete && !tutorialComplete) {
        // Small delay to let the page render first
        setTimeout(() => {
          setShowTutorial(true);
          setIsChecking(false);
        }, 500);
      } else {
        setIsChecking(false);
      }
    };

    checkTutorial();
  }, []);

  const completeTutorial = () => {
    localStorage.setItem("spritelab_tutorial_complete", "true");
    setShowTutorial(false);
  };

  const skipTutorial = () => {
    localStorage.setItem("spritelab_tutorial_complete", "true");
    setShowTutorial(false);
  };

  return {
    showTutorial,
    isChecking,
    completeTutorial,
    skipTutorial,
  };
}
