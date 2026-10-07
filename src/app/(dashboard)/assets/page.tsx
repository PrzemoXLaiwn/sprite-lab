"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Trash2,
  Search,
  LayoutGrid,
  List,
  Plus,
  Loader2,
  ImageIcon,
  Cuboid,
  RefreshCw,
  CheckSquare,
  X,
  CheckCircle2,
  XCircle,
  Info,
  Archive,
  Images,
  SearchX,
  ArrowDownUp,
} from "lucide-react";
import JSZip from "jszip";
import { SpriteEditor } from "@/components/editor/SpriteEditor";
import { SpritePlayground } from "@/components/playground/SpritePlayground";
import { AssetCard, AssetRow, PendingJobCard } from "@/components/assets/AssetCard";
import { AssetPreviewModal } from "@/components/assets/AssetPreviewModal";
import {
  is3DFormat,
  is3DStyle,
  get3DFormat,
  type AssetActions,
  type Generation,
  type PendingJob,
} from "@/components/assets/asset-utils";

// ===========================================
// TOAST
// ===========================================
interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  description?: string;
}

function SuccessToast({
  message,
  onClose,
}: {
  message: ToastMessage;
  onClose: () => void;
}) {
  // Keep the latest onClose in a ref so parent re-renders (the 3s queue poll)
  // don't restart the auto-dismiss timer — previously toasts could stick forever.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    const timer = setTimeout(() => closeRef.current(), 4000);
    return () => clearTimeout(timer);
  }, []);

  const tone =
    message.type === "success"
      ? { box: "border-emerald-400/20 bg-emerald-500/[0.06]", icon: "text-emerald-300", title: "text-emerald-200", Icon: CheckCircle2 }
      : message.type === "error"
      ? { box: "border-red-400/20 bg-red-500/[0.06]", icon: "text-red-300", title: "text-red-200", Icon: XCircle }
      : { box: "border-white/[0.08] bg-white/[0.03]", icon: "text-[#FF8A3D]", title: "text-white", Icon: Info };

  return (
    <div className="pointer-events-auto overflow-hidden rounded-2xl border border-white/[0.08] bg-[#151922] shadow-2xl animate-in slide-in-from-top-2 fade-in duration-300">
      <div className={`flex items-start gap-3 border p-3.5 ${tone.box} rounded-2xl`}>
        <tone.Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone.icon}`} />
        <div className="min-w-0 flex-1">
          <p className={`text-[13px] font-semibold ${tone.title}`}>{message.title}</p>
          {message.description && <p className="mt-0.5 text-[12px] text-[#8B93A5]">{message.description}</p>}
        </div>
        <button
          onClick={onClose}
          aria-label="Dismiss"
          className="rounded-md p-0.5 text-[#7A8294] transition-colors hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "WEAPONS", label: "Weapons" },
  { id: "ARMOR", label: "Armor" },
  { id: "CONSUMABLES", label: "Consumables" },
  { id: "RESOURCES", label: "Resources" },
  { id: "CHARACTERS", label: "Characters" },
  { id: "CREATURES", label: "Creatures" },
  { id: "ENVIRONMENT", label: "Environment" },
];

const PAGE_SIZE = 60;

// ===========================================
// MAIN COMPONENT
// ===========================================
export default function GalleryPage() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [pendingJobs, setPendingJobs] = useState<PendingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterType, setFilterType] = useState<"all" | "2d" | "3d">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  // Multi-select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Toast state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Inpaint editor state
  const [inpaintGeneration, setInpaintGeneration] = useState<Generation | null>(null);

  // Playground state
  const [playgroundGeneration, setPlaygroundGeneration] = useState<Generation | null>(null);

  // Completed queue jobs we've already announced. `null` until the first poll,
  // which only records what's there (no toast for jobs finished earlier).
  // A ref is required: the polling interval keeps the first render's closure,
  // so reading `pendingJobs` state there always saw an empty list.
  const seenCompletedRef = useRef<Set<string> | null>(null);

  const showToast = (type: ToastMessage["type"], title: string, description?: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, title, description }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    loadGenerations();
    loadPendingJobs();
    // Poll for pending jobs every 3 seconds
    const interval = setInterval(loadPendingJobs, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** `silent` refreshes in place instead of swapping the grid for skeletons. */
  const loadGenerations = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await fetch("/api/generations");
      if (response.ok) {
        const data = await response.json();
        setGenerations(data.generations || []);
      }
    } catch (error) {
      console.error("Failed to load generations:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadPendingJobs = async () => {
    try {
      const response = await fetch("/api/queue/status");
      if (response.ok) {
        const data = await response.json();
        const jobs: PendingJob[] = data.jobs || [];

        const completedIds = jobs.filter((job) => job.status === "completed").map((job) => job.id);
        const seen = seenCompletedRef.current;
        const newlyCompleted = seen ? completedIds.filter((id) => !seen.has(id)) : [];
        seenCompletedRef.current = new Set([...(seen ?? []), ...completedIds]);

        setPendingJobs(jobs);

        // Auto-refresh gallery when jobs complete
        if (newlyCompleted.length > 0) {
          showToast(
            "success",
            `${newlyCompleted.length} generation${newlyCompleted.length > 1 ? "s" : ""} completed!`,
            "Your new assets have been added to the gallery."
          );
          loadGenerations(true);
        }
      }
    } catch (error) {
      console.error("Failed to load pending jobs:", error);
    }
  };

  const cancelPendingJob = async (jobId: string) => {
    try {
      const response = await fetch("/api/queue/status", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });

      if (response.ok) {
        const data = await response.json();
        showToast("success", "Job Cancelled", `${data.creditsRefunded} credits refunded`);
        loadPendingJobs();
      } else {
        const error = await response.json();
        showToast("error", "Failed to cancel", error.error);
      }
    } catch (error) {
      console.error("Failed to cancel job:", error);
      showToast("error", "Failed to cancel", "Please try again");
    }
  };

  // Filter active pending jobs (not completed/failed recently)
  const activePendingJobs = pendingJobs.filter(
    (job) => job.status === "pending" || job.status === "processing"
  );

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this generation?")) return;

    // Optimistic update - remove immediately
    const previousGenerations = generations;
    setGenerations((prev) => prev.filter((g) => g.id !== id));
    showToast("info", "Deleting...", "Removing from gallery");

    try {
      const response = await fetch(`/api/generations/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        showToast("success", "Deleted", "Asset removed from gallery");
      } else {
        // Rollback on error
        setGenerations(previousGenerations);
        showToast("error", "Delete failed", "Please try again");
      }
    } catch (error) {
      console.error("Failed to delete:", error);
      // Rollback on error
      setGenerations(previousGenerations);
      showToast("error", "Delete failed", "Please try again");
    }
  };

  const handleDownload = async (gen: Generation) => {
    try {
      const response = await fetch(gen.imageUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;

      const is3D = is3DFormat(gen.imageUrl) || is3DStyle(gen.styleId);
      const ext = is3D ? get3DFormat(gen.imageUrl).toLowerCase() : "png";

      a.download = `spritelab-${gen.categoryId}-${gen.seed || gen.id}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      window.open(gen.imageUrl, "_blank");
    }
  };

  const copySeed = (seed: number, id: string) => {
    navigator.clipboard.writeText(seed.toString());
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Toggle selection for an item
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Select all filtered items
  const selectAll = () => {
    const allIds = new Set(filteredGenerations.map((g) => g.id));
    setSelectedIds(allIds);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  // Bulk delete with optimistic UI
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const count = selectedIds.size;
    if (!confirm(`Are you sure you want to delete ${count} item(s)? This cannot be undone.`)) return;

    // Optimistic update - remove immediately
    const previousGenerations = generations;
    const idsToDelete = new Set(selectedIds);
    setGenerations((prev) => prev.filter((g) => !idsToDelete.has(g.id)));
    clearSelection();
    setDeleting(true);
    showToast("info", `Deleting ${count} items...`, "This may take a moment");

    try {
      const response = await fetch("/api/generations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(idsToDelete) }),
      });

      if (response.ok) {
        const data = await response.json();
        showToast("success", "Deleted", `${data.deleted} items removed`);
      } else {
        // Rollback on error
        setGenerations(previousGenerations);
        const error = await response.json();
        showToast("error", "Delete failed", error.error || "Please try again");
      }
    } catch (error) {
      console.error("Bulk delete failed:", error);
      // Rollback on error
      setGenerations(previousGenerations);
      showToast("error", "Delete failed", "Please try again");
    } finally {
      setDeleting(false);
    }
  };

  // Batch download as ZIP
  const handleBatchDownload = async () => {
    if (selectedIds.size === 0) return;

    setDownloading(true);
    showToast("info", "Preparing download...", `Packaging ${selectedIds.size} files`);

    try {
      const zip = new JSZip();
      const selectedGens = generations.filter((g) => selectedIds.has(g.id));

      // Download all files in parallel
      const downloadPromises = selectedGens.map(async (gen, index) => {
        try {
          const response = await fetch(gen.imageUrl);
          if (!response.ok) throw new Error("Failed to fetch");

          const blob = await response.blob();
          const is3D = is3DFormat(gen.imageUrl) || is3DStyle(gen.styleId);
          const ext = is3D ? get3DFormat(gen.imageUrl).toLowerCase() : "png";
          const safeName = gen.prompt.slice(0, 30).replace(/[^a-zA-Z0-9]/g, "_");
          const fileName = `${index + 1}_${safeName}_${gen.seed || gen.id.slice(0, 8)}.${ext}`;

          zip.file(fileName, blob);
        } catch (err) {
          console.error(`Failed to download ${gen.id}:`, err);
        }
      });

      await Promise.all(downloadPromises);

      // Generate and download ZIP
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `spritelab-assets-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast("success", "Download complete!", `${selectedIds.size} files packaged`);
      clearSelection();
    } catch (error) {
      console.error("Batch download failed:", error);
      showToast("error", "Download failed", "Please try again");
    } finally {
      setDownloading(false);
    }
  };

  // Toggle share to community
  const handleToggleShare = async (gen: Generation) => {
    const newIsPublic = !gen.isPublic;
    try {
      const response = await fetch(`/api/generations/${gen.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: newIsPublic }),
      });

      if (response.ok) {
        setGenerations((prev) =>
          prev.map((g) => (g.id === gen.id ? { ...g, isPublic: newIsPublic } : g))
        );
        if (newIsPublic) {
          showToast(
            "success",
            "Shared to Community!",
            "Your creation is now visible to everyone in the community gallery."
          );
        } else {
          showToast("info", "Removed from Community", "Your creation is now private.");
        }
      } else {
        const error = await response.json();
        showToast("error", "Failed to update", error.error || "Please try again.");
      }
    } catch (error) {
      console.error("Share toggle failed:", error);
      showToast("error", "Failed to update", "Please try again.");
    }
  };

  const filteredGenerations = generations
    .filter((gen) => {
      const matchesSearch = gen.prompt.toLowerCase().includes(searchQuery.toLowerCase());
      // Older rows stored lowercase ids ("characters") — compare case-insensitively
      const matchesCategory = filterCategory === "all" || gen.categoryId?.toUpperCase() === filterCategory;

      const is3D = is3DFormat(gen.imageUrl) || is3DStyle(gen.styleId);
      const matchesType =
        filterType === "all" || (filterType === "3d" && is3D) || (filterType === "2d" && !is3D);

      return matchesSearch && matchesCategory && matchesType;
    })
    .sort((a, b) => {
      const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return sortOrder === "newest" ? diff : -diff;
    });

  const total2D = generations.filter((g) => !is3DFormat(g.imageUrl) && !is3DStyle(g.styleId)).length;
  const total3D = generations.filter((g) => is3DFormat(g.imageUrl) || is3DStyle(g.styleId)).length;
  const hasFilters = searchQuery !== "" || filterCategory !== "all" || filterType !== "all";
  const visibleGenerations = filteredGenerations.slice(0, visibleCount);

  // Filters reset the "load more" window so results start from the top.
  const withReset = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setVisibleCount(PAGE_SIZE);
  };
  const changeSearch = withReset(setSearchQuery);
  const changeCategory = withReset(setFilterCategory);
  const changeType = withReset(setFilterType);
  const clearFilters = () => {
    setSearchQuery("");
    setFilterCategory("all");
    setFilterType("all");
    setVisibleCount(PAGE_SIZE);
  };

  // Preview modal
  const previewIndex = previewId ? filteredGenerations.findIndex((g) => g.id === previewId) : -1;
  const previewGen = previewIndex >= 0 ? filteredGenerations[previewIndex] : null;

  const actions: AssetActions = {
    onDownload: handleDownload,
    onDelete: handleDelete,
    onToggleShare: handleToggleShare,
    // Close the preview first so the editor / playground modal isn't layered under it.
    onInpaint: (gen) => {
      setPreviewId(null);
      setInpaintGeneration(gen);
    },
    onPlayground: (gen) => {
      setPreviewId(null);
      setPlaygroundGeneration(gen);
    },
  };

  const typeOptions = [
    { id: "all" as const, label: "All", count: generations.length, icon: null },
    { id: "2d" as const, label: "2D", count: total2D, icon: ImageIcon },
    { id: "3d" as const, label: "3D", count: total3D, icon: Cuboid },
  ];

  return (
    <div className="min-h-screen bg-[#0B0D12] text-[#ECEEF3]">
      <div className="mx-auto max-w-[1400px] px-5 py-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-[26px] font-semibold leading-tight tracking-normal text-white">My Assets</h1>
            <p className="mt-1 text-[13px] text-[#8B93A5]">
              <span className="font-mono text-[#C9CFDB]">{generations.length}</span> assets
              <span className="mx-1.5 text-[#7A8294]">·</span>
              <span className="font-mono text-[#C9CFDB]">{total2D}</span> sprites
              {total3D > 0 && (
                <>
                  <span className="mx-1.5 text-[#7A8294]">·</span>
                  <span className="font-mono text-[#C9CFDB]">{total3D}</span> 3D models
                </>
              )}
            </p>
          </div>
          <Link
            href="/generate"
            className="px-corners inline-flex h-10 shrink-0 items-center gap-2 bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] px-4 text-[13px] font-semibold text-white transition hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            Create
          </Link>
        </div>

        {/* Toolbar */}
        <div className="mb-5 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A8294]" />
              <input
                type="search"
                placeholder="Search by prompt..."
                value={searchQuery}
                onChange={(e) => changeSearch(e.target.value)}
                className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#151922] pl-10 pr-3 text-[13px] text-white outline-none transition-colors placeholder:text-[#7A8294] focus:border-[#FF8A3D]/50"
              />
            </div>

            <div className="relative">
              <ArrowDownUp className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8B93A5]" />
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
                aria-label="Sort"
                className="h-10 appearance-none rounded-xl border border-white/[0.08] bg-[#151922] pl-8 pr-4 text-[13px] text-[#C9CFDB] outline-none transition-colors hover:border-white/20 focus:border-[#FF8A3D]/50"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>

            <div className="flex h-10 items-center gap-1 rounded-xl bg-white/[0.04] p-1">
              {([
                { id: "grid" as const, icon: LayoutGrid, label: "Grid view" },
                { id: "list" as const, icon: List, label: "List view" },
              ]).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setViewMode(v.id)}
                  title={v.label}
                  aria-label={v.label}
                  aria-pressed={viewMode === v.id}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                    viewMode === v.id ? "bg-white/[0.1] text-white" : "text-[#8B93A5] hover:text-white"
                  }`}
                >
                  <v.icon className="h-4 w-4" />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => (selectMode ? clearSelection() : setSelectMode(true))}
              className={`flex h-10 items-center gap-1.5 rounded-xl border px-3.5 text-[13px] font-medium transition-colors ${
                selectMode
                  ? "border-[#FF8A3D] bg-[#FF8A3D]/10 text-[#FFB27A] ring-2 ring-[#FF8A3D]/25"
                  : "border-white/[0.1] bg-white/[0.04] text-[#C9CFDB] hover:bg-white/[0.08]"
              }`}
            >
              {selectMode ? <X className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
              {selectMode ? "Cancel" : "Select"}
            </button>

            <button
              type="button"
              onClick={() => loadGenerations(true)}
              disabled={refreshing}
              title="Refresh"
              aria-label="Refresh"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] text-[#C9CFDB] transition-colors hover:bg-white/[0.08] disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {total3D > 0 && (
              <div className="flex shrink-0 items-center gap-1 rounded-xl bg-white/[0.04] p-1">
                {typeOptions.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => changeType(t.id)}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                      filterType === t.id ? "bg-white/[0.1] text-white" : "text-[#8B93A5] hover:text-white"
                    }`}
                  >
                    {t.icon && <t.icon className="h-3.5 w-3.5" />}
                    {t.label}
                    <span className="font-mono text-[10.5px] text-[#7A8294]">{t.count}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="-mx-1 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-1 py-0.5 [scrollbar-width:none]">
              {CATEGORIES.map((c) => {
                const active = filterCategory === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => changeCategory(c.id)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                      active
                        ? "border-[#FF8A3D]/60 bg-[#FF8A3D]/[0.12] text-white"
                        : "border-white/[0.08] text-[#8B93A5] hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pending jobs */}
        {!loading && activePendingJobs.length > 0 && (
          <section className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#FF8A3D]" />
              <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#8B93A5]">
                Generating · {activePendingJobs.length}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 2xl:grid-cols-5">
              {activePendingJobs.map((job) => (
                <PendingJobCard key={job.id} job={job} onCancel={cancelPendingJob} />
              ))}
            </div>
          </section>
        )}

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 2xl:grid-cols-5">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-white/[0.04]" style={{ animationDelay: `${i * 40}ms` }} />
            ))}
          </div>
        ) : filteredGenerations.length === 0 ? (
          hasFilters ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-white/[0.06] px-6 py-20 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04]">
                <SearchX className="h-5 w-5 text-[#FF8A3D]" />
              </div>
              <h3 className="text-[15px] font-semibold text-white">No matches found</h3>
              <p className="mt-1 max-w-sm text-[13px] text-[#8B93A5]">No assets match your filters. Try adjusting your search.</p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-[13px] font-medium text-[#C9CFDB] transition-colors hover:bg-white/[0.08]"
              >
                <X className="h-4 w-4" /> Clear filters
              </button>
            </div>
          ) : activePendingJobs.length > 0 ? null : (
            <div className="pixel-grid flex flex-col items-center justify-center rounded-3xl border border-white/[0.06] px-6 py-24 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04]">
                <Images className="h-5 w-5 text-[#FF8A3D]" />
              </div>
              <h3 className="text-[15px] font-semibold text-white">
                No assets yet<span className="caret" />
              </h3>
              <p className="mt-1 max-w-sm text-[13px] text-[#8B93A5]">
                Everything you generate is saved here — ready to download, edit and share.
              </p>
              <Link
                href="/generate"
                className="px-corners mt-5 inline-flex h-10 items-center gap-2 bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] px-4 text-[13px] font-semibold text-white transition hover:brightness-110"
              >
                <Plus className="h-4 w-4" /> Create your first asset
              </Link>
            </div>
          )
        ) : (
          <>
            {hasFilters && (
              <p className="mb-3 text-[12px] text-[#8B93A5]">
                Showing <span className="font-mono text-[#C9CFDB]">{filteredGenerations.length}</span> of{" "}
                <span className="font-mono text-[#C9CFDB]">{generations.length}</span>
              </p>
            )}
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 2xl:grid-cols-5"
                  : "flex flex-col gap-2"
              }
            >
              {visibleGenerations.map((gen) => {
                const Item = viewMode === "grid" ? AssetCard : AssetRow;
                return (
                  <Item
                    key={gen.id}
                    gen={gen}
                    actions={actions}
                    selectMode={selectMode}
                    selected={selectMode && selectedIds.has(gen.id)}
                    onToggleSelect={toggleSelect}
                    onOpen={(g) => setPreviewId(g.id)}
                    copied={copiedId === gen.id}
                    onCopySeed={copySeed}
                  />
                );
              })}
            </div>

            {filteredGenerations.length > visibleCount && (
              <div className="mt-8 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                  className="inline-flex h-10 items-center rounded-xl border border-white/[0.1] bg-white/[0.04] px-5 text-[13px] font-medium text-[#C9CFDB] transition-colors hover:bg-white/[0.08]"
                >
                  Load more
                </button>
                <span className="font-mono text-[11px] text-[#7A8294]">
                  {visibleGenerations.length} / {filteredGenerations.length}
                </span>
              </div>
            )}
          </>
        )}

        {/* Floating selection action bar */}
        {selectMode && (
          <div className="fixed bottom-20 left-1/2 z-50 w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 md:bottom-6 md:ml-[38px] md:w-auto md:max-w-none">
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/[0.08] bg-[#151922]/95 p-2 pl-4 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:flex-nowrap">
              <span className="mr-1 text-[13px] font-medium text-white">
                <span className="font-mono">{selectedIds.size}</span> selected
              </span>

              <span className="hidden h-5 w-px bg-white/[0.08] sm:block" />

              <button
                type="button"
                onClick={selectAll}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[12.5px] font-medium text-[#C9CFDB] transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <CheckSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Select all</span>
                <span className="sm:hidden">All</span>
                <span className="font-mono text-[11px] text-[#7A8294]">{filteredGenerations.length}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                disabled={selectedIds.size === 0}
                className="inline-flex h-9 items-center rounded-xl px-3 text-[12.5px] font-medium text-[#C9CFDB] transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
              >
                Clear
              </button>

              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBatchDownload}
                  disabled={downloading || selectedIds.size === 0}
                  className="px-corners inline-flex h-9 items-center gap-1.5 bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] px-3.5 text-[12.5px] font-semibold text-white transition hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100"
                >
                  {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                  {downloading ? "Packaging..." : "Download ZIP"}
                </button>

                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={deleting || selectedIds.size === 0}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-400/20 bg-red-500/[0.06] px-3.5 text-[12.5px] font-semibold text-red-200 transition-colors hover:bg-red-500/[0.12] disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast container */}
        {toasts.length > 0 && (
          <div className="pointer-events-none fixed right-4 top-4 z-[80] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
            {toasts.map((toast) => (
              <SuccessToast key={toast.id} message={toast} onClose={() => removeToast(toast.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Preview modal */}
      {previewGen && (
        <AssetPreviewModal
          gen={previewGen}
          actions={actions}
          onClose={() => setPreviewId(null)}
          onPrev={previewIndex > 0 ? () => setPreviewId(filteredGenerations[previewIndex - 1].id) : undefined}
          onNext={
            previewIndex < filteredGenerations.length - 1
              ? () => setPreviewId(filteredGenerations[previewIndex + 1].id)
              : undefined
          }
        />
      )}

      {/* Inpaint Editor Modal */}
      {inpaintGeneration && (
        <SpriteEditor
          imageUrl={inpaintGeneration.imageUrl}
          generationId={inpaintGeneration.id}
          originalData={{
            categoryId: inpaintGeneration.categoryId,
            subcategoryId: inpaintGeneration.subcategoryId,
            styleId: inpaintGeneration.styleId,
          }}
          onClose={() => setInpaintGeneration(null)}
          onSave={() => {
            // Refresh gallery after saving
            loadGenerations();
            setInpaintGeneration(null);
            showToast("success", "Inpainting complete!", "Your edited image has been saved to gallery.");
          }}
        />
      )}

      {/* Sprite Playground Modal */}
      {playgroundGeneration && (
        <SpritePlayground
          spriteUrl={playgroundGeneration.imageUrl}
          onClose={() => setPlaygroundGeneration(null)}
        />
      )}
    </div>
  );
}
