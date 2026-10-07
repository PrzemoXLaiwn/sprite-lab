"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Maximize2, Info, Grid3x3, Sparkles, Check, Scissors } from "lucide-react";
import { triggerCreditsRefresh } from "@/components/dashboard/CreditsDisplay";
import {
  ToolShell, ToolPanel, ToolTabs, Field, CanvasColumn, CanvasFrame, CanvasImage, BeforeAfter,
  BackdropToggle, Chip, PrimaryButton, DownloadButton, SecondaryButton, ErrorNote, InfoNote,
  SourceCard, RecentAssetPicker, ProcessingOverlay, CanvasEmptyHint, Segmented, PageFallback,
  isPixelStyleId, useElapsedSeconds, type ToolBgModeId, type ToolGeneration,
} from "@/components/tools/ToolWorkspace";

// Must match /api/upscale: "pixel" = free nearest-neighbour (any plan),
// "runware" = AI upscale (Pro+), 1 credit at 2×, 2 credits at 4×.
type UpscaleMode = "pixel" | "runware";

const MODES: { id: UpscaleMode; name: string; desc: string; icon: typeof Grid3x3 }[] = [
  { id: "pixel", name: "Pixel-perfect", desc: "Duplicates pixels — razor sharp. Free.", icon: Grid3x3 },
  { id: "runware", name: "AI upscale", desc: "Adds detail to painted / cartoon art. Pro+.", icon: Sparkles },
];

const SCALES: Record<UpscaleMode, { value: 2 | 3 | 4; desc: string }[]> = {
  pixel: [
    { value: 2, desc: "2× size" },
    { value: 3, desc: "3× size" },
    { value: 4, desc: "4× size" },
  ],
  runware: [
    { value: 2, desc: "1 credit" },
    { value: 4, desc: "2 credits" },
  ],
};

function costFor(mode: UpscaleMode, scale: number): number {
  if (mode === "pixel") return 0;
  return scale >= 4 ? 2 : 1;
}

