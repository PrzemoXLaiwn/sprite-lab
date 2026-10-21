"use client";

/**
 * Create ("Generate") session restore, kept out of GenerateWorkspace so the
 * workspace only needs one hook call and one `apply` function.
 *
 * - URL: `?result=<generationId>` follows the selected result; the workspace
 *   already keeps category / type / style / view in the URL.
 * - Draft (localStorage): prompt, quality, palette, pose and the session's
 *   results, so a bare /generate visit or a reload brings them back.
 *   URL params win over the draft for the fields they carry.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { classifyGeneration, cleanGenerationPrompt } from "@/lib/workspace/history";
import {
  clearDraft, clearLastActivity, isMeaningfulCreateDraft, loadDraft, MAX_CREATE_RESULTS, parseToolParams,
  saveDraft, saveLastActivity, withResultParam, type CreateResultSnapshot,
} from "@/lib/workspace/session";
import { fetchOwnGeneration, type SavedGeneration } from "@/components/workspace/restore";
import type { HistoryItem } from "@/components/workspace/HistoryPanel";
import { isUploadedPrompt } from "@/lib/upload-marker";

export interface CreateFormState {
  prompt: string;
  groupId: string;
  subcategoryId: string;
  styleId: string;
  view: string;
  detail: string;
  palette: string;
  pose: string;
}

/** What the workspace should apply; every field is optional. */
export interface CreateRestore {
  form?: Partial<CreateFormState>;
  results?: CreateResultSnapshot[];
  selectedIndex?: number;
}

const URL_FORM_PARAMS = ["prompt", "styleId", "categoryId", "subcategoryId", "view"] as const;

function toSnapshot(r: CreateResultSnapshot): CreateResultSnapshot {
  return {
    id: r.id, imageUrl: r.imageUrl, seed: r.seed, categoryId: r.categoryId, subcategoryId: r.subcategoryId,
    styleId: r.styleId, view: r.view, palette: r.palette, prompt: r.prompt, qualityPreset: r.qualityPreset,
    generationId: r.generationId, resolvedView: r.resolvedView, translatedPrompt: r.translatedPrompt,
  };
}

/** A saved generation as a Create result (view / palette weren't stored, so they read as defaults). */
export function snapshotFromGeneration(g: Pick<SavedGeneration, "id" | "imageUrl" | "prompt" | "categoryId" | "subcategoryId" | "styleId" | "seed">): CreateResultSnapshot {
  return {
    id: `gen-${g.id}`,
    imageUrl: g.imageUrl,
    seed: typeof g.seed === "number" ? g.seed : 0,
    categoryId: g.categoryId,
    subcategoryId: g.subcategoryId,
    styleId: g.styleId,
    view: "none",
    palette: "auto",
    prompt: cleanGenerationPrompt(g.prompt),
    generationId: g.id,
  };
}

/**
 * Form fields a saved generation implies (edits keep the current prompt: theirs
 * is an instruction). An uploaded sprite implies nothing: its name is a file
 * name, not a prompt, so the user's draft prompt and settings stay as they are.
 */
function formFromGeneration(g: Pick<SavedGeneration, "prompt" | "subcategoryId" | "styleId"> & { fullPrompt?: string | null }): Partial<CreateFormState> {
  if (isUploadedPrompt(g.fullPrompt)) return {};
  const form: Partial<CreateFormState> = { subcategoryId: g.subcategoryId, styleId: g.styleId };
  if (classifyGeneration(g) !== "edit") form.prompt = cleanGenerationPrompt(g.prompt);
  return form;
}

