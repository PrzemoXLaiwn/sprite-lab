"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Maximize2, Info, Grid3x3, Sparkles, Check, Scissors } from "lucide-react";
import { triggerCreditsRefresh } from "@/components/dashboard/CreditsDisplay";
import {
  ToolShell, ToolPanel, ToolTabs, Field, FooterHint, CanvasColumn, CanvasFrame, CanvasImage, BeforeAfter,
  BackdropToggle, Chip, TopBarHint, PrimaryButton, DownloadButton, SecondaryButton, ErrorNote, InfoNote, OptionCard,
  SourceCard, RecentAssetPicker, ProcessingOverlay, SourceMissing, Segmented, PageFallback, Elapsed,
  isPixelStyleId, useSourceGeneration, toolErrorMessage, downloadImage, creditLabel, type ToolBgModeId,
} from "@/components/tools/ToolWorkspace";

// Must match /api/upscale: "pixel" = free nearest-neighbour (any plan),
// "runware" = AI upscale (Pro and up), 1 credit at 2×, 2 credits at 4×.
type UpscaleMode = "pixel" | "runware";

const MODES: { id: UpscaleMode; name: string; desc: string; badge: string; icon: typeof Grid3x3 }[] = [
  { id: "pixel", name: "Pixel-perfect", desc: "Every pixel becomes a crisp block. Best for pixel art.", badge: "free", icon: Grid3x3 },
  { id: "runware", name: "AI upscale", desc: "Adds real detail to painted, anime or cartoon art.", badge: "Pro plan & up", icon: Sparkles },
];

const SCALES: Record<UpscaleMode, (2 | 3 | 4)[]> = {
  pixel: [2, 3, 4],
  runware: [2, 4],
};

function costFor(mode: UpscaleMode, scale: number): number {
  if (mode === "pixel") return 0;
  return scale >= 4 ? 2 : 1;
}

