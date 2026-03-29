"use client";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
      <div className="text-center">
        {/* Animated logo/loader */}
        <div className="relative w-20 h-20 mx-auto mb-4">
          <div className="absolute inset-0 bg-gradient-to-r from-[#FF6B2C] to-[#FF6B2C] rounded-full blur-xl opacity-50 animate-pulse" />
          <div className="relative w-full h-full rounded-full border-4 border-[rgba(255,255,255,0.06)] border-t-[#FF6B2C] animate-spin" />
        </div>
        <p className="text-[#a0a0b0] text-sm animate-pulse">Loading SpriteLab...</p>
      </div>
    </div>
  );
}
