"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Scissors, Check, Info, Maximize2, Lock } from "lucide-react";
import { triggerCreditsRefresh } from "@/components/dashboard/CreditsDisplay";
import {
  ToolShell, ToolPanel, ToolTabs, Field, FooterHint, CanvasColumn, CanvasFrame, CanvasImage, BeforeAfter,
  BackdropToggle, Chip, TopBarHint, PrimaryButton, DownloadButton, SecondaryButton, ErrorNote, InfoNote,
  SourceCard, RecentAssetPicker, ProcessingOverlay, SourceMissing, Segmented, PageFallback, Elapsed,
  isPixelStyleId, useSourceGeneration, toolErrorMessage, downloadImage, type ToolBgModeId,
} from "@/components/tools/ToolWorkspace";
import { userErrorMessage } from "@/lib/user-error";

// Must match /api/remove-bg (1 credit, Starter plan and up)
const COST = 1;

function RemoveBgPageContent({ generationId }: { generationId: string | null }) {
  const { source, loading: loadingSource, error: sourceError } = useSourceGeneration(generationId);
  const [loading, setLoading] = useState(false);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [savedToGallery, setSavedToGallery] = useState(false);
  const [error, setError] = useState("");
  const [bgMode, setBgMode] = useState<ToolBgModeId>("checker");
  const [view, setView] = useState<"compare" | "result">("compare");

  const originalImage = source?.imageUrl ?? null;

  const handleRemoveBackground = async () => {
    if (!originalImage || loading) return;
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
          originalPrompt: source?.prompt,
          categoryId: source?.categoryId,
          subcategoryId: source?.subcategoryId,
          styleId: source?.styleId,
          generationId,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(toolErrorMessage(response, data, "Background removal failed."));
      if (!data?.imageUrl) throw new Error("Background removal finished but returned no image. Please try again.");

      setProcessedImage(data.imageUrl);
      setSavedToGallery(Boolean(data.savedToGallery));
      setView("compare");
      triggerCreditsRefresh();
    } catch (err) {
      setError(userErrorMessage(err, "Something went wrong. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const pixel = isPixelStyleId(source?.styleId);
  const shownError = error || sourceError;

  return (
    <ToolShell>
      <ToolPanel
        title="Remove background"
        cost={COST}
        tabs={<ToolTabs active="remove-bg" generationId={generationId} />}
        footer={
          <>
            <PrimaryButton onClick={handleRemoveBackground} disabled={loading || !originalImage} loading={loading}
              loadingLabel={<>Removing background… <Elapsed /></>}
              icon={<Scissors className="h-4 w-4" />} label="Remove background" cost={COST} />
            <FooterHint>~20–40s · transparent PNG</FooterHint>
            {shownError && <ErrorNote>{shownError}</ErrorNote>}
          </>
        }
      >
        <Field label="Sprite">
          <SourceCard imageUrl={originalImage} loading={loadingSource} prompt={source?.prompt} pixel={pixel} />
        </Field>

        <InfoNote icon={<Info className="h-3.5 w-3.5 text-[#9AA1CC]" />}>
          Cuts the sprite out and makes everything behind it transparent, ready to drop into any engine.
          New sprites already come without a background — use this for older ones or when a background slipped in.
        </InfoNote>

        <InfoNote icon={<Lock className="h-3.5 w-3.5 text-[#9AA1CC]" />}>
          Available on the <span className="text-[#C8CCE8]">Starter plan and up</span>.
        </InfoNote>

        {processedImage && (
          <InfoNote tone="success" icon={<Check className="h-3.5 w-3.5 text-emerald-300" />}>
            Background removed.{savedToGallery && " Saved to your assets."}
          </InfoNote>
        )}
      </ToolPanel>

      <CanvasColumn
        topLeft={
          originalImage ? (
            <>
              <Chip>{processedImage ? "background removed" : "original"}</Chip>
              {pixel && <Chip>pixel art</Chip>}
            </>
          ) : (
            <TopBarHint>Your transparent sprite will appear here</TopBarHint>
          )
        }
        topRight={
          <>
            {processedImage && (
              <Segmented label="Preview mode" value={view} onChange={setView}
                options={[{ id: "compare", label: "Compare" }, { id: "result", label: "Result" }]} />
            )}
            <BackdropToggle value={bgMode} onChange={setBgMode} />
          </>
        }
        actions={
          processedImage ? (
            <>
              <DownloadButton onClick={() => downloadImage(processedImage, `spritelab-no-background-${Date.now()}.png`)} />
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
          ) : loadingSource ? (
            <ProcessingOverlay icon={<Scissors className="h-5 w-5" />} title="Loading sprite…" />
          ) : processedImage && originalImage ? (
            view === "compare" ? (
              <BeforeAfter before={originalImage} after={processedImage} pixel={pixel} beforeLabel="Original" afterLabel="No background" />
            ) : (
              <CanvasImage src={processedImage} alt="Sprite without background" pixel={pixel} />
            )
          ) : originalImage ? (
            <>
              <CanvasImage src={originalImage} alt="Original sprite" pixel={pixel} dim={loading} />
              {loading && (
                <ProcessingOverlay icon={<Scissors className="h-5 w-5" />} title="Removing background…" hint="usually 20–40s" timed />
              )}
            </>
          ) : (
            <SourceMissing icon={<Scissors className="h-5 w-5" />} message={sourceError} />
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
