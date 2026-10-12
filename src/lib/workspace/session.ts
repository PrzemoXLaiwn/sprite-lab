// =============================================================================
// WORKSPACE SESSION — "continue where you left off"
// =============================================================================
// The URL is the source of truth for *what* a tool shows (`?id=` source
// sprite, `?result=` result generation). A small per-tool draft in
// localStorage adds what the URL can't hold (typed text, options, the GIF URL
// of the last animation) and lets a bare /animate or /edit link from the
// sidebar reopen the last session.
//
// Storage is best-effort: every access is wrapped so private mode, blocked
// storage or a corrupt value can never break a page — parsing returns null
// and the tool starts fresh.
// =============================================================================

import type { WorkspaceTool } from "./history";

export const DRAFT_VERSION = 1;
/** Drafts older than this are ignored (and the continue banner hidden). */
export const DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const KEY_PREFIX = "spritelab:ws:";
export const draftKey = (tool: WorkspaceTool) => `${KEY_PREFIX}${tool}:v${DRAFT_VERSION}`;
export const LAST_ACTIVITY_KEY = `${KEY_PREFIX}last:v${DRAFT_VERSION}`;
export const SOURCE_LINKS_KEY = `${KEY_PREFIX}links:v${DRAFT_VERSION}`;
/** Max remembered animation → source sprite links. */
export const MAX_SOURCE_LINKS = 300;

// -----------------------------------------------------------------------------
// Draft shapes
// -----------------------------------------------------------------------------

export interface AnimationResultSnapshot {
  sheetUrl: string;
  gifUrl: string | null;
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
  sheetCols?: number;
}

/** A motion card as the Animate page shows it (tailored suggestions are kept so a restore shows the same list). */
export interface SavedMotion {
  id: string;
  label: string;
  motion: string;
  loop: boolean;
  anchor?: "ground" | "air" | "cell" | "center";
  frames?: 4 | 6 | 9;
}

export interface AnimateDraft {
  v: typeof DRAFT_VERSION;
  updatedAt: number;
  sourceId: string;
  action?: string;
  customMotion?: string;
  frames?: number;
  framesTouched?: boolean;
  smooth?: boolean;
  fps?: number;
  /** Generation id of the last animation (the `?result=` param). */
  resultId?: string;
  result?: AnimationResultSnapshot;
  resultMotion?: { id: string; text: string };
  /** Motions tailored to this sprite, so the restored selection still exists. */
  suggested?: SavedMotion[];
}

export interface EditDraft {
  v: typeof DRAFT_VERSION;
  updatedAt: number;
  sourceId: string;
  editPrompt?: string;
  resultId?: string;
  resultUrl?: string;
}

/** One Create result, trimmed to what the workspace needs to show it again. */
export interface CreateResultSnapshot {
  id: string;
  imageUrl: string;
  seed: number;
  categoryId: string;
  subcategoryId: string;
  styleId: string;
  view: string;
  palette: string;
  prompt: string;
  qualityPreset?: "draft" | "normal" | "hd";
  generationId?: string;
  resolvedView?: string;
  translatedPrompt?: string;
}

export interface CreateDraft {
  v: typeof DRAFT_VERSION;
  updatedAt: number;
  prompt: string;
  groupId?: string;
  subcategoryId?: string;
  styleId?: string;
  view?: string;
  detail?: string;
  palette?: string;
  pose?: string;
  results: CreateResultSnapshot[];
  selectedIndex: number;
}

export interface DraftByTool {
  create: CreateDraft;
  animate: AnimateDraft;
  edit: EditDraft;
}

export interface LastActivity {
  tool: WorkspaceTool;
  href: string;
  title: string;
  thumbUrl?: string;
  pixel?: boolean;
  updatedAt: number;
  dismissed?: boolean;
}

/** Max Create results kept in the draft (newest first). */
export const MAX_CREATE_RESULTS = 12;

