"use client";

import { useEffect, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Cuboid,
  Download,
  ExternalLink,
  Globe,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { GenerationFeedback } from "@/components/analytics/GenerationFeedback";
import { AssetMedia, Chip, getToolActions } from "./AssetCard";
import {
  CHECKER_STYLE,
  cleanPrompt,
  formatLabel,
  get3DFormat,
  getModelName,
  isAsset3D,
  type AssetActions,
  type Generation,
} from "./asset-utils";

/**
 * Large preview of one asset with every action available — the touch-friendly
 * counterpart of the grid card's hover overlay. ←/→ step through the current
 * (filtered) list, Esc closes.
 */
export function AssetPreviewModal({
  gen,
  actions,
  onClose,
  onPrev,
  onNext,
}: {
  gen: Generation;
  actions: AssetActions;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const [copied, setCopied] = useState<"prompt" | "seed" | null>(null);
  const is3D = isAsset3D(gen);
  const tools = getToolActions(gen, actions);
  const prompt = cleanPrompt(gen.prompt);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && onPrev) onPrev();
      else if (e.key === "ArrowRight" && onNext) onNext();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, onPrev, onNext]);

  const copy = (what: "prompt" | "seed", text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(what);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Asset preview"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-[1100px] flex-col overflow-hidden rounded-t-3xl border border-white/[0.08] bg-[#19223F] shadow-2xl sm:rounded-3xl lg:flex-row"
      >
        {/* Canvas */}
        <div className="relative min-h-[300px] flex-1 bg-[#131A31] lg:min-h-[560px]" style={CHECKER_STYLE}>
          <AssetMedia gen={gen} sizes="(max-width: 1024px) 100vw, 720px" padding="p-8 sm:p-12" />
          {is3D && (
            <p className="absolute inset-x-0 bottom-6 text-center text-[12px] text-[#9AA1CC]">
              Download {get3DFormat(gen.imageUrl)} for Unity, Unreal, Blender, Godot
            </p>
          )}
          {onPrev && (
            <button
              type="button"
              onClick={onPrev}
              aria-label="Previous asset"
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl border border-white/[0.1] bg-black/50 text-[#C8CCE8] backdrop-blur-md transition-colors hover:bg-white/[0.12] hover:text-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {onNext && (
            <button
              type="button"
              onClick={onNext}
              aria-label="Next asset"
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl border border-white/[0.1] bg-black/50 text-[#C8CCE8] backdrop-blur-md transition-colors hover:bg-white/[0.12] hover:text-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Details */}
        <aside className="flex w-full flex-col border-t border-white/[0.06] lg:w-[360px] lg:border-l lg:border-t-0">
          <div className="flex items-center justify-between px-5 pb-3 pt-4">
            <span className="text-[12.5px] text-[#9AA1CC] font-semibold">Asset details</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9AA1CC] transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 pb-5">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[12px] font-medium text-[#C8CCE8]">Prompt</span>
                <button
                  type="button"
                  onClick={() => copy("prompt", prompt)}
                  className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-[#9AA1CC] transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  {copied === "prompt" ? <Check className="h-3 w-3 text-[#FFA300]" /> : <Copy className="h-3 w-3" />}
                  {copied === "prompt" ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="rounded-xl border border-white/[0.08] bg-[#212B4E] px-3.5 py-3 text-[13px] leading-relaxed text-[#FFF1E8]">
                {prompt}
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Chip>{formatLabel(gen.categoryId)}</Chip>
              {gen.subcategoryId && <Chip>{formatLabel(gen.subcategoryId)}</Chip>}
              <Chip>{is3D ? `${get3DFormat(gen.imageUrl)} · ${getModelName(gen.styleId)}` : getModelName(gen.styleId)}</Chip>
              {is3D && (
                <Chip accent>
                  <Cuboid className="h-3 w-3" /> 3D
                </Chip>
              )}
              {gen.isPublic && (
                <Chip accent>
                  <Globe className="h-3 w-3" /> Shared
                </Chip>
              )}
            </div>

            <dl className="space-y-2 rounded-xl border border-white/[0.06] px-3.5 py-3 text-[12px]">
              <div className="flex items-center justify-between">
                <dt className="text-[#9AA1CC]">Created</dt>
                <dd className="font-mono text-[#C8CCE8]">{new Date(gen.createdAt).toLocaleString()}</dd>
              </div>
              {!!gen.seed && (
                <div className="flex items-center justify-between">
                  <dt className="text-[#9AA1CC]">Seed</dt>
                  <dd>
                    <button
                      type="button"
                      onClick={() => copy("seed", String(gen.seed))}
                      className="flex items-center gap-1.5 rounded-md px-1 font-mono text-[#C8CCE8] transition-colors hover:bg-white/[0.06] hover:text-white"
                    >
                      {gen.seed}
                      {copied === "seed" ? <Check className="h-3 w-3 text-[#FFA300]" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </dd>
                </div>
              )}
              <div className="flex items-center justify-between">
                <dt className="text-[#9AA1CC]">Rate result</dt>
                <dd>
                  <GenerationFeedback generationId={gen.id} compact />
                </dd>
              </div>
            </dl>

            {!is3D && (
              <div>
                <span className="mb-2 block text-[12px] font-medium text-[#C8CCE8]">Tools</span>
                <div className="grid grid-cols-2 gap-2">
                  {tools.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={t.run}
                      className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#212B4E] px-3 py-2.5 text-[12.5px] font-medium text-[#C8CCE8] transition-colors hover:border-white/20 hover:bg-[#263260] hover:text-white"
                    >
                      <t.icon className="h-4 w-4 text-[#FFA300]" />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex items-center gap-2 border-t border-white/[0.06] px-5 py-4">
            <button
              type="button"
              onClick={() => actions.onDownload(gen)}
              className="px-corners flex h-10 flex-1 items-center justify-center gap-2 bg-[#FFA300] text-[13px] font-semibold text-[#131A31] transition hover:bg-[#FFB733]"
            >
              <Download className="h-4 w-4" /> Download
            </button>
            <button
              type="button"
              onClick={() => actions.onToggleShare(gen)}
              title={gen.isPublic ? "Remove from Community" : "Share to Community"}
              aria-label={gen.isPublic ? "Remove from Community" : "Share to Community"}
              className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
                gen.isPublic
                  ? "border-[#FFA300]/40 bg-[#FFA300]/10 text-[#FFC857] hover:bg-[#FFA300]/20"
                  : "border-white/[0.1] bg-white/[0.04] text-[#C8CCE8] hover:bg-white/[0.08]"
              }`}
            >
              {gen.isPublic ? <Globe className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => window.open(gen.imageUrl, "_blank")}
              title="Open in new tab"
              aria-label="Open in new tab"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] text-[#C8CCE8] transition-colors hover:bg-white/[0.08]"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => actions.onDelete(gen.id)}
              title="Delete"
              aria-label="Delete"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] text-[#C8CCE8] transition-colors hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-200"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
