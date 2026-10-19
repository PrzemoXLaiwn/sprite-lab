"use client";

import { useCallback, useEffect, useMemo, useState, useRef, Suspense } from "react";
import { EDIT_CREDITS } from "@/config/tool-prices";
import { useRouter, useSearchParams } from "next/navigation";
import { Wand2, Info, Brush, Eraser, Check, RotateCcw, Pencil } from "lucide-react";
import { HistoryButton, HistoryPanel, type HistoryItem } from "@/components/workspace/HistoryPanel";
import { RestoredNote } from "@/components/workspace/ContinueBanner";
import { UploadSpriteButton } from "@/components/generate/UploadSprite";
import { fetchOwnGeneration, useStoredRaw } from "@/components/workspace/restore";
import { classifyGeneration, cleanGenerationPrompt } from "@/lib/workspace/history";
import {
  buildToolHref, clearDraft, clearLastActivity, draftKey, loadDraft, parseDraft, lookupSourceLink, parseToolParams, rememberSourceLink,
  saveDraft, saveLastActivity, withResultParam,
} from "@/lib/workspace/session";
import { MaskPainter, maskDataUrl, clearMask } from "@/components/tools/MaskPainter";
import { triggerCreditsRefresh } from "@/components/dashboard/CreditsDisplay";
import {
  ToolShell, ToolPanel, Field, FooterHint, CanvasColumn, CanvasFrame, CanvasImage, BeforeAfter,
  BackdropToggle, Chip, TopBarHint, PrimaryButton, DownloadButton, SecondaryButton, ErrorNote, InfoNote, SuggestionChip,
  ToolTabs, SourceCard, RecentAssetPicker, ProcessingOverlay, SourceMissing, Segmented, PageFallback, Elapsed,
  isPixelStyleId, useSourceGeneration, toolErrorMessage, downloadImage, type ToolBgModeId,
} from "@/components/tools/ToolWorkspace";

const COST = EDIT_CREDITS;

const SUGGESTIONS = [
  "replace the sword with an axe",
  "make the armor golden",
  "add a red cape",
  "remove the helmet",
  "add glowing runes",
  "make it look frozen",
];

const BRUSHES = [
  { size: 0.05, label: "S", name: "Small brush" },
  { size: 0.1, label: "M", name: "Medium brush" },
  { size: 0.18, label: "L", name: "Large brush" },
];

/** Set right before a bare /edit visit reopens the saved session, so the page can say so. */
let reopenedFromDraft = false;