// -----------------------------------------------------------------------------
// Validation (pure)
// -----------------------------------------------------------------------------

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max = 2000): string | undefined => (typeof v === "string" ? v.slice(0, max) : undefined);
const num = (v: unknown, min: number, max: number): number | undefined =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : undefined;
const bool = (v: unknown): boolean | undefined => (typeof v === "boolean" ? v : undefined);
/** Ids are cuid-like: short, no spaces or slashes (they go into URLs). */
export const isSafeId = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(v);
/** Only http(s) image URLs are restored (never javascript: / data: blobs). */
export const isSafeUrl = (v: unknown): v is string => typeof v === "string" && v.length <= 2048 && /^https?:\/\//i.test(v);

function parseAnimationSnapshot(v: unknown): AnimationResultSnapshot | undefined {
  if (!isObj(v) || !isSafeUrl(v.sheetUrl)) return undefined;
  const frameCount = num(v.frameCount, 1, 256);
  const frameWidth = num(v.frameWidth, 1, 8192);
  const frameHeight = num(v.frameHeight, 1, 8192);
  if (!frameCount || !frameWidth || !frameHeight) return undefined;
  return {
    sheetUrl: v.sheetUrl,
    gifUrl: isSafeUrl(v.gifUrl) ? v.gifUrl : null,
    frameCount,
    frameWidth,
    frameHeight,
    sheetCols: num(v.sheetCols, 1, 256),
  };
}

const ANCHORS = new Set(["ground", "air", "cell", "center"]);

function parseMotions(v: unknown): SavedMotion[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: SavedMotion[] = [];
  for (const m of v.slice(0, 16)) {
    if (!isObj(m) || typeof m.id !== "string" || typeof m.label !== "string" || typeof m.motion !== "string") continue;
    out.push({
      id: m.id.slice(0, 32),
      label: m.label.slice(0, 40),
      motion: m.motion.slice(0, 400),
      loop: m.loop === true,
      anchor: typeof m.anchor === "string" && ANCHORS.has(m.anchor) ? (m.anchor as SavedMotion["anchor"]) : undefined,
      frames: m.frames === 4 || m.frames === 6 || m.frames === 9 ? m.frames : undefined,
    });
  }
  return out.length ? out : undefined;
}

function parseCreateResult(v: unknown): CreateResultSnapshot | null {
  if (!isObj(v) || !isSafeUrl(v.imageUrl) || typeof v.id !== "string") return null;
  const quality = v.qualityPreset === "draft" || v.qualityPreset === "normal" || v.qualityPreset === "hd" ? v.qualityPreset : undefined;
  return {
    id: v.id.slice(0, 80),
    imageUrl: v.imageUrl,
    seed: num(v.seed, 0, Number.MAX_SAFE_INTEGER) ?? 0,
    categoryId: str(v.categoryId, 64) ?? "",
    subcategoryId: str(v.subcategoryId, 64) ?? "",
    styleId: str(v.styleId, 64) ?? "",
    view: str(v.view, 16) ?? "none",
    palette: str(v.palette, 32) ?? "auto",
    prompt: str(v.prompt, 1000) ?? "",
    qualityPreset: quality,
    generationId: isSafeId(v.generationId) ? v.generationId : undefined,
    resolvedView: str(v.resolvedView, 32),
    translatedPrompt: str(v.translatedPrompt, 1000),
  };
}

function baseOk(v: unknown, now: number): v is Record<string, unknown> & { updatedAt: number } {
  if (!isObj(v) || v.v !== DRAFT_VERSION) return false;
  const at = num(v.updatedAt, 0, Number.MAX_SAFE_INTEGER);
  return at !== undefined && now - at <= DRAFT_MAX_AGE_MS;
}

