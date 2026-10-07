"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Wand2, Info } from "lucide-react";
import { triggerCreditsRefresh } from "@/components/dashboard/CreditsDisplay";
import {
  ToolShell, ToolPanel, Field, CanvasColumn, CanvasFrame, CanvasImage, BeforeAfter,
  BackdropToggle, Chip, PrimaryButton, DownloadButton, ErrorNote, InfoNote,
  SourceCard, RecentAssetPicker, ProcessingOverlay, CanvasEmptyHint, Segmented, PageFallback,
  isPixelStyleId, useElapsedSeconds, type ToolBgModeId, type ToolGeneration,
} from "@/components/tools/ToolWorkspace";

const COST = 1;

const SUGGESTIONS = [
  "add fire effects",
  "make it golden",
  "add glowing runes",
  "add ice effects",
  "make it magical",
  "add lightning",
];

function EditPageContent({ generationId }: { generationId: string | null }) {
  const [loading, setLoading] = useState(false);
  const [loadingOriginal, setLoadingOriginal] = useState(true);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [error, setError] = useState("");
  const [originalData, setOriginalData] = useState<ToolGeneration | null>(null);
  const [bgMode, setBgMode] = useState<ToolBgModeId>("checker");
  const [view, setView] = useState<"compare" | "result">("compare");
  const seconds = useElapsedSeconds(loading);

  // Load original generation
  useEffect(() => {
    if (generationId) {
      loadOriginalGeneration();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generationId]);

  const loadOriginalGeneration = async () => {
    try {
      const response = await fetch(`/api/generations/${generationId}`);
      if (response.ok) {
        const data = await response.json();
        setOriginalImage(data.generation.imageUrl);
        setOriginalData(data.generation);
      } else {
        setError("Failed to load original image");
      }
    } catch {
      setError("Error loading image");
    } finally {
      setLoadingOriginal(false);
    }
  };

  const handleEdit = async () => {
    if (!editPrompt.trim()) {
      setError("Please describe what you want to change");
      return;
    }

    if (!originalImage) {
      setError("No original image loaded");
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
          originalGeneration: originalData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Edit failed");
      }

      setEditedImage(data.imageUrl);
      setView("compare");
      triggerCreditsRefresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `edited-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  const pixel = isPixelStyleId(originalData?.styleId);
  const isLoadingSource = !!generationId && loadingOriginal;

  return (
    <ToolShell>
      <ToolPanel
        title="Edit with AI"
        cost={COST}
        backHref="/assets"
        footer={
          <>
            <PrimaryButton onClick={handleEdit} disabled={loading || !originalImage || !editPrompt.trim()} loading={loading}
              loadingLabel={<>Editing… <span className="font-mono">{seconds}s</span></>}
              icon={<Wand2 className="h-4 w-4" />} label="Apply edit" cost={COST} />
            <p className="mt-2 text-center font-mono text-[11px] text-[#7A8294]">~30–60s · Ctrl + Enter</p>
            {error && <ErrorNote>{error}</ErrorNote>}
          </>
        }
      >
        <Field label="Source">
          <SourceCard imageUrl={originalImage} loading={isLoadingSource} prompt={originalData?.prompt} pixel={pixel} />
        </Field>

        <Field label="Describe your edit">
          <div className="rounded-2xl border border-white/[0.08] bg-[#151922] transition-colors focus-within:border-[#FF8A3D]/50">
            <textarea
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !loading && originalImage && editPrompt.trim()) {
                  e.preventDefault();
                  handleEdit();
                }
              }}
              placeholder="e.g. add fire effects, make it golden, add glowing runes…"
              disabled={loading || !originalImage}
              rows={4}
              className="w-full resize-none bg-transparent px-4 py-3 text-[14px] leading-relaxed text-white outline-none placeholder:text-[#7A8294] disabled:opacity-60"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => setEditPrompt(suggestion)} disabled={loading}
                className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors disabled:opacity-50 ${
                  editPrompt === suggestion
                    ? "border-[#FF8A3D]/60 bg-[#FF8A3D]/12 text-white"
                    : "border-white/[0.08] text-[#9BA3B4] hover:border-white/20 hover:text-white"
                }`}>
                {suggestion}
              </button>
            ))}
          </div>
        </Field>

        <InfoNote icon={<Info className="h-3.5 w-3.5 text-[#8B93A5]" />}>
          Be specific about what you want to change. The AI keeps the original sprite and only applies your requested changes.
        </InfoNote>
      </ToolPanel>

      <CanvasColumn
        topLeft={
          originalImage ? (
            <>
              <Chip>{editedImage ? "edited" : "original"}</Chip>
              {pixel && <Chip>pixel art</Chip>}
            </>
          ) : (
            <span className="text-[12px] text-[#7A8294]">Your edited sprite will appear here</span>
          )
        }
        topRight={
          <div className="flex items-center gap-2">
            {editedImage && (
              <Segmented value={view} onChange={setView}
                options={[{ id: "compare", label: "Compare" }, { id: "result", label: "Result" }]} />
            )}
            <BackdropToggle value={bgMode} onChange={setBgMode} />
          </div>
        }
        actions={editedImage ? <DownloadButton onClick={() => handleDownload(editedImage)} /> : undefined}
      >
        <CanvasFrame bg={bgMode}>
          {!generationId ? (
            <RecentAssetPicker toolPath="/edit" title="Edit a sprite" />
          ) : isLoadingSource ? (
            <ProcessingOverlay icon={<Wand2 className="h-5 w-5" />} title="Loading sprite…" seconds={0} hint="fetching" />
          ) : editedImage && originalImage ? (
            view === "compare" ? (
              <BeforeAfter before={originalImage} after={editedImage} pixel={pixel} beforeLabel="Original" afterLabel="Edited" />
            ) : (
              <CanvasImage src={editedImage} alt="Edited" pixel={pixel} />
            )
          ) : originalImage ? (
            <>
              <CanvasImage src={originalImage} alt="Original" pixel={pixel} dim={loading} />
              {loading && (
                <ProcessingOverlay icon={<Wand2 className="h-5 w-5" />} title="Editing sprite…" seconds={seconds} hint="usually 30–60s" />
              )}
            </>
          ) : (
            <CanvasEmptyHint icon={<Wand2 className="h-5 w-5" />} title="Couldn't load this sprite" subtitle="Pick another one from your assets." />
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
