"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Download, FolderInput, Check, X } from "lucide-react";
import { isPixelStyleId } from "@/lib/client/sprite-native";
import { saveBlob, spriteFilename } from "./pack";
import type { ProjectAsset, ProjectFolder } from "./types";

const CHECKER = {
  backgroundImage: "repeating-conic-gradient(#80808015 0% 25%, transparent 0% 50%)",
  backgroundSize: "24px 24px",
};

const iconBtn =
  "flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-[#0E1016]/90 text-[#C9CFDB] backdrop-blur transition-colors hover:bg-[#1A1F2A] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8A3D]/60";

export function ProjectSpriteCard({
  asset,
  folders,
  onMove,
  onRemove,
  onError,
}: {
  asset: ProjectAsset;
  folders: ProjectFolder[];
  onMove: (asset: ProjectAsset, folderId: string) => void;
  onRemove: (asset: ProjectAsset) => void;
  onError: (msg: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pixel = isPixelStyleId(asset.styleId);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [menuOpen]);

  const download = async () => {
    setDownloading(true);
    try {
      const res = await fetch(asset.imageUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      saveBlob(await res.blob(), spriteFilename(asset));
    } catch {
      onError("Couldn't download that sprite — opening it in a new tab instead.");
      window.open(asset.imageUrl, "_blank", "noopener");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      tabIndex={0}
      aria-label={asset.prompt}
      className={`group relative aspect-square rounded-xl border border-white/[0.08] bg-[#151922] transition-colors hover:border-white/20 focus-visible:border-[#FF8A3D]/60 focus-visible:outline-none ${menuOpen ? "z-20" : ""}`}
    >
      <div className="absolute inset-0 overflow-hidden rounded-xl" style={CHECKER}>
        <Image
          src={asset.imageUrl}
          alt={asset.prompt}
          fill
          unoptimized
          loading="lazy"
          sizes="200px"
          className={`object-contain p-2 ${pixel ? "pixel-perfect" : ""}`}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-6 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <p className="line-clamp-2 text-[11px] leading-snug text-[#ECEEF3]">{asset.prompt}</p>
        </div>
      </div>

      <div
        className={`absolute right-1.5 top-1.5 flex gap-1 transition-opacity ${menuOpen ? "opacity-100" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"}`}
      >
        <button type="button" onClick={download} disabled={downloading} aria-label="Download PNG" title="Download PNG" className={`${iconBtn} disabled:opacity-50`}>
          <Download className="h-3.5 w-3.5" />
        </button>
        {folders.length > 0 && (
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Move to folder"
            title="Move to folder"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className={iconBtn}
          >
            <FolderInput className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onRemove(asset)}
          aria-label="Remove from project"
          title="Remove from project (stays in My Assets)"
          className={`${iconBtn} hover:!bg-red-500/15 hover:!text-red-300`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {menuOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Move to folder"
          className="absolute right-1.5 top-11 z-30 max-h-64 w-52 overflow-y-auto rounded-xl border border-white/[0.08] bg-[#0E1016] p-1 shadow-2xl"
        >
          <p className="px-2.5 pb-1 pt-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-[#8B93A5]">Move to</p>
          {folders.map((f) => {
            const current = f.id === asset.folderId;
            const firstEnabled = folders.find((x) => x.id !== asset.folderId)?.id;
            return (
              <button
                key={f.id}
                type="button"
                role="menuitem"
                autoFocus={f.id === firstEnabled}
                disabled={current}
                onClick={() => {
                  setMenuOpen(false);
                  onMove(asset, f.id);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-[#C9CFDB] transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:bg-white/[0.06] focus-visible:outline-none disabled:cursor-default disabled:text-[#7A8294] disabled:hover:bg-transparent"
              >
                <span className="truncate">{f.name}</span>
                {current && <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-[#FF8A3D]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
