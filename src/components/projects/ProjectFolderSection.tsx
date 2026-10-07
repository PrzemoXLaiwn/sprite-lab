"use client";

import Link from "next/link";
import { FolderOpen, Inbox, Plus, Sparkles } from "lucide-react";
import { ProjectSpriteCard } from "./ProjectSpriteCard";
import { generateHref, parseSuggestions, type ProjectAsset, type ProjectFolder } from "./types";

const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7";

export function ProjectFolderSection({
  projectId,
  folder,
  assets,
  folders,
  onMove,
  onRemove,
  onError,
}: {
  projectId: string;
  /** null → the "Unsorted" section */
  folder: ProjectFolder | null;
  assets: ProjectAsset[];
  folders: ProjectFolder[];
  onMove: (asset: ProjectAsset, folderId: string) => void;
  onRemove: (asset: ProjectAsset) => void;
  onError: (msg: string) => void;
}) {
  const suggestions = folder ? parseSuggestions(folder.suggestedAssets) : [];
  const title = folder ? folder.name : "Unsorted";
  const headingId = `folder-${folder?.id ?? "unsorted"}`;

  return (
    <section aria-labelledby={headingId} className="rounded-2xl border border-white/[0.06] bg-[#0E1016] p-4 lg:p-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.04]">
          {folder ? <FolderOpen className="h-4 w-4 text-[#FF8A3D]" /> : <Inbox className="h-4 w-4 text-[#8B93A5]" />}
        </div>
        <div className="min-w-0 flex-1">
          <h2 id={headingId} className="flex items-baseline gap-2 font-display text-[16px] font-semibold text-white">
            <span className="truncate">{title}</span>
            <span className="font-mono text-[11.5px] font-normal text-[#8B93A5]">{assets.length}</span>
          </h2>
          {folder?.description ? (
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#8B93A5]">{folder.description}</p>
          ) : !folder ? (
            <p className="mt-0.5 text-[12.5px] text-[#8B93A5]">Sprites that didn&apos;t match a folder. Move them where they belong.</p>
          ) : null}
        </div>
        {folder && (
          <Link
            href={generateHref(projectId, folder)}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 text-[12px] font-medium text-[#C9CFDB] transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#FFB27A]" />
            Generate into this folder
          </Link>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-[#7A8294]">Ideas</span>
          {suggestions.map((s, i) => (
            <Link
              key={`${s}-${i}`}
              href={generateHref(projectId, folder, s)}
              title={`Generate "${s}"`}
              className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] leading-none text-[#C9CFDB] transition-colors hover:border-[#FF8A3D]/40 hover:bg-[#FF8A3D]/10 hover:text-[#FFB27A]"
            >
              <Plus className="h-3 w-3" />
              {s}
            </Link>
          ))}
        </div>
      )}

      <div className={`mt-4 ${GRID}`}>
        {assets.map((a) => (
          <ProjectSpriteCard key={a.id} asset={a} folders={folders} onMove={onMove} onRemove={onRemove} onError={onError} />
        ))}
        {assets.length === 0 && folder && (
          <Link
            href={generateHref(projectId, folder)}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/[0.12] px-3 text-center text-[12px] text-[#8B93A5] transition-colors hover:border-[#FF8A3D]/50 hover:bg-[#FF8A3D]/[0.04] hover:text-[#FFB27A]"
          >
            <Plus className="h-4 w-4" />
            <span>
              No sprites yet — <span className="font-medium text-[#FFB27A]">Generate</span>
            </span>
          </Link>
        )}
      </div>
    </section>
  );
}