/** Validates a stored draft. Anything unexpected → null (start fresh). */
export function parseDraft<T extends WorkspaceTool>(tool: T, raw: string | null, now = Date.now()): DraftByTool[T] | null {
  if (!raw) return null;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!baseOk(v, now)) return null;

  if (tool === "animate") {
    if (!isSafeId(v.sourceId)) return null;
    const motion = isObj(v.resultMotion) ? { id: str(v.resultMotion.id, 64) ?? "", text: str(v.resultMotion.text, 400) ?? "" } : undefined;
    const draft: AnimateDraft = {
      v: DRAFT_VERSION,
      updatedAt: v.updatedAt,
      sourceId: v.sourceId,
      action: str(v.action, 64),
      customMotion: str(v.customMotion, 300),
      frames: num(v.frames, 1, 64),
      framesTouched: bool(v.framesTouched),
      smooth: bool(v.smooth),
      fps: num(v.fps, 1, 60),
      resultId: isSafeId(v.resultId) ? v.resultId : undefined,
      result: parseAnimationSnapshot(v.result),
      resultMotion: motion,
      suggested: parseMotions(v.suggested),
    };
    return draft as DraftByTool[T];
  }

  if (tool === "edit") {
    if (!isSafeId(v.sourceId)) return null;
    const draft: EditDraft = {
      v: DRAFT_VERSION,
      updatedAt: v.updatedAt,
      sourceId: v.sourceId,
      editPrompt: str(v.editPrompt, 400),
      resultId: isSafeId(v.resultId) ? v.resultId : undefined,
      resultUrl: isSafeUrl(v.resultUrl) ? v.resultUrl : undefined,
    };
    return draft as DraftByTool[T];
  }

  // create
  const results = Array.isArray(v.results)
    ? v.results.map(parseCreateResult).filter((r): r is CreateResultSnapshot => r !== null).slice(0, MAX_CREATE_RESULTS)
    : [];
  const selected = Math.floor(num(v.selectedIndex, 0, Number.MAX_SAFE_INTEGER) ?? 0);
  const draft: CreateDraft = {
    v: DRAFT_VERSION,
    updatedAt: v.updatedAt,
    prompt: str(v.prompt, 1000) ?? "",
    groupId: str(v.groupId, 64),
    subcategoryId: str(v.subcategoryId, 64),
    styleId: str(v.styleId, 64),
    view: str(v.view, 16),
    detail: str(v.detail, 16),
    palette: str(v.palette, 32),
    pose: str(v.pose, 16),
    results,
    selectedIndex: results.length ? Math.min(selected, results.length - 1) : 0,
  };
  return draft as DraftByTool[T];
}

/** A Create draft worth restoring has text or a result; empty ones are noise. */
export function isMeaningfulCreateDraft(d: CreateDraft | null): d is CreateDraft {
  return !!d && (d.prompt.trim().length > 0 || d.results.length > 0);
}

export function parseLastActivity(raw: string | null, now = Date.now()): LastActivity | null {
  if (!raw) return null;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObj(v)) return null;
  const tool = v.tool;
  if (tool !== "create" && tool !== "animate" && tool !== "edit") return null;
  const href = str(v.href, 600);
  // Same-origin tool paths only — never an absolute or protocol-relative URL
  if (!href || !/^\/(generate|animate|edit)(\?|$)/.test(href)) return null;
  const at = num(v.updatedAt, 0, Number.MAX_SAFE_INTEGER);
  if (at === undefined || now - at > DRAFT_MAX_AGE_MS) return null;
  return {
    tool,
    href,
    title: str(v.title, 120) ?? "",
    thumbUrl: isSafeUrl(v.thumbUrl) ? v.thumbUrl : undefined,
    pixel: bool(v.pixel),
    updatedAt: at,
    dismissed: bool(v.dismissed),
  };
}

// -----------------------------------------------------------------------------
// URLs (pure)
// -----------------------------------------------------------------------------

export interface ToolUrlState {
  /** Source sprite (`?id=`). */
  id: string | null;
  /** Result generation to show (`?result=`). */
  result: string | null;
}

/** Reads `?id=` / `?result=`; malformed ids are dropped, not passed to the API. */
export function parseToolParams(params: { get(name: string): string | null }): ToolUrlState {
  const id = params.get("id");
  const result = params.get("result");
  return { id: isSafeId(id) ? id : null, result: isSafeId(result) ? result : null };
}

const TOOL_PATHS: Record<WorkspaceTool, string> = { create: "/generate", animate: "/animate", edit: "/edit" };

/** `/animate?id=…&result=…` (create ignores `id`). */
export function buildToolHref(tool: WorkspaceTool, state: Partial<ToolUrlState>): string {
  const q = new URLSearchParams();
  if (tool !== "create" && state.id && isSafeId(state.id)) q.set("id", state.id);
  if (state.result && isSafeId(state.result)) q.set("result", state.result);
  const s = q.toString();
  return s ? `${TOOL_PATHS[tool]}?${s}` : TOOL_PATHS[tool];
}

