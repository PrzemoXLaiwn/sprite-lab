"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Download,
  Search,
  Grid3x3,
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
  ChevronLeft,
  Crown,
  Flame,
  Eye,
  Zap,
  Star,
  Trophy,
} from "lucide-react";

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
      return { label: "VIP", icon: Crown, color: "bg-gradient-to-r from-yellow-400 to-amber-500 text-black" };
    case "PRO":
      return { label: "PRO", icon: Zap, color: "bg-gradient-to-r from-[#c084fc] to-[#a855f7] text-white" };
    case "STARTER":
      return { label: "★", icon: Star, color: "bg-gradient-to-r from-[#00d4ff] to-[#0ea5e9] text-white" };
    default:
      return null;
  }
};

const CATEGORIES = [
  { id: "all", label: "All", icon: LayoutGrid, color: "from-white/20 to-white/10" },
  { id: "WEAPONS", label: "Weapons", icon: Zap, color: "from-red-500/20 to-orange-500/20" },
  { id: "ARMOR", label: "Armor", icon: Trophy, color: "from-blue-500/20 to-cyan-500/20" },
  { id: "CONSUMABLES", label: "Potions", icon: Flame, color: "from-green-500/20 to-emerald-500/20" },
  { id: "RESOURCES", label: "Resources", icon: Star, color: "from-yellow-500/20 to-amber-500/20" },
  { id: "CHARACTERS", label: "Characters", icon: Users, color: "from-purple-500/20 to-pink-500/20" },
  { id: "CREATURES", label: "Creatures", icon: Eye, color: "from-rose-500/20 to-red-500/20" },
  { id: "ENVIRONMENT", label: "Environment", icon: Sparkles, color: "from-teal-500/20 to-cyan-500/20" },
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

  // Chat state
  const [chatOpen, setChatOpen] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loadingChat, setLoadingChat] = useState(true);
  const [newChatMessage, setNewChatMessage] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatPollRef = useRef<NodeJS.Timeout | null>(null);

  // Hover state for cards
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  useEffect(() => {
    loadCommunityGallery();
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

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  useEffect(() => {
    if (selectedGen) {
      loadComments(selectedGen.id);
      checkUserLiked(selectedGen.id);
    }
  }, [selectedGen]);

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
        alert(error.error || "Failed to send message");
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
        alert(error.error || "Failed to post comment");
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

  return (
    <div className="min-h-screen bg-[#030305] relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#c084fc]/10 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-[#00d4ff]/10 via-transparent to-transparent" />
        <div className="absolute inset-0 grid-pattern opacity-30" />

        {/* Floating orbs */}
        <div className="absolute top-20 left-[10%] w-72 h-72 bg-[#c084fc]/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-40 right-[20%] w-96 h-96 bg-[#00d4ff]/15 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-[#00ff88]/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <div className="relative z-10 flex h-screen">
        {/* Main Content */}
        <div className={`flex-1 overflow-y-auto transition-all duration-300 ${chatOpen ? 'mr-80' : 'mr-0'}`}>
          <div className="p-6 lg:p-8">
            {/* Hero Header */}
            <div className="mb-8">
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#c084fc]/20 via-[#0a0a0f] to-[#00d4ff]/20 border border-white/10 p-8 mb-8">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjAyIi8+PC9nPjwvc3ZnPg==')] opacity-50" />

                <div className="relative flex flex-col lg:flex-row items-center justify-between gap-6">
                  <div className="text-center lg:text-left">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm mb-4">
                      <Users className="w-4 h-4 text-[#00ff88]" />
                      <span className="text-white/80">{total} creations shared</span>
                      <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
                    </div>

                    <h1 className="text-4xl lg:text-5xl font-black mb-3">
                      <span className="bg-gradient-to-r from-white via-[#c084fc] to-[#00d4ff] bg-clip-text text-transparent">
                        Community Gallery
                      </span>
                    </h1>
                    <p className="text-white/60 text-lg max-w-xl">
                      Discover amazing game assets created by our community. Get inspired, download, and share your own creations!
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Link href="/generate">
                      <Button className="h-12 px-6 bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-black font-bold hover:opacity-90 transition-all hover:scale-105 shadow-lg shadow-[#00ff88]/25">
                        <Sparkles className="w-5 h-5 mr-2" />
                        Create Asset
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      className="h-12 px-6 border-white/20 hover:bg-white/10"
                      onClick={loadCommunityGallery}
                    >
                      <RefreshCw className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                {/* Stats Bar */}
                <div className="relative mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Total Assets", value: total, icon: ImageIcon, color: "text-[#00ff88]" },
                    { label: "2D Sprites", value: total2D, icon: ImageIcon, color: "text-[#00d4ff]" },
                    { label: "3D Models", value: total3D, icon: Cuboid, color: "text-[#c084fc]" },
                    { label: "Active Now", value: chatMessages.length > 0 ? "Live" : "0", icon: MessageSquare, color: "text-yellow-400" },
                  ].map((stat, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className={`w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center ${stat.color}`}>
                        <stat.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-white">{stat.value}</p>
                        <p className="text-xs text-white/50">{stat.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Featured Section (only if there are liked assets) */}
              {featuredAssets.length > 0 && featuredAssets[0].likes > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Flame className="w-5 h-5 text-orange-400" />
                    <h2 className="text-lg font-bold text-white">Trending Now</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {featuredAssets.map((gen, index) => {
                      const is3D = is3DFormat(gen.imageUrl) || is3DStyle(gen.styleId);
                      return (
                        <div
                          key={gen.id}
                          onClick={() => setSelectedGen(gen)}
                          className="group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02]"
                        >
                          <div className={`absolute inset-0 bg-gradient-to-br ${index === 0 ? 'from-yellow-500/30 to-orange-500/30' : index === 1 ? 'from-gray-400/30 to-gray-500/30' : 'from-amber-600/30 to-amber-700/30'} opacity-0 group-hover:opacity-100 transition-opacity`} />
                          <div className="aspect-video bg-[#0a0a0f] relative">
                            {is3D ? (
                              <div className="w-full h-full flex items-center justify-center">
                                <FileBox className="w-16 h-16 text-[#c084fc]" />
                              </div>
                            ) : (
                              <img src={gen.imageUrl} alt={gen.prompt} className="w-full h-full object-contain p-4" />
                            )}

                            {/* Rank Badge */}
                            <div className={`absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                              index === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-black' :
                              index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-black' :
                              'bg-gradient-to-br from-amber-600 to-amber-700 text-white'
                            }`}>
                              #{index + 1}
                            </div>

                            {/* Likes */}
                            <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm">
                              <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400" />
                              <span className="text-white text-sm font-medium">{gen.likes}</span>
                            </div>
                          </div>

                          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
                            <p className="text-white font-medium text-sm line-clamp-1">{gen.prompt}</p>
                            <p className="text-white/50 text-xs mt-1">by {gen.user?.name || "Anonymous"}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Filters */}
              <div className="space-y-4">
                {/* Search & Sort Row */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-[#00ff88] transition-colors" />
                    <Input
                      placeholder="Search assets..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-12 h-12 bg-white/5 border-white/10 rounded-xl focus:border-[#00ff88]/50 focus:ring-[#00ff88]/20 text-white placeholder:text-white/40"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setSortBy("newest")}
                      className={`h-12 px-5 rounded-xl font-medium transition-all flex items-center gap-2 ${
                        sortBy === "newest"
                          ? "bg-gradient-to-r from-[#00ff88]/20 to-[#00d4ff]/20 text-[#00ff88] border border-[#00ff88]/30"
                          : "bg-white/5 text-white/60 hover:text-white border border-white/10"
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                      New
                    </button>
                    <button
                      onClick={() => setSortBy("popular")}
                      className={`h-12 px-5 rounded-xl font-medium transition-all flex items-center gap-2 ${
                        sortBy === "popular"
                          ? "bg-gradient-to-r from-[#c084fc]/20 to-[#a855f7]/20 text-[#c084fc] border border-[#c084fc]/30"
                          : "bg-white/5 text-white/60 hover:text-white border border-white/10"
                      }`}
                    >
                      <TrendingUp className="w-4 h-4" />
                      Hot
                    </button>
                  </div>
                </div>

                {/* Type Filter */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFilterType("all")}
                    className={`h-10 px-4 rounded-lg font-medium transition-all ${
                      filterType === "all"
                        ? "bg-white/10 text-white border border-white/20"
                        : "text-white/50 hover:text-white"
                    }`}
                  >
                    All Types
                  </button>
                  <button
                    onClick={() => setFilterType("2d")}
                    className={`h-10 px-4 rounded-lg font-medium transition-all flex items-center gap-2 ${
                      filterType === "2d"
                        ? "bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30"
                        : "text-white/50 hover:text-[#00ff88]"
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    2D ({total2D})
                  </button>
                  <button
                    onClick={() => setFilterType("3d")}
                    className={`h-10 px-4 rounded-lg font-medium transition-all flex items-center gap-2 ${
                      filterType === "3d"
                        ? "bg-[#c084fc]/20 text-[#c084fc] border border-[#c084fc]/30"
                        : "text-white/50 hover:text-[#c084fc]"
                    }`}
                  >
                    <Cuboid className="w-4 h-4" />
                    3D ({total3D})
                  </button>
                </div>

                {/* Category Pills */}
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const count = cat.id === "all" ? total : (categoryCounts[cat.id] || 0);
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setFilterCategory(cat.id)}
                        className={`h-10 px-4 rounded-xl font-medium transition-all flex items-center gap-2 ${
                          filterCategory === cat.id
                            ? `bg-gradient-to-r ${cat.color} text-white border border-white/20 shadow-lg`
                            : "bg-white/5 text-white/50 hover:text-white border border-transparent hover:border-white/10"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {cat.label}
                        {count > 0 && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${filterCategory === cat.id ? 'bg-white/20' : 'bg-white/10'}`}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Gallery Grid */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-4 border-[#c084fc]/20 border-t-[#c084fc] animate-spin" />
                  <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-[#c084fc]" />
                </div>
                <p className="text-white/60 mt-4">Loading amazing creations...</p>
              </div>
            ) : filteredGenerations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-[#c084fc]/20 to-[#00d4ff]/20 flex items-center justify-center mb-6 border border-white/10">
                  <Users className="w-16 h-16 text-white/20" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">No Assets Yet</h3>
                <p className="text-white/50 mb-6 text-center max-w-md">
                  {searchQuery || filterCategory !== "all" || filterType !== "all"
                    ? "No assets match your filters. Try adjusting your search."
                    : "Be the first to share your creations with the community!"}
                </p>
                <Link href="/generate">
                  <Button className="h-12 px-6 bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-black font-bold">
                    <Sparkles className="w-5 h-5 mr-2" />
                    Create First Asset
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredGenerations.map((gen) => {
                  const is3D = is3DFormat(gen.imageUrl) || is3DStyle(gen.styleId);
                  const format3D = is3D ? get3DFormat(gen.imageUrl) : null;
                  const isHovered = hoveredCard === gen.id;

                  return (
                    <div
                      key={gen.id}
                      className="group relative"
                      onMouseEnter={() => setHoveredCard(gen.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                    >
                      <div
                        onClick={() => setSelectedGen(gen)}
                        className={`relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 ${
                          isHovered ? 'scale-[1.02] z-10' : ''
                        }`}
                      >
                        {/* Glow effect on hover */}
                        <div className={`absolute -inset-1 bg-gradient-to-r ${is3D ? 'from-[#c084fc] to-[#a855f7]' : 'from-[#00ff88] to-[#00d4ff]'} rounded-2xl opacity-0 group-hover:opacity-30 blur-lg transition-opacity`} />

                        <div className="relative bg-[#0a0a0f] border border-white/10 rounded-2xl overflow-hidden group-hover:border-white/20 transition-colors">
                          {/* Image */}
                          <div className="aspect-square relative overflow-hidden bg-gradient-to-br from-white/5 to-transparent">
                            {/* Type Badge */}
                            <div className="absolute top-2 left-2 z-10">
                              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold backdrop-blur-sm ${
                                is3D
                                  ? 'bg-[#c084fc]/90 text-white'
                                  : 'bg-[#00ff88]/90 text-black'
                              }`}>
                                {is3D ? <Cuboid className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                                {is3D ? format3D : '2D'}
                              </div>
                            </div>

                            {/* Likes Badge */}
                            {gen.likes > 0 && (
                              <div className="absolute top-2 right-2 z-10">
                                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm">
                                  <Heart className="w-3 h-3 text-red-400 fill-red-400" />
                                  <span className="text-white text-xs font-medium">{gen.likes}</span>
                                </div>
                              </div>
                            )}

                            {is3D ? (
                              <div className="w-full h-full flex flex-col items-center justify-center p-4">
                                <div className="relative">
                                  <div className="absolute inset-0 bg-[#c084fc]/30 rounded-full blur-xl animate-pulse" />
                                  <FileBox className="relative w-16 h-16 text-[#c084fc]" />
                                </div>
                                <span className="text-xs text-white/50 mt-3">{getModelName(gen.styleId)}</span>
                              </div>
                            ) : (
                              <img
                                src={gen.imageUrl}
                                alt={gen.prompt}
                                className="w-full h-full object-contain p-3 transition-transform duration-300 group-hover:scale-110"
                              />
                            )}

                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-end p-4">
                              <div className="flex gap-2 mb-3">
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownload(gen);
                                  }}
                                  className={`${is3D ? 'bg-[#c084fc] hover:bg-[#a855f7]' : 'bg-[#00ff88] hover:bg-[#00d4ff]'} text-black`}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(gen.imageUrl, "_blank");
                                  }}
                                  className="border-white/30 hover:bg-white/10"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              </div>
                              <p className="text-white text-xs text-center line-clamp-2">{gen.prompt}</p>
                            </div>
                          </div>

                          {/* Info */}
                          <div className="p-3 border-t border-white/5">
                            <p className="text-white text-sm font-medium truncate mb-2">
                              {gen.prompt.replace(/^\[3D\]\s*/, '')}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {gen.user?.avatarUrl ? (
                                  <img src={gen.user.avatarUrl} alt="" className="w-5 h-5 rounded-full" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#c084fc] to-[#00d4ff]" />
                                )}
                                <span className="text-white/50 text-xs truncate max-w-[80px]">
                                  {gen.user?.name || "Anonymous"}
                                </span>
                              </div>
                              <span className="text-white/30 text-xs">
                                {new Date(gen.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Chat Toggle Button */}
        {!chatOpen && (
          <button
            onClick={() => setChatOpen(true)}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-30 w-12 h-32 rounded-l-2xl bg-gradient-to-b from-[#c084fc] to-[#00d4ff] flex flex-col items-center justify-center gap-2 hover:w-14 transition-all shadow-lg shadow-[#c084fc]/25"
          >
            <MessageSquare className="w-5 h-5 text-white" />
            <ChevronLeft className="w-4 h-4 text-white" />
            {chatMessages.length > 0 && (
              <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                {chatMessages.length > 99 ? '99+' : chatMessages.length}
              </span>
            )}
          </button>
        )}

        {/* Chat Sidebar */}
        <div
          className={`fixed right-0 top-0 h-full w-80 bg-[#0a0a0f]/95 backdrop-blur-xl border-l border-[#c084fc]/20 flex flex-col z-20 transition-transform duration-300 ${
            chatOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Chat Header */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c084fc] to-[#00d4ff] flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#00ff88] border-2 border-[#0a0a0f]" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Live Chat</h3>
                  <p className="text-xs text-white/50">{chatMessages.length} messages</p>
                </div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-white/50" />
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loadingChat ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-[#c084fc] animate-spin" />
              </div>
            ) : chatMessages.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#c084fc]/20 to-[#00d4ff]/20 flex items-center justify-center">
                  <MessageSquare className="w-8 h-8 text-white/30" />
                </div>
                <p className="text-white/50 text-sm">No messages yet</p>
                <p className="text-white/30 text-xs mt-1">Be the first to say hello!</p>
              </div>
            ) : (
              chatMessages.map((msg) => {
                const planBadge = getPlanBadge(msg.userPlan);
                return (
                  <div key={msg.id} className="group animate-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-start gap-2">
                      {msg.userAvatar ? (
                        <img src={msg.userAvatar} alt="" className="w-8 h-8 rounded-full flex-shrink-0 ring-2 ring-white/10" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c084fc] to-[#00d4ff] flex-shrink-0 ring-2 ring-white/10" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-white truncate">
                            {msg.userName || "Anonymous"}
                          </span>
                          {planBadge && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5 ${planBadge.color}`}>
                              <planBadge.icon className="w-2.5 h-2.5" />
                              {planBadge.label}
                            </span>
                          )}
                          <span className="text-[10px] text-white/30 opacity-0 group-hover:opacity-100 transition-opacity">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="bg-white/5 rounded-2xl rounded-tl-sm px-3 py-2">
                          <p className="text-sm text-white/80 break-words">{msg.message}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-white/10 bg-[#0a0a0f]/50">
            <div className="flex gap-2">
              <Input
                placeholder="Say something..."
                value={newChatMessage}
                onChange={(e) => setNewChatMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendChatMessage()}
                className="flex-1 h-11 bg-white/5 border-white/10 rounded-xl focus:border-[#c084fc]/50 text-white placeholder:text-white/30"
                maxLength={500}
              />
              <Button
                onClick={handleSendChatMessage}
                disabled={!newChatMessage.trim() || sendingChat}
                className="h-11 w-11 bg-gradient-to-r from-[#c084fc] to-[#00d4ff] hover:opacity-90"
              >
                {sendingChat ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-white/30 mt-2 text-center">
              Be kind • Max 10 msg/min
            </p>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedGen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedGen(null)}
        >
          <div
            className="relative bg-[#0a0a0f] border border-white/10 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image Side */}
            <div className="md:w-1/2 aspect-square bg-gradient-to-br from-white/5 to-transparent relative flex-shrink-0">
              {is3DFormat(selectedGen.imageUrl) || is3DStyle(selectedGen.styleId) ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-4">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-[#c084fc]/30 rounded-full blur-2xl animate-pulse" />
                    <FileBox className="relative w-32 h-32 text-[#c084fc]" />
                  </div>
                  <span className="text-xl font-bold text-white">3D Model</span>
                  <span className="text-[#c084fc] font-mono">{get3DFormat(selectedGen.imageUrl)}</span>
                </div>
              ) : (
                <img
                  src={selectedGen.imageUrl}
                  alt={selectedGen.prompt}
                  className="w-full h-full object-contain p-6"
                />
              )}

              <button
                onClick={() => setSelectedGen(null)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Details Side */}
            <div className="md:w-1/2 flex flex-col max-h-[50vh] md:max-h-full">
              {/* Header */}
              <div className="p-6 border-b border-white/10">
                <p className="text-white text-lg font-medium mb-3">
                  {selectedGen.prompt.replace(/^\[3D\]\s*/, '')}
                </p>
                <div className="flex items-center gap-2 flex-wrap mb-4">
                  <Badge className="bg-white/10 text-white border-white/20">
                    {selectedGen.categoryId}
                  </Badge>
                  <Badge className="bg-[#c084fc]/20 text-[#c084fc] border-[#c084fc]/30">
                    {getModelName(selectedGen.styleId)}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedGen.user?.avatarUrl ? (
                      <img src={selectedGen.user.avatarUrl} alt="" className="w-10 h-10 rounded-full ring-2 ring-white/20" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#c084fc] to-[#00d4ff] ring-2 ring-white/20" />
                    )}
                    <div>
                      <p className="text-white font-medium">{selectedGen.user?.name || "Anonymous"}</p>
                      <p className="text-white/50 text-xs">{new Date(selectedGen.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleLike}
                      disabled={likingInProgress}
                      className={`h-10 ${userLiked ? 'border-red-400 bg-red-400/10 text-red-400' : 'border-white/20'}`}
                    >
                      <Heart className={`w-4 h-4 mr-1.5 ${userLiked ? 'fill-current' : ''}`} />
                      {selectedGen.likes}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleDownload(selectedGen)}
                      className="h-10 bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-black"
                    >
                      <Download className="w-4 h-4 mr-1.5" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>

              {/* Comments */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <h4 className="text-sm font-medium text-white flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Comments ({comments.length})
                </h4>

                {loadingComments ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-[#c084fc] animate-spin" />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-white/50 text-sm text-center py-4">
                    No comments yet. Be the first!
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex items-start gap-3">
                      {comment.userAvatar ? (
                        <img src={comment.userAvatar} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c084fc] to-[#00d4ff]" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-white">{comment.userName || "Anonymous"}</span>
                          <span className="text-xs text-white/30">{new Date(comment.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-white/70">{comment.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Comment Input */}
              <div className="p-4 border-t border-white/10">
                <div className="flex gap-2">
                  <Input
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handlePostComment()}
                    className="flex-1 h-11 bg-white/5 border-white/10 rounded-xl text-white placeholder:text-white/30"
                    maxLength={500}
                  />
                  <Button
                    onClick={handlePostComment}
                    disabled={!newComment.trim() || submittingComment}
                    className="h-11 bg-gradient-to-r from-[#c084fc] to-[#00d4ff]"
                  >
                    {submittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
