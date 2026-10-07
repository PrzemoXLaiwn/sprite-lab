"use client";

import Link from "next/link";
import { Palette, Sparkles } from "lucide-react";

export default function PresetsPage() {
  return (
    <div className="mx-auto max-w-[1100px] px-5 py-6 lg:px-8">
      <div className="mb-6">
        <h1 className="font-display text-[22px] font-semibold tracking-tight text-white">Style presets</h1>
        <p className="mt-1 max-w-xl text-[13px] text-[#8B93A5]">
          Save style configurations to generate consistent assets across your
          entire game project.
        </p>
      </div>

      <div className="pixel-grid flex flex-col items-center rounded-2xl border border-dashed border-white/[0.08] bg-[#0E1016] px-6 py-14 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.06] bg-[#151922]">
          <Palette className="h-5 w-5 text-[#7A8294]" />
        </div>
        <span className="mb-3 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-[#C9CFDB]">
          coming soon
        </span>
        <h2 className="text-[15px] font-semibold text-white">Lock in your game&apos;s look</h2>
        <p className="mt-1.5 max-w-md text-[13px] text-[#8B93A5]">
          Create style presets to lock in your art style, quality level, and
          color palette. Generate hundreds of assets that all look like they
          belong in the same game.
        </p>
        <Link
          href="/generate"
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-[13px] font-medium text-[#C9CFDB] transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <Sparkles className="h-4 w-4 text-[#FF8A3D]" /> Open the generator
        </Link>
      </div>
    </div>
  );
}
