// =============================================================================
// WORKSPACE HISTORY — pure helpers (no React, no Prisma client)
// =============================================================================
// Every tool keeps its results as rows in `generations`; the kind of a row is
// only encoded in its prompt / subcategory:
//   animation  subcategory_id = 'ANIMATION', prompt "[Animation: walk, 8f] <source prompt>"
//   edit       prompt "[Edited] <instruction>"
//   variant    prompt "[Upscaled 2x] …", "[No BG] …", "[Variation 1/4] …"
//   model      3D models (style_id "3D_…", image_url is a .glb)
//   sprite     everything else
// These helpers classify rows, describe animation sheets and build the
// filters used by GET /api/generations, so the history panel and the API
// agree on what "Animations" or "Edits" means.
// =============================================================================

export type HistoryKind = "sprite" | "animation" | "edit" | "variant" | "model";

/** Which items a history filter shows. Sent to the API as `kind`. */
export type HistoryFilterId = "all-images" | "sprites" | "animations" | "edits";

export type WorkspaceTool = "create" | "animate" | "edit";

export interface HistoryFilterOption {
  id: HistoryFilterId;
  label: string;
}

/** Filter chips per tool; the first one is the default. */
export const TOOL_HISTORY_FILTERS: Record<WorkspaceTool, HistoryFilterOption[]> = {
  create: [
    { id: "all-images", label: "All" },
    { id: "sprites", label: "Sprites" },
    { id: "edits", label: "Edits" },
  ],
  animate: [
    { id: "animations", label: "Animations" },
    { id: "sprites", label: "Sprites" },
  ],
  edit: [
    { id: "all-images", label: "All" },
    { id: "edits", label: "Edits" },
    { id: "sprites", label: "Sprites" },
  ],
};

export const HISTORY_FILTER_IDS: readonly HistoryFilterId[] = ["all-images", "sprites", "animations", "edits"];

export function isHistoryFilterId(value: unknown): value is HistoryFilterId {
  return typeof value === "string" && (HISTORY_FILTER_IDS as readonly string[]).includes(value);
}

/** Kinds each filter lets through. */
export const FILTER_KINDS: Record<HistoryFilterId, readonly HistoryKind[]> = {
  "all-images": ["sprite", "edit", "variant"],
  sprites: ["sprite", "variant"],
  animations: ["animation"],
  edits: ["edit"],
};

export interface ClassifiableGeneration {
  prompt?: string | null;
  subcategoryId?: string | null;
  styleId?: string | null;
  imageUrl?: string | null;
}

const VARIANT_PREFIX = /^\[(Upscaled\b|No BG\]|Variation\b)/i;

export function classifyGeneration(g: ClassifiableGeneration): HistoryKind {
  const prompt = g.prompt ?? "";
  if (g.subcategoryId === "ANIMATION" || prompt.startsWith("[Animation:")) return "animation";
  if ((g.styleId ?? "").toUpperCase().startsWith("3D_") || /\.(glb|gltf)(\?|$)/i.test(g.imageUrl ?? "")) return "model";
  if (prompt.startsWith("[Edited]")) return "edit";
  if (VARIANT_PREFIX.test(prompt)) return "variant";
  return "sprite";
}

export interface ParsedAnimationPrompt {
  /** Motion label as saved ("walk", "4-direction walk", "8 directions"). */
  label: string;
  /** Frames in the finished sheet (the "8f" part). */
  frameCount: number;
  /** Prompt of the sprite the animation was made from. */
  sourcePrompt: string;
  /** 4-direction walk sets are a grid: one row per direction. */
  walkSet: boolean;
  /** 4 / 8 when the sheet is a set of directional views. */
  directions: 4 | 8 | null;
}

const ANIMATION_PROMPT = /^\[Animation:\s*(.*?),\s*(\d+)f\]\s*([\s\S]*)$/;

/** Reads "[Animation: walk, 8f] knight in armor" back into its parts. */
export function parseAnimationPrompt(prompt: string | null | undefined): ParsedAnimationPrompt | null {
  const m = ANIMATION_PROMPT.exec((prompt ?? "").trim());
  if (!m) return null;
  const frameCount = Number(m[2]);
  if (!Number.isFinite(frameCount) || frameCount < 1 || frameCount > 256) return null;
  const label = m[1].trim();
  const walkSet = /\b4-direction walk\b/i.test(label);
  const dirs = /^(4|8) directions$/i.exec(label);
  return {
    label,
    frameCount,
    sourcePrompt: m[3].trim(),
    walkSet,
    directions: walkSet ? 4 : dirs ? (Number(dirs[1]) as 4 | 8) : null,
  };
}

