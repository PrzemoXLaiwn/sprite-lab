"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Film, Info, Check, Download, Wand2 } from "lucide-react";
import { triggerCreditsRefresh } from "@/components/dashboard/CreditsDisplay";
import { triggerUpgradeModal } from "@/components/dashboard/UpgradeModal";
import {
  ToolShell, ToolPanel, ToolTabs, Field, CanvasColumn, CanvasFrame, CanvasImage,
  BackdropToggle, Chip, PrimaryButton, SecondaryButton, ErrorNote, InfoNote,
  SourceCard, RecentAssetPicker, ProcessingOverlay, CanvasEmptyHint, Segmented, PageFallback,
  isPixelStyleId, useElapsedSeconds, type ToolBgModeId, type ToolGeneration,
} from "@/components/tools/ToolWorkspace";
import { ANIMATION_FRAME_OPTIONS, DEFAULT_ANIMATION_FRAMES, animationCredits, animationFrameOption, animationPresetsFor } from "@/config/animations";
import type { SuggestedMotion } from "@/lib/animation-suggest";

const CUSTOM_EXAMPLES = [
  "breathes a stream of fire forward",
  "raises the staff and summons lightning",
  "draws the bow and shoots an arrow",
  "dances happily and spins around",
];

interface AnimationResult {
  sheetUrl: string;
  gifUrl: string | null;
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
}

/** Plays a horizontal sprite sheet at an adjustable frame rate. */
function SheetPlayer({ result, fps, pixel }: { result: AnimationResult; fps: number; pixel: boolean }) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % result.frameCount), 1000 / fps);
    return () => clearInterval(id);
  }, [fps, result.frameCount]);
  return (
    <div className="absolute inset-0 flex items-center justify-center p-[8%]">
      <div
        role="img"
        aria-label={`Animation preview, frame ${frame + 1} of ${result.frameCount}`}
        className={`max-h-full max-w-full ${pixel ? "pixel-perfect" : ""}`}
        style={{
          aspectRatio: `${result.frameWidth} / ${result.frameHeight}`,
          width: result.frameWidth >= result.frameHeight ? "100%" : "auto",
          height: result.frameWidth >= result.frameHeight ? "auto" : "100%",
          backgroundImage: `url(${result.sheetUrl})`,
          backgroundSize: `${result.frameCount * 100}% 100%`,
          backgroundPosition: `${(frame / Math.max(1, result.frameCount - 1)) * 100}% 0`,
          backgroundRepeat: "no-repeat",
          imageRendering: pixel ? "pixelated" : "auto",
        }}
      />
    </div>
  );
}

async function downloadUrl(url: string, filename: string) {
  try {
    const blob = await (await fetch(url)).blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(href);
  } catch {
    window.open(url, "_blank");
  }
}

/** Splits the sheet into individual frame PNGs and zips them. */
async function downloadFramesZip(result: AnimationResult, baseName: string) {
  const blob = await (await fetch(result.sheetUrl)).blob();
  const bitmap = await createImageBitmap(blob);
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const canvas = document.createElement("canvas");
  const w = result.frameWidth, h = result.frameHeight;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  for (let i = 0; i < result.frameCount; i++) {
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(bitmap, i * w, 0, w, h, 0, 0, w, h);
    const frame = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
    if (frame) zip.file(`${baseName}_frame${i + 1}.png`, frame);
  }
  zip.file(`${baseName}_sheet.png`, blob);
  const out = await zip.generateAsync({ type: "blob" });
  const href = URL.createObjectURL(out);
  const a = document.createElement("a");
  a.href = href;
  a.download = `${baseName}_frames.zip`;
  a.click();
  URL.revokeObjectURL(href);
}

