"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, FolderOpen, Loader2, MoreHorizontal, Sparkles, Trash2, Wand2, X } from "lucide-react";
import { ProjectFolderSection } from "@/components/projects/ProjectFolderSection";
import { buildProjectPack, saveBlob } from "@/components/projects/pack";
import { generateHref, type ProjectAsset, type ProjectDetail } from "@/components/projects/types";

type Toast = { id: number; kind: "error" | "info"; msg: string };

const secondaryBtn =
  "inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-[13px] font-medium text-[#C9CFDB] transition-colors hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white/[0.04]";

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [assets, setAssets] = useState<ProjectAsset[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "notfound" | "error">("loading");
  const [packing, setPacking] = useState<{ done: number; total: number } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sorting, setSorting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const assetsRef = useRef<ProjectAsset[]>([]);
  useEffect(() => {
    assetsRef.current = assets;
  }, [assets]);

  const toast = useCallback((msg: string, kind: Toast["kind"] = "error") => {
    const tid = Date.now() + Math.random();
    setToasts((t) => [...t, { id: tid, kind, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== tid)), 5000);
  }, []);

  const load = useCallback(async () => {
    if (!id) return;
    setStatus("loading");
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(id)}?assets=1`, { cache: "no-store" });
      if (res.status === 404) {
        setStatus("notfound");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProject(data.project);
      setAssets(Array.isArray(data.assets) ? data.assets : []);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Overflow menu: close on Escape / outside click.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        menuBtnRef.current?.focus();
      }
    };
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [menuOpen]);

  const folders = useMemo(
    () => (project ? [...project.folders].sort((a, b) => a.sortOrder - b.sortOrder) : []),
    [project]
  );

  const byFolder = useMemo(() => {
    const known = new Set(folders.map((f) => f.id));
    const map = new Map<string | null, ProjectAsset[]>();
    for (const a of assets) {
      const key = a.folderId && known.has(a.folderId) ? a.folderId : null;
      const list = map.get(key);
      if (list) list.push(a);
      else map.set(key, [a]);
    }
    return map;
  }, [assets, folders]);

  const unsorted = byFolder.get(null) ?? [];

  const handleMove = useCallback(
    async (asset: ProjectAsset, folderId: string) => {
      const prevFolder = asset.folderId;
      if (prevFolder === folderId) return;
      setAssets((list) => list.map((a) => (a.id === asset.id ? { ...a, folderId } : a)));
      try {
        const res = await fetch(`/api/projects/${encodeURIComponent(id)}/assets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ generationId: asset.id, folderId }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Move failed");
        }
      } catch (e) {
        setAssets((list) => list.map((a) => (a.id === asset.id ? { ...a, folderId: prevFolder } : a)));
        toast(`Couldn't move sprite: ${e instanceof Error ? e.message : "unknown error"}`);
      }
    },
    [id, toast]
  );

  const handleRemove = useCallback(
    async (asset: ProjectAsset) => {
      const index = assetsRef.current.findIndex((a) => a.id === asset.id);
      setAssets((list) => list.filter((a) => a.id !== asset.id));
      try {
        const res = await fetch(`/api/projects/${encodeURIComponent(id)}/assets`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ generationId: asset.id }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Remove failed");
        }
        toast("Removed from project — it's still in My Assets.", "info");
      } catch (e) {
        setAssets((list) => {
          if (list.some((a) => a.id === asset.id)) return list;
          const next = [...list];
          next.splice(index < 0 ? next.length : Math.min(index, next.length), 0, asset);
          return next;
        });
        toast(`Couldn't remove sprite: ${e instanceof Error ? e.message : "unknown error"}`);
      }
    },
    [id, toast]
  );

  const handleDownloadPack = async () => {
    if (!project || assets.length === 0 || packing) return;
    setPacking({ done: 0, total: assets.length });
    try {
      const result = await buildProjectPack(project, assets, (done, total) => setPacking({ done, total }));
      if (result.packed === 0) {
        toast("None of the sprites could be packed. Check your connection and try again.");
        return;
      }
      saveBlob(result.blob, result.filename);
      if (result.failed > 0) {
        toast(`${result.failed} sprite${result.failed === 1 ? "" : "s"} couldn't be packed — the rest are in the zip.`);
      }
    } catch {
      toast("Couldn't build the sprite pack. Please try again.");
    } finally {
      setPacking(null);
    }
  };

  const handleAutoSort = async () => {
    if (!project || assets.length === 0 || sorting) return;
    setSorting(true);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(id)}/assets`, { method: "PATCH" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Sort failed");
      await load();
      const created = Array.isArray(data?.createdFolders) && data.createdFolders.length
        ? ` New folder${data.createdFolders.length === 1 ? "" : "s"}: ${data.createdFolders.join(", ")}.`
        : "";
      toast(data?.moved ? `Sorted — moved ${data.moved} sprite${data.moved === 1 ? "" : "s"}.${created}` : "Everything is already in the right folder.", "info");
    } catch (e) {
      toast(`Couldn't sort: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setSorting(false);
    }
  };

  const handleDelete = async () => {
    if (!project) return;
    setMenuOpen(false);
    if (!confirm(`Delete "${project.name}" and all its folders? Sprites stay in My Assets.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.push("/projects");
    } catch {
      setDeleting(false);
      toast("Couldn't delete the project. Please try again.");
    }
  };

  const backLink = (
    <Link
      href="/projects"
      className="inline-flex items-center gap-1.5 rounded-lg text-[12.5px] font-medium text-[#8B93A5] transition-colors hover:text-white"
    >
      <ArrowLeft className="h-3.5 w-3.5" /> Projects
    </Link>
  );

  return (
    <div className="min-h-screen bg-[#0B0D12] text-[#ECEEF3]">
      <div className="mx-auto max-w-[1400px] px-5 py-6 lg:px-8">
        {backLink}

        {status === "loading" && <LoadingSkeleton />}

        {status === "notfound" && (
          <div className="pixel-grid mt-6 flex flex-col items-center justify-center rounded-3xl border border-white/[0.06] px-6 py-24 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04]">
              <FolderOpen className="h-5 w-5 text-[#FF8A3D]" />
            </div>
            <h1 className="font-display text-[20px] font-semibold text-white">Project not found</h1>
            <p className="mt-1 max-w-sm text-[13px] text-[#8B93A5]">It may have been deleted, or it belongs to another account.</p>
            <Link href="/projects" className={`${secondaryBtn} mt-5`}>
              <ArrowLeft className="h-4 w-4" /> Back to projects
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="mt-6 flex flex-col items-center justify-center rounded-3xl border border-white/[0.06] px-6 py-20 text-center" role="alert">
            <h1 className="font-display text-[20px] font-semibold text-white">Couldn&apos;t load this project</h1>
            <p className="mt-1 text-[13px] text-[#8B93A5]">Check your connection and try again.</p>
            <button type="button" onClick={load} className={`${secondaryBtn} mt-5`}>
              Retry
            </button>
          </div>
        )}

        {status === "ready" && project && (
          <>
            {/* Header */}
            <header className="mt-3 mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <h1 className="break-words font-display text-[26px] font-semibold leading-tight text-white">{project.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {[project.gameType, project.artStyle, project.perspective, project.mood]
                    .filter((c): c is string => Boolean(c))
                    .map((c, i) => (
                      <span
                        key={`${c}-${i}`}
                        className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] leading-none text-[#C9CFDB]"
                      >
                        {c}
                      </span>
                    ))}
                  <span className="ml-1 font-mono text-[11.5px] text-[#8B93A5]">
                    <span className="text-[#C9CFDB]">{assets.length}</span> asset{assets.length === 1 ? "" : "s"}
                    <span className="mx-1.5 text-[#7A8294]">·</span>
                    <span className="text-[#C9CFDB]">{folders.length}</span> folder{folders.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Link
                  href={generateHref(project.id)}
                  className="px-corners inline-flex h-10 items-center gap-2 bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] px-4 text-[13px] font-semibold text-white transition hover:brightness-110"
                >
                  <Sparkles className="h-4 w-4" />
                  Generate for this project
                </Link>
                <button
                  type="button"
                  onClick={handleAutoSort}
                  disabled={assets.length === 0 || sorting}
                  title="Move every sprite into the folder that matches its type"
                  className={secondaryBtn}
                >
                  {sorting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  Auto-sort
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPack}
                  disabled={assets.length === 0 || packing !== null}
                  title={assets.length === 0 ? "Accept some sprites into this project first" : "Download every sprite, organized by folder"}
                  className={secondaryBtn}
                  aria-live="polite"
                >
                  {packing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {packing ? (
                    <span className="font-mono text-[12.5px]">
                      Packing {packing.done}/{packing.total}…
                    </span>
                  ) : (
                    "Download pack (.zip)"
                  )}
                </button>
                <div className="relative" ref={menuRef}>
                  <button
                    ref={menuBtnRef}
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-label="More project actions"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    disabled={deleting}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] text-[#C9CFDB] transition-colors hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
                  >
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                  </button>
                  {menuOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 top-12 z-40 w-48 rounded-xl border border-white/[0.08] bg-[#0E1016] p-1 shadow-2xl"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        autoFocus
                        onClick={handleDelete}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12.5px] text-red-300 transition-colors hover:bg-red-500/10 focus-visible:bg-red-500/10 focus-visible:outline-none"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete project
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </header>

            {/* Sections */}
            <div className="flex flex-col gap-4">
              {unsorted.length > 0 && (
                <ProjectFolderSection
                  projectId={project.id}
                  folder={null}
                  assets={unsorted}
                  folders={folders}
                  onMove={handleMove}
                  onRemove={handleRemove}
                  onError={toast}
                />
              )}
              {folders.map((f) => (
                <ProjectFolderSection
                  key={f.id}
                  projectId={project.id}
                  folder={f}
                  assets={byFolder.get(f.id) ?? []}
                  folders={folders}
                  onMove={handleMove}
                  onRemove={handleRemove}
                  onError={toast}
                />
              ))}
              {folders.length === 0 && unsorted.length === 0 && (
                <div className="pixel-grid flex flex-col items-center justify-center rounded-3xl border border-white/[0.06] px-6 py-20 text-center">
                  <h2 className="font-display text-[16px] font-semibold text-white">No sprites yet</h2>
                  <p className="mt-1 max-w-sm text-[13px] text-[#8B93A5]">
                    Generate sprites for this project and accept the ones you like — they&apos;ll show up here.
                  </p>
                  <Link
                    href={generateHref(project.id)}
                    className="px-corners mt-5 inline-flex h-10 items-center gap-2 bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] px-4 text-[13px] font-semibold text-white transition hover:brightness-110"
                  >
                    <Sparkles className="h-4 w-4" /> Generate for this project
                  </Link>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Toasts */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex max-w-md items-start gap-3 rounded-xl border px-4 py-3 text-[13px] shadow-2xl ${
              t.kind === "error" ? "border-red-500/30 bg-[#1A1116] text-red-200" : "border-white/[0.08] bg-[#151922] text-[#ECEEF3]"
            }`}
          >
            <span className="flex-1">{t.msg}</span>
            <button
              type="button"
              onClick={() => setToasts((list) => list.filter((x) => x.id !== t.id))}
              aria-label="Dismiss"
              className="-mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[#8B93A5] hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="mt-3" aria-busy="true" aria-label="Loading project">
      <div className="h-8 w-64 animate-pulse rounded-lg bg-white/[0.06]" />
      <div className="mt-3 flex gap-1.5">
        {[72, 88, 64, 80].map((w, i) => (
          <div key={i} className="h-6 animate-pulse rounded-full bg-white/[0.04]" style={{ width: w }} />
        ))}
      </div>
      <div className="mt-6 flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-white/[0.06] bg-[#0E1016] p-5">
            <div className="h-5 w-40 animate-pulse rounded bg-white/[0.06]" />
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
              {Array.from({ length: 5 }).map((_, j) => (
                <div
                  key={j}
                  className="aspect-square animate-pulse rounded-xl bg-white/[0.04]"
                  style={{ animationDelay: `${(i * 5 + j) * 40}ms` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
