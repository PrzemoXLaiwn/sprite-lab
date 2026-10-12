import type { CSSProperties } from "react";

// ===========================================
// TYPES
// ===========================================
export interface Generation {
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

export interface PendingJob {
  id: string;
  prompt: string;
  categoryId: string;
  subcategoryId: string;
  styleId: string;
  mode: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  progressMessage: string | null;
  errorMessage: string | null;
  creditsUsed: number;
  resultUrl: string | null;
  resultSeed: number | null;
  generationId: string | null;
  model3DId: string | null;
  quality3D: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

/** Handlers shared by the grid card, list row and preview modal. */
export interface AssetActions {
  onDownload: (gen: Generation) => void;
  onDelete: (id: string) => void;
  onToggleShare: (gen: Generation) => void;
  onInpaint: (gen: Generation) => void;
  onPlayground: (gen: Generation) => void;
}

// ===========================================
// HELPERS
// ===========================================
export const is3DFormat = (url: string): boolean => {
  if (!url) return false;
  const lower = url.toLowerCase();
  return [".ply", ".glb", ".gltf", ".obj", ".fbx", ".usdz"].some((ext) => lower.includes(ext));
};

export const is3DStyle = (styleId: string): boolean => {
  return styleId?.startsWith("3D_") || styleId === "3D_MODEL";
};

export const isAsset3D = (gen: Generation): boolean =>
  is3DFormat(gen.imageUrl) || is3DStyle(gen.styleId);

export const get3DFormat = (url: string): string => {
  if (!url) return "GLB";
  const lower = url.toLowerCase();
  if (lower.includes(".ply")) return "PLY";
  if (lower.includes(".glb") || lower.includes(".gltf")) return "GLB";
  if (lower.includes(".obj")) return "OBJ";
  if (lower.includes(".fbx")) return "FBX";
  if (lower.includes(".usdz")) return "USDZ";
  return "GLB";
};

export const getModelName = (styleId: string): string => {
  if (styleId === "3D_TRELLIS") return "TRELLIS";
  if (styleId === "3D_HUNYUAN3D") return "Hunyuan3D";
  if (styleId === "3D_WONDER3D") return "Wonder3D";
  if (styleId?.startsWith("3D_")) return styleId.replace("3D_", "");
  return styleId?.replace(/_/g, " ") || "Unknown";
};

/** Pixel-art styles render with nearest-neighbour scaling so they stay crisp. */
export const isPixelStyleId = (styleId: string): boolean =>
  !!styleId && styleId.toUpperCase().includes("PIXEL");

export const cleanPrompt = (prompt: string): string => prompt.replace(/^\[3D\]\s*/, "");

export const formatLabel = (id: string): string =>
  (id || "")
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");

export const CHECKER_STYLE: CSSProperties = {
  backgroundImage: "repeating-conic-gradient(#ffffff08 0% 25%, transparent 0% 50%)",
  backgroundSize: "16px 16px",
};

export const openTool = (tool: "edit" | "upscale" | "variations" | "animate" | "remove-bg", id: string) => {
  window.location.href = `/${tool}?id=${encodeURIComponent(id)}`;
};

/** Send the prompt + settings back to the generator. */
export const remix = (gen: Generation) => {
  const params = new URLSearchParams({
    prompt: cleanPrompt(gen.prompt),
    categoryId: gen.categoryId ?? "",
    subcategoryId: gen.subcategoryId ?? "",
    styleId: gen.styleId ?? "",
  });
  window.location.href = `/generate?${params.toString()}`;
};
