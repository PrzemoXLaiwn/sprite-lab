"use client";

import { useState } from "react";
import Image from "next/image";
import { Download, Copy, RotateCcw, Scissors, ArrowUpFromLine, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface GeneratedResult {
  id: string;
  imageUrl: string;
  seed: number;
  categoryId: string;
  subcategoryId: string;
  styleId: string;
  prompt: string;
  fullPrompt?: string;
  duration?: string;
}

interface Props {
  result: GeneratedResult | null;
  isGenerating: boolean;
  bgStyle: React.CSSProperties;
  onRemix: (result: GeneratedResult) => void;
  onRemoveBg?: (imageUrl: string) => void;
  onUpscale?: (imageUrl: string) => void;
}

export function ResultPanel({ result, isGenerating, bgStyle, onRemix, onRemoveBg, onUpscale }: Props) {
  const [copied, setCopied] = useState(false);

  if (isGenerating) {
    return (
      <div className="aspect-square rounded-2xl border border-white/10 bg-white/[0.02] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-white/30">Generating...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="aspect-square rounded-2xl border border-dashed border-white/10 bg-white/[0.01] flex items-center justify-center">
        <p className="text-sm text-white/15">Your asset will appear here</p>
      </div>
    );
  }

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = result.imageUrl;
    a.download = `spritelab-${result.subcategoryId.toLowerCase()}-${result.seed}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(result.fullPrompt || result.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      {/* Image preview */}
      <div
        className="aspect-square rounded-2xl border border-white/10 overflow-hidden relative"
        style={bgStyle}
      >
        <Image
          src={result.imageUrl}
          alt={result.prompt}
          fill
          className="object-contain p-4"
          unoptimized
        />
      </div>

      {/* Metadata */}
      <div className="text-xs text-white/30 space-y-0.5 px-1">
        <p className="text-white/50 truncate">{result.prompt}</p>
        <p>
          Seed: {result.seed}
          {result.duration && <span> &middot; {result.duration}</span>}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant="outline" onClick={handleDownload} className="text-xs">
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Download
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onRemix(result)} className="text-xs">
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Remix
        </Button>
        {onRemoveBg && (
          <Button size="sm" variant="ghost" onClick={() => onRemoveBg(result.imageUrl)} className="text-xs">
            <Scissors className="w-3.5 h-3.5 mr-1.5" />
            Remove BG
          </Button>
        )}
        {onUpscale && (
          <Button size="sm" variant="ghost" onClick={() => onUpscale(result.imageUrl)} className="text-xs">
            <ArrowUpFromLine className="w-3.5 h-3.5 mr-1.5" />
            Upscale
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={handleCopyPrompt} className="text-xs">
          {copied ? (
            <><Check className="w-3.5 h-3.5 mr-1.5" />Copied</>
          ) : (
            <><Copy className="w-3.5 h-3.5 mr-1.5" />Copy Prompt</>
          )}
        </Button>
      </div>
    </div>
  );
}
