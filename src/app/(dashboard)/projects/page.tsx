"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { Loader2, Plus, FolderOpen, Trash2, ChevronRight, ChevronDown, X, Sparkles } from "lucide-react";
import Link from "next/link";

interface ProjectFolder {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  suggestedAssets: string | null;
  defaultStyleId: string | null;
  defaultView: string | null;
  _count?: { generations: number };
}

interface Project {
  id: string;
  name: string;
  gameType: string | null;
  perspective: string | null;
  artStyle: string | null;
  mood: string | null;
  systems: string | null;
  notes: string | null;
  createdAt: string;
  folders: ProjectFolder[];
  _count: { generations: number };
}

const GAME_TYPES = ["Dungeon Crawler", "Platformer", "RPG", "Roguelike", "Survival", "Tower Defense", "Action", "Puzzle", "Card Game"];
const PERSPECTIVES = ["Top-down", "Side-scroll", "Isometric", "Front-facing"];
const ART_STYLES = ["Pixel Art", "Pixel Art HD", "Hand-Painted", "Anime", "Dark Fantasy", "Cartoon", "Vector", "Realistic"];
const MOODS = ["Dark Fantasy", "Colorful", "Gritty", "Whimsical", "Sci-Fi", "Horror", "Peaceful"];

const FOLDER_PREVIEW = 6;

