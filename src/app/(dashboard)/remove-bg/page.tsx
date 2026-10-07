"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Scissors, Check, Info, Maximize2 } from "lucide-react";
import { triggerCreditsRefresh } from "@/components/dashboard/CreditsDisplay";
import {
  ToolShell, ToolPanel, ToolTabs, Field, CanvasColumn, CanvasFrame, CanvasImage, BeforeAfter,
  BackdropToggle, Chip, PrimaryButton, DownloadButton, SecondaryButton, ErrorNote, InfoNote,
  SourceCard, RecentAssetPicker, ProcessingOverlay, CanvasEmptyHint, Segmented, PageFallback,
  isPixelStyleId, useElapsedSeconds, type ToolBgModeId, type ToolGeneration,
} from "@/components/tools/ToolWorkspace";

const COST = 1;

function RemoveBgPageContent({ generationId }: { generationId: string | null }) {
  const [loading, setLoading] = useState(false);
  const [loadingOriginal, setLoadingOriginal] = useState(true);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
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

  const [savedToGallery, setSavedToGallery] = useState(false);

  const handleRemoveBackground = async () => {
    if (!originalImage) {
      setError("No original image loaded");
      return;
    }

    setLoading(true);
    setError("");
    setProcessedImage(null);
    setSavedToGallery(false);

    try {
      const response = await fetch("/api/remove-bg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: originalImage,
          originalPrompt: originalData?.prompt,
          categoryId: originalData?.categoryId,
          subcategoryId: originalData?.subcategoryId,
          styleId: originalData?.styleId,
          generationId: generationId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.noCredits) {
          setError("Not enough credits. Background removal costs 1 credit.");
        } else {
          throw new Error(data.error || "Background removal failed");
        }
        return;
      }

      setProcessedImage(data.imageUrl);
      setSavedToGallery(data.savedToGallery || false);
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
      a.download = `no-background-${Date.now()}.png`;
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
        title="Remove background"
        cost={COST}
        tabs={<ToolTabs active="remove-bg" generationId={generationId} />}
        footer={
          <>
            <PrimaryButton onClick={handleRemoveBackground} disabled={loading || !originalImage} loading={loading}
              loadingLabel={<>Removing background… <span className="font-mono">{seconds}s</span></>}
              icon={<Scissors className="h-4 w-4" />} label="Remove background" cost={COST} />
            <p className="mt-2 text-center font-mono text-[11px] text-[#7A8294]">~20–40s · transparent PNG</p>
            {error && <ErrorNote>{error}</ErrorNote>}
          </>
        }
      >
        <Field label="Source">
          <SourceCard imageUrl={originalImage} loading={isLoadingSource} prompt={originalData?.prompt} pixel={pixel} />
        </Field>

        <Field label="How it works">
          <InfoNote icon={<Info className="h-3.5 w-3.5 text-[#8B93A5]" />}>
            <ul className="space-y-1">
              <li>AI detects the subject and removes everything behind it.</li>
              <li>Fine details like hair and soft edges are preserved.</li>
              <li>Outputs a transparent PNG ready for any game engine.</li>
              <li>Works best with clear subject separation.</li>
            </ul>
          </InfoNote>
        </Field>

        {processedImage && (
          <InfoNote tone="success" icon={<Check className="h-3.5 w-3.5 text-emerald-300" />}>
            Background removed — the sprite is now transparent and ready for your engine.
            {savedToGallery && " Auto-saved to your assets."}
          </InfoNote>
        )}
      </ToolPanel>

      <CanvasColumn
        topLeft={
          originalImage ? (
            <>
              {processedImage ? <Chip>background removed</Chip> : <Chip>original</Chip>}
              {pixel && <Chip>pixel art</Chip>}
            </>
          ) : (
            <span className="text-[12px] text-[#7A8294]">Your transparent sprite will appear here</span>
          )
        }
        topRight={
          <div className="flex items-center gap-2">
            {processedImage && (
              <Segmented value={view} onChange={setView}
                options={[{ id: "compare", label: "Compare" }, { id: "result", label: "Result" }]} />
            )}
            <BackdropToggle value={bgMode} onChange={setBgMode} />
          </div>
        }
        actions={
          processedImage ? (
            <>
              <DownloadButton onClick={() => handleDownload(processedImage)} />
              {generationId && (
                <SecondaryButton href={`/upscale?id=${encodeURIComponent(generationId)}`} title="Upscale the original sprite">
                  <Maximize2 className="h-4 w-4" /> Upscale
                </SecondaryButton>
              )}
            </>
          ) : undefined
        }
      >
        <CanvasFrame bg={bgMode}>
          {!generationId ? (
            <RecentAssetPicker toolPath="/remove-bg" title="Remove a background" />
          ) : isLoadingSource ? (
            <ProcessingOverlay icon={<Scissors className="h-5 w-5" />} title="Loading sprite…" seconds={0} hint="fetching" />
          ) : processedImage && originalImage ? (
            view === "compare" ? (
              <BeforeAfter before={originalImage} after={processedImage} pixel={pixel} beforeLabel="Original" afterLabel="No background" />
            ) : (
              <CanvasImage src={processedImage} alt="No background" pixel={pixel} />
            )
          ) : originalImage ? (
            <>
              <CanvasImage src={originalImage} alt="Original" pixel={pixel} dim={loading} />
              {loading && (
                <ProcessingOverlay icon={<Scissors className="h-5 w-5" />} title="Removing background…" seconds={seconds} hint="usually 20–40s" />
              )}
            </>
          ) : (
            <CanvasEmptyHint icon={<Scissors className="h-5 w-5" />} title="Couldn't load this sprite" subtitle="Pick another one from your assets." />
          )}
        </CanvasFrame>
      </CanvasColumn>
    </ToolShell>
  );
}

function RemoveBgPageKeyed() {
  const generationId = useSearchParams().get("id");
  // Keyed so picking another sprite resets the tool state.
  return <RemoveBgPageContent key={generationId ?? "none"} generationId={generationId} />;
}

export default function RemoveBgPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <RemoveBgPageKeyed />
    </Suspense>
  );
}
