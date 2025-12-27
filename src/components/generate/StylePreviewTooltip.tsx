"use client";

import { useState } from "react";
import type { StyleUI } from "@/config/types";

// ===========================================
// STYLE PREVIEW TOOLTIP COMPONENT
// ===========================================
// Shows a beautiful preview of the style on hover
// with color gradient, best use cases, and example

interface StylePreviewTooltipProps {
  style: StyleUI;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
}

export function StylePreviewTooltip({
  style,
  children,
  position = "top"
}: StylePreviewTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const preview = style.preview;

  // Position classes
  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  // Arrow position classes
  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-[#1a1a2e] border-x-transparent border-b-transparent",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-[#1a1a2e] border-x-transparent border-t-transparent",
    left: "left-full top-1/2 -translate-y-1/2 border-l-[#1a1a2e] border-y-transparent border-r-transparent",
    right: "right-full top-1/2 -translate-y-1/2 border-r-[#1a1a2e] border-y-transparent border-l-transparent",
  };

  if (!preview) {
    return <>{children}</>;
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}

      {/* Tooltip */}
      {isVisible && (
        <div
          className={`absolute z-50 ${positionClasses[position]} pointer-events-none`}
          style={{ width: "220px" }}
        >
          <div className="bg-[#1a1a2e] border border-[#2a2a3d] rounded-xl p-3 shadow-xl">
            {/* Color Preview Bar */}
            <div className="flex gap-1 mb-2 h-6 rounded-lg overflow-hidden">
              {preview.colors.map((color, i) => (
                <div
                  key={i}
                  className="flex-1 transition-all hover:flex-[1.5]"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            {/* Style Name */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{style.emoji}</span>
              <span className="font-semibold text-white text-sm">{style.name}</span>
            </div>

            {/* Example */}
            <p className="text-xs text-[#a0a0b0] mb-2">
              {preview.example}
            </p>

            {/* Best For Tags */}
            <div className="flex flex-wrap gap-1">
              {preview.bestFor.map((use, i) => (
                <span
                  key={i}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20"
                >
                  {use}
                </span>
              ))}
            </div>
          </div>

          {/* Arrow */}
          <div
            className={`absolute w-0 h-0 border-[6px] ${arrowClasses[position]}`}
          />
        </div>
      )}
    </div>
  );
}

// ===========================================
// STYLE BUTTON WITH PREVIEW
// ===========================================
// Complete style button with built-in preview

interface StyleButtonProps {
  style: StyleUI;
  isSelected: boolean;
  onClick: () => void;
  showPreviewOnHover?: boolean;
}

export function StyleButton({
  style,
  isSelected,
  onClick,
  showPreviewOnHover = true
}: StyleButtonProps) {
  const preview = style.preview;
  const [isHovered, setIsHovered] = useState(false);

  const button = (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative p-3 rounded-xl text-center transition-all duration-200 border overflow-hidden ${
        isSelected
          ? "border-[#00ff88] bg-[#00ff88]/10 neon-glow"
          : "border-[#2a2a3d] hover:border-[#00ff88]/50 hover:bg-white/5"
      }`}
    >
      {/* Color gradient background on hover (subtle) */}
      {preview && isHovered && !isSelected && (
        <div
          className="absolute inset-0 opacity-20 transition-opacity"
          style={{
            background: `linear-gradient(135deg, ${preview.colors.join(", ")})`,
          }}
        />
      )}

      <div className="relative z-10">
        <div className="text-2xl mb-1">{style.emoji}</div>
        <span className={`text-xs font-medium block ${isSelected ? "text-[#00ff88]" : "text-white"}`}>
          {style.name}
        </span>
        <span className="text-[10px] text-[#a0a0b0] block mt-0.5">{style.description}</span>
      </div>
    </button>
  );

  if (showPreviewOnHover && preview) {
    return (
      <StylePreviewTooltip style={style} position="top">
        {button}
      </StylePreviewTooltip>
    );
  }

  return button;
}