const inputClass =
  "h-10 w-full rounded-xl border border-white/[0.08] bg-[#212B4E] px-3 text-[13px] text-white outline-none transition-colors placeholder:text-[#8A92BF] focus:border-[#FFA300]/50";

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-[#C8CCE8]">
        {label}
        {required && <span className="ml-0.5 text-[#FFA300]">*</span>}
      </span>
      {children}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <Field label={label}>
      <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} appearance-none pr-9`}>
          <option value="">Select...</option>
          {options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A92BF]" />
      </div>
    </Field>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loadFailed, setLoadFailed] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [gameType, setGameType] = useState("");
  const [perspective, setPerspective] = useState("");
  const [artStyle, setArtStyle] = useState("");
  const [mood, setMood] = useState("");
  const [systems, setSystems] = useState("");

  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProjects(data.projects || []);
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  // Esc closes the create dialog (unless a request is in flight).
  useEffect(() => {
    if (!showForm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !creating) setShowForm(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showForm, creating]);

  const openForm = () => {
    setFormError(null);
    setShowForm(true);
  };

  const handleCreate = async () => {
    if (!name.trim() || creating) return;
    setCreating(true);
    setFormError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), gameType, perspective, artStyle, mood, systems }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Couldn't create the project. Please try again.");
      setShowForm(false);
      setName(""); setGameType(""); setPerspective(""); setArtStyle(""); setMood(""); setSystems("");
      loadProjects();
    } catch (e) {
      setFormError(e instanceof Error && e.message !== "Failed to fetch" ? e.message : "Couldn't reach the server. Check your connection and try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (project: Project) => {
    if (!confirm(`Delete "${project.name}" and its folders? Your sprites stay in My Assets.`)) return;
    setPageError(null);
    setDeletingId(project.id);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(project.id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setProjects((list) => list.filter((p) => p.id !== project.id));
    } catch {
      setPageError(`Couldn't delete "${project.name}". Please try again.`);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalAssets = projects.reduce((sum, p) => sum + p._count.generations, 0);

  return (
    <div className="min-h-screen bg-[#131A31] text-[#FFF1E8]">
      <div className="mx-auto max-w-[1400px] px-5 py-6 lg:px-8">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4 sm:items-end">
          <div className="min-w-0">
            <h1 className="font-display text-[24px] font-semibold leading-tight tracking-tight text-white">Projects</h1>
            <p className="mt-1 text-[13px] text-[#9AA1CC]">
              <span className="max-sm:block">Organize assets by game project</span>
              {!loading && projects.length > 0 && (
                <>
                  <span className="mx-1.5 text-[#8A92BF] max-sm:hidden">·</span>
                  <span className="font-mono text-[#C8CCE8]">{projects.length}</span> project{projects.length === 1 ? "" : "s"}
                  <span className="mx-1.5 text-[#8A92BF]">·</span>
                  <span className="font-mono text-[#C8CCE8]">{totalAssets}</span> assets
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={openForm}
            className="px-corners inline-flex h-10 shrink-0 items-center gap-2 bg-[#FFA300] px-4 text-[13px] font-semibold text-[#131A31] transition hover:bg-[#FFB733]"
          >
            <Plus className="h-4 w-4" />
            New project
          </button>
        </div>

        {pageError && (
          <div role="alert" className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-400/20 bg-red-500/[0.06] px-4 py-3 text-[13px] text-red-200">
            <span className="flex-1">{pageError}</span>
            <button type="button" onClick={() => setPageError(null)} aria-label="Dismiss"
              className="-my-1.5 -mr-2 flex h-8 w-8 items-center justify-center rounded-lg text-red-200/70 hover:bg-red-500/10 hover:text-red-100">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Project list */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading projects">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-2xl bg-white/[0.04]" style={{ animationDelay: `${i * 60}ms` }} />
            ))}
          </div>
        ) : loadFailed ? (
          <div role="alert" className="flex flex-col items-center justify-center rounded-3xl border border-white/[0.06] px-6 py-20 text-center">
            <h2 className="font-display text-[18px] font-semibold text-white">Couldn&apos;t load your projects</h2>
            <p className="mt-1 text-[13px] text-[#9AA1CC]">Check your connection and try again.</p>
            <button type="button" onClick={() => { setLoading(true); loadProjects(); }}
              className="mt-5 inline-flex h-10 items-center rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-[13px] font-medium text-[#C8CCE8] transition-colors hover:bg-white/[0.08] hover:text-white">
              Try again
            </button>
          </div>
        ) : projects.length === 0 ? (
          <div className="pixel-grid flex flex-col items-center justify-center rounded-3xl border border-white/[0.06] px-6 py-20 text-center sm:py-24">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04]">
              <FolderOpen className="h-5 w-5 text-[#FFA300]" aria-hidden />
            </div>
            <h2 className="text-[15px] font-semibold text-white">
              No projects yet
            </h2>
            <p className="mt-1 max-w-sm text-[13px] text-[#9AA1CC]">
              Describe your game and we&apos;ll set up folders for everything it needs — heroes, enemies, items, tiles. Then generate straight into them.
            </p>
            <button
              type="button"
              onClick={openForm}
              className="px-corners mt-5 inline-flex h-10 items-center gap-2 bg-[#FFA300] px-4 text-[13px] font-semibold text-[#131A31] transition hover:bg-[#FFB733]"
            >
              <Plus className="h-4 w-4" aria-hidden /> Create your first project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => {
              const chips = [project.gameType, project.artStyle, project.perspective, project.mood].filter(Boolean) as string[];
              const isExpanded = expanded.has(project.id);
              const folders = isExpanded ? project.folders : project.folders.slice(0, FOLDER_PREVIEW);
              const hidden = project.folders.length - FOLDER_PREVIEW;

              return (
                <div
                  key={project.id}
                  className="group flex flex-col rounded-2xl border border-white/[0.08] bg-[#212B4E] p-4 transition-colors hover:border-white/20"
                >
                  <div className="flex items-start gap-3">
                    <Link
                      href={`/projects/${project.id}`}
                      className="group/open -m-1 flex min-w-0 flex-1 items-start gap-3 rounded-xl p-1 outline-none focus-visible:ring-2 focus-visible:ring-[#FFA300]/60"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04]">
                        <FolderOpen className="h-[18px] w-[18px] text-[#FFA300]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="flex items-center gap-1 text-[14px] font-semibold text-white" title={project.name}>
                          <span className="truncate group-hover/open:text-[#FFC857]">{project.name}</span>
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#8A92BF] transition-transform group-hover/open:translate-x-0.5 group-hover/open:text-[#FFC857]" />
                        </h3>
                        <p className="mt-0.5 font-mono text-[11px] text-[#9AA1CC]">
                          {project._count.generations} assets · {project.folders.length} folders
                        </p>
                      </div>
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(project)}
                      disabled={deletingId === project.id}
                      title="Delete project"
                      aria-label={`Delete project ${project.name}`}
                      className="-mr-1.5 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#8A92BF] transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:opacity-100 lg:opacity-0 lg:focus-visible:opacity-100 lg:group-hover:opacity-100"
                    >
                      {deletingId === project.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>

                  {chips.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {chips.map((c, i) => (
                        <span
                          key={`${c}-${i}`}
                          className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] leading-none text-[#C8CCE8]"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Folders */}
                  {project.folders.length > 0 ? (
                    <div className="mt-4 border-t border-white/[0.06] pt-3">
                      <span className="mb-2 block text-[12.5px] text-[#9AA1CC] font-semibold">Folders</span>
                      <div className="grid grid-cols-2 gap-1">
                        {folders.map((folder) => (
                          <Link
                            key={folder.id}
                            href={`/generate?${new URLSearchParams({
                              projectId: project.id,
                              folderId: folder.id,
                              categoryId: folder.category,
                              subcategoryId: folder.subcategory || "",
                              styleId: folder.defaultStyleId || "",
                              view: folder.defaultView || "DEFAULT",
                            }).toString()}`}
                            title={folder.description || `Generate sprites for ${folder.name}`}
                            className="group/folder flex min-h-10 min-w-0 items-center gap-2 rounded-lg border border-transparent px-2 transition-colors hover:border-white/[0.08] hover:bg-[#263260]"
                          >
                            <FolderOpen className="h-3.5 w-3.5 shrink-0 text-[#8A92BF] transition-colors group-hover/folder:text-[#FFA300]" />
                            <span className="truncate text-[12.5px] text-[#C8CCE8] group-hover/folder:text-white">{folder.name}</span>
                            <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-[#8A92BF] opacity-0 transition-opacity group-hover/folder:opacity-100" />
                          </Link>
                        ))}
                      </div>
                      {hidden > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleExpanded(project.id)}
                          aria-expanded={isExpanded}
                          className="mt-1 flex min-h-9 items-center gap-1 rounded-lg px-2.5 text-[12px] font-medium text-[#9AA1CC] transition-colors hover:text-white"
                        >
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          {isExpanded ? "Show less" : `Show all ${project.folders.length}`}
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="mt-4 border-t border-white/[0.06] pt-3 text-[12px] text-[#8A92BF]">No folders in this project.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create dialog */}
      {showForm && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={() => !creating && setShowForm(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-project-title"
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate();
            }}
            className="max-h-[92vh] max-h-[92dvh] w-full max-w-[560px] overflow-y-auto overscroll-contain rounded-t-3xl border border-white/[0.08] bg-[#19223F] shadow-2xl sm:rounded-3xl"
          >
            <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-5 sm:px-6">
              <div>
                <h2 id="new-project-title" className="font-display text-[18px] font-semibold tracking-tight text-white">Describe your game</h2>
                <p className="mt-1 text-[13px] text-[#9AA1CC]">We&apos;ll plan a folder for each kind of asset your game needs. Only the name is required — it&apos;s free.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={creating}
                aria-label="Close"
                className="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#9AA1CC] transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-4 px-5 py-4 sm:gap-x-4 sm:px-6">
              <div className="col-span-2">
                <Field label="Project name" required>
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My Dungeon Crawler"
                    className={inputClass}
                  />
                </Field>
              </div>
              <SelectField label="Game type" value={gameType} onChange={setGameType} options={GAME_TYPES} />
              <SelectField label="Perspective" value={perspective} onChange={setPerspective} options={PERSPECTIVES} />
              <SelectField label="Art style" value={artStyle} onChange={setArtStyle} options={ART_STYLES} />
              <SelectField label="Mood" value={mood} onChange={setMood} options={MOODS} />
              <div className="col-span-2">
                <Field label="Core systems">
                  <input
                    value={systems}
                    onChange={(e) => setSystems(e.target.value)}
                    placeholder="combat, inventory, crafting, loot"
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>

            {formError && (
              <p role="alert" className="mx-5 mb-1 sm:mx-6 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-3 py-2.5 text-[12.5px] text-red-200">
                {formError}
              </p>
            )}

            <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-white/[0.06] bg-[#19223F] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={creating}
                className="inline-flex h-10 items-center rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-[13px] font-medium text-[#C8CCE8] transition-colors hover:bg-white/[0.08] disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || creating}
                className="px-corners inline-flex h-10 items-center gap-2 bg-[#FFA300] px-4 text-[13px] font-semibold text-[#131A31] transition hover:bg-[#FFB733] disabled:opacity-50 disabled:hover:bg-[#FFB733]"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
                {creating ? "Planning folders…" : "Create project"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
