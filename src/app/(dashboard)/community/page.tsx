"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "@/components/ui/use-toast";
import Link from "next/link";
import {
  Download,
  Search,
  LayoutGrid,
  Loader2,
  ImageIcon,
  Cuboid,
  RefreshCw,
  ExternalLink,
  Heart,
  Users,
  TrendingUp,
  Clock,
  FileBox,
  Sparkles,
  MessageCircle,
  X,
  Send,
  MessageSquare,
  ChevronRight,
  Crown,
  Flame,
  Eye,
  Zap,
  Star,
  Trophy,
  Plus,
} from "lucide-react";
import { CHECKERBOARD, CommunityAvatar, isPixelStyleId } from "@/components/community/shared";

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
  likes: number;
  createdAt: string;
  user?: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
}

interface Comment {
  id: string;
  userId: string;
  message: string;
  createdAt: string;
  userName: string | null;
  userAvatar: string | null;
}

interface ChatMessage {
  id: string;
  userId: string;
  message: string;
  createdAt: string;
  userName: string | null;
  userAvatar: string | null;
  userPlan: string;
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

const getPlanBadge = (plan: string) => {
  switch (plan) {
    case "UNLIMITED":
      return { label: "Studio", icon: Crown, color: "border-amber-400/20 bg-amber-500/[0.06] text-amber-200" };
    case "PRO":
      return { label: "Pro", icon: Zap, color: "border-[#FF8A3D]/25 bg-[#FF8A3D]/10 text-[#FFB27A]" };
    case "STARTER":
      return { label: "Starter", icon: Star, color: "border-sky-400/20 bg-sky-500/[0.06] text-sky-200" };
    default:
      return null;
  }
};

const cleanPrompt = (prompt: string) => prompt.replace(/^\[3D\]\s*/, "");

const CATEGORIES = [
  { id: "all", label: "All", icon: LayoutGrid },
  { id: "WEAPONS", label: "Weapons", icon: Zap },
  { id: "ARMOR", label: "Armor", icon: Trophy },
  { id: "CONSUMABLES", label: "Potions", icon: Flame },
  { id: "RESOURCES", label: "Resources", icon: Star },
  { id: "CHARACTERS", label: "Characters", icon: Users },
  { id: "CREATURES", label: "Creatures", icon: Eye },
  { id: "ENVIRONMENT", label: "Environment", icon: Sparkles },
];

// ===========================================
// MAIN COMPONENT
// ===========================================
export default function CommunityPage() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterType, setFilterType] = useState<"all" | "2d" | "3d">("all");
  const [sortBy, setSortBy] = useState<"newest" | "popular">("newest");
  const [total, setTotal] = useState(0);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  // Detail modal state
  const [selectedGen, setSelectedGen] = useState<Generation | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [userLiked, setUserLiked] = useState(false);
  const [likingInProgress, setLikingInProgress] = useState(false);

  // Chat state — collapsed by default; auto-opened on wide (>= 1536px) screens.
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loadingChat, setLoadingChat] = useState(true);
  const [newChatMessage, setNewChatMessage] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const chatCountRef = useRef(0);
  const chatPollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadCommunityGallery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCategory, filterType, sortBy]);

  useEffect(() => {
    loadChatMessages();
    chatPollRef.current = setInterval(() => {
      loadChatMessages();
    }, 5000);
    return () => {
      if (chatPollRef.current) clearInterval(chatPollRef.current);
    };
  }, []);

  // Open the chat panel by default only when there is room for it.
  useEffect(() => {
    const t = setTimeout(() => {
      if (window.matchMedia("(min-width: 1536px)").matches) setChatOpen(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // Keep the chat pinned to the newest message — only when new messages
  // arrive (not on every poll) so reading history isn't interrupted.
  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    if (chatMessages.length !== chatCountRef.current) {
      chatCountRef.current = chatMessages.length;
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [chatMessages]);

  useEffect(() => {
    if (chatOpen && chatScrollRef.current) {
      chatScrollRef.current.scrollTo({ top: chatScrollRef.current.scrollHeight });
    }
  }, [chatOpen]);

  useEffect(() => {
    if (selectedGen) {
      loadComments(selectedGen.id);
      checkUserLiked(selectedGen.id);
    }
  }, [selectedGen]);

  // Close the detail modal with Escape.
  const modalOpen = selectedGen !== null;
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedGen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  const loadChatMessages = async () => {
    try {
      const response = await fetch("/api/chat?limit=100");
      if (response.ok) {
        const data = await response.json();
        const serverMessages = data.messages || [];

        // Merge server messages with any locally added messages
        // This prevents messages from disappearing while waiting for server sync
        setChatMessages(prev => {
          // Create a map of server message IDs
          const serverIds = new Set(serverMessages.map((m: ChatMessage) => m.id));

          // Keep any local messages that aren't on the server yet (recently sent)
          const localOnlyMessages = prev.filter(m =>
            !serverIds.has(m.id) &&
            // Only keep messages sent within the last 10 seconds
            new Date(m.createdAt).getTime() > Date.now() - 10000
          );

          // Merge: server messages + any pending local messages
          return [...serverMessages, ...localOnlyMessages].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        });
      }
    } catch (error) {
      console.error("Failed to load chat:", error);
    } finally {
      setLoadingChat(false);
    }
  };

  const handleSendChatMessage = async () => {
    if (!newChatMessage.trim() || sendingChat) return;
    setSendingChat(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newChatMessage.trim() }),
      });
      if (response.ok) {
        const data = await response.json();
        setChatMessages(prev => [...prev, data.message]);
        setNewChatMessage("");
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Couldn't send message",
          description: error.error || "Please try again.",
        });
      }
    } catch (error) {
      console.error("Failed to send chat:", error);
    } finally {
      setSendingChat(false);
    }
  };

  const loadComments = async (generationId: string) => {
    setLoadingComments(true);
    try {
      const response = await fetch(`/api/community/${generationId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error("Failed to load comments:", error);
    } finally {
      setLoadingComments(false);
    }
  };

  const checkUserLiked = async (generationId: string) => {
    try {
      const response = await fetch(`/api/community/${generationId}/like`);
      if (response.ok) {
        const data = await response.json();
        setUserLiked(data.liked);
      }
    } catch (error) {
      console.error("Failed to check like status:", error);
    }
  };

  const handleLike = async () => {
    if (!selectedGen || likingInProgress) return;
    setLikingInProgress(true);
    try {
      const response = await fetch(`/api/community/${selectedGen.id}/like`, {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        setUserLiked(data.liked);
        setGenerations(prev => prev.map(g =>
          g.id === selectedGen.id ? { ...g, likes: data.likes } : g
        ));
        setSelectedGen(prev => prev ? { ...prev, likes: data.likes } : null);
      }
    } catch (error) {
      console.error("Failed to like:", error);
    } finally {
      setLikingInProgress(false);
    }
  };

  const handlePostComment = async () => {
    if (!selectedGen || !newComment.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const response = await fetch(`/api/community/${selectedGen.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newComment.trim() }),
      });
      if (response.ok) {
        const data = await response.json();
        setComments(prev => [data.comment, ...prev]);
        setNewComment("");
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Couldn't post comment",
          description: error.error || "Please try again.",
        });
      }
    } catch (error) {
      console.error("Failed to post comment:", error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const loadCommunityGallery = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        category: filterCategory,
        type: filterType,
        sort: sortBy,
        limit: "100",
      });
      const response = await fetch(`/api/community?${params}`);
      if (response.ok) {
        const data = await response.json();
        setGenerations(data.generations || []);
        setTotal(data.total || 0);
        setCategoryCounts(data.categoryCounts || {});
      }
    } catch (error) {
      console.error("Failed to load community gallery:", error);
    } finally {
      setLoading(false);
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

  const filteredGenerations = generations.filter((gen) => {
    return gen.prompt.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const total2D = generations.filter(g => !is3DFormat(g.imageUrl) && !is3DStyle(g.styleId)).length;
  const total3D = generations.filter(g => is3DFormat(g.imageUrl) || is3DStyle(g.styleId)).length;

  // Get featured (top liked) assets
  const featuredAssets = [...generations].sort((a, b) => b.likes - a.likes).slice(0, 3);

  const hasFilters = searchQuery !== "" || filterCategory !== "all" || filterType !== "all";

  const TYPE_TABS = [
    { id: "all" as const, label: "All", icon: null },
    { id: "2d" as const, label: "2D", icon: ImageIcon, count: total2D },
    { id: "3d" as const, label: "3D", icon: Cuboid, count: total3D },
  ];

  const SORT_TABS = [
    { id: "newest" as const, label: "Newest", icon: Clock },
    { id: "popular" as const, label: "Popular", icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-[#0B0D12] text-[#ECEEF3]">
      <div className={`transition-[padding] duration-300 ${chatOpen ? "lg:pr-[320px]" : ""}`}>
        <div className="mx-auto max-w-[1400px] px-5 py-6 lg:px-8">
          {/* ═══ Header ═══════════════════════════════════════════════ */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-[26px] font-semibold leading-tight tracking-normal text-white">Explore</h1>
              <p className="mt-1 text-[13px] text-[#8B93A5]">Discover sprites shared by the community</p>
              <p className="mt-1.5 font-mono text-[11.5px] text-[#8B93A5]">
                <span className="mr-1.5 text-[#FF8A3D]">&gt;</span>
                <span className="font-mono tabular-nums text-[#C9CFDB]">{total}</span> creations
                <span className="mx-1.5 text-[#7A8294]">·</span>
                <span className="font-mono tabular-nums text-[#C9CFDB]">{total2D}</span> 2D
                <span className="mx-1.5 text-[#7A8294]">·</span>
                <span className="font-mono tabular-nums text-[#C9CFDB]">{total3D}</span> 3D
                <span className="caret ml-1.5 align-[-2px]" aria-hidden="true" />
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadCommunityGallery}
                title="Refresh"
                aria-label="Refresh gallery"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] text-[#C9CFDB] transition hover:bg-white/[0.08] hover:text-white"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button
                type="button"
                onClick={() => setChatOpen(v => !v)}
                aria-pressed={chatOpen}
                className={`flex h-10 items-center gap-2 rounded-xl border px-3.5 text-[13px] font-medium transition ${
                  chatOpen
                    ? "border-[#FF8A3D]/40 bg-[#FF8A3D]/10 text-white"
                    : "border-white/[0.1] bg-white/[0.04] text-[#C9CFDB] hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                <MessageSquare className={`h-4 w-4 ${chatOpen ? "text-[#FF8A3D]" : ""}`} />
                <span className="hidden sm:inline">Live chat</span>
                {chatMessages.length > 0 && (
                  <span className="rounded-full bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-semibold font-mono tabular-nums text-[#C9CFDB]">
                    {chatMessages.length > 99 ? "99+" : chatMessages.length}
                  </span>
                )}
              </button>
              <Link
                href="/generate"
                className="flex h-10 items-center gap-2 px-corners bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] px-4 text-[13px] font-semibold text-white transition hover:brightness-110"
              >
                <Plus className="h-4 w-4" strokeWidth={2.4} />
                Create
              </Link>
            </div>
          </div>

          {/* ═══ Trending ═════════════════════════════════════════════ */}
          {featuredAssets.length > 0 && featuredAssets[0].likes > 0 && (
            <section className="mt-6">
              <div className="mb-2.5 flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-[#FF8A3D]" />
                <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#8B93A5]">Trending now</h2>
              </div>
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
                {featuredAssets.map((gen, index) => {
                  const is3D = is3DFormat(gen.imageUrl) || is3DStyle(gen.styleId);
                  return (
                    <button
                      key={gen.id}
                      type="button"
                      onClick={() => setSelectedGen(gen)}
                      className="group flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-[#0E1016] p-2 pr-3 text-left transition-colors hover:border-white/20 hover:bg-[#151922]"
                    >
                      <div
                        className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/[0.06] bg-[#151922]"
                        style={CHECKERBOARD}
                      >
                        {is3D ? (
                          <FileBox className="absolute inset-0 m-auto h-6 w-6 text-[#FF8A3D]" />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={gen.imageUrl}
                            alt={gen.prompt}
                            loading="lazy"
                            className={`h-full w-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-110 ${isPixelStyleId(gen.styleId) ? "pixel-perfect" : ""}`}
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-white">{cleanPrompt(gen.prompt)}</p>
                        <p className="mt-0.5 truncate text-[12px] text-[#8B93A5]">by {gen.user?.name || "Anonymous"}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-[11px] font-semibold font-mono tabular-nums text-[#7A8294]">#{index + 1}</span>
                        <span className="flex items-center gap-1 text-[12px] font-mono tabular-nums text-[#C9CFDB]">
                          <Heart className="h-3 w-3 fill-rose-400 text-rose-400" />
                          {gen.likes}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* ═══ Toolbar ══════════════════════════════════════════════ */}
          <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1 lg:max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A8294]" />
              <input
                type="text"
                placeholder="Search prompts…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#151922] pl-10 pr-9 text-[13px] text-white outline-none transition-colors placeholder:text-[#7A8294] focus:border-[#FF8A3D]/50"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg text-[#8B93A5] hover:bg-white/[0.06] hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
              <div className="flex items-center gap-1 rounded-xl bg-white/[0.04] p-1">
                {TYPE_TABS.map((tab) => {
                  const active = filterType === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFilterType(tab.id)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
                        active ? "bg-white/[0.1] text-white shadow-sm" : "text-[#8B93A5] hover:text-white"
                      }`}
                    >
                      {Icon && <Icon className={`h-3.5 w-3.5 ${active ? "text-[#FF8A3D]" : ""}`} />}
                      {tab.label}
                      {tab.count !== undefined && (
                        <span className={`font-mono tabular-nums ${active ? "text-[#C9CFDB]" : "text-[#7A8294]"}`}>{tab.count}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1 rounded-xl bg-white/[0.04] p-1">
                {SORT_TABS.map((tab) => {
                  const active = sortBy === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSortBy(tab.id)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
                        active ? "bg-white/[0.1] text-white shadow-sm" : "text-[#8B93A5] hover:text-white"
                      }`}
                    >
                      <tab.icon className={`h-3.5 w-3.5 ${active ? "text-[#FF8A3D]" : ""}`} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Category chips */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const active = filterCategory === cat.id;
              const count = cat.id === "all" ? total : (categoryCounts[cat.id] || 0);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFilterCategory(cat.id)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                    active
                      ? "border-[#FF8A3D]/60 bg-[#FF8A3D]/12 text-white"
                      : "border-white/[0.08] text-[#9BA3B4] hover:border-white/20 hover:text-white"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${active ? "text-[#FF8A3D]" : ""}`} />
                  {cat.label}
                  {count > 0 && (
                    <span className={`font-mono tabular-nums ${active ? "text-[#FFB27A]" : "text-[#7A8294]"}`}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ═══ Gallery ══════════════════════════════════════════════ */}
          <div className="mt-5">
            {!loading && searchQuery && filteredGenerations.length > 0 && (
              <p className="mb-3 text-[12px] text-[#8B93A5]">
                {filteredGenerations.length} result{filteredGenerations.length === 1 ? "" : "s"} for{" "}
                <span className="text-[#C9CFDB]">&ldquo;{searchQuery}&rdquo;</span>
              </p>
            )}

            {loading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {Array.from({ length: 18 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square animate-pulse rounded-2xl bg-white/[0.04]"
                    style={{ animationDelay: `${i * 40}ms` }}
                  />
                ))}
              </div>
            ) : filteredGenerations.length === 0 ? (
              <div className="flex flex-col items-center justify-center pixel-grid rounded-2xl border border-white/[0.06] bg-[#0E1016] px-6 py-20 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04]">
                  {hasFilters ? <Search className="h-5 w-5 text-[#8B93A5]" /> : <Users className="h-5 w-5 text-[#8B93A5]" />}
                </div>
                <h3 className="text-[15px] font-semibold text-white">
                  {hasFilters ? "No matches" : "Nothing shared yet"}
                </h3>
                <p className="mt-1 max-w-sm text-[13px] text-[#8B93A5]">
                  {hasFilters
                    ? "No assets match your filters. Try adjusting your search."
                    : "Be the first to share your creations with the community!"}
                </p>
                <Link
                  href="/generate"
                  className="mt-5 flex h-10 items-center gap-2 px-corners bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] px-4 text-[13px] font-semibold text-white transition hover:brightness-110"
                >
                  <Sparkles className="h-4 w-4" />
                  Create an asset
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {filteredGenerations.map((gen) => {
                  const is3D = is3DFormat(gen.imageUrl) || is3DStyle(gen.styleId);
                  const format3D = is3D ? get3DFormat(gen.imageUrl) : null;

                  return (
                    <div
                      key={gen.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedGen(gen)}
                      onKeyDown={(e) => {
                        if (e.target !== e.currentTarget) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedGen(gen);
                        }
                      }}
                      title={`${cleanPrompt(gen.prompt)} · ${new Date(gen.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
                      className="group relative aspect-square cursor-pointer overflow-hidden rounded-2xl border border-white/[0.06] bg-[#151922] outline-none transition-colors hover:border-white/20 focus-visible:border-[#FF8A3D] focus-visible:ring-2 focus-visible:ring-[#FF8A3D]/25"
                      style={CHECKERBOARD}
                    >
                      {is3D ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pb-8">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04]">
                            <FileBox className="h-7 w-7 text-[#FF8A3D]" />
                          </div>
                          <span className="text-[11px] text-[#8B93A5]">{getModelName(gen.styleId)}</span>
                        </div>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={gen.imageUrl}
                          alt={gen.prompt}
                          loading="lazy"
                          className={`absolute inset-0 h-full w-full object-contain p-[10%] pb-[20%] transition-transform duration-300 group-hover:scale-105 ${isPixelStyleId(gen.styleId) ? "pixel-perfect" : ""}`}
                        />
                      )}

                      {/* Type chip — only 3D is called out; 2D is the default */}
                      {is3D && (
                        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full border border-white/[0.08] bg-black/45 px-2 py-0.5 font-mono text-[10px] font-medium text-[#C9CFDB] backdrop-blur-sm">
                          <Cuboid className="h-3 w-3 text-[#FF8A3D]" />
                          {format3D}
                        </span>
                      )}

                      {/* Hover actions */}
                      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                        <button
                          type="button"
                          title="Download"
                          aria-label="Download"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(gen);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.1] bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/75"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Open original"
                          aria-label="Open original"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(gen.imageUrl, "_blank");
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.1] bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/75"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Bottom info */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-3 pb-2.5 pt-8">
                        <p className="line-clamp-1 text-[12px] font-medium text-white">{cleanPrompt(gen.prompt)}</p>
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <CommunityAvatar src={gen.user?.avatarUrl} name={gen.user?.name} size={16} />
                            <span className="truncate text-[11px] text-[#C9CFDB]">{gen.user?.name || "Anonymous"}</span>
                          </div>
                          <span className={`flex shrink-0 items-center gap-1 text-[11px] font-mono tabular-nums ${gen.likes > 0 ? "text-[#ECEEF3]" : "text-[#8B93A5]"}`}>
                            <Heart className={`h-3 w-3 ${gen.likes > 0 ? "fill-rose-400 text-rose-400" : ""}`} />
                            {gen.likes}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Live chat panel ══════════════════════════════════════════ */}
      <aside
        aria-label="Live chat"
        inert={!chatOpen}
        className={`fixed bottom-12 right-0 top-12 z-30 flex w-full max-w-[320px] flex-col border-l border-white/[0.06] bg-[#0E1016] shadow-[-20px_0_40px_-20px_rgba(0,0,0,0.6)] transition-transform duration-300 md:bottom-0 md:top-0 ${
          chatOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04]">
              <MessageSquare className="h-4 w-4 text-[#FF8A3D]" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-white">Live chat</h3>
              <p className="flex items-center gap-1.5 font-mono text-[10.5px] text-[#8B93A5]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {chatMessages.length} messages
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setChatOpen(false)}
            aria-label="Collapse chat"
            title="Collapse chat"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8B93A5] transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div ref={chatScrollRef} className="flex-1 space-y-3.5 overflow-y-auto px-4 py-4">
          {loadingChat ? (
            <div className="space-y-3.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-white/[0.04]" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-20 animate-pulse rounded bg-white/[0.04]" />
                    <div className="h-8 animate-pulse rounded-xl bg-white/[0.04]" />
                  </div>
                </div>
              ))}
            </div>
          ) : chatMessages.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04]">
                <MessageSquare className="h-5 w-5 text-[#8B93A5]" />
              </div>
              <p className="text-[13px] font-medium text-white">No messages yet</p>
              <p className="mt-1 text-[12px] text-[#8B93A5]">Be the first to say hello!</p>
            </div>
          ) : (
            chatMessages.map((msg) => {
              const planBadge = getPlanBadge(msg.userPlan);
              return (
                <div key={msg.id} className="group flex items-start gap-2.5">
                  <CommunityAvatar src={msg.userAvatar} name={msg.userName} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-1.5">
                      <span className="truncate text-[12.5px] font-medium text-white">
                        {msg.userName || "Anonymous"}
                      </span>
                      {planBadge && (
                        <span className={`flex shrink-0 items-center gap-0.5 rounded-full border px-1.5 py-px text-[10px] font-medium ${planBadge.color}`}>
                          <planBadge.icon className="h-2.5 w-2.5" />
                          {planBadge.label}
                        </span>
                      )}
                      <span className="ml-auto shrink-0 text-[10px] font-mono tabular-nums text-[#7A8294] opacity-0 transition-opacity group-hover:opacity-100">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="rounded-xl rounded-tl-sm bg-white/[0.04] px-3 py-2">
                      <p className="break-words text-[13px] leading-snug text-[#ECEEF3]">{msg.message}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-white/[0.06] p-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Say something…"
              value={newChatMessage}
              onChange={(e) => setNewChatMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendChatMessage()}
              maxLength={500}
              className="h-10 min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-[#151922] px-3 text-[13px] text-white outline-none transition-colors placeholder:text-[#7A8294] focus:border-[#FF8A3D]/50"
            />
            <button
              type="button"
              onClick={handleSendChatMessage}
              disabled={!newChatMessage.trim() || sendingChat}
              aria-label="Send message"
              className="flex h-10 w-10 shrink-0 items-center justify-center px-corners bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sendingChat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-2 text-center font-mono text-[10px] text-[#7A8294]">Be kind · Max 10 messages/min</p>
        </div>
      </aside>

      {/* ═══ Detail modal ═════════════════════════════════════════════ */}
      {selectedGen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedGen(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={cleanPrompt(selectedGen.prompt)}
            className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0E1016] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] animate-in zoom-in-95 duration-200 md:flex-row"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedGen(null)}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.1] bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Preview */}
            <div
              className="relative h-[38vh] shrink-0 bg-[#151922] md:h-auto md:w-[56%] md:aspect-square"
              style={CHECKERBOARD}
            >
              {is3DFormat(selectedGen.imageUrl) || is3DStyle(selectedGen.styleId) ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/[0.04]">
                    <FileBox className="h-10 w-10 text-[#FF8A3D]" />
                  </div>
                  <span className="text-[15px] font-semibold text-white">3D Model</span>
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-[#C9CFDB]">
                    {get3DFormat(selectedGen.imageUrl)}
                  </span>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedGen.imageUrl}
                  alt={selectedGen.prompt}
                  className={`absolute inset-0 h-full w-full object-contain p-[8%] ${isPixelStyleId(selectedGen.styleId) ? "pixel-perfect" : ""}`}
                />
              )}
            </div>

            {/* Details */}
            <div className="flex min-h-0 flex-1 flex-col md:border-l md:border-white/[0.06]">
              <div className="border-b border-white/[0.06] p-5">
                <div className="flex items-center gap-3 pr-10">
                  <CommunityAvatar src={selectedGen.user?.avatarUrl} name={selectedGen.user?.name} size={36} />
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-white">{selectedGen.user?.name || "Anonymous"}</p>
                    <p className="font-mono text-[11px] text-[#8B93A5]">{new Date(selectedGen.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <p className="mt-4 text-[14px] leading-relaxed text-[#ECEEF3]">{cleanPrompt(selectedGen.prompt)}</p>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] text-[#C9CFDB]">
                    {selectedGen.categoryId}
                  </span>
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] text-[#C9CFDB]">
                    {getModelName(selectedGen.styleId)}
                  </span>
                  {selectedGen.seed !== undefined && selectedGen.seed !== null && (
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] font-mono tabular-nums text-[#8B93A5]">
                      seed {selectedGen.seed}
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownload(selectedGen)}
                    className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 text-[13px] font-semibold text-black transition hover:bg-white/90"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={handleLike}
                    disabled={likingInProgress}
                    aria-pressed={userLiked}
                    className={`flex h-10 items-center gap-1.5 rounded-xl border px-3.5 text-[13px] font-medium font-mono tabular-nums transition disabled:opacity-60 ${
                      userLiked
                        ? "border-rose-400/20 bg-rose-500/[0.06] text-rose-200 hover:bg-rose-500/[0.1]"
                        : "border-white/[0.1] bg-white/[0.04] text-[#C9CFDB] hover:bg-white/[0.08]"
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${userLiked ? "fill-rose-400 text-rose-400" : ""}`} />
                    {selectedGen.likes}
                  </button>
                  <button
                    type="button"
                    onClick={() => window.open(selectedGen.imageUrl, "_blank")}
                    title="Open original"
                    aria-label="Open original"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] text-[#C9CFDB] transition hover:bg-white/[0.08]"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Comments */}
              <div className="min-h-[120px] flex-1 overflow-y-auto p-5">
                <h4 className="mb-4 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-[#8B93A5]">
                  <MessageCircle className="h-3.5 w-3.5" />
                  Comments
                  <span className="font-mono tabular-nums text-[#7A8294]">{comments.length}</span>
                </h4>

                {loadingComments ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-[#FF8A3D]" />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="py-6 text-center text-[13px] text-[#8B93A5]">
                    No comments yet. Be the first!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex items-start gap-2.5">
                        <CommunityAvatar src={comment.userAvatar} name={comment.userName} size={28} />
                        <div className="min-w-0 flex-1">
                          <div className="mb-0.5 flex items-center gap-2">
                            <span className="truncate text-[12.5px] font-medium text-white">{comment.userName || "Anonymous"}</span>
                            <span className="shrink-0 font-mono text-[10.5px] text-[#7A8294]">{new Date(comment.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="break-words text-[13px] leading-snug text-[#C9CFDB]">{comment.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Comment input */}
              <div className="border-t border-white/[0.06] p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Write a comment…"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handlePostComment()}
                    maxLength={500}
                    className="h-10 min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-[#151922] px-3 text-[13px] text-white outline-none transition-colors placeholder:text-[#7A8294] focus:border-[#FF8A3D]/50"
                  />
                  <button
                    type="button"
                    onClick={handlePostComment}
                    disabled={!newComment.trim() || submittingComment}
                    aria-label="Post comment"
                    className="flex h-10 w-10 shrink-0 items-center justify-center px-corners bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {submittingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