function EditPageContent({ generationId, resultId }: { generationId: string | null; resultId: string | null }) {
  const router = useRouter();
  const { source, loading: loadingSource, error: sourceError } = useSourceGeneration(generationId);
  const [loading, setLoading] = useState(false);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [error, setError] = useState("");
  const [bgMode, setBgMode] = useState<ToolBgModeId>("checker");
  const [view, setView] = useState<"compare" | "result">("compare");
  // Optional painted area: only this part may change
  const maskRef = useRef<HTMLCanvasElement | null>(null);
  const [painted, setPainted] = useState(false);
  const [brush, setBrush] = useState(0.1);

  // ── Session restore: URL (?id= sprite, ?result= edit) + draft (typed text)
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showRestored, setShowRestored] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [restoringResult, setRestoringResult] = useState(Boolean(resultId));
  const [shownResultId, setShownResultId] = useState<string | null>(null);
  const [resultFromRun, setResultFromRun] = useState(false);
  const shownResultRef = useRef<string | null>(null);

  useEffect(() => {
    if (reopenedFromDraft) {
      reopenedFromDraft = false;
      setShowRestored(true);
    }
    const d = loadDraft("edit");
    if (d && generationId && d.sourceId === generationId && d.editPrompt) setEditPrompt(d.editPrompt);
    setDraftReady(true);
    // Once per sprite (the page is keyed on it)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showResultInUrl = useCallback((id: string | null) => {
    shownResultRef.current = id;
    setShownResultId(id);
    const next = withResultParam(`${window.location.pathname}${window.location.search}${window.location.hash}`, id);
    if (next) window.history.replaceState(window.history.state, "", next);
  }, []);

  // ?result= → show that edit next to the original again
  useEffect(() => {
    if (!resultId || resultId === shownResultRef.current) { setRestoringResult(false); return; }
    let cancelled = false;
    setRestoringResult(true);
    (async () => {
      const d = loadDraft("edit");
      const url = d?.resultId === resultId && d.resultUrl ? d.resultUrl : (await fetchOwnGeneration(resultId))?.generation.imageUrl;
      if (cancelled) return;
      if (!url) {
        setError("Couldn't open that edit. It may have been deleted.");
        showResultInUrl(null);
        return;
      }
      setEditedImage(url);
      setView("compare");
      setResultFromRun(false);
      shownResultRef.current = resultId;
      setShownResultId(resultId);
    })().finally(() => { if (!cancelled) setRestoringResult(false); });
    return () => { cancelled = true; };
  }, [resultId, showResultInUrl]);

  useEffect(() => {
    if (!draftReady || !generationId || restoringResult) return;
    saveDraft("edit", {
      sourceId: generationId,
      editPrompt,
      resultId: editedImage ? shownResultId ?? undefined : undefined,
      resultUrl: editedImage ?? undefined,
    });
  }, [draftReady, generationId, restoringResult, editPrompt, editedImage, shownResultId]);

  useEffect(() => {
    if (!generationId || !source?.imageUrl) return;
    saveLastActivity({
      tool: "edit",
      href: buildToolHref("edit", { id: generationId, result: shownResultId }),
      title: cleanGenerationPrompt(source.prompt) || "Your sprite",
      thumbUrl: editedImage ?? source.imageUrl,
      pixel: isPixelStyleId(source.styleId),
    });
  }, [generationId, source, shownResultId, editedImage]);

  /** History: an edit opens next to its original when known, else as the sprite to keep editing. */
  const openFromHistory = (item: HistoryItem) => {
    if (classifyGeneration(item) === "edit") {
      const src = lookupSourceLink(item.id);
      router.push(src ? buildToolHref("edit", { id: src, result: item.id }) : buildToolHref("edit", { id: item.id }));
    } else if (item.id !== generationId) {
      router.push(buildToolHref("edit", { id: item.id }));
    }
  };

  const startFresh = () => {
    clearDraft("edit");
    clearLastActivity("edit");
    router.push("/edit");
  };

  const originalImage = source?.imageUrl ?? null;
  const canSubmit = Boolean(originalImage) && editPrompt.trim().length > 0 && !loading;

  const handleEdit = async () => {
    if (!originalImage || loading) return;
    if (!editPrompt.trim()) {
      setError("Describe what you want to change first.");
      return;
    }
    setLoading(true);
    setError("");
    setEditedImage(null);

    try {
      const response = await fetch("/api/edit-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: originalImage,
          editPrompt: editPrompt.trim(),
          originalGeneration: source,
          mask: maskDataUrl(maskRef.current, painted),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(toolErrorMessage(response, data, "The edit failed."));
      if (!data?.imageUrl) throw new Error("The edit finished but returned no image. Please try again.");

      setEditedImage(data.imageUrl);
      setView("compare");
      setResultFromRun(true);
      const newId = typeof data.generationId === "string" ? data.generationId : null;
      if (newId && generationId) rememberSourceLink(newId, generationId);
      showResultInUrl(newId);
      triggerCreditsRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /** Back to the original to try a different edit (the result stays in Assets). */
  const startOver = () => {
    setEditedImage(null);
    showResultInUrl(null);
    setPainted(false);
    setError("");
  };

  const pixel = isPixelStyleId(source?.styleId);
  const shownError = error || sourceError;

  return (
    <ToolShell>
      <ToolPanel
        title="Edit with AI"
        cost={COST}
        tabs={<ToolTabs active="edit" generationId={generationId} />}
        headerAction={<HistoryButton onClick={() => setHistoryOpen(true)} />}
        footer={
          <>
            <PrimaryButton onClick={handleEdit} disabled={!canSubmit} loading={loading}
              loadingLabel={<>Editing… <Elapsed /></>}
              icon={<Wand2 className="h-4 w-4" />} label="Apply edit" cost={COST} />
            <FooterHint>~30–60s<span className="max-lg:hidden"> · Ctrl + Enter</span></FooterHint>
            {shownError && <ErrorNote>{shownError}</ErrorNote>}
          </>
        }
      >
        {showRestored && <RestoredNote onStartFresh={startFresh} onDismiss={() => setShowRestored(false)} />}

        <Field label="Sprite">
          <SourceCard imageUrl={originalImage} loading={loadingSource} prompt={source?.prompt} pixel={pixel} />
          <UploadSpriteButton then="edit" label="Edit your own sprite" className="mt-2 w-full justify-center" />
        </Field>

        <Field label="What should change?" labelFor="edit-prompt">
          <div className="rounded-2xl border border-white/[0.08] bg-[#212B4E] transition-colors focus-within:border-[#FFA300]/50">
            <textarea
              id="edit-prompt"
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && canSubmit) {
                  e.preventDefault();
                  handleEdit();
                }
              }}
              placeholder="e.g. make the armor golden"
              disabled={loading || !originalImage}
              maxLength={400}
              rows={3}
              className="w-full resize-none bg-transparent px-4 py-3 text-[14px] leading-relaxed text-white outline-none placeholder:text-[#8A92BF] disabled:opacity-60"
            />
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((suggestion) => (
              <SuggestionChip key={suggestion} active={editPrompt === suggestion}
                onClick={() => setEditPrompt(suggestion)} disabled={loading || !originalImage}>
                {suggestion}
              </SuggestionChip>
            ))}
          </div>
        </Field>

        {originalImage && !editedImage && (
          <Field label="Paint the area to change · optional"
            hint={painted
              ? "Only the painted area will change — everything else stays exactly as it is."
              : "Paint over the part you want changed (e.g. the sword), or skip this and the AI decides."}>
            <div className="flex items-center gap-1.5">
              <span className="mr-0.5 flex items-center gap-1 text-[12px] text-[#A7ADD4]"><Brush className="h-3.5 w-3.5" aria-hidden /> Brush</span>
              {BRUSHES.map((b) => (
                <button key={b.label} type="button" onClick={() => setBrush(b.size)} disabled={loading}
                  aria-label={b.name} aria-pressed={brush === b.size} title={b.name}
                  className={`h-10 w-10 rounded-lg border text-[12px] font-medium transition-colors lg:h-8 lg:w-8 ${
                    brush === b.size ? "border-[#FFA300] bg-[#FFA300]/10 text-white" : "border-white/[0.08] text-[#A7ADD4] hover:text-white"
                  }`}>
                  {b.label}
                </button>
              ))}
              <button type="button" onClick={() => { clearMask(maskRef.current); setPainted(false); }} disabled={!painted || loading}
                className="ml-auto flex h-10 items-center gap-1 rounded-lg border border-white/[0.08] px-3 text-[12px] text-[#A7ADD4] transition-colors hover:text-white disabled:opacity-40 lg:h-8 lg:px-2.5">
                <Eraser className="h-3.5 w-3.5" aria-hidden /> Clear
              </button>
            </div>
          </Field>
        )}

        <InfoNote icon={<Info className="h-3.5 w-3.5 text-[#9AA1CC]" />}>
          One change at a time works best. The sprite keeps its pose, colours, style and pixel size — only what you ask for changes.
        </InfoNote>

        {editedImage && resultFromRun && (
          <InfoNote tone="success" icon={<Check className="h-3.5 w-3.5 text-emerald-300" />}>
            Edit applied and saved to your assets as a new sprite.
          </InfoNote>
        )}
        {editedImage && !resultFromRun && (
          <InfoNote icon={<Pencil className="h-3.5 w-3.5 text-[#9AA1CC]" />}>
            Opened from your history. Keep editing the result, or go back to the original and try another change.
          </InfoNote>
        )}
      </ToolPanel>

      <CanvasColumn
        topLeft={
          originalImage ? (
            <>
              <Chip>{editedImage ? "edited" : painted ? "area painted" : "original"}</Chip>
              {pixel && <Chip>pixel art</Chip>}
            </>
          ) : (
            <TopBarHint>Your edited sprite will appear here</TopBarHint>
          )
        }
        topRight={
          <>
            {editedImage && (
              <Segmented label="Preview mode" value={view} onChange={setView}
                options={[{ id: "compare", label: "Compare" }, { id: "result", label: "Result" }]} />
            )}
            <BackdropToggle value={bgMode} onChange={setBgMode} />
          </>
        }
        actions={editedImage ? (
          <>
            <DownloadButton onClick={() => downloadImage(editedImage, `spritelab-edited-${Date.now()}.png`)} />
            {shownResultId && (
              <SecondaryButton onClick={() => router.push(buildToolHref("edit", { id: shownResultId }))} title="Use the edited sprite as the starting point for the next change">
                <Pencil className="h-4 w-4" /> Keep editing result
              </SecondaryButton>
            )}
            <SecondaryButton onClick={startOver} title="Go back to the original and try another edit">
              <RotateCcw className="h-4 w-4" /> Edit original again
            </SecondaryButton>
          </>
        ) : undefined}
      >
        <CanvasFrame bg={bgMode}>
          {!generationId ? (
            <RecentAssetPicker toolPath="/edit" title="Edit a sprite" />
          ) : restoringResult ? (
            <ProcessingOverlay icon={<Wand2 className="h-5 w-5" />} title="Opening edit…" />
          ) : loadingSource ? (
            <ProcessingOverlay icon={<Wand2 className="h-5 w-5" />} title="Loading sprite…" />
          ) : editedImage && originalImage ? (
            view === "compare" ? (
              <BeforeAfter before={originalImage} after={editedImage} pixel={pixel} beforeLabel="Original" afterLabel="Edited" />
            ) : (
              <CanvasImage src={editedImage} alt="Edited sprite" pixel={pixel} />
            )
          ) : originalImage ? (
            <>
              <MaskPainter src={originalImage} pixel={pixel} brush={brush} canvasRef={maskRef} onPaintedChange={setPainted} disabled={loading} />
              {loading && (
                <ProcessingOverlay icon={<Wand2 className="h-5 w-5" />} title="Editing sprite…" hint="usually 30–60s" timed />
              )}
            </>
          ) : (
            <SourceMissing icon={<Wand2 className="h-5 w-5" />} message={sourceError} />
          )}
        </CanvasFrame>
      </CanvasColumn>

      <HistoryPanel tool="edit" open={historyOpen} onOpenChange={setHistoryOpen} onSelect={openFromHistory}
        activeIds={[generationId, shownResultId]} refreshKey={shownResultId} />
    </ToolShell>
  );
}

function EditPageKeyed() {
  const router = useRouter();
  const { id, result } = parseToolParams(useSearchParams());
  // Bare /edit (sidebar, bottom nav): reopen the last session, if any
  // null = not readable yet (server render / hydration), "" = no draft.
  const bare = !id;
  const draftRaw = useStoredRaw(draftKey("edit"));
  const draft = useMemo(() => (draftRaw ? parseDraft("edit", draftRaw) : null), [draftRaw]);
  useEffect(() => {
    if (!bare || !draft) return;
    reopenedFromDraft = true;
    router.replace(buildToolHref("edit", { id: draft.sourceId, result: draft.resultId }));
  }, [bare, draft, router]);

  if (bare && (draftRaw === null || draft)) return <PageFallback />;
  // Keyed so picking another sprite resets the tool state.
  return <EditPageContent key={id ?? "none"} generationId={id} resultId={id ? result : null} />;
}

export default function EditPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <EditPageKeyed />
    </Suspense>
  );
}