/**
 * Same URL with `?result=` set or removed (other params untouched). Returns
 * null when nothing changes, so callers can skip the history write.
 */
export function withResultParam(href: string, resultId: string | null | undefined): string | null {
  const url = new URL(href, "http://x");
  const current = url.searchParams.get("result");
  const next = resultId && isSafeId(resultId) ? resultId : null;
  if (current === next) return null;
  if (next) url.searchParams.set("result", next);
  else url.searchParams.delete("result");
  const qs = url.searchParams.toString();
  return `${url.pathname}${qs ? `?${qs}` : ""}${url.hash}`;
}

// -----------------------------------------------------------------------------
// Animation → source sprite links (until the schema has a column for it)
// -----------------------------------------------------------------------------

export type SourceLinks = Record<string, string>;

export function parseSourceLinks(raw: string | null): SourceLinks {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    if (!isObj(v)) return {};
    const out: SourceLinks = {};
    for (const [k, val] of Object.entries(v)) if (isSafeId(k) && isSafeId(val)) out[k] = val;
    return out;
  } catch {
    return {};
  }
}

/** Adds a link, keeping only the newest MAX_SOURCE_LINKS (insertion order). */
export function addSourceLink(links: SourceLinks, resultId: string, sourceId: string, max = MAX_SOURCE_LINKS): SourceLinks {
  if (!isSafeId(resultId) || !isSafeId(sourceId)) return links;
  const rest = Object.entries(links).filter(([k]) => k !== resultId);
  rest.push([resultId, sourceId]);
  return Object.fromEntries(rest.slice(-max));
}

// -----------------------------------------------------------------------------
// Storage (best-effort, never throws)
// -----------------------------------------------------------------------------

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function readRaw(key: string): string | null {
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string | null): void {
  try {
    const s = storage();
    if (!s) return;
    if (value === null) s.removeItem(key);
    else s.setItem(key, value);
  } catch {
    /* quota / blocked storage — the session just isn't remembered */
  }
}

export function loadDraft<T extends WorkspaceTool>(tool: T): DraftByTool[T] | null {
  return parseDraft(tool, readRaw(draftKey(tool)));
}

export function saveDraft<T extends WorkspaceTool>(tool: T, draft: Omit<DraftByTool[T], "v" | "updatedAt">): void {
  writeRaw(draftKey(tool), JSON.stringify({ ...draft, v: DRAFT_VERSION, updatedAt: Date.now() }));
}

export function clearDraft(tool: WorkspaceTool): void {
  writeRaw(draftKey(tool), null);
}

export function loadLastActivity(): LastActivity | null {
  return parseLastActivity(readRaw(LAST_ACTIVITY_KEY));
}

export function saveLastActivity(activity: Omit<LastActivity, "updatedAt" | "dismissed">): void {
  writeRaw(LAST_ACTIVITY_KEY, JSON.stringify({ ...activity, updatedAt: Date.now(), dismissed: false }));
}

export function dismissLastActivity(): void {
  const last = loadLastActivity();
  if (last) writeRaw(LAST_ACTIVITY_KEY, JSON.stringify({ ...last, dismissed: true }));
}

export function clearLastActivity(tool: WorkspaceTool): void {
  if (loadLastActivity()?.tool === tool) writeRaw(LAST_ACTIVITY_KEY, null);
}

export function rememberSourceLink(resultId: string, sourceId: string): void {
  writeRaw(SOURCE_LINKS_KEY, JSON.stringify(addSourceLink(parseSourceLinks(readRaw(SOURCE_LINKS_KEY)), resultId, sourceId)));
}

export function lookupSourceLink(resultId: string): string | null {
  return parseSourceLinks(readRaw(SOURCE_LINKS_KEY))[resultId] ?? null;
}

/** Raw stored value ("" when absent) for useSyncExternalStore snapshots. */
export function readStoredRaw(key: string): string {
  return readRaw(key) ?? "";
}
