export interface ProjectFolder {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  suggestedAssets: string | null;
  defaultStyleId: string | null;
  defaultView: string | null;
  sortOrder: number;
  _count?: { generations: number };
}

export interface ProjectDetail {
  id: string;
  name: string;
  gameType: string | null;
  perspective: string | null;
  artStyle: string | null;
  mood: string | null;
  systems: string | null;
  notes: string | null;
  folders: ProjectFolder[];
  _count: { generations: number };
}

export interface ProjectAsset {
  id: string;
  imageUrl: string;
  prompt: string;
  styleId: string;
  categoryId: string | null;
  subcategoryId: string | null;
  folderId: string | null;
  seed: number | string | null;
  createdAt: string;
}

/** Parse a folder's `suggestedAssets` JSON string array; never throws. */
export function parseSuggestions(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v.filter((s): s is string => typeof s === "string" && s.trim().length > 0).map((s) => s.trim());
  } catch {
    return [];
  }
}

/** Generator deep link, optionally targeting a folder and pre-filling a prompt. */
export function generateHref(projectId: string, folder?: ProjectFolder | null, prompt?: string): string {
  const qs = new URLSearchParams({ projectId });
  if (folder) {
    qs.set("folderId", folder.id);
    qs.set("categoryId", folder.category);
    qs.set("subcategoryId", folder.subcategory || "");
    qs.set("styleId", folder.defaultStyleId || "");
    qs.set("view", folder.defaultView || "DEFAULT");
  }
  if (prompt) qs.set("prompt", prompt);
  return `/generate?${qs.toString()}`;
}