function AnimatePageContent({ generationId }: { generationId: string | null }) {
  const [source, setSource] = useState<ToolGeneration | null>(null);
  const [loadingSource, setLoadingSource] = useState(Boolean(generationId));
  const [action, setAction] = useState<string>("");
  const [customMotion, setCustomMotion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnimationResult | null>(null);
  const [view, setView] = useState<"play" | "sheet">("play");
  const [frames, setFrames] = useState<number>(DEFAULT_ANIMATION_FRAMES);
  const [smooth, setSmooth] = useState(true);
  const [fps, setFps] = useState(8);
  const [bgMode, setBgMode] = useState<ToolBgModeId>("checker");
  const seconds = useElapsedSeconds(loading);

  useEffect(() => {
    if (!generationId) return;
    let cancelled = false;
    fetch(`/api/generations/${encodeURIComponent(generationId)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setSource(data.generation);
      })
      .catch(() => { if (!cancelled) setError("Couldn't load this sprite."); })
      .finally(() => { if (!cancelled) setLoadingSource(false); });
    return () => { cancelled = true; };
  }, [generationId]);

  // Motions tailored to this sprite (a dog gets Bark / Sit, not Fly); the
  // category presets show until they arrive or if the helper is unavailable.
  const [suggested, setSuggested] = useState<SuggestedMotion[] | null>(null);
  const [suggesting, setSuggesting] = useState(Boolean(generationId));
  useEffect(() => {
    if (!generationId) return;
    let cancelled = false;
    fetch(`/api/animate/suggest?id=${encodeURIComponent(generationId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.ai && Array.isArray(data.motions) && data.motions.length) {
          setSuggested(data.motions);
          setAction((a) => (a && a !== "custom" ? "" : a)); // re-pick the first tailored motion
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setSuggesting(false); });
    return () => { cancelled = true; };
  }, [generationId]);

  const presets: SuggestedMotion[] = suggested ?? animationPresetsFor(source?.categoryId).map((p) => ({ ...p, loop: p.loop ?? true }));
  const selected = action || presets[0]?.id || "custom";
  const selectedPreset = presets.find((p) => p.id === selected);
  const isTile = (source?.categoryId ?? "").toUpperCase() === "TILESETS";
  const smoothOn = smooth && !isTile;

  // Each motion comes with a recommended number of key poses (a walk needs
  // more than a pulse) — applied until the user picks a count themselves.
  const [framesTouched, setFramesTouched] = useState(false);
  const recommendedFrames = selectedPreset?.frames;
  useEffect(() => {
    if (!framesTouched && recommendedFrames) setFrames(recommendedFrames);
  }, [recommendedFrames, framesTouched]);
  const pixel = isPixelStyleId(source?.styleId);
  const baseName = `spritelab-${selected}-${Date.now().toString(36)}`;
  const option = animationFrameOption(frames);
  const cost = animationCredits(frames, smoothOn);

  const animate = async () => {
    if (!generationId || loading) return;
    if (selected === "custom" && customMotion.trim().length < 3) {
      setError("Describe how it should move.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/animate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generationId, action: selected, frames, smooth: smoothOn,
          ...(selected === "custom" ? { customMotion } : {}),
          // Tailored motions travel with their description
          ...(selected.startsWith("ai-") && selectedPreset ? { customMotion: selectedPreset.motion, label: selectedPreset.label, loop: selectedPreset.loop, anchor: selectedPreset.anchor } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 402 || data.noCredits) triggerUpgradeModal();
        throw new Error(data.error || "Animation failed. Please try again.");
      }
      setResult(data);
      setFps(data.smoothed ? (data.frameCount >= 12 ? 18 : 14) : data.frameCount >= 9 ? 12 : data.frameCount >= 6 ? 10 : 8);
      setView("play");
      triggerCreditsRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Animation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolShell>
      <ToolPanel
        title="Animate"
        cost={cost}
        tabs={<ToolTabs active="animate" generationId={generationId} />}
        footer={
          <>
            <PrimaryButton onClick={animate} disabled={loading || !source} loading={loading}
              loadingLabel={<>Animating… <span className="font-mono">{seconds}s</span></>}
              icon={<Film className="h-4 w-4" />} label="Animate" cost={cost} />
            <p className="mt-2 text-center font-mono text-[11px] text-[#7A8294]">{smoothOn ? "~45–90s" : option.frames > 4 ? "~30–60s" : "~25–45s"} · {option.frames * (smoothOn ? 2 : 1)} frames · sprite sheet + GIF</p>
            {error && <ErrorNote>{error}</ErrorNote>}
          </>
        }
      >
        <Field label="Sprite">
          <SourceCard imageUrl={source?.imageUrl ?? null} loading={loadingSource} prompt={source?.prompt} pixel={pixel} />
        </Field>

        {source && (
          <Field label={suggesting ? "Motion · tailoring to your sprite…" : suggested ? "Motion · picked for this sprite" : "Motion"}>
            <div className={`grid grid-cols-2 gap-1.5 transition-opacity ${suggesting ? "opacity-60" : ""}`}>
              {[...presets, { id: "custom", label: "Custom…", motion: "" }].map((p) => {
                const active = selected === p.id;
                return (
                  <button key={p.id} type="button" onClick={() => setAction(p.id)} disabled={loading} aria-pressed={active} title={p.motion || undefined}
                    className={`rounded-xl border px-3 py-2.5 text-left text-[13px] font-medium transition-colors disabled:cursor-not-allowed ${
                      active ? "border-[#FF8A3D] bg-[#FF8A3D]/[0.06] text-white ring-2 ring-[#FF8A3D]/25" : "border-white/[0.08] bg-[#151922] text-[#C9CFDB] hover:border-white/20"
                    }`}>
                    {p.label}
                  </button>
                );
              })}
            </div>
            {selectedPreset && selected !== "custom" && (
              <p className="mt-2 rounded-lg bg-white/[0.03] px-3 py-2 text-[11.5px] leading-snug text-[#9BA3B4]">{selectedPreset.motion}</p>
            )}
            {selected === "custom" && (
              <textarea value={customMotion} onChange={(e) => setCustomMotion(e.target.value)} maxLength={300} rows={3}
                placeholder="e.g. swings the axe overhead and slams it down"
                aria-label="Describe the motion"
                className="mt-2 w-full resize-none rounded-xl border border-white/[0.08] bg-[#151922] px-3 py-2.5 text-[13px] text-white outline-none placeholder:text-[#7A8294] focus:border-[#FF8A3D]/50" />
            )}
            {selected === "custom" && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {CUSTOM_EXAMPLES.map((ex) => (
                  <button key={ex} type="button" onClick={() => setCustomMotion(ex)} disabled={loading}
                    className="rounded-full border border-white/[0.08] px-2.5 py-1 text-[11px] text-[#8B93A5] transition-colors hover:border-white/20 hover:text-white">
                    {ex}
                  </button>
                ))}
              </div>
            )}
          </Field>
        )}

        {source && (
          <Field label="Key poses">
            <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Number of key poses">
              {ANIMATION_FRAME_OPTIONS.map((o) => {
                const active = frames === o.frames;
                return (
                  <button key={o.frames} type="button" role="radio" aria-checked={active} onClick={() => { setFrames(o.frames); setFramesTouched(true); }} disabled={loading}
                    className={`rounded-xl border px-2 py-2 text-center transition-colors disabled:cursor-not-allowed ${
                      active ? "border-[#FF8A3D] bg-[#FF8A3D]/[0.06] ring-2 ring-[#FF8A3D]/25" : "border-white/[0.08] bg-[#151922] hover:border-white/20"
                    }`}>
                    <span className="block text-[15px] font-semibold tabular-nums text-white">{o.frames}</span>
                    <span className="block text-[11px] text-[#8B93A5]">{o.hint}</span>
                    <span className="mt-0.5 block font-mono text-[10px] tabular-nums text-[#FF8A3D]">{animationCredits(o.frames, smoothOn)} credits</span>{selectedPreset?.frames === o.frames && <span className="block font-mono text-[9.5px] uppercase tracking-wide text-emerald-300/80">best fit</span>}
                  </button>
                );
              })}
            </div>
            {!isTile && <button type="button" role="switch" aria-checked={smooth} onClick={() => setSmooth((v) => !v)} disabled={loading}
              className={`mt-2 flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed ${
                smooth ? "border-[#FF8A3D]/60 bg-[#FF8A3D]/[0.06]" : "border-white/[0.08] bg-[#151922] hover:border-white/20"
              }`}>
              <span className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${smooth ? "bg-[#FF8A3D]" : "bg-white/[0.12]"}`}>
                <span className={`h-4 w-4 rounded-full bg-white transition-transform ${smooth ? "translate-x-4" : ""}`} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium text-white">
                  Smooth motion <span className="font-mono text-[11px] text-[#FFB27A]">· {option.frames * 2} frames</span>
                </span>
                <span className="block text-[11.5px] leading-snug text-[#8B93A5]">
                  AI draws an in-between pose for every pair, so the animation flows instead of stepping. 2× frames and credits.
                </span>
              </span>
            </button>}
          </Field>
        )}

        {result && (
          <Field label={`Preview speed · ${fps} fps`}>
            <input type="range" min={2} max={24} value={fps} onChange={(e) => setFps(Number(e.target.value))}
              aria-label="Preview frames per second" className="w-full accent-[#FF8A3D]" />
          </Field>
        )}

        <InfoNote icon={<Info className="h-3.5 w-3.5 text-[#8B93A5]" />}>
          You get a <span className="text-[#C9CFDB]">horizontal sprite sheet</span> ({option.frames} frames, 256px tall, transparent) for Unity, Godot or GameMaker, plus a GIF preview.
          The AI studies your sprite first (dress, wings, slime, weapon…) and plans every pose, then frames share one baseline and palette so nothing jitters.
        </InfoNote>

        {result && (
          <InfoNote tone="success" icon={<Check className="h-3.5 w-3.5 text-emerald-300" />}>
            Saved to your assets{source?.projectId ? " and project" : ""}.
          </InfoNote>
        )}
      </ToolPanel>

      <CanvasColumn
        topLeft={
          source ? (
            <>
              <Chip>{result ? `${result.frameCount} frames` : "original"}</Chip>
              {pixel && <Chip>pixel art</Chip>}
            </>
          ) : (
            <span className="text-[12px] text-[#7A8294]">Your animation will appear here</span>
          )
        }
        topRight={
          <div className="flex items-center gap-2">
            {result && (
              <Segmented value={view} onChange={setView}
                options={[{ id: "play", label: "Play" }, { id: "sheet", label: "Sheet" }]} />
            )}
            <BackdropToggle value={bgMode} onChange={setBgMode} />
          </div>
        }
        actions={
          result ? (
            <>
              <button type="button" onClick={() => downloadUrl(result.sheetUrl, `${baseName}_sheet.png`)}
                className="flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[13px] font-semibold text-black transition hover:bg-white/90">
                <Download className="h-4 w-4" /> Sprite sheet
              </button>
              {result.gifUrl && (
                <SecondaryButton onClick={() => downloadUrl(result.gifUrl!, `${baseName}.gif`)}>GIF</SecondaryButton>
              )}
              <SecondaryButton onClick={() => downloadFramesZip(result, baseName)}>Frames .zip</SecondaryButton>
            </>
          ) : undefined
        }
      >
        <CanvasFrame bg={bgMode}>
          {!generationId ? (
            <RecentAssetPicker toolPath="/animate" title="Animate a sprite" />
          ) : loadingSource ? (
            <ProcessingOverlay icon={<Film className="h-5 w-5" />} title="Loading sprite…" seconds={0} hint="fetching" />
          ) : result ? (
            view === "play" ? (
              <SheetPlayer result={result} fps={fps} pixel={pixel} />
            ) : (
              <CanvasImage src={result.sheetUrl} alt="Sprite sheet" pixel={pixel} />
            )
          ) : source?.imageUrl ? (
            <>
              <CanvasImage src={source.imageUrl} alt="Sprite" pixel={pixel} dim={loading} />
              {loading && (
                <ProcessingOverlay icon={<Wand2 className="h-5 w-5" />} title="Drawing frames…" seconds={seconds} hint="planning poses, then drawing" />
              )}
            </>
          ) : (
            <CanvasEmptyHint icon={<Film className="h-5 w-5" />} title="Couldn't load this sprite" subtitle="Pick another one from your assets." />
          )}
        </CanvasFrame>
      </CanvasColumn>
    </ToolShell>
  );
}

function AnimatePageKeyed() {
  const generationId = useSearchParams().get("id");
  return <AnimatePageContent key={generationId ?? "none"} generationId={generationId} />;
}

export default function AnimatePage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <AnimatePageKeyed />
    </Suspense>
  );
}