export function useCreateSession({ state, results, selectedIndex, projectId, apply }: {
  state: CreateFormState;
  results: CreateResultSnapshot[];
  selectedIndex: number;
  /** Project mode reviews results for a project: no draft there. */
  projectId: string;
  apply: (patch: CreateRestore) => void;
}) {
  const searchParams = useSearchParams();
  const [restoredNote, setRestoredNote] = useState(false);
  const [ready, setReady] = useState(false);
  const applyRef = useRef(apply);
  useEffect(() => { applyRef.current = apply; }, [apply]);
  const resultsRef = useRef(results);
  useEffect(() => { resultsRef.current = results; }, [results]);

  // ── Restore once on mount ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const { result } = parseToolParams(searchParams);
    const draft = projectId ? null : loadDraft("create");
    const meaningful = isMeaningfulCreateDraft(draft) ? draft : null;

    if (meaningful) {
      const form: Partial<CreateFormState> = {
        detail: meaningful.detail, palette: meaningful.palette, pose: meaningful.pose,
      };
      // URL params (links from the gallery, projects…) win over the draft
      if (!searchParams.has("prompt")) form.prompt = meaningful.prompt;
      if (!URL_FORM_PARAMS.some((k) => k !== "prompt" && searchParams.has(k))) {
        form.groupId = meaningful.groupId;
        form.subcategoryId = meaningful.subcategoryId;
        form.styleId = meaningful.styleId;
        form.view = meaningful.view;
      }
      const index = result ? meaningful.results.findIndex((r) => r.generationId === result) : -1;
      applyRef.current({
        form,
        results: meaningful.results,
        selectedIndex: index >= 0 ? index : meaningful.selectedIndex,
      });
      if (!result && meaningful.results.length > 0) setRestoredNote(true);
      if (!result || index >= 0) { setReady(true); return; }
    }

    if (!result) { setReady(true); return; }
    // ?result= that isn't in the draft: load it from the user's generations
    fetchOwnGeneration(result).then((fetched) => {
      if (cancelled) return;
      if (fetched && classifyGeneration(fetched.generation) !== "animation" && classifyGeneration(fetched.generation) !== "model") {
        const snap = snapshotFromGeneration(fetched.generation);
        const prev = (meaningful?.results ?? []).filter((r) => r.generationId !== snap.generationId);
        applyRef.current({ form: formFromGeneration(fetched.generation), results: [snap, ...prev].slice(0, MAX_CREATE_RESULTS), selectedIndex: 0 });
      }
      setReady(true);
    });
    return () => { cancelled = true; };
    // Once on mount; later URL changes come from this page itself
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── ?result= set later by this page's own links (upload, a claimed guest
  // sprite): the page doesn't remount, so load and show it here ────────────
  const urlResult = parseToolParams(searchParams).result ?? null;
  useEffect(() => {
    if (!ready || !urlResult) return;
    const index = resultsRef.current.findIndex((r) => r.generationId === urlResult);
    if (index >= 0) { applyRef.current({ selectedIndex: index }); return; }
    let cancelled = false;
    fetchOwnGeneration(urlResult).then((fetched) => {
      if (cancelled || !fetched) return;
      const kind = classifyGeneration(fetched.generation);
      if (kind === "animation" || kind === "model") return;
      const snap = snapshotFromGeneration(fetched.generation);
      const prev = resultsRef.current.filter((r) => r.generationId !== snap.generationId);
      applyRef.current({ form: formFromGeneration(fetched.generation), results: [snap, ...prev].slice(0, MAX_CREATE_RESULTS), selectedIndex: 0 });
    });
    return () => { cancelled = true; };
  }, [ready, urlResult]);

  // ── Persist ──────────────────────────────────────────────────────────────
  const active = results[selectedIndex] ?? null;
  useEffect(() => {
    if (!ready || projectId) return;
    saveDraft("create", {
      prompt: state.prompt,
      groupId: state.groupId,
      subcategoryId: state.subcategoryId,
      styleId: state.styleId,
      view: state.view,
      detail: state.detail,
      palette: state.palette,
      pose: state.pose,
      results: results.slice(0, MAX_CREATE_RESULTS).map(toSnapshot),
      selectedIndex: Math.min(selectedIndex, MAX_CREATE_RESULTS - 1),
    });
  }, [ready, projectId, state.prompt, state.groupId, state.subcategoryId, state.styleId, state.view, state.detail, state.palette, state.pose, results, selectedIndex]);

  // Address bar follows the selected result
  const activeGenerationId = active?.generationId ?? null;
  useEffect(() => {
    if (!ready) return;
    // A ?result= still loading (set by an upload or a claimed sprite) must not be stripped
    if (!activeGenerationId && urlResult) return;
    const next = withResultParam(`${window.location.pathname}${window.location.search}${window.location.hash}`, activeGenerationId);
    if (next) window.history.replaceState(window.history.state, "", next);
  }, [ready, activeGenerationId, urlResult]);

  // "Continue where you left off" points here once there is a result
  useEffect(() => {
    if (!ready || projectId || !active?.generationId) return;
    saveLastActivity({
      tool: "create",
      href: `/generate?result=${encodeURIComponent(active.generationId)}`,
      title: active.prompt || "Your sprite",
      thumbUrl: active.imageUrl,
      pixel: active.styleId.toUpperCase().includes("PIXEL"),
    });
  }, [ready, projectId, active?.generationId, active?.prompt, active?.imageUrl, active?.styleId]);

  /** History panel: show the item with its prompt and settings. */
  const openFromHistory = useCallback((item: HistoryItem) => {
    const current = resultsRef.current;
    const existing = current.findIndex((r) => r.generationId === item.id);
    if (existing >= 0) {
      applyRef.current({ selectedIndex: existing, form: formFromGeneration(item) });
      return;
    }
    const snap = snapshotFromGeneration(item);
    applyRef.current({
      form: formFromGeneration(item),
      results: [snap, ...current].slice(0, MAX_CREATE_RESULTS),
      selectedIndex: 0,
    });
  }, []);

  const startFresh = useCallback(() => {
    clearDraft("create");
    clearLastActivity("create");
    setRestoredNote(false);
    applyRef.current({ form: { prompt: "" }, results: [], selectedIndex: 0 });
  }, []);

  return {
    restoredNote,
    dismissRestoredNote: () => setRestoredNote(false),
    startFresh,
    openFromHistory,
    activeGenerationId,
  };
}
