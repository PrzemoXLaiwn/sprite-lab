"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Shuffle, Info, Download } from "lucide-react";
import { triggerCreditsRefresh } from "@/components/dashboard/CreditsDisplay";
import {
  ToolShell, ToolPanel, Field, CanvasColumn, CanvasFrame, CanvasImage,
  BackdropToggle, Chip, PrimaryButton, DownloadButton, SecondaryButton, ErrorNote, InfoNote,
  SourceCard, RecentAssetPicker, ProcessingOverlay, CanvasEmptyHint, PageFallback,
  isPixelStyleId, useElapsedSeconds, type ToolBgModeId, type ToolGeneration,
} from "@/components/tools/ToolWorkspace";

type Similarity = "low" | "medium" | "high";

const SIMILARITY_LEVELS: { id: Similarity; name: string; desc: string }[] = [
  { id: "high", name: "High", desc: "Very similar, minor changes" },
  { id: "medium", name: "Medium", desc: "Balanced variations" },
  { id: "low", name: "Low", desc: "More creative changes" },
];

function VariationsPageContent({ generationId }: { generationId: string | null }) {
  const [loading, setLoading] = useState(false);
  const [loadingOriginal, setLoadingOriginal] = useState(true);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [variationImages, setVariationImages] = useState<string[]>([]);
  const [numVariations, setNumVariations] = useState<1 | 2 | 3 | 4>(2);
  const [similarity, setSimilarity] = useState<Similarity>("medium");
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");
  const [originalData, setOriginalData] = useState<ToolGeneration | null>(null);
  const [bgMode, setBgMode] = useState<ToolBgModeId>("checker");
  // -1 = original, otherwise index into variationImages
  const [selected, setSelected] = useState(-1);
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
        setPrompt(data.generation.prompt || "");
      } else {
        setError("Failed to load original image");
      }
    } catch {
      setError("Error loading image");
    } finally {
      setLoadingOriginal(false);
    }
  };

  const handleGenerateVariations = async () => {
    if (!originalImage) {
      setError("No original image loaded");
      return;
    }

    setLoading(true);
    setError("");
    setVariationImages([]);
    setSelected(-1);

    try {
      const response = await fetch("/api/variations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: originalImage,
          numVariations,
          similarity,
          prompt: prompt.trim() || undefined,
          originalGeneration: originalData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Variation generation failed");
      }

      setVariationImages(data.imageUrls);
      if (Array.isArray(data.imageUrls) && data.imageUrls.length > 0) setSelected(0);
      triggerCreditsRefresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (imageUrl: string, index: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `variation-${index + 1}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  const handleDownloadAll = async () => {
    for (let i = 0; i < variationImages.length; i++) {
      await handleDownload(variationImages[i], i);
      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const pixel = isPixelStyleId(originalData?.styleId);
  const isLoadingSource = !!generationId && loadingOriginal;
  const activeImage = selected >= 0 ? variationImages[selected] : originalImage;
  const thumbs = originalImage && variationImages.length > 0 ? [originalImage, ...variationImages] : [];

  return (
    <ToolShell>
      <ToolPanel
        title="Variations"
        cost={numVariations}
        backHref="/assets"
        footer={
          <>
            <PrimaryButton onClick={handleGenerateVariations} disabled={loading || !originalImage} loading={loading}
              loadingLabel={<>Generating… <span className="font-mono">{seconds}s</span></>}
              icon={<Shuffle className="h-4 w-4" />}
              label={`Generate ${numVariations} variation${numVariations > 1 ? "s" : ""}`} cost={numVariations} />
            <p className="mt-2 text-center font-mono text-[11px] text-[#7A8294]">~60–120s · 1 credit each</p>
            {error && <ErrorNote>{error}</ErrorNote>}
          </>
        }
      >
        <Field label="Source">
          <SourceCard imageUrl={originalImage} loading={isLoadingSource} prompt={originalData?.prompt} pixel={pixel} />
        </Field>

        <Field label="Count">
          <div className="grid grid-cols-4 gap-1 rounded-xl bg-white/[0.04] p-1">
            {([1, 2, 3, 4] as const).map((num) => (
              <button key={num} type="button" onClick={() => setNumVariations(num)} disabled={loading}
                className={`rounded-lg py-1.5 font-mono text-[13px] font-semibold transition-colors disabled:cursor-not-allowed ${
                  numVariations === num ? "bg-white/[0.1] text-white shadow-sm" : "text-[#8B93A5] hover:text-white"
                }`}>
                {num}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Similarity" hint={SIMILARITY_LEVELS.find((l) => l.id === similarity)?.desc}>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-white/[0.04] p-1">
            {SIMILARITY_LEVELS.map((level) => (
              <button key={level.id} type="button" onClick={() => setSimilarity(level.id)} disabled={loading} title={level.desc}
                className={`rounded-lg py-1.5 text-[12px] font-medium transition-colors disabled:cursor-not-allowed ${
                  similarity === level.id ? "bg-white/[0.1] text-white shadow-sm" : "text-[#8B93A5] hover:text-white"
                }`}>
                {level.name}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Guide the variations (optional)">
          <div className="rounded-2xl border border-white/[0.08] bg-[#151922] transition-colors focus-within:border-[#FF8A3D]/50">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. different colors, add effects…"
              disabled={loading}
              rows={3}
              className="w-full resize-none bg-transparent px-4 py-3 text-[14px] leading-relaxed text-white outline-none placeholder:text-[#7A8294] disabled:opacity-60"
            />
          </div>
        </Field>

        <InfoNote icon={<Info className="h-3.5 w-3.5 text-[#8B93A5]" />}>
          High similarity keeps the original look with minor tweaks. Low similarity creates more creative variations. Each variation costs 1 credit.
        </InfoNote>
      </ToolPanel>

      <CanvasColumn
        topLeft={
          originalImage ? (
            <>
              <Chip>{selected >= 0 ? `variation ${selected + 1} of ${variationImages.length}` : "original"}</Chip>
              {pixel && <Chip>pixel art</Chip>}
            </>
          ) : (
            <span className="text-[12px] text-[#7A8294]">Your variations will appear here</span>
          )
        }
        topRight={<BackdropToggle value={bgMode} onChange={setBgMode} />}
        actions={
          variationImages.length > 0 ? (
            <>
              {selected >= 0 && (
                <DownloadButton onClick={() => handleDownload(variationImages[selected], selected)} />
              )}
              {variationImages.length > 1 && (
                <SecondaryButton onClick={handleDownloadAll}>
                  <Download className="h-4 w-4" /> Download all <span className="font-mono text-[12px] text-[#8B93A5]">({variationImages.length})</span>
                </SecondaryButton>
              )}
            </>
          ) : undefined
        }
        below={
          thumbs.length > 0 ? (
            <div className="flex justify-center gap-2 overflow-x-auto px-5 pb-5">
              {thumbs.map((url, i) => {
                const idx = i - 1; // -1 = original
                const active = selected === idx;
                return (
                  <button key={`${url}-${i}`} type="button" onClick={() => setSelected(idx)}
                    title={idx < 0 ? "Original" : `Variation ${idx + 1}`}
                    className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-[#151922] transition-all ${
                      active ? "border-[#FF8A3D] ring-2 ring-[#FF8A3D]/25" : "border-white/[0.06] opacity-70 hover:opacity-100"
                    }`}
                    style={{ backgroundImage: "repeating-conic-gradient(#ffffff08 0% 25%, transparent 0% 50%)", backgroundSize: "10px 10px" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className={`h-full w-full object-contain p-1.5 ${pixel ? "pixel-perfect" : ""}`} />
                    <span className="absolute bottom-0.5 left-1 font-mono text-[9px] text-white/80">{idx < 0 ? "orig" : idx + 1}</span>
                  </button>
                );
              })}
            </div>
          ) : undefined
        }
      >
        <CanvasFrame bg={bgMode}>
          {!generationId ? (
            <RecentAssetPicker toolPath="/variations" title="Create variations" />
          ) : isLoadingSource ? (
            <ProcessingOverlay icon={<Shuffle className="h-5 w-5" />} title="Loading sprite…" seconds={0} hint="fetching" />
          ) : activeImage ? (
            <>
              <CanvasImage src={activeImage} alt={selected >= 0 ? `Variation ${selected + 1}` : "Original"} pixel={pixel} dim={loading} />
              {loading && (
                <ProcessingOverlay icon={<Shuffle className="h-5 w-5" />} title={`Generating ${numVariations} variation${numVariations > 1 ? "s" : ""}…`} seconds={seconds} hint="usually 60–120s" />
              )}
            </>
          ) : (
            <CanvasEmptyHint icon={<Shuffle className="h-5 w-5" />} title="Couldn't load this sprite" subtitle="Pick another one from your assets." />
          )}
        </CanvasFrame>
      </CanvasColumn>
    </ToolShell>
  );
}

function VariationsPageKeyed() {
  const generationId = useSearchParams().get("id");
  // Keyed so picking another sprite resets the tool state.
  return <VariationsPageContent key={generationId ?? "none"} generationId={generationId} />;
}

export default function VariationsPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <VariationsPageKeyed />
    </Suspense>
  );
}
