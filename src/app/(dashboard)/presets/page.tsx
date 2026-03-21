"use client";

import { Palette } from "lucide-react";

export default function PresetsPage() {
  return (
    <div className="min-h-screen p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Style Presets</h1>
        <p className="text-white/50 text-sm">
          Save style configurations to generate consistent assets across your
          entire game project.
        </p>
      </div>

      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
          <Palette className="w-8 h-8 text-white/20" />
        </div>
        <h2 className="text-lg font-semibold text-white/60 mb-2">
          Coming Soon
        </h2>
        <p className="text-sm text-white/30 max-w-md mx-auto">
          Create style presets to lock in your art style, quality level, and
          color palette. Generate hundreds of assets that all look like they
          belong in the same game.
        </p>
      </div>
    </div>
  );
}