function UpscalePageContent({ generationId }: { generationId: string | null }) {
  const { source, loading: loadingSource, error: sourceError } = useSourceGeneration(generationId);
  const [loading, setLoading] = useState(false);
  const [upscaledImage, setUpscaledImage] = useState<string | null>(null);
  const [scale, setScale] = useState<2 | 3 | 4>(2);
  const [modeOverride, setModeOverride] = useState<UpscaleMode | null>(null);
  const [error, setError] = useState("");
  const [bgMode, setBgMode] = useState<ToolBgModeId>("checker");
  const [view, setView] = useState<"compare" | "result">("compare");
  // Scale + mode the result was produced with (the selectors may change afterwards).
  const [result, setResult] = useState<{ scale: number; mode: UpscaleMode; saved: boolean }>({ scale: 2, mode: "pixel", saved: false });

  const originalImage = source?.imageUrl ?? null;
  // Default: pixel-perfect for pixel-art sprites, AI for everything else.
  const sourceIsPixel = isPixelStyleId(source?.styleId);
  const mode: UpscaleMode = modeOverride ?? (sourceIsPixel ? "pixel" : "runware");

  const selectMode = (m: UpscaleMode) => {
    setModeOverride(m);
    if (m === "runware" && scale === 3) setScale(4);
  };

  const handleUpscale = async () => {
    if (!originalImage || loading) return;
    setLoading(true);
    setError("");
    setUpscaledImage(null);

    try {
      const response = await fetch("/api/upscale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: originalImage, scale, modelType: mode, originalGeneration: source }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(toolErrorMessage(response, data, "Upscaling failed."));
      if (!data?.imageUrl) throw new Error("Upscaling finished but returned no image. Please try again.");

      setUpscaledImage(data.imageUrl);
      setResult({ scale, mode, saved: Boolean(data.savedToGallery) });
      setView("compare");
      triggerCreditsRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const cost = costFor(mode, scale);
  const pixel = sourceIsPixel || mode === "pixel";
  const modelName = (m: UpscaleMode) => MODES.find((x) => x.id === m)?.name ?? m;
  const shownError = error || sourceError;

  return (
    <ToolShell>
      <ToolPanel
        title="Upscale"
        cost={cost}
        tabs={<ToolTabs active="upscale" generationId={generationId} />}
        footer={
          <>
            <PrimaryButton onClick={handleUpscale} disabled={loading || !originalImage} loading={loading}
              loadingLabel={<>Upscaling {scale}×… <Elapsed /></>}
              icon={<Maximize2 className="h-4 w-4" />} label={`Upscale ${scale}×`} cost={cost} />
            <FooterHint>{mode === "pixel" ? "a few seconds" : "~30–90s"} · {modelName(mode)}</FooterHint>
            {shownError && <ErrorNote>{shownError}</ErrorNote>}
          </>
        }
      >
        <Field label="Sprite">
          <SourceCard imageUrl={originalImage} loading={loadingSource} prompt={source?.prompt} pixel={pixel} />
        </Field>

        <Field label="Method">
          <div className="grid grid-cols-2 gap-2">
            {MODES.map((m) => {
              const active = mode === m.id;
              const Icon = m.icon;
              return (
                <OptionCard key={m.id} active={active} onClick={() => selectMode(m.id)} disabled={loading} className="p-3">
                  <span className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 shrink-0 ${active ? "text-[#FFA300]" : "text-[#9AA1CC]"}`} />
                    <span className="text-[13px] font-semibold text-white">{m.name}</span>
                  </span>
                  <span className="mt-1 block text-[11.5px] leading-snug text-[#9AA1CC]">{m.desc}</span>
                  <span className="mt-1.5 block font-mono text-[10.5px] text-[#FFC857]">{m.badge}</span>
                </OptionCard>
              );
            })}
          </div>
        </Field>

        <Field label="Size" hint={mode === "runware" ? "2× costs 1 credit, 4× costs 2 credits." : "Pixel-perfect is free at any size."}>
          <div className={`grid gap-1 rounded-xl bg-white/[0.04] p-1 ${SCALES[mode].length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
            {SCALES[mode].map((s) => (
              <button key={s} type="button" onClick={() => setScale(s)} disabled={loading} aria-pressed={scale === s}
                className={`min-h-11 rounded-lg py-1.5 transition-colors disabled:cursor-not-allowed ${
                  scale === s ? "bg-white/[0.1] text-white shadow-sm" : "text-[#9AA1CC] hover:text-white"
                }`}>
                <span className="block font-mono text-[14px] font-semibold">{s}×</span>
                <span className="block text-[10.5px] opacity-80">{creditLabel(costFor(mode, s))}</span>
              </button>
            ))}
          </div>
        </Field>

        <InfoNote icon={<Info className="h-3.5 w-3.5 text-[#9AA1CC]" />}>
          Use <span className="text-[#C8CCE8]">Pixel-perfect</span> for pixel art — AI upscalers blur hard pixel edges.
          Use <span className="text-[#C8CCE8]">AI upscale</span> for painted, anime or cartoon sprites.
        </InfoNote>

        {upscaledImage && (
          <InfoNote tone="success" icon={<Check className="h-3.5 w-3.5 text-emerald-300" />}>
            Upscaled {result.scale}×.{result.saved && " Saved to your assets."} Drag across the preview to compare.
          </InfoNote>
        )}
      </ToolPanel>

      <CanvasColumn
        topLeft={
          originalImage ? (
            <>
              <Chip>{upscaledImage ? `${result.scale}× upscaled` : "original"}</Chip>
              {upscaledImage && <Chip>{modelName(result.mode)}</Chip>}
              {pixel && <Chip>pixel art</Chip>}
            </>
          ) : (
            <TopBarHint>Your upscaled sprite will appear here</TopBarHint>
          )
        }
        topRight={
          <>
            {upscaledImage && (
              <Segmented label="Preview mode" value={view} onChange={setView}
                options={[{ id: "compare", label: "Compare" }, { id: "result", label: "Result" }]} />
            )}
            <BackdropToggle value={bgMode} onChange={setBgMode} />
          </>
        }
        actions={
          upscaledImage ? (
            <>
              <DownloadButton onClick={() => downloadImage(upscaledImage, `spritelab-upscaled-${result.scale}x-${Date.now()}.png`)} />
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
          ) : loadingSource ? (
            <ProcessingOverlay icon={<Maximize2 className="h-5 w-5" />} title="Loading sprite…" />
          ) : upscaledImage && originalImage ? (
            view === "compare" ? (
              <BeforeAfter before={originalImage} after={upscaledImage} pixel={pixel} beforeLabel="Original" afterLabel={`${result.scale}×`} />
            ) : (
              <CanvasImage src={upscaledImage} alt="Upscaled sprite" pixel={pixel} />
            )
          ) : originalImage ? (
            <>
              <CanvasImage src={originalImage} alt="Original sprite" pixel={pixel} dim={loading} />
              {loading && (
                <ProcessingOverlay icon={<Maximize2 className="h-5 w-5" />} title={`Upscaling ${scale}×…`}
                  hint={mode === "pixel" ? "a few seconds" : "usually 30–90s"} timed />
              )}
            </>
          ) : (
            <SourceMissing icon={<Maximize2 className="h-5 w-5" />} message={sourceError} />
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