function UpscalePageContent({ generationId }: { generationId: string | null }) {
  const [loading, setLoading] = useState(false);
  const [loadingOriginal, setLoadingOriginal] = useState(true);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [upscaledImage, setUpscaledImage] = useState<string | null>(null);
  const [scale, setScale] = useState<2 | 3 | 4>(2);
  const [modeOverride, setModeOverride] = useState<UpscaleMode | null>(null);
  const [error, setError] = useState("");
  const [originalData, setOriginalData] = useState<ToolGeneration | null>(null);
  const [bgMode, setBgMode] = useState<ToolBgModeId>("checker");
  const [view, setView] = useState<"compare" | "result">("compare");
  // Scale the result was produced with (the selector may change afterwards).
  const [resultScale, setResultScale] = useState<number>(2);
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

  const handleUpscale = async () => {
    if (!originalImage) {
      setError("No original image loaded");
      return;
    }

    setLoading(true);
    setError("");
    setUpscaledImage(null);

    try {
      const response = await fetch("/api/upscale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: originalImage,
          scale,
          modelType: mode,
          originalGeneration: originalData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upscale failed");
      }

      setUpscaledImage(data.imageUrl);
      setResultScale(scale);
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
      a.download = `upscaled-${scale}x-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  // Default: pixel-perfect for pixel-art sprites, AI for everything else.
  const sourceIsPixel = isPixelStyleId(originalData?.styleId);
  const mode: UpscaleMode = modeOverride ?? (sourceIsPixel ? "pixel" : "runware");
  const selectMode = (m: UpscaleMode) => {
    setModeOverride(m);
    if (m === "runware" && scale === 3) setScale(4);
  };
  const cost = costFor(mode, scale);
  const pixel = sourceIsPixel || mode === "pixel";
  const isLoadingSource = !!generationId && loadingOriginal;
  const modelName = MODES.find((m) => m.id === mode)?.name ?? mode;

  return (
    <ToolShell>
      <ToolPanel
        title="Upscale"
        cost={cost}
        tabs={<ToolTabs active="upscale" generationId={generationId} />}
        footer={
          <>
            <PrimaryButton onClick={handleUpscale} disabled={loading || !originalImage} loading={loading}
              loadingLabel={<>Upscaling {scale}×… <span className="font-mono">{seconds}s</span></>}
              icon={<Maximize2 className="h-4 w-4" />} label={`Upscale ${scale}×`} cost={cost} />
            <p className="mt-2 text-center font-mono text-[11px] text-[#7A8294]">
              {mode === "pixel" ? "instant · free" : "~30–90s"} · {modelName}
            </p>
            {error && <ErrorNote>{error}</ErrorNote>}
          </>
        }
      >
        <Field label="Source">
          <SourceCard imageUrl={originalImage} loading={isLoadingSource} prompt={originalData?.prompt} pixel={pixel} />
        </Field>

        <Field label="Mode">
          <div className="grid grid-cols-2 gap-2">
            {MODES.map((m) => {
              const active = mode === m.id;
              const Icon = m.icon;
              return (
                <button key={m.id} type="button" onClick={() => selectMode(m.id)} disabled={loading} aria-pressed={active}
                  className={`rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed ${
                    active ? "border-[#FF8A3D] bg-[#FF8A3D]/[0.06] ring-2 ring-[#FF8A3D]/25" : "border-white/[0.08] bg-[#151922] hover:border-white/20"
                  }`}>
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${active ? "text-[#FF8A3D]" : "text-[#8B93A5]"}`} />
                    <span className="text-[13px] font-semibold text-white">{m.name}</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-[#8B93A5]">{m.desc}</p>
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Scale">
          <div className={`grid gap-1 rounded-xl bg-white/[0.04] p-1 ${SCALES[mode].length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
            {SCALES[mode].map((s) => (
              <button key={s.value} type="button" onClick={() => setScale(s.value)} disabled={loading}
                className={`rounded-lg py-2 transition-colors disabled:cursor-not-allowed ${
                  scale === s.value ? "bg-white/[0.1] text-white shadow-sm" : "text-[#8B93A5] hover:text-white"
                }`}>
                <span className="block font-mono text-[14px] font-semibold">{s.value}×</span>
                <span className="block text-[10.5px] opacity-80">{s.desc}</span>
              </button>
            ))}
          </div>
        </Field>

        <InfoNote icon={<Info className="h-3.5 w-3.5 text-[#8B93A5]" />}>
          Use <span className="text-[#C9CFDB]">Pixel-perfect</span> for pixel art — AI upscalers blur hard pixel edges.
          Use <span className="text-[#C9CFDB]">AI upscale</span> for painted, anime or cartoon sprites.
        </InfoNote>

        {upscaledImage && (
          <InfoNote tone="success" icon={<Check className="h-3.5 w-3.5 text-emerald-300" />}>
            Upscaled {resultScale}× — drag the slider on the canvas to compare.
          </InfoNote>
        )}
      </ToolPanel>

      <CanvasColumn
        topLeft={
          originalImage ? (
            <>
              <Chip>{upscaledImage ? `${resultScale}× upscaled` : "original"}</Chip>
              {upscaledImage && <Chip>{modelName}</Chip>}
              {pixel && <Chip>pixel art</Chip>}
            </>
          ) : (
            <span className="text-[12px] text-[#7A8294]">Your upscaled sprite will appear here</span>
          )
        }
        topRight={
          <div className="flex items-center gap-2">
            {upscaledImage && (
              <Segmented value={view} onChange={setView}
                options={[{ id: "compare", label: "Compare" }, { id: "result", label: "Result" }]} />
            )}
            <BackdropToggle value={bgMode} onChange={setBgMode} />
          </div>
        }
        actions={
          upscaledImage ? (
            <>
              <DownloadButton onClick={() => handleDownload(upscaledImage)} />
              {generationId && (
                <SecondaryButton href={`/remove-bg?id=${encodeURIComponent(generationId)}`} title="Remove the background of the original sprite">
                  <Scissors className="h-4 w-4" /> Remove BG
                </SecondaryButton>
              )}
            </>
          ) : undefined
        }
      >
        <CanvasFrame bg={bgMode}>
          {!generationId ? (
            <RecentAssetPicker toolPath="/upscale" title="Upscale a sprite" />
          ) : isLoadingSource ? (
            <ProcessingOverlay icon={<Maximize2 className="h-5 w-5" />} title="Loading sprite…" seconds={0} hint="fetching" />
          ) : upscaledImage && originalImage ? (
            view === "compare" ? (
              <BeforeAfter before={originalImage} after={upscaledImage} pixel={pixel} beforeLabel="Original" afterLabel={`${resultScale}×`} />
            ) : (
              <CanvasImage src={upscaledImage} alt="Upscaled" pixel={pixel} />
            )
          ) : originalImage ? (
            <>
              <CanvasImage src={originalImage} alt="Original" pixel={pixel} dim={loading} />
              {loading && (
                <ProcessingOverlay icon={<Maximize2 className="h-5 w-5" />} title={`Upscaling ${scale}×…`} seconds={seconds} hint="usually 30–90s" />
              )}
            </>
          ) : (
            <CanvasEmptyHint icon={<Maximize2 className="h-5 w-5" />} title="Couldn't load this sprite" subtitle="Pick another one from your assets." />
          )}
        </CanvasFrame>
      </CanvasColumn>
    </ToolShell>
  );
}

function UpscalePageKeyed() {
  const generationId = useSearchParams().get("id");
  // Keyed so picking another sprite resets the tool state.
  return <UpscalePageContent key={generationId ?? "none"} generationId={generationId} />;
}

export default function UpscalePage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <UpscalePageKeyed />
    </Suspense>
  );
}
