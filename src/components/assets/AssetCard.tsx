"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import {
  Check,
  Copy,
  Cuboid,
  Download,
  Edit,
  ExternalLink,
  Film,
  Gamepad2,
  Globe,
  Loader2,
  Maximize2,
  Paintbrush,
  Share2,
  Shuffle,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { GenerationFeedback } from "@/components/analytics/GenerationFeedback";
import {
  CHECKER_STYLE,
  cleanPrompt,
  formatLabel,
  get3DFormat,
  getModelName,
  isAsset3D,
  isPixelStyleId,
  openTool,
  remix,
  type AssetActions,
  type Generation,
  type PendingJob,
} from "./asset-utils";

// ===========================================
// SMALL PRIMITIVES
// ===========================================
export function Chip({ children, accent = false }: { children: ReactNode; accent?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[11px] font-medium leading-none ${
        accent
          ? "border-[#FF8A3D]/25 bg-[#FF8A3D]/10 text-[#FFB27A]"
          : "border-white/[0.08] bg-white/[0.04] text-[#C9CFDB]"
      }`}
    >
      {children}
    </span>
  );
}

function IconAction({
  title,
  onClick,
  children,
  danger = false,
  active = false,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`flex h-8 w-8 items-center justify-center rounded-lg border backdrop-blur-md transition-colors ${
        danger
          ? "border-white/[0.1] bg-black/50 text-[#C9CFDB] hover:border-red-400/30 hover:bg-red-500/20 hover:text-red-200"
          : active
          ? "border-[#FF8A3D]/40 bg-[#FF8A3D]/20 text-[#FFB27A] hover:bg-[#FF8A3D]/30"
          : "border-white/[0.1] bg-black/50 text-[#ECEEF3] hover:bg-white/[0.15] hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

/** Image (or 3D placeholder) on a checkerboard. Fills its parent. */
export function AssetMedia({
  gen,
  sizes,
  padding = "p-4",
}: {
  gen: Generation;
  sizes: string;
  padding?: string;
}) {
  if (isAsset3D(gen)) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04]">
          <Cuboid className="h-6 w-6 text-[#FF8A3D]" />
        </div>
        <span className="font-mono text-[11px] font-semibold text-[#C9CFDB]">{get3DFormat(gen.imageUrl)} model</span>
      </div>
    );
  }
  return (
    <Image
      src={gen.imageUrl}
      alt={cleanPrompt(gen.prompt)}
      fill
      sizes={sizes}
      className={`object-contain ${padding} ${isPixelStyleId(gen.styleId) ? "pixel-perfect" : ""}`}
      loading="lazy"
    />
  );
}

/** The 2D tool actions (edit / inpaint / upscale / variations / test / remix). */
export function getToolActions(gen: Generation, actions: AssetActions) {
  return [
    { key: "animate", label: "Animate", icon: Film, run: () => openTool("animate", gen.id) },
    { key: "edit", label: "Edit", icon: Edit, run: () => openTool("edit", gen.id) },
    { key: "inpaint", label: "Inpaint", icon: Paintbrush, run: () => actions.onInpaint(gen) },
    { key: "upscale", label: "Upscale", icon: Maximize2, run: () => openTool("upscale", gen.id) },
    { key: "variations", label: "Variations", icon: Shuffle, run: () => openTool("variations", gen.id) },
    { key: "test", label: "Test sprite", icon: Gamepad2, run: () => actions.onPlayground(gen) },
    { key: "remix", label: "Remix prompt", icon: Wand2, run: () => remix(gen) },
  ];
}

