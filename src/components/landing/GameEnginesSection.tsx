"use client";

import { Gamepad2 } from "lucide-react";

const ENGINES = [
  {
    name: "Unity",
    description: "Drag & drop ready",
    logo: (
      <svg viewBox="0 0 24 24" className="w-10 h-10" fill="currentColor">
        <path d="M10.4 17.8l-7.2-4.2 1.2-2.4 5.4 1.2 2.4-4.2-2.4-4.2-5.4 1.2L3.2 2.8l7.2-4.2 2.4 6 4.8 0 2.4-6 7.2 4.2-1.2 2.4-5.4-1.2-2.4 4.2 2.4 4.2 5.4-1.2 1.2 2.4-7.2 4.2-2.4-6-4.8 0z" />
      </svg>
    ),
  },
  {
    name: "Godot",
    description: "Import directly",
    logo: (
      <svg viewBox="0 0 24 24" className="w-10 h-10" fill="currentColor">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm0 2c5.5 0 10 4.5 10 10s-4.5 10-10 10S2 17.5 2 12 6.5 2 12 2zm-3 5c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2s2-.9 2-2V9c0-1.1-.9-2-2-2zm6 0c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2s2-.9 2-2V9c0-1.1-.9-2-2-2zm-3 7c-2.2 0-4 1.3-4 3h8c0-1.7-1.8-3-4-3z" />
      </svg>
    ),
  },
  {
    name: "Unreal",
    description: "PBR materials",
    logo: (
      <svg viewBox="0 0 24 24" className="w-10 h-10" fill="currentColor">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm0 2.5c5.2 0 9.5 4.3 9.5 9.5s-4.3 9.5-9.5 9.5S2.5 17.2 2.5 12 6.8 2.5 12 2.5zm-1 4v7l5-3.5-5-3.5z" />
      </svg>
    ),
  },
  {
    name: "Roblox",
    description: "Studio ready",
    logo: (
      <svg viewBox="0 0 24 24" className="w-10 h-10" fill="currentColor">
        <path d="M5.164 0L0 18.836 18.836 24 24 5.164 5.164 0zm8.746 14.254l-4.164-1.09 1.09-4.164 4.164 1.09-1.09 4.164z" />
      </svg>
    ),
  },
  {
    name: "GameMaker",
    description: "Sprite sheets",
    logo: (
      <svg viewBox="0 0 24 24" className="w-10 h-10" fill="currentColor">
        <path d="M12 0L1.5 6v12L12 24l10.5-6V6L12 0zm0 2.5l8 4.6v9.2l-8 4.6-8-4.6V7.1l8-4.6zm-4.5 7v5l4.5 2.6 4.5-2.6v-5L12 7l-4.5 2.5z" />
      </svg>
    ),
  },
  {
    name: "Blender",
    description: "3D import",
    logo: (
      <svg viewBox="0 0 24 24" className="w-10 h-10" fill="currentColor">
        <path d="M12.5 3L4 9.5l3.5 3-3.5 3L12.5 21l8.5-6-3.5-3 3.5-3L12.5 3zm0 3l5.5 4-5.5 4-5.5-4 5.5-4z" />
      </svg>
    ),
  },
];

export function GameEnginesSection() {
  return (
    <section className="py-20 bg-card/30 border-y border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Gamepad2 className="w-4 h-4" />
            Universal Compatibility
          </div>
          <h2 className="text-3xl font-bold mb-4">
            Works With Your Favorite Engine
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            PNG with transparent background. GLB/OBJ for 3D. Drag & drop ready for any game engine.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
          {ENGINES.map((engine) => (
            <div
              key={engine.name}
              className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all text-center"
            >
              <div className="text-muted-foreground group-hover:text-primary transition-colors mb-3 flex justify-center">
                {engine.logo}
              </div>
              <h3 className="font-semibold mb-1">{engine.name}</h3>
              <p className="text-xs text-muted-foreground">{engine.description}</p>
            </div>
          ))}
        </div>

        {/* Formats */}
        <div className="mt-12 flex flex-wrap justify-center gap-4">
          <div className="px-4 py-2 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] text-sm font-medium">
            PNG (Transparent)
          </div>
          <div className="px-4 py-2 rounded-full bg-[#c084fc]/10 border border-[#c084fc]/30 text-[#c084fc] text-sm font-medium">
            GLB / GLTF
          </div>
          <div className="px-4 py-2 rounded-full bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff] text-sm font-medium">
            OBJ / PLY
          </div>
          <div className="px-4 py-2 rounded-full bg-[#ffd93d]/10 border border-[#ffd93d]/30 text-[#ffd93d] text-sm font-medium">
            Commercial License
          </div>
        </div>
      </div>
    </section>
  );
}