/** The prompt without the "[Edited]" / "[Animation: …]" tags, for titles and the prompt box. */
export function cleanGenerationPrompt(prompt: string | null | undefined): string {
  let p = (prompt ?? "").trim();
  const anim = parseAnimationPrompt(p);
  if (anim) p = anim.sourcePrompt;
  // Several tools may have stacked their tags: "[No BG] [Upscaled 2x] knight"
  for (let i = 0; i < 4; i++) {
    const next = p.replace(/^\[(Edited|No BG|Upscaled[^\]]*|Variation[^\]]*)\]\s*/i, "");
    if (next === p) break;
    p = next;
  }
  return p;
}

/** Short label for a history tile ("Walk · 8 frames", "Edit"). */
export function historyBadge(g: ClassifiableGeneration): string | null {
  const kind = classifyGeneration(g);
  if (kind === "animation") {
    const a = parseAnimationPrompt(g.prompt);
    if (!a) return "Animation";
    const label = a.label.charAt(0).toUpperCase() + a.label.slice(1);
    // Long labels ("4 directions") alone; short ones with the frame count
    return label.length > 10 ? label : `${label} · ${a.frameCount}f`;
  }
  if (kind === "edit") return "Edit";
  if (kind === "variant") {
    const p = g.prompt ?? "";
    if (/^\[Upscaled/i.test(p)) return "Upscaled";
    if (/^\[No BG\]/i.test(p)) return "No BG";
    return "Variation";
  }
  return null;
}

export interface SheetGeometry {
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
  /** Frames per row (only for grid sheets). */
  sheetCols?: number;
  rows: number;
  cols: number;
}

/**
 * Frame layout of a saved animation sheet. The database only keeps the sheet
 * URL and the prompt, so the size of one frame comes from the image itself:
 * walk sets are a 4-row grid, everything else is one row of frames.
 */
export function animationSheetGeometry(
  parsed: Pick<ParsedAnimationPrompt, "frameCount" | "walkSet">,
  sheetWidth: number,
  sheetHeight: number
): SheetGeometry | null {
  const { frameCount } = parsed;
  if (!(sheetWidth > 0 && sheetHeight > 0 && frameCount > 0)) return null;
  if (parsed.walkSet && frameCount % 4 === 0) {
    const cols = frameCount / 4;
    return {
      frameCount,
      frameWidth: Math.floor(sheetWidth / cols),
      frameHeight: Math.floor(sheetHeight / 4),
      sheetCols: cols,
      rows: 4,
      cols,
    };
  }
  return {
    frameCount,
    frameWidth: Math.floor(sheetWidth / frameCount),
    frameHeight: Math.floor(sheetHeight),
    rows: 1,
    cols: frameCount,
  };
}

/** Preview speed for a restored animation (mirrors the Animate page defaults). */
export function defaultAnimationFps(parsed: Pick<ParsedAnimationPrompt, "frameCount" | "walkSet" | "directions">, fullPrompt?: string | null): number {
  if (parsed.walkSet) return 6;
  if (parsed.directions) return 2;
  if ((fullPrompt ?? "").startsWith("rig:")) return 12;
  return parsed.frameCount >= 12 ? 12 : parsed.frameCount >= 9 ? 10 : 8;
}

// -----------------------------------------------------------------------------
// API filter (shape of a Prisma GenerationWhereInput fragment, kept structural
// so this file stays importable from client code and tests)
// -----------------------------------------------------------------------------

export type HistoryWhere = Record<string, unknown>;

const NOT_ANIMATION: HistoryWhere = { NOT: { subcategoryId: "ANIMATION" } };
const NOT_MODEL: HistoryWhere = { NOT: { styleId: { startsWith: "3D_" } } };
const IS_EDIT: HistoryWhere = { prompt: { startsWith: "[Edited]" } };

/** Extra `where` conditions for `kind` + `q`. Combine with `userId` via AND. */
export function historyWhere(kind: HistoryFilterId | null, q: string | null): HistoryWhere[] {
  const and: HistoryWhere[] = [];
  switch (kind) {
    case "animations":
      and.push({ subcategoryId: "ANIMATION" });
      break;
    case "edits":
      and.push(IS_EDIT, NOT_ANIMATION);
      break;
    case "sprites":
      and.push(NOT_ANIMATION, NOT_MODEL, { NOT: IS_EDIT });
      break;
    case "all-images":
      and.push(NOT_ANIMATION, NOT_MODEL);
      break;
    default:
      break;
  }
  const query = normalizeHistoryQuery(q);
  if (query) and.push({ prompt: { contains: query, mode: "insensitive" } });
  return and;
}

/** Trims, collapses whitespace and caps the search text. */
export function normalizeHistoryQuery(q: string | null | undefined): string {
  return (q ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
}

/** Client-side mirror of `historyWhere` (used to filter cached / optimistic items). */
export function matchesHistoryFilter(g: ClassifiableGeneration, kind: HistoryFilterId | null, q?: string | null): boolean {
  if (kind && !FILTER_KINDS[kind].includes(classifyGeneration(g))) return false;
  const query = normalizeHistoryQuery(q).toLowerCase();
  if (query && !(g.prompt ?? "").toLowerCase().includes(query)) return false;
  return true;
}
