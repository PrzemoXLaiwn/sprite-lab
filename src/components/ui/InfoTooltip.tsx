"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";

interface InfoTooltipProps {
  title: string;
  content: string;
  tips?: string[];
  example?: string;
}

export function InfoTooltip({ title, content, tips, example }: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Info button */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-5 h-5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#00d4ff]/50 flex items-center justify-center transition-all group"
        title={`Info about ${title}`}
      >
        <Info className="w-3 h-3 text-[#606070] group-hover:text-[#00d4ff] transition-colors" />
      </button>

      {/* Modal overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#030305]/80 backdrop-blur-sm p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-md bg-[#0a0a0f] border border-[#2a2a3d] rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-1 text-[#606070] hover:text-white hover:bg-white/10 rounded-lg transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#00d4ff]/10 flex items-center justify-center">
                <Info className="w-5 h-5 text-[#00d4ff]" />
              </div>
              <h3 className="text-lg font-display font-bold text-white">{title}</h3>
            </div>

            {/* Content */}
            <p className="text-[#a0a0b0] mb-4">{content}</p>

            {/* Tips */}
            {tips && tips.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-white mb-2">Tips:</h4>
                <ul className="space-y-1.5">
                  {tips.map((tip, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-[#a0a0b0]">
                      <span className="text-[#00ff88] mt-1">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Example */}
            {example && (
              <div className="p-3 rounded-xl bg-[#00ff88]/5 border border-[#00ff88]/20">
                <h4 className="text-xs font-semibold text-[#00ff88] mb-1">Example:</h4>
                <p className="text-sm text-white font-mono">{example}</p>
              </div>
            )}

            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="mt-4 w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Pre-defined info content for generator sections
export const GENERATOR_INFO = {
  outputType: {
    title: "Output Type",
    content: "Choose between 2D sprites (PNG images) or 3D models (GLB files) for your game assets.",
    tips: [
      "2D Sprites are perfect for platformers, RPGs, and mobile games",
      "3D Models work great for Unity, Unreal, and Godot 3D projects",
      "2D costs 1 credit, 3D costs 4 credits",
      "3D models come with textures and are game-ready",
    ],
  },
  category: {
    title: "Category",
    content: "Select the type of game asset you want to create. Each category has specialized AI prompts optimized for that type of content.",
    tips: [
      "Categories with purple badges support both 2D and 3D",
      "Each category has subcategories for more specific results",
      "The AI uses different techniques for each category",
      "Characters and Creatures work best with clear descriptions",
    ],
  },
  subcategory: {
    title: "Asset Type",
    content: "Narrow down your selection to get more accurate results. The AI is trained to understand specific asset types.",
    tips: [
      "More specific = better results",
      "Check the example prompts for inspiration",
      "You can click examples to auto-fill your description",
    ],
  },
  artStyle: {
    title: "Art Style",
    content: "Choose the visual style that matches your game's aesthetic. Each style uses different AI models and techniques.",
    tips: [
      "Pixel Art 16-bit - Classic retro look (SNES era)",
      "Pixel Art HD - Modern pixel art with more detail",
      "Hand Painted - Hollow Knight / indie game style",
      "Vector - Clean lines, great for mobile games",
      "Isometric - Perfect for strategy and city builders",
      "Anime/Chibi - Japanese game aesthetics",
    ],
    example: "Try different styles with the same prompt to see which fits your game best!",
  },
  premiumFeatures: {
    title: "Premium Features",
    content: "Advanced options to customize your generation. These features give you more control over the output.",
    tips: [
      "Style Mixing - Blend two art styles together (e.g., 70% Pixel + 30% Hand Painted)",
      "Color Palettes - Restrict colors to specific themes (Retro, Neon, Pastel, etc.)",
      "These features don't cost extra credits",
    ],
  },
  prompt: {
    title: "Asset Description",
    content: "Describe what you want the AI to create. Be specific about appearance, materials, effects, and style.",
    tips: [
      "Start with the main object: 'sword', 'potion', 'knight'",
      "Add materials: 'golden', 'crystal', 'wooden', 'iron'",
      "Add effects: 'glowing', 'flaming', 'frozen', 'magical'",
      "Add style: 'ancient', 'futuristic', 'cursed', 'holy'",
      "Add details: 'with ruby gems', 'wrapped in vines', 'battle-worn'",
    ],
    example: "ancient elven sword with glowing blue runes, silver blade, golden hilt wrapped in leather",
  },
  seed: {
    title: "Seed Number",
    content: "A seed is a number that controls the randomness of generation. Using the same seed with the same prompt will produce similar results.",
    tips: [
      "Leave empty for random results each time",
      "Note down seeds of results you like",
      "Use the same seed + tweaked prompt to refine results",
      "Seeds range from 0 to 2,147,483,647",
    ],
    example: "Seed: 12345678 + 'red sword' → always produces similar red sword",
  },
  model3D: {
    title: "3D Model Type",
    content: "Choose the 3D generation model. Different models produce different quality and style outputs.",
    tips: [
      "Meshy is great for game-ready low-poly models",
      "Output is GLB format, compatible with all game engines",
      "Models include basic textures",
    ],
  },
};
