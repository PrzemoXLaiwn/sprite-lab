"use client";

import { useState } from "react";
import { FileBox, Cuboid, Check, Play, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Model3DViewerProps {
  modelUrl: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  format: string;
  compact?: boolean;
  onDownload?: () => void;
}

export function Model3DViewer({
  modelUrl,
  thumbnailUrl,
  videoUrl,
  format,
  compact = false,
  onDownload
}: Model3DViewerProps) {
  const [showVideo, setShowVideo] = useState(false);

  if (compact) {
    // Compact view for gallery grid
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center relative">
        {/* Thumbnail background */}
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
          <div className="absolute inset-0 overflow-hidden bg-black/50">
            <video
              src={videoUrl}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-contain"
            />
          </div>
        )}

        {/* Content Overlay */}
        <div className="relative z-10">
          <div className="relative mb-3">
            <div className="absolute inset-0 bg-[#c084fc]/30 rounded-full blur-xl animate-pulse" />
            <FileBox className="relative w-12 h-12 text-[#c084fc]" />
          </div>

          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#c084fc]/20 border border-[#c084fc]/40 mb-2">
            <Cuboid className="w-3 h-3 text-[#c084fc]" />
            <span className="text-[#c084fc] font-mono font-bold text-xs">{format}</span>
          </div>

          {/* Video toggle button - only if video available */}
          {videoUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowVideo(!showVideo);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs transition-colors mx-auto mt-2"
            >
              <Play className="w-3 h-3" />
              {showVideo ? "Hide" : "Preview"}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Full view (for generate page and modal)
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
            playsInline
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

        {/* Action buttons */}
        <div className="flex items-center gap-2 justify-center mb-4">
          {videoUrl && (
            <button
              onClick={() => setShowVideo(!showVideo)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
            >
              <Play className="w-4 h-4" />
              {showVideo ? "Hide Preview" : "Show 360° Preview"}
            </button>
          )}

          {onDownload && (
            <Button
              onClick={onDownload}
              className="bg-[#c084fc] hover:bg-[#a855f7] text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Download {format}
            </Button>
          )}
        </div>

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

export default Model3DViewer;
