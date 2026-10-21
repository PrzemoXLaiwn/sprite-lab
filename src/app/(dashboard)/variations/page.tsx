"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Shuffle, Info, Download, Check } from "lucide-react";
import { triggerCreditsRefresh } from "@/components/dashboard/CreditsDisplay";
import {
  ToolShell, ToolPanel, Field, FooterHint, CanvasColumn, CanvasFrame, CanvasImage,
  BackdropToggle, Chip, TopBarHint, PrimaryButton, DownloadButton, SecondaryButton, ErrorNote, InfoNote,
  SourceCard, RecentAssetPicker, ProcessingOverlay, SourceMissing, PageFallback, Elapsed,
  isPixelStyleId, useSourceGeneration, toolErrorMessage, downloadImage, type ToolBgModeId,
} from "@/components/tools/ToolWorkspace";
import { userErrorMessage } from "@/lib/user-error";

type Similarity = "low" | "medium" | "high";

const SIMILARITY_LEVELS: { id: Similarity; name: string; desc: string }[] = [
  { id: "high", name: "Close", desc: "Very close to the original — small changes only." },
  { id: "medium", name: "Balanced", desc: "Same idea, noticeably different details." },
  { id: "low", name: "Loose", desc: "Freer takes on the same idea." },
];

function VariationsPageContent({ generationId }: { generationId: string | null }) {
  const { source, loading: loadingSource, error: sourceError } = useSourceGeneration(generationId);
  const [loading, setLoading] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [variationImages, setVariationImages] = useState<string[]>([]);
  const [numVariations, setNumVariations] = useState<1 | 2 | 3 | 4>(2);
  const [similarity, setSimilarity] = useState<Similarity>("medium");
  // Optional guidance, appended to the sprite's original description.
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");
  const [bgMode, setBgMode] = useState<ToolBgModeId>("checker");
  // -1 = original, otherwise index into variationImages
  const [selected, setSelected] = useState(-1);

  const originalImage = source?.imageUrl ?? null;

  const handleGenerateVariations = async () => {
    if (!originalImage || loading) return;
    const guide = prompt.trim();
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
          // Guidance is added to the original description so the subject stays
          prompt: guide ? (source?.prompt ? `${source.prompt}, ${guide}` : guide) : undefined,
          originalGeneration: source,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(toolErrorMessage(response, data, "Couldn't create variations."));
      const urls: string[] = Array.isArray(data?.imageUrls) ? data.imageUrls : [];
      if (urls.length === 0) throw new Error("No variations came back — please try again.");

      setVariationImages(urls);
      setSelected(0);
      triggerCreditsRefresh();
    } catch (err) {
      setError(userErrorMessage(err, "Something went wrong. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAll = async () => {
    setDownloadingAll(true);
    try {
      for (let i = 0; i < variationImages.length; i++) {
        await downloadImage(variationImages[i], `spritelab-variation-${i + 1}.png`);
        // Browsers block rapid back-to-back downloads
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    } finally {
      setDownloadingAll(false);
    }
  };

  const pixel = isPixelStyleId(source?.styleId);
  const activeImage = selected >= 0 ? variationImages[selected] : originalImage;
  const thumbs = originalImage && variationImages.length > 0 ? [originalImage, ...variationImages] : [];
  const level = SIMILARITY_LEVELS.find((l) => l.id === similarity);
  const shownError = error || sourceError;
  const plural = numVariations > 1 ? "s" : "";

  return (
    <ToolShell>
      <ToolPanel
        title="Variations"
        cost={numVariations}
        backHref="/assets"
        footer={
          <>
            <PrimaryButton onClick={handleGenerateVariations} disabled={loading || !originalImage} loading={loading}
              loadingLabel={<>Creating variations… <Elapsed /></>}
              icon={<Shuffle className="h-4 w-4" />}
              label={`Create ${numVariations} variation${plural}`} cost={numVariations} />
            <FooterHint>~60–120s · 3 credits per variation</FooterHint>
            {shownError && <ErrorNote>{shownError}</ErrorNote>}
          </>
        }
      >
        <Field label="Sprite">
          <SourceCard imageUrl={originalImage} loading={loadingSource} prompt={source?.prompt} pixel={pixel} />
        </Field>

        <Field label="How many">
          <div className="grid grid-cols-4 gap-1 rounded-xl bg-white/[0.04] p-1">
            {([1, 2, 3, 4] as const).map((num) => (
              <button key={num} type="button" onClick={() => setNumVariations(num)} disabled={loading}
                aria-pressed={numVariations === num} aria-label={`${num} variation${num > 1 ? "s" : ""}`}
                className={`min-h-10 rounded-lg font-mono text-[13px] font-semibold transition-colors disabled:cursor-not-allowed lg:min-h-8 ${
                  numVariations === num ? "bg-white/[0.1] text-white shadow-sm" : "text-[#9AA1CC] hover:text-white"
                }`}>
                {num}
              </button>
            ))}
          </div>
        </Field>

        <Field label="How different" hint={level?.desc}>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-white/[0.04] p-1">
            {SIMILARITY_LEVELS.map((l) => (
              <button key={l.id} type="button" onClick={() => setSimilarity(l.id)} disabled={loading} aria-pressed={similarity === l.id}
                className={`min-h-10 rounded-lg text-[12px] font-medium transition-colors disabled:cursor-not-allowed lg:min-h-8 ${
                  similarity === l.id ? "bg-white/[0.1] text-white shadow-sm" : "text-[#9AA1CC] hover:text-white"
                }`}>
                {l.name}
              </button>
            ))}
          </div>
        </Field>

        <Field label="What to change · optional" labelFor="variation-guide">
          <div className="rounded-2xl border border-white/[0.08] bg-[#212B4E] transition-colors focus-within:border-[#FFA300]/50">
            <textarea
              id="variation-guide"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. blue and silver colours, add a glowing aura"
              disabled={loading}
              maxLength={300}
              rows={3}
              className="w-full resize-none bg-transparent px-4 py-3 text-[14px] leading-relaxed text-white outline-none placeholder:text-[#8A92BF] disabled:opacity-60"
            />
          </div>
        </Field>

        <InfoNote icon={<Info className="h-3.5 w-3.5 text-[#9AA1CC]" />}>
          Each variation is a new take on your sprite in the same style. Any that fail are refunded automatically.
        </InfoNote>

        {variationImages.length > 0 && (
          <InfoNote tone="success" icon={<Check className="h-3.5 w-3.5 text-emerald-300" />}>
            {variationImages.length} variation{variationImages.length > 1 ? "s" : ""} ready — pick one below the preview.
          </InfoNote>
        )}
      </ToolPanel>

      <CanvasColumn
        topLeft={
          originalImage ? (
            <>
              <Chip>{selected >= 0 ? `variation ${selected + 1} of ${variationImages.length}` : "original"}</Chip>
              {pixel && <Chip>pixel art</Chip>}
            </>
          ) : (
            <TopBarHint>Your variations will appear here</TopBarHint>
          )
        }
        topRight={<BackdropToggle value={bgMode} onChange={setBgMode} />}
        actions={
          variationImages.length > 0 ? (
            <>
              {selected >= 0 && (
                <DownloadButton onClick={() => downloadImage(variationImages[selected], `spritelab-variation-${selected + 1}.png`)} />
              )}
              {variationImages.length > 1 && (
                <SecondaryButton onClick={handleDownloadAll} disabled={downloadingAll}>
                  <Download className="h-4 w-4" /> Download all <span className="font-mono text-[12px] text-[#9AA1CC]">({variationImages.length})</span>
                </SecondaryButton>
              )}
            </>
          ) : undefined
        }
        below={
          thumbs.length > 0 ? (
            <div role="group" aria-label="Variations" className="flex gap-2 overflow-x-auto px-4 pb-5 sm:justify-center sm:px-5">
              {thumbs.map((url, i) => {
                const idx = i - 1; // -1 = original
                const active = selected === idx;
                const name = idx < 0 ? "Original" : `Variation ${idx + 1}`;
                return (
                  <button key={`${url}-${i}`} type="button" onClick={() => setSelected(idx)}
                    title={name} aria-label={name} aria-pressed={active}
                    className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-[#212B4E] transition-all ${
                      active ? "border-[#FFA300] ring-2 ring-[#FFA300]/25" : "border-white/[0.06] opacity-70 hover:opacity-100"
                    }`}
                    style={{ backgroundImage: "repeating-conic-gradient(#ffffff08 0% 25%, transparent 0% 50%)", backgroundSize: "10px 10px" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className={`h-full w-full object-contain p-1.5 ${pixel ? "pixel-perfect" : ""}`} />
                    <span className="absolute bottom-0.5 left-1 font-mono text-[9px] text-white/80" aria-hidden>{idx < 0 ? "orig" : idx + 1}</span>
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
          ) : loadingSource ? (
            <ProcessingOverlay icon={<Shuffle className="h-5 w-5" />} title="Loading sprite…" />
          ) : activeImage ? (
            <>
              <CanvasImage src={activeImage} alt={selected >= 0 ? `Variation ${selected + 1}` : "Original sprite"} pixel={pixel} dim={loading} />
              {loading && (
                <ProcessingOverlay icon={<Shuffle className="h-5 w-5" />} title={`Creating ${numVariations} variation${plural}…`} hint="usually 60–120s" timed />
              )}
            </>
          ) : (
            <SourceMissing icon={<Shuffle className="h-5 w-5" />} message={sourceError} />
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