// ===========================================
// GRID CARD
// ===========================================
export function AssetCard({
  gen,
  actions,
  selectMode,
  selected,
  onToggleSelect,
  onOpen,
  copied,
  onCopySeed,
}: {
  gen: Generation;
  actions: AssetActions;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onOpen: (gen: Generation) => void;
  copied: boolean;
  onCopySeed: (seed: number, id: string) => void;
}) {
  const is3D = isAsset3D(gen);
  const tools = getToolActions(gen, actions);

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border bg-[#151922] transition-all ${
        selected ? "border-[#FF8A3D] ring-2 ring-[#FF8A3D]/25" : "border-white/[0.08] hover:border-white/20"
      } ${selectMode ? "cursor-pointer" : ""}`}
      onClick={() => selectMode && onToggleSelect(gen.id)}
    >
      {/* Preview */}
      <div
        className={`relative aspect-square overflow-hidden bg-[#0E1016] ${selectMode ? "" : "cursor-zoom-in"}`}
        style={CHECKER_STYLE}
        onClick={() => !selectMode && onOpen(gen)}
      >
        <div className="absolute inset-0 transition-transform duration-300 group-hover:scale-[1.03]">
          <AssetMedia gen={gen} sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1536px) 25vw, 20vw" />
        </div>

        {/* Badges */}
        <div className="absolute left-2.5 top-2.5 z-10 flex gap-1.5">
          {is3D && (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.1] bg-black/55 px-2 py-1 font-mono text-[10.5px] font-semibold text-white backdrop-blur-md">
              <Cuboid className="h-3 w-3 text-[#FF8A3D]" /> {get3DFormat(gen.imageUrl)}
            </span>
          )}
          {gen.isPublic && (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.1] bg-black/55 px-2 py-1 font-mono text-[10.5px] font-semibold text-white backdrop-blur-md">
              <Globe className="h-3 w-3 text-[#FF8A3D]" /> Shared
            </span>
          )}
        </div>

        {selectMode ? (
          <button
            type="button"
            aria-label={selected ? "Deselect" : "Select"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(gen.id);
            }}
            className={`absolute right-2.5 top-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-lg border transition-all ${
              selected
                ? "border-[#FF8A3D] bg-[#FF8A3D] text-black"
                : "border-white/30 bg-black/50 text-transparent backdrop-blur-md hover:border-white/60"
            }`}
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </button>
        ) : (
          <>
            {/* Quick actions */}
            <div className="absolute right-2.5 top-2.5 z-10 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <IconAction
                title={gen.isPublic ? "Remove from Community" : "Share to Community"}
                onClick={() => actions.onToggleShare(gen)}
                active={gen.isPublic}
              >
                {gen.isPublic ? <Globe className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
              </IconAction>
              <IconAction title="Download" onClick={() => actions.onDownload(gen)}>
                <Download className="h-3.5 w-3.5" />
              </IconAction>
              <IconAction title="Delete" onClick={() => actions.onDelete(gen.id)} danger>
                <Trash2 className="h-3.5 w-3.5" />
              </IconAction>
            </div>

            {/* Hover overlay */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-3 pb-3 pt-12 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              <p className="line-clamp-2 text-[12px] leading-snug text-[#ECEEF3]">{cleanPrompt(gen.prompt)}</p>
              <div className="pointer-events-auto mt-2.5 flex flex-wrap gap-1.5">
                {!is3D &&
                  tools.map((t) => (
                    <IconAction key={t.key} title={t.label} onClick={t.run}>
                      <t.icon className="h-3.5 w-3.5" />
                    </IconAction>
                  ))}
                <IconAction title="Open in new tab" onClick={() => window.open(gen.imageUrl, "_blank")}>
                  <ExternalLink className="h-3.5 w-3.5" />
                </IconAction>
              </div>
              {is3D && (
                <p className="mt-2 text-[11px] text-[#8B93A5]">
                  Download {get3DFormat(gen.imageUrl)} for Unity, Unreal, Blender, Godot
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Info */}
      <div className="space-y-2 px-3 pb-2.5 pt-3">
        <p className="truncate text-[13px] font-medium text-[#ECEEF3]" title={cleanPrompt(gen.prompt)}>
          {cleanPrompt(gen.prompt)}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Chip>{formatLabel(gen.categoryId)}</Chip>
          <Chip>{is3D ? `${get3DFormat(gen.imageUrl)} · ${getModelName(gen.styleId)}` : getModelName(gen.styleId)}</Chip>
        </div>
        <div className="flex items-center justify-between gap-2 text-[11px] text-[#8B93A5]">
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 font-mono">{new Date(gen.createdAt).toLocaleDateString()}</span>
            {gen.seed != null && gen.seed !== 0 && (
              <button
                type="button"
                title="Copy seed"
                onClick={(e) => {
                  e.stopPropagation();
                  onCopySeed(gen.seed!, gen.id);
                }}
                className="flex min-w-0 items-center gap-1 rounded-md px-1 py-0.5 font-mono text-[#7A8294] transition-colors hover:bg-white/[0.06] hover:text-[#C9CFDB]"
              >
                <span className="truncate">#{gen.seed}</span>
                {copied ? <Check className="h-3 w-3 shrink-0 text-[#FF8A3D]" /> : <Copy className="h-3 w-3 shrink-0" />}
              </button>
            )}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <GenerationFeedback generationId={gen.id} compact />
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================
// LIST ROW
// ===========================================
export function AssetRow({
  gen,
  actions,
  selectMode,
  selected,
  onToggleSelect,
  onOpen,
  copied,
  onCopySeed,
}: {
  gen: Generation;
  actions: AssetActions;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onOpen: (gen: Generation) => void;
  copied: boolean;
  onCopySeed: (seed: number, id: string) => void;
}) {
  const is3D = isAsset3D(gen);

  return (
    <div
      onClick={() => (selectMode ? onToggleSelect(gen.id) : onOpen(gen))}
      className={`group flex cursor-pointer items-center gap-3 rounded-2xl border bg-[#151922] p-2.5 pr-3 transition-all sm:gap-4 ${
        selected ? "border-[#FF8A3D] ring-2 ring-[#FF8A3D]/25" : "border-white/[0.08] hover:border-white/20 hover:bg-[#1A1F2A]"
      }`}
    >
      {selectMode && (
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
            selected ? "border-[#FF8A3D] bg-[#FF8A3D] text-black" : "border-white/30 text-transparent"
          }`}
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      )}
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#0E1016]" style={CHECKER_STYLE}>
        {is3D ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Cuboid className="h-6 w-6 text-[#FF8A3D]" />
          </div>
        ) : (
          <AssetMedia gen={gen} sizes="64px" padding="p-1.5" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-[#ECEEF3]">{cleanPrompt(gen.prompt)}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Chip>{formatLabel(gen.categoryId)}</Chip>
          <Chip>{is3D ? `${get3DFormat(gen.imageUrl)} · ${getModelName(gen.styleId)}` : getModelName(gen.styleId)}</Chip>
          {gen.isPublic && (
            <Chip accent>
              <Globe className="h-3 w-3" /> Shared
            </Chip>
          )}
          <span className="font-mono text-[11px] text-[#7A8294]">{new Date(gen.createdAt).toLocaleDateString()}</span>
          {gen.seed != null && gen.seed !== 0 && (
            <button
              type="button"
              title="Copy seed"
              onClick={(e) => {
                e.stopPropagation();
                onCopySeed(gen.seed!, gen.id);
              }}
              className="hidden items-center gap-1 rounded-md px-1 py-0.5 font-mono text-[11px] text-[#7A8294] transition-colors hover:bg-white/[0.06] hover:text-[#C9CFDB] sm:flex"
            >
              #{gen.seed}
              {copied ? <Check className="h-3 w-3 text-[#FF8A3D]" /> : <Copy className="h-3 w-3" />}
            </button>
          )}
        </div>
      </div>

      {!selectMode && (
        <div className="hidden shrink-0 items-center gap-1.5 sm:flex" onClick={(e) => e.stopPropagation()}>
          <GenerationFeedback generationId={gen.id} compact />
          <span className="mx-1 h-5 w-px bg-white/[0.08]" />
          <RowButton title={gen.isPublic ? "Remove from Community" : "Share to Community"} onClick={() => actions.onToggleShare(gen)} active={gen.isPublic}>
            {gen.isPublic ? <Globe className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
          </RowButton>
          <RowButton title="Download" onClick={() => actions.onDownload(gen)}>
            <Download className="h-4 w-4" />
          </RowButton>
          <RowButton title="Delete" onClick={() => actions.onDelete(gen.id)} danger>
            <Trash2 className="h-4 w-4" />
          </RowButton>
        </div>
      )}
    </div>
  );
}

function RowButton({
  title,
  onClick,
  children,
  danger = false,
  active = false,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
        danger
          ? "text-[#8B93A5] hover:bg-red-500/10 hover:text-red-300"
          : active
          ? "bg-[#FF8A3D]/10 text-[#FFB27A] hover:bg-[#FF8A3D]/20"
          : "text-[#8B93A5] hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

// ===========================================
// PENDING JOB CARD
// ===========================================
export function PendingJobCard({ job, onCancel }: { job: PendingJob; onCancel: (id: string) => void }) {
  const processing = job.status === "processing";
  return (
    <div className="overflow-hidden rounded-2xl border border-[#FF8A3D]/30 bg-[#151922]">
      <div className="relative flex aspect-square items-center justify-center bg-[#0E1016]" style={CHECKER_STYLE}>
        <div className="absolute left-2.5 top-2.5 flex gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 font-mono text-[10.5px] font-semibold ${
              processing
                ? "border-[#FF8A3D]/30 bg-[#FF8A3D]/15 text-[#FFB27A]"
                : "border-white/[0.1] bg-white/[0.06] text-[#C9CFDB]"
            }`}
          >
            <Loader2 className="h-3 w-3 animate-spin" />
            {processing ? "Processing" : "Queued"}
          </span>
          {job.mode === "3d" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.1] bg-white/[0.06] px-2 py-1 font-mono text-[10.5px] font-semibold text-[#C9CFDB]">
              <Cuboid className="h-3 w-3 text-[#FF8A3D]" /> 3D
            </span>
          )}
        </div>

        {job.status === "pending" && (
          <button
            type="button"
            onClick={() => onCancel(job.id)}
            title="Cancel and refund credits"
            aria-label="Cancel and refund credits"
            className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.1] bg-black/40 text-[#C9CFDB] transition-colors hover:border-red-400/30 hover:bg-red-500/20 hover:text-red-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        <div className="w-full px-6 text-center">
          <div className="mx-auto mb-4 h-16 w-16">
            <Image
              src="/coreling-working.png"
              alt="Generating"
              width={64}
              height={64}
              className="h-full w-full animate-bounce object-contain"
              style={{ animationDuration: "1.5s" }}
            />
          </div>
          <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] transition-all duration-500"
              style={{ width: `${job.progress}%` }}
            />
          </div>
          <p className="font-mono text-[11px] text-[#8B93A5]">{job.progressMessage || "Waiting..."}</p>
        </div>
      </div>
      <div className="px-3 pb-3 pt-3">
        <p className="truncate text-[13px] font-medium text-[#ECEEF3]">{job.prompt}</p>
        <div className="mt-1 flex items-center justify-between font-mono text-[11px] text-[#8B93A5]">
          <span>{job.mode === "3d" ? "3D Model" : "2D Sprite"}</span>
          <span>{job.creditsUsed} credits</span>
        </div>
      </div>
    </div>
  );
}
