"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Download,
  Trash2,
  Search,
  Grid3x3,
  List,
  Sparkles,
  Loader2,
  ImageIcon,
  Cuboid,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Edit,
  Maximize2,
  Shuffle,
  Scissors,
  FileBox,
  CheckSquare,
  Square,
  X,
  Share2,
  Globe,
  Users,
  CheckCircle2,
  XCircle,
  PartyPopper,
} from "lucide-react";

// ===========================================
// SUCCESS TOAST COMPONENT
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
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`animate-in slide-in-from-top-2 fade-in duration-300 pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl shadow-2xl ${
        message.type === "success"
          ? "bg-[#00ff88]/10 border-[#00ff88]/30"
          : message.type === "error"
          ? "bg-red-500/10 border-red-500/30"
          : "bg-[#00d4ff]/10 border-[#00d4ff]/30"
      }`}
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
          message.type === "success"
            ? "bg-[#00ff88]/20"
            : message.type === "error"
            ? "bg-red-500/20"
            : "bg-[#00d4ff]/20"
        }`}
      >
        {message.type === "success" ? (
          <PartyPopper className="w-5 h-5 text-[#00ff88]" />
        ) : message.type === "error" ? (
          <XCircle className="w-5 h-5 text-red-500" />
        ) : (
          <CheckCircle2 className="w-5 h-5 text-[#00d4ff]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`font-semibold ${
            message.type === "success"
              ? "text-[#00ff88]"
              : message.type === "error"
              ? "text-red-500"
              : "text-[#00d4ff]"
          }`}
        >
          {message.title}
        </p>
        {message.description && (
          <p className="text-white/60 text-sm mt-0.5">{message.description}</p>
        )}
      </div>
      <button
        onClick={onClose}
        className="text-white/40 hover:text-white/80 transition-colors p-1"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ===========================================
// TYPES
// ===========================================
interface Generation {
  id: string;
  prompt: string;
  imageUrl: string;
  categoryId: string;
  subcategoryId: string;
  styleId: string;
  seed?: number;
  isPublic?: boolean;
  createdAt: string;
}

// ===========================================
// HELPERS
// ===========================================
const is3DFormat = (url: string): boolean => {
  if (!url) return false;
  const lower = url.toLowerCase();
  return [".ply", ".glb", ".gltf", ".obj", ".fbx", ".usdz"].some(ext => lower.includes(ext));
};

const is3DStyle = (styleId: string): boolean => {
  return styleId?.startsWith("3D_") || styleId === "3D_MODEL";
};

const get3DFormat = (url: string): string => {
  if (!url) return "GLB";
  const lower = url.toLowerCase();
  if (lower.includes(".ply")) return "PLY";
  if (lower.includes(".glb") || lower.includes(".gltf")) return "GLB";
  if (lower.includes(".obj")) return "OBJ";
  if (lower.includes(".fbx")) return "FBX";
  if (lower.includes(".usdz")) return "USDZ";
  return "GLB";
};

const getModelName = (styleId: string): string => {
  if (styleId === "3D_TRELLIS") return "TRELLIS";
  if (styleId === "3D_HUNYUAN3D") return "Hunyuan3D";
  if (styleId === "3D_WONDER3D") return "Wonder3D";
  if (styleId?.startsWith("3D_")) return styleId.replace("3D_", "");
  return styleId?.replace(/_/g, " ") || "Unknown";
};

// ===========================================
// MAIN COMPONENT
// ===========================================
export default function GalleryPage() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterType, setFilterType] = useState<"all" | "2d" | "3d">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Multi-select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  // Toast state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (type: ToastMessage["type"], title: string, description?: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, title, description }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    loadGenerations();
  }, []);

  const loadGenerations = async () => {
    setLoading(true);
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
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this generation?")) return;

    try {
      const response = await fetch(`/api/generations/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setGenerations(generations.filter((g) => g.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete:", error);
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
    setSelectedIds(prev => {
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
    const allIds = new Set(filteredGenerations.map(g => g.id));
    setSelectedIds(allIds);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const count = selectedIds.size;
    if (!confirm(`Are you sure you want to delete ${count} item(s)? This cannot be undone.`)) return;

    setDeleting(true);
    try {
      const response = await fetch("/api/generations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (response.ok) {
        const data = await response.json();
        setGenerations(prev => prev.filter(g => !selectedIds.has(g.id)));
        clearSelection();
        alert(`Successfully deleted ${data.deleted} item(s).`);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete items");
      }
    } catch (error) {
      console.error("Bulk delete failed:", error);
      alert("Failed to delete items. Please try again.");
    } finally {
      setDeleting(false);
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
        setGenerations(prev => prev.map(g =>
          g.id === gen.id ? { ...g, isPublic: newIsPublic } : g
        ));
        if (newIsPublic) {
          showToast(
            "success",
            "Shared to Community!",
            "Your creation is now visible to everyone in the community gallery."
          );
        } else {
          showToast(
            "info",
            "Removed from Community",
            "Your creation is now private."
          );
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

  const filteredGenerations = generations.filter((gen) => {
    const matchesSearch = gen.prompt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || gen.categoryId === filterCategory;
    
    const is3D = is3DFormat(gen.imageUrl) || is3DStyle(gen.styleId);
    const matchesType = filterType === "all" || 
      (filterType === "3d" && is3D) || 
      (filterType === "2d" && !is3D);
    
    return matchesSearch && matchesCategory && matchesType;
  });

  const total2D = generations.filter(g => !is3DFormat(g.imageUrl) && !is3DStyle(g.styleId)).length;
  const total3D = generations.filter(g => is3DFormat(g.imageUrl) || is3DStyle(g.styleId)).length;

  return (
    <div className="min-h-screen bg-[#030305] relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      <div className="fixed inset-0 grid-pattern pointer-events-none opacity-50" />
      <div className="fixed top-20 left-10 w-96 h-96 bg-[#00ff88]/10 rounded-full blur-[120px] animate-glow-pulse pointer-events-none" />
      <div className="fixed bottom-20 right-10 w-80 h-80 bg-[#00d4ff]/10 rounded-full blur-[100px] animate-glow-pulse pointer-events-none" style={{ animationDelay: "1s" }} />

      <div className="relative z-10 p-4 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-display font-black gradient-text neon-text mb-2">
                YOUR GALLERY
              </h1>
              <p className="text-muted-foreground">
                {filteredGenerations.length} assets • {total2D} sprites • {total3D} 3D models
              </p>
            </div>
            <Link href="/generate">
              <Button className="btn-primary">
                <Sparkles className="w-4 h-4 mr-2" />
                Generate New
              </Button>
            </Link>
          </div>

          {/* Controls */}
          <div className="glass-card rounded-2xl p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by prompt..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 input-gaming"
                />
              </div>

              {/* Type Filter */}
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterType("all")}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    filterType === "all"
                      ? "bg-white/10 text-white"
                      : "text-muted-foreground hover:text-white"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterType("2d")}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
                    filterType === "2d"
                      ? "bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30"
                      : "text-muted-foreground hover:text-[#00ff88]"
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  2D ({total2D})
                </button>
                <button
                  onClick={() => setFilterType("3d")}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
                    filterType === "3d"
                      ? "bg-[#c084fc]/20 text-[#c084fc] border border-[#c084fc]/30"
                      : "text-muted-foreground hover:text-[#c084fc]"
                  }`}
                >
                  <Cuboid className="w-4 h-4" />
                  3D ({total3D})
                </button>
              </div>

              {/* Category Filter */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-2 rounded-lg bg-[#1a1a28] border border-border text-white focus:border-[#00ff88] focus:outline-none"
              >
                <option value="all">All Categories</option>
                <option value="WEAPONS">Weapons</option>
                <option value="ARMOR">Armor</option>
                <option value="CONSUMABLES">Consumables</option>
                <option value="RESOURCES">Resources</option>
                <option value="CHARACTERS">Characters</option>
                <option value="CREATURES">Creatures</option>
                <option value="ENVIRONMENT">Environment</option>
              </select>

              {/* View Mode & Actions */}
              <div className="flex gap-2">
                {/* Select Mode Toggle */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectMode) {
                      clearSelection();
                    } else {
                      setSelectMode(true);
                    }
                  }}
                  className={selectMode
                    ? "border-[#ff6b6b] bg-[#ff6b6b]/10 text-[#ff6b6b]"
                    : "border-border"
                  }
                >
                  {selectMode ? (
                    <>
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-4 h-4 mr-1" />
                      Select
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setViewMode("grid")}
                  className={viewMode === "grid" ? "border-[#00ff88] bg-[#00ff88]/10" : "border-border"}
                >
                  <Grid3x3 className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setViewMode("list")}
                  className={viewMode === "list" ? "border-[#00ff88] bg-[#00ff88]/10" : "border-border"}
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={loadGenerations}
                  className="border-border"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-[#00ff88] animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading your gallery...</p>
            </div>
          </div>
        ) : filteredGenerations.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            {/* Coreling waving for empty state */}
            <div className="w-32 h-32 mx-auto mb-6 relative">
              <div className="absolute inset-0 bg-[#c084fc]/20 rounded-full blur-2xl" />
              <img
                src="/coreling-wave.png"
                alt="Coreling Waving"
                className="relative w-full h-full object-contain animate-float drop-shadow-xl"
              />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {searchQuery || filterCategory !== "all" || filterType !== "all"
                ? "No Matches Found"
                : "Your Gallery is Empty!"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery || filterCategory !== "all" || filterType !== "all"
                ? "No assets match your filters. Try adjusting your search."
                : "Coreling is waiting for you to create some amazing assets!"}
            </p>
            <Link href="/generate">
              <Button className="btn-primary">
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Your First Asset
              </Button>
            </Link>
          </div>
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                : "space-y-4"
            }
          >
            {filteredGenerations.map((gen) => {
              const is3D = is3DFormat(gen.imageUrl) || is3DStyle(gen.styleId);
              const format3D = is3D ? get3DFormat(gen.imageUrl) : null;
              
              return (
                <div
                  key={gen.id}
                  className={`glass-card rounded-xl overflow-hidden group hover:border-${is3D ? '[#c084fc]' : '[#00ff88]'}/50 transition-all ${
                    selectMode && selectedIds.has(gen.id) ? 'ring-2 ring-[#00ff88] border-[#00ff88]' : ''
                  }`}
                  onClick={() => selectMode && toggleSelect(gen.id)}
                >
                  {/* Preview */}
                  <div className="aspect-square bg-[#0a0a0f] relative overflow-hidden">
                    <div className="absolute inset-0 grid-pattern-dense opacity-30" />

                    {/* Selection checkbox */}
                    {selectMode && (
                      <div className="absolute top-2 right-2 z-30">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect(gen.id);
                          }}
                          className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                            selectedIds.has(gen.id)
                              ? 'bg-[#00ff88] text-black'
                              : 'bg-black/50 border border-white/30 text-white hover:border-[#00ff88]'
                          }`}
                        >
                          {selectedIds.has(gen.id) ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    )}

                    {/* Badges row */}
                    <div className="absolute top-2 left-2 z-20 flex gap-1">
                      {/* 3D indicator badge */}
                      {is3D && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#c084fc]/90 text-white text-xs font-bold">
                          <Cuboid className="w-3 h-3" />
                          {format3D}
                        </div>
                      )}
                      {/* Shared to community badge */}
                      {gen.isPublic && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#c084fc]/90 text-white text-xs font-bold">
                          <Users className="w-3 h-3" />
                          Shared
                        </div>
                      )}
                    </div>
                    
                    {is3D ? (
                      // 3D Model placeholder
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 relative z-10">
                        <div className="relative mb-3">
                          <div className="absolute inset-0 bg-[#c084fc]/30 rounded-full blur-xl animate-pulse" />
                          <FileBox className="relative w-16 h-16 text-[#c084fc]" />
                        </div>
                        <span className="text-sm font-medium text-white">3D Model</span>
                        <span className="text-xs text-[#c084fc] font-mono">{format3D}</span>
                        <span className="text-xs text-muted-foreground mt-1">{getModelName(gen.styleId)}</span>
                      </div>
                    ) : (
                      // 2D Image
                      <img
                        src={gen.imageUrl}
                        alt={gen.prompt}
                        className="w-full h-full object-contain p-4 relative z-10"
                      />
                    )}
                    
                    {/* Hover Actions */}
                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 z-20 p-4">
                      {/* Only show edit options for 2D */}
                      {!is3D && (
                        <>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`/edit?id=${gen.id}`, "_blank")}
                              className="border-[#c084fc] bg-[#c084fc]/10 hover:bg-[#c084fc]/20 text-[#c084fc]"
                              title="Edit Image"
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`/upscale?id=${gen.id}`, "_blank")}
                              className="border-[#ffd93d] bg-[#ffd93d]/10 hover:bg-[#ffd93d]/20 text-[#ffd93d]"
                              title="Upscale Image"
                            >
                              <Maximize2 className="w-4 h-4 mr-1" />
                              Upscale
                            </Button>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`/variations?id=${gen.id}`, "_blank")}
                              className="border-[#00d4ff] bg-[#00d4ff]/10 hover:bg-[#00d4ff]/20 text-[#00d4ff]"
                              title="Create Variations"
                            >
                              <Shuffle className="w-4 h-4 mr-1" />
                              Variations
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`/remove-bg?id=${gen.id}`, "_blank")}
                              className="border-[#00ff88] bg-[#00ff88]/10 hover:bg-[#00ff88]/20 text-[#00ff88]"
                              title="Remove Background"
                            >
                              <Scissors className="w-4 h-4 mr-1" />
                              Remove BG
                            </Button>
                          </div>
                        </>
                      )}

                      {/* Utility Actions - Always show */}
                      <div className={`flex gap-2 ${!is3D ? 'mt-2 pt-2 border-t border-white/10' : ''}`}>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleShare(gen);
                          }}
                          className={gen.isPublic
                            ? "border-[#c084fc] bg-[#c084fc]/20 hover:bg-[#c084fc]/30"
                            : "border-white/20 bg-white/5 hover:bg-white/10"
                          }
                          title={gen.isPublic ? "Remove from Community" : "Share to Community"}
                        >
                          {gen.isPublic ? (
                            <Globe className="w-4 h-4 text-[#c084fc]" />
                          ) : (
                            <Share2 className="w-4 h-4 text-white" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleDownload(gen)}
                          className={is3D
                            ? "border-[#c084fc] bg-[#c084fc]/10 hover:bg-[#c084fc]/20"
                            : "border-white/20 bg-white/5 hover:bg-white/10"
                          }
                          title="Download"
                        >
                          <Download className={`w-4 h-4 ${is3D ? 'text-[#c084fc]' : 'text-white'}`} />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => window.open(gen.imageUrl, "_blank")}
                          className="border-white/20 bg-white/5 hover:bg-white/10"
                          title="Open in New Tab"
                        >
                          <ExternalLink className="w-4 h-4 text-white" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleDelete(gen.id)}
                          className="border-destructive bg-destructive/10 hover:bg-destructive/20"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                      
                      {/* 3D specific info */}
                      {is3D && (
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                          Download {format3D} for Unity, Unreal, Blender, Godot
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 border-t border-border">
                    <p className="text-sm text-white font-medium mb-2 line-clamp-2">
                      {gen.prompt.replace(/^\[3D\]\s*/, '')}
                    </p>
                    
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <Badge className={`text-xs ${
                        is3D 
                          ? 'bg-[#c084fc]/10 text-[#c084fc] border-[#c084fc]/30'
                          : 'bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/30'
                      }`}>
                        {gen.categoryId}
                      </Badge>
                      <Badge className={`text-xs ${
                        is3D
                          ? 'bg-[#c084fc]/10 text-[#c084fc] border-[#c084fc]/30'
                          : 'bg-[#00d4ff]/10 text-[#00d4ff] border-[#00d4ff]/30'
                      }`}>
                        {is3D ? `${format3D} • ${getModelName(gen.styleId)}` : getModelName(gen.styleId)}
                      </Badge>
                    </div>

                    {gen.seed && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono">Seed: {gen.seed}</span>
                        <button
                          onClick={() => copySeed(gen.seed!, gen.id)}
                          className="p-1 hover:bg-white/10 rounded transition-colors"
                        >
                          {copiedId === gen.id ? (
                            <Check className="w-3 h-3 text-[#00ff88]" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(gen.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Floating Selection Action Bar */}
        {selectMode && selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="glass-card rounded-2xl p-4 flex items-center gap-4 border border-[#00ff88]/30 shadow-lg shadow-[#00ff88]/10">
              <span className="text-white font-medium">
                {selectedIds.size} selected
              </span>

              <div className="h-6 w-px bg-border" />

              <Button
                size="sm"
                variant="outline"
                onClick={selectAll}
                className="border-[#00d4ff] bg-[#00d4ff]/10 text-[#00d4ff] hover:bg-[#00d4ff]/20"
              >
                <CheckSquare className="w-4 h-4 mr-1" />
                Select All ({filteredGenerations.length})
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedIds(new Set())}
                className="border-border"
              >
                Clear
              </Button>

              <div className="h-6 w-px bg-border" />

              <Button
                size="sm"
                onClick={handleBulkDelete}
                disabled={deleting}
                className="bg-destructive hover:bg-destructive/90 text-white"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete Selected
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Toast Container */}
        {toasts.length > 0 && (
          <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
            {toasts.map((toast) => (
              <SuccessToast
                key={toast.id}
                message={toast}
                onClose={() => removeToast(toast.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}