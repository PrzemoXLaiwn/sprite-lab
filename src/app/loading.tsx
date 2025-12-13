"use client";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#030305] flex items-center justify-center">
      <div className="text-center">
        {/* Animated logo/loader */}
        <div className="relative w-20 h-20 mx-auto mb-4">
          <div className="absolute inset-0 bg-gradient-to-r from-[#00ff88] to-[#00d4ff] rounded-full blur-xl opacity-50 animate-pulse" />
          <div className="relative w-full h-full rounded-full border-4 border-[#2a2a3d] border-t-[#00ff88] animate-spin" />
        </div>
        <p className="text-[#a0a0b0] text-sm animate-pulse">Loading SpriteLab...</p>
      </div>
    </div>
  );
}
