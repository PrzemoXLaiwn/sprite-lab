"use client";

import { useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Wand2, Info, Brush, Eraser, Check, RotateCcw } from "lucide-react";
import { MaskPainter, maskDataUrl, clearMask } from "@/components/tools/MaskPainter";
import { triggerCreditsRefresh } from "@/components/dashboard/CreditsDisplay";
import {
  ToolShell, ToolPanel, Field, FooterHint, CanvasColumn, CanvasFrame, CanvasImage, BeforeAfter,
  BackdropToggle, Chip, TopBarHint, PrimaryButton, DownloadButton, SecondaryButton, ErrorNote, InfoNote, SuggestionChip,
  SourceCard, RecentAssetPicker, ProcessingOverlay, SourceMissing, Segmented, PageFallback, Elapsed,
  isPixelStyleId, useSourceGeneration, toolErrorMessage, downloadImage, type ToolBgModeId,
} from "@/components/tools/ToolWorkspace";

// Must match EDIT_CREDITS in src/lib/image/sprite-edit.ts
const COST = 4;

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

function EditPageContent({ generationId }: { generationId: string | null }) {
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
        backHref="/assets"
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
        <Field label="Sprite">
          <SourceCard imageUrl={originalImage} loading={loadingSource} prompt={source?.prompt} pixel={pixel} />
        </Field>

        <Field label="What should change?" labelFor="edit-prompt">
          <div className="rounded-2xl border border-white/[0.08] bg-[#151922] transition-colors focus-within:border-[#FF8A3D]/50">
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
              className="w-full resize-none bg-transparent px-4 py-3 text-[14px] leading-relaxed text-white outline-none placeholder:text-[#7A8294] disabled:opacity-60"
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
              <span className="mr-0.5 flex items-center gap-1 text-[12px] text-[#9BA3B4]"><Brush className="h-3.5 w-3.5" aria-hidden /> Brush</span>
              {BRUSHES.map((b) => (
                <button key={b.label} type="button" onClick={() => setBrush(b.size)} disabled={loading}
                  aria-label={b.name} aria-pressed={brush === b.size} title={b.name}
                  className={`h-10 w-10 rounded-lg border text-[12px] font-medium transition-colors lg:h-8 lg:w-8 ${
                    brush === b.size ? "border-[#FF8A3D] bg-[#FF8A3D]/10 text-white" : "border-white/[0.08] text-[#9BA3B4] hover:text-white"
                  }`}>
                  {b.label}
                </button>
              ))}
              <button type="button" onClick={() => { clearMask(maskRef.current); setPainted(false); }} disabled={!painted || loading}
                className="ml-auto flex h-10 items-center gap-1 rounded-lg border border-white/[0.08] px-3 text-[12px] text-[#9BA3B4] transition-colors hover:text-white disabled:opacity-40 lg:h-8 lg:px-2.5">
                <Eraser className="h-3.5 w-3.5" aria-hidden /> Clear
              </button>
            </div>
          </Field>
        )}

        <InfoNote icon={<Info className="h-3.5 w-3.5 text-[#8B93A5]" />}>
          One change at a time works best. The sprite keeps its pose, colours, style and pixel size — only what you ask for changes.
        </InfoNote>

        {editedImage && (
          <InfoNote tone="success" icon={<Check className="h-3.5 w-3.5 text-emerald-300" />}>
            Edit applied and saved to your assets as a new sprite.
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
            <SecondaryButton onClick={startOver} title="Go back to the original and try another edit">
              <RotateCcw className="h-4 w-4" /> Edit original again
            </SecondaryButton>
          </>
        ) : undefined}
      >
        <CanvasFrame bg={bgMode}>
          {!generationId ? (
            <RecentAssetPicker toolPath="/edit" title="Edit a sprite" />
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
    </ToolShell>
  );
}

function EditPageKeyed() {
  const generationId = useSearchParams().get("id");
  // Keyed so picking another sprite resets the tool state.
  return <EditPageContent key={generationId ?? "none"} generationId={generationId} />;
}

export default function EditPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <EditPageKeyed />
    </Suspense>
  );
}
