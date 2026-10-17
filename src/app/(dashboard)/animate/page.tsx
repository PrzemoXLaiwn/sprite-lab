"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HistoryButton, HistoryPanel, type HistoryItem } from "@/components/workspace/HistoryPanel";
import { RestoredNote } from "@/components/workspace/ContinueBanner";
import { animationFromGeneration, fetchOwnGeneration, resolveAnimationSource, useStoredRaw } from "@/components/workspace/restore";
import { classifyGeneration, cleanGenerationPrompt } from "@/lib/workspace/history";
import {
  buildToolHref, clearDraft, clearLastActivity, draftKey, loadDraft, parseDraft, lookupSourceLink, parseToolParams, rememberSourceLink,
  saveDraft, saveLastActivity, withResultParam,
} from "@/lib/workspace/session";
import { SpritePlayer } from "@/components/animate/SpritePlayer";
import { MovesetBuilder } from "@/components/animate/MovesetBuilder";
import { buildEnginePack, saveBlob } from "@/lib/export/engine-pack";
import { Film, Info, Check, Wand2, Loader2, Compass } from "lucide-react";
import { triggerCreditsRefresh } from "@/components/dashboard/CreditsDisplay";
import {
  ToolShell, ToolPanel, ToolTabs, Field, FooterHint, CanvasColumn, CanvasFrame, CanvasImage,
  BackdropToggle, Chip, TopBarHint, PrimaryButton, DownloadButton, SecondaryButton, ErrorNote, InfoNote, OptionCard, SuggestionChip,
  SourceCard, RecentAssetPicker, ProcessingOverlay, SourceMissing, Segmented, PageFallback, Elapsed,
  isPixelStyleId, useSourceGeneration, toolErrorMessage, downloadImage, saveBlobAs, type ToolBgModeId,
} from "@/components/tools/ToolWorkspace";
import { ANIMATION_FRAME_OPTIONS, DEFAULT_ANIMATION_FRAMES, RIG_CREDITS, RIG_FRAMES, ROTATIONS, rotationFor, supportsRotation, animationCredits, animationFrameOption, animationPresetsFor, rigMotionFor } from "@/config/animations";
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
  /** Grid sheets (4-direction walk): frames per row. */
  sheetCols?: number;
}

/** Motions where the character travels — the game view scrolls the ground. */
const TRAVELS = /\b(walk|run|jog|sprint|trot|gallop|march|crawl|slither|fly|flight|swim|drive|roll|dash|hop|skate)/i;

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
  if (!ctx) throw new Error("canvas-unavailable");
  ctx.imageSmoothingEnabled = false;
  const cols = result.sheetCols ?? result.frameCount;
  for (let i = 0; i < result.frameCount; i++) {
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(bitmap, (i % cols) * w, Math.floor(i / cols) * h, w, h, 0, 0, w, h);
    const frame = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
    if (frame) zip.file(`${baseName}_frame${String(i + 1).padStart(2, "0")}.png`, frame);
  }
  zip.file(`${baseName}_sheet.png`, blob);
  saveBlobAs(await zip.generateAsync({ type: "blob" }), `${baseName}_frames.zip`);
}

/** Set right before a bare /animate visit reopens the saved session, so the page can say so. */
let reopenedFromDraft = false;

function AnimatePageContent({ generationId, resultId }: { generationId: string | null; resultId: string | null }) {
  const router = useRouter();
  const { source, loading: loadingSource, error: sourceError } = useSourceGeneration(generationId);
  const [action, setAction] = useState<string>("");
  const [customMotion, setCustomMotion] = useState("");
  const [loading, setLoading] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnimationResult | null>(null);
  const [view, setView] = useState<"play" | "game" | "sheet">("play");
  // What the last result shows (file names + the game view: does it travel?)
  const [resultMotion, setResultMotion] = useState({ id: "", text: "" });
  const [frames, setFrames] = useState<number>(DEFAULT_ANIMATION_FRAMES);
  const [smooth, setSmooth] = useState(true);
  const [fps, setFps] = useState(8);
  const [bgMode, setBgMode] = useState<ToolBgModeId>("checker");
  const [framesTouched, setFramesTouched] = useState(false);

  // ── Session restore ("continue where you left off") ────────────────────
  // URL = what is shown (?id= sprite, ?result= animation); the draft adds the
  // typed motion, options and the GIF URL. Restored before the suggestion
  // fetch below runs (effects run in order), so a restored list isn't replaced.
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showRestored, setShowRestored] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [resultFromRun, setResultFromRun] = useState(false);
  const [restoringResult, setRestoringResult] = useState(Boolean(resultId));
  const [shownResultId, setShownResultId] = useState<string | null>(null);
  const [resultStyleId, setResultStyleId] = useState<string | null>(null);
  const shownResultRef = useRef<string | null>(null);
  const skipSuggestRef = useRef(false);
  useEffect(() => {
    if (reopenedFromDraft) {
      reopenedFromDraft = false;
      setShowRestored(true);
    }
    const d = loadDraft("animate");
    if (d && generationId && d.sourceId === generationId) {
      if (d.action) setAction(d.action);
      if (d.customMotion) setCustomMotion(d.customMotion);
      if (d.frames) setFrames(d.frames);
      if (d.framesTouched) setFramesTouched(true);
      if (typeof d.smooth === "boolean") setSmooth(d.smooth);
      if (d.fps) setFps(d.fps);
      if (d.suggested?.length) {
        setSuggested(d.suggested);
        skipSuggestRef.current = true;
      }
    }
    setDraftReady(true);
    // Once per sprite (the page is keyed on it)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Motions tailored to this sprite (a dog gets Bark / Sit, not Fly); the
  // category presets show until they arrive or if the helper is unavailable.
  const [suggested, setSuggested] = useState<SuggestedMotion[] | null>(null);
  const [suggesting, setSuggesting] = useState(Boolean(generationId));
  useEffect(() => {
    if (!generationId) return;
    if (skipSuggestRef.current) { setSuggesting(false); return; }
    let cancelled = false;
    fetch(`/api/animate/suggest?id=${encodeURIComponent(generationId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.ai && Array.isArray(data.motions) && data.motions.length) {
          setSuggested(data.motions);
          setAction((a) => (a && a !== "custom" && !rotationFor(a) ? "" : a)); // re-pick the first tailored motion
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
  const recommendedFrames = selectedPreset?.frames;
  useEffect(() => {
    if (!framesTouched && recommendedFrames) setFrames(recommendedFrames);
  }, [recommendedFrames, framesTouched]);

  const pixel = isPixelStyleId(source?.styleId ?? resultStyleId);
  const option = animationFrameOption(frames);
  // Idle / breathing / hover are rigged from the original sprite (no redraw, no flicker)
  const rigKind = !isTile && selected !== "custom" ? rigMotionFor(selected, selectedPreset?.label, source?.categoryId)
    // Pixel-art walks are rigged too (whole-pixel steps); AI frames only as a fallback
    ?? (pixel && /walk/i.test(`${selected} ${selectedPreset?.label ?? ""}`) ? "walk" : null) : null;
  const rotation = rotationFor(selected);
  const canRotate = supportsRotation(source?.categoryId);
  const cost = rotation ? rotation.credits : rigKind ? RIG_CREDITS : animationCredits(frames, smoothOn);
  const rigFrames = rigKind && rigKind in ITEM_FRAMES ? ITEM_FRAMES[rigKind] : pixel ? (rigKind === "walk" ? 4 : 6) : RIG_FRAMES;
  // Frames in the finished sheet, for the summary lines
  const outFrames = rotation ? rotation.frames : rigKind ? rigFrames : smoothOn ? option.frames * 2 : option.frames;
  const customTooShort = selected === "custom" && customMotion.trim().length < 3;

  /** Points the address bar at the shown animation (no navigation, no remount). */
  const showResultInUrl = useCallback((id: string | null) => {
    shownResultRef.current = id;
    setShownResultId(id);
    const next = withResultParam(`${window.location.pathname}${window.location.search}${window.location.hash}`, id);
    if (next) window.history.replaceState(window.history.state, "", next);
  }, []);

  // ?result= → show that animation again (player, sheet, downloads). This
  // browser's draft has the GIF URL; otherwise the sheet is measured.
  useEffect(() => {
    if (!resultId || resultId === shownResultRef.current) { setRestoringResult(false); return; }
    let cancelled = false;
    setRestoringResult(true);
    (async () => {
      const d = loadDraft("animate");
      if (d?.resultId === resultId && d.result) {
        if (cancelled) return;
        setResult(d.result);
        if (d.resultMotion) setResultMotion(d.resultMotion);
        if (d.fps) setFps(d.fps);
      } else {
        const fetched = await fetchOwnGeneration(resultId);
        const restored = fetched && classifyGeneration(fetched.generation) === "animation" ? await animationFromGeneration(fetched.generation) : null;
        if (cancelled) return;
        if (!restored) {
          setError("Couldn't open that animation — it may have been deleted.");
          showResultInUrl(null);
          return;
        }
        setResult(restored.result);
        setResultStyleId(fetched?.generation.styleId ?? null);
        setResultMotion(restored.motion);
        setFps(restored.fps);
        if (restored.action) setAction(restored.action);
        if (generationId) rememberSourceLink(resultId, generationId);
      }
      shownResultRef.current = resultId;
      setShownResultId(resultId);
      setResultFromRun(false);
      setView("play");
    })().finally(() => { if (!cancelled) setRestoringResult(false); });
    return () => { cancelled = true; };
  }, [resultId, generationId, showResultInUrl]);

  // Remember the session: options + last result (draft) and where to come back to
  useEffect(() => {
    if (!draftReady || !generationId || restoringResult) return;
    const isAi = selected.startsWith("ai-");
    saveDraft("animate", {
      sourceId: generationId,
      action: selected,
      customMotion,
      frames,
      framesTouched,
      smooth,
      fps,
      resultId: result ? shownResultId ?? undefined : undefined,
      result: result ? {
        sheetUrl: result.sheetUrl, gifUrl: result.gifUrl ?? null, frameCount: result.frameCount,
        frameWidth: result.frameWidth, frameHeight: result.frameHeight, sheetCols: result.sheetCols,
      } : undefined,
      resultMotion: result ? resultMotion : undefined,
      // Tailored cards are kept so a restored "ai-…" choice still exists
      suggested: suggested && (isAi || suggested.some((m) => m.id === selected)) ? suggested : undefined,
    });
  }, [draftReady, generationId, restoringResult, selected, customMotion, frames, framesTouched, smooth, fps, result, shownResultId, resultMotion, suggested]);

  useEffect(() => {
    if (!generationId || !source?.imageUrl) return;
    saveLastActivity({
      tool: "animate",
      href: buildToolHref("animate", { id: generationId, result: shownResultId }),
      title: cleanGenerationPrompt(source.prompt) || "Your sprite",
      thumbUrl: source.imageUrl,
      pixel: isPixelStyleId(source.styleId),
    });
  }, [generationId, source, shownResultId]);

  /** History: a sprite opens fresh; an animation opens with its sprite (when known). */
  const openFromHistory = (item: HistoryItem) => {
    if (classifyGeneration(item) === "animation") {
      if (item.id === shownResultId) return;
      const src = lookupSourceLink(item.id) ?? (generationId && item.id === resultId ? generationId : null);
      router.push(buildToolHref("animate", { id: src, result: item.id }));
    } else if (item.id !== generationId) {
      router.push(buildToolHref("animate", { id: item.id }));
    }
  };

  const startFresh = () => {
    clearDraft("animate");
    clearLastActivity("animate");
    router.push("/animate");
  };

  const animate = async () => {
    if (!generationId || loading) return;
    if (customTooShort) {
      setError("Describe how it should move — a few words are enough.");
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
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(toolErrorMessage(res, data, "Animation failed."));
      if (!data?.sheetUrl) throw new Error("The animation finished but returned no sprite sheet. Please try again.");
      setResult(data);
      // Address bar → this animation, so a reload or a later visit reopens it
      const newId = typeof data.generationId === "string" ? data.generationId : null;
      if (newId) rememberSourceLink(newId, generationId);
      showResultInUrl(newId);
      setResultFromRun(true);
      setResultMotion({ id: selected, text: `${selected} ${selectedPreset?.label ?? ""} ${selected === "custom" ? customMotion : ""}` });
      setFps(typeof data.fps === "number" ? data.fps : data.smoothed ? (data.frameCount >= 12 ? 12 : 10) : data.frameCount >= 9 ? 10 : 8);
      setView("play");
      triggerCreditsRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Animation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const baseName = () => `spritelab-${(resultMotion.id || "animation").replace(/[^a-z0-9-]+/gi, "-").toLowerCase()}`;

  const [packing, setPacking] = useState(false);
  const downloadEngine = async () => {
    if (!result || packing) return;
    setPacking(true);
    try {
      const name = (resultMotion.id || "animation").replace(/^ai-/, "");
      const blob = await buildEnginePack((source?.prompt ?? "character").split(/[,.]/)[0].slice(0, 32), [{
        name, sheetUrl: result.sheetUrl, frameCount: result.frameCount, frameWidth: result.frameWidth, frameHeight: result.frameHeight,
        fps, loop: /idle|walk|run|fly|float|loop/i.test(name), sheetCols: result.sheetCols,
      }]);
      saveBlob(blob, `${baseName()}_engine.zip`);
    } catch {
      setError("Couldn't build the engine pack. Download the sprite sheet instead, or try again.");
    } finally {
      setPacking(false);
    }
  };

  const downloadZip = async () => {
    if (!result || zipping) return;
    setZipping(true);
    try {
      await downloadFramesZip(result, baseName());
    } catch {
      setError("Couldn't build the frames .zip. Download the sprite sheet instead, or try again.");
    } finally {
      setZipping(false);
    }
  };

  const shownError = error || sourceError;

  return (
    <ToolShell>
      <ToolPanel
        title="Animate"
        cost={cost}
        tabs={<ToolTabs active="animate" generationId={generationId} />}
        headerAction={<HistoryButton onClick={() => setHistoryOpen(true)} />}
        footer={
          <>
            <PrimaryButton onClick={animate} disabled={loading || !source} loading={loading}
              loadingLabel={<>Animating… <Elapsed /></>}
              icon={<Film className="h-4 w-4" />} label="Animate" cost={cost} />
            <FooterHint>
              {!rotation && !rigKind && <>{smoothOn ? "~45–90s" : option.frames > 4 ? "~30–60s" : "~25–45s"} · </>}
              {outFrames} frames · sprite sheet + GIF
            </FooterHint>
            {shownError && <ErrorNote>{shownError}</ErrorNote>}
          </>
        }
      >
        {showRestored && <RestoredNote onStartFresh={startFresh} onDismiss={() => setShowRestored(false)} />}

        <Field label="Sprite">
          <SourceCard imageUrl={source?.imageUrl ?? null} loading={loadingSource} prompt={source?.prompt} pixel={pixel} />
          {!generationId && result && (
            <p className="mt-2 text-[11.5px] leading-snug text-[#9AA1CC]">
              We couldn&apos;t find the sprite this animation was made from. Pick it from your history to animate it again.
            </p>
          )}
        </Field>

        {source && (
          <Field label={suggesting ? "Motion · tailoring to your sprite…" : suggested ? "Motion · picked for this sprite" : "Motion"}>
            <div className={`grid grid-cols-2 gap-1.5 transition-opacity ${suggesting ? "opacity-60" : ""}`} aria-busy={suggesting || undefined}>
              {[...presets, { id: "custom", label: "Custom…", motion: "" }].map((p) => (
                <OptionCard key={p.id} active={selected === p.id} onClick={() => setAction(p.id)} disabled={loading}
                  title={p.motion || "Describe your own motion"} className="min-h-11 px-3 py-2.5">
                  <span className={`text-[13px] font-medium ${selected === p.id ? "text-white" : "text-[#C8CCE8]"}`}>{p.label}</span>
                </OptionCard>
              ))}
            </div>
            {selectedPreset && selected !== "custom" && (
              <p className="mt-2 rounded-lg bg-white/[0.03] px-3 py-2 text-[11.5px] leading-snug text-[#A7ADD4]">{selectedPreset.motion}</p>
            )}
            {selected === "custom" && (
              <>
                <textarea value={customMotion} onChange={(e) => setCustomMotion(e.target.value)} maxLength={300} rows={3}
                  placeholder="e.g. swings the axe overhead and slams it down"
                  aria-label="Describe the motion" disabled={loading}
                  className="mt-2 w-full resize-none rounded-xl border border-white/[0.08] bg-[#212B4E] px-3 py-2.5 text-[13px] text-white outline-none placeholder:text-[#8A92BF] focus:border-[#FFA300]/50 disabled:opacity-60" />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {CUSTOM_EXAMPLES.map((ex) => (
                    <SuggestionChip key={ex} active={customMotion === ex} onClick={() => setCustomMotion(ex)} disabled={loading}>{ex}</SuggestionChip>
                  ))}
                </div>
              </>
            )}
          </Field>
        )}

        {source && canRotate && (
          <Field label="Directions · for top-down & isometric games">
            <div className="grid grid-cols-1 gap-1.5 min-[400px]:grid-cols-3">
              {ROTATIONS.map((r) => (
                <OptionCard key={r.id} active={selected === r.id} onClick={() => setAction(r.id)} disabled={loading}>
                  {/* Phones: one compact row per option (cost on the right); 3 columns from 400px */}
                  <span className="flex items-center justify-between gap-3 min-[400px]:block">
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium text-white">{r.label}</span>
                      <span className="block text-[11.5px] leading-snug text-[#9AA1CC] min-[400px]:text-[11px]">{r.hint}</span>
                    </span>
                    <span className="block shrink-0 font-mono text-[11px] text-[#FFC857] min-[400px]:mt-0.5 min-[400px]:text-[10.5px]">{r.credits} credits</span>
                  </span>
                </OptionCard>
              ))}
            </div>
          </Field>
        )}

        {source && canRotate && generationId && (
          <Field label="Whole move set · one click">
            <MovesetBuilder generationId={generationId} characterName={(source.prompt ?? "character").split(/[,.]/)[0].slice(0, 32)} disabled={loading} />
          </Field>
        )}

        {source && rotation && (
          <InfoNote icon={<Compass className="h-3.5 w-3.5 text-emerald-300" />}>
            <span className="text-[#C8CCE8]">{rotation.label} · {rotation.frames} frames · {rotation.credits} credits.</span>{" "}
            {rotation.kind === "walk"
              ? "Your character walking in all 4 directions — a classic RPG sheet: row 1 front, row 2 right, row 3 back, row 4 left, 4 steps each. Ready for top-down movement."
              : `The same sprite seen from ${rotation.directions === 4 ? "the front, right, back and left" : "every 45°"} — same size, same ground line, one view per frame in the sheet (${rotation.directions === 4 ? "S, E, N, W" : "S, SE, E, NE, N, NW, W, SW"}).`}
          </InfoNote>
        )}

        {source && rigKind && !rotation && (
          <InfoNote icon={<Check className="h-3.5 w-3.5 text-emerald-300" />}>
            <span className="text-[#C8CCE8]">{pixel ? "Pixel rig" : "Smooth rig"} · {rigFrames} frames · {RIG_CREDITS} credits.</span>{" "}
            {rigKind && rigKind in ITEM_NOTES
              ? ITEM_NOTES[rigKind]
              : rigKind === "float"
              ? "Your sprite itself hovers up and down"
              : pixel
                ? rigKind === "walk"
                  ? "Your sprite steps in place in whole pixels — legs lift in turn, the body bobs, arms swing — like hand-made 16-bit animation"
                  : "Your sprite breathes in whole pixels — the body sinks 1px, head and arms follow — like hand-made 16-bit animation"
                : "Your sprite gets a skeleton: it shifts its weight from leg to leg with feet planted, arms swing gently, the head and tail follow"}
            {" "}— the original drawing is reused, never redrawn, so colours and details stay identical.
            {rigKind === "walk" ? " If it can't be rigged, the AI draws the frames instead at the normal price." : ""}
          </InfoNote>
        )}

        {source && !rigKind && !rotation && (
          <Field label="Key poses" hint="More poses = more detailed motion. “Best fit” is the count this motion was designed for.">
            <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Number of key poses">
              {ANIMATION_FRAME_OPTIONS.map((o) => {
                const active = frames === o.frames;
                return (
                  <button key={o.frames} type="button" role="radio" aria-checked={active} onClick={() => { setFrames(o.frames); setFramesTouched(true); }} disabled={loading}
                    className={`rounded-xl border px-2 py-2 text-center transition-colors disabled:cursor-not-allowed ${
                      active ? "border-[#FFA300] bg-[#FFA300]/[0.07] ring-2 ring-[#FFA300]/25" : "border-white/[0.08] bg-[#212B4E] hover:border-white/20"
                    }`}>
                    <span className="block text-[15px] font-semibold tabular-nums text-white">{o.frames}</span>
                    <span className="block text-[11px] leading-snug text-[#9AA1CC]">{o.hint}</span>
                    <span className="mt-0.5 block font-mono text-[10.5px] tabular-nums text-[#FFC857]">{animationCredits(o.frames, smoothOn)} credits</span>
                    {selectedPreset?.frames === o.frames && <span className="mt-0.5 block text-[12.5px] text-emerald-300/90 font-semibold">best fit</span>}
                  </button>
                );
              })}
            </div>
            {!isTile && (
              <button type="button" role="switch" aria-checked={smooth} onClick={() => setSmooth((v) => !v)} disabled={loading}
                className={`mt-2 flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed ${
                  smooth ? "border-[#FFA300]/60 bg-[#FFA300]/[0.06]" : "border-white/[0.08] bg-[#212B4E] hover:border-white/20"
                }`}>
                <span aria-hidden className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${smooth ? "bg-[#FFA300]" : "bg-white/[0.12]"}`}>
                  <span className={`h-4 w-4 rounded-full bg-white transition-transform ${smooth ? "translate-x-4" : ""}`} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-white">
                    Smooth motion <span className="font-mono text-[11px] text-[#FFC857]">· {option.frames * 2} frames</span>
                  </span>
                  <span className="block text-[11.5px] leading-snug text-[#9AA1CC]">
                    Adds an in-between pose for every pair, so the animation flows instead of stepping. Doubles the frames and adds {option.smoothExtra} credits.
                  </span>
                </span>
              </button>
            )}
          </Field>
        )}

        {result && (
          <Field label={`Preview speed · ${fps} fps`} labelFor="animate-fps"
            hint="Only changes the preview — the sheet is the same. Set the speed in your engine.">
            <input id="animate-fps" type="range" min={2} max={24} value={fps} onChange={(e) => setFps(Number(e.target.value))}
              aria-valuetext={`${fps} frames per second`} className="h-6 w-full accent-[#FFA300]" />
          </Field>
        )}

        <InfoNote icon={<Info className="h-3.5 w-3.5 text-[#9AA1CC]" />}>
          {rotation?.kind === "walk"
            ? <>You get a <span className="text-[#C8CCE8]">4-row sprite sheet</span> ({outFrames} frames, transparent) plus a GIF preview.</>
            : <>You get a <span className="text-[#C8CCE8]">sprite sheet</span> ({outFrames} frames in a row, transparent) for Unity, Godot or GameMaker, plus a GIF preview.</>}
          {!rotation && !rigKind && " The AI studies your sprite first (outfit, wings, weapon…) and plans every pose; all frames share one baseline and palette so nothing jitters."}
        </InfoNote>

        {result && resultFromRun && (
          <InfoNote tone="success" icon={<Check className="h-3.5 w-3.5 text-emerald-300" />}>
            Animation ready — saved to your assets{source?.projectId ? " and project" : ""}.
          </InfoNote>
        )}
        {result && !resultFromRun && (
          <InfoNote icon={<Film className="h-3.5 w-3.5 text-[#9AA1CC]" />}>
            Opened from your history. Change the motion or options and press Animate to make a new version — this one stays in your assets.
          </InfoNote>
        )}
      </ToolPanel>

      <CanvasColumn
        topLeft={
          source || result ? (
            <>
              <Chip>{result ? `${result.frameCount} frames` : "original"}</Chip>
              {pixel && <Chip>pixel art</Chip>}
            </>
          ) : (
            <TopBarHint>Your animation will appear here</TopBarHint>
          )
        }
        topRight={
          <>
            {result && (
              <Segmented label="Preview mode" value={view} onChange={setView}
                options={[{ id: "play", label: "Play" }, { id: "game", label: "In game" }, { id: "sheet", label: "Sheet" }]} />
            )}
            <BackdropToggle value={bgMode} onChange={setBgMode} />
          </>
        }
        actions={
          result ? (
            <>
              <DownloadButton label="Sprite sheet" onClick={() => downloadImage(result.sheetUrl, `${baseName()}_sheet.png`)} />
              {result.gifUrl && (
                <SecondaryButton onClick={() => downloadImage(result.gifUrl!, `${baseName()}.gif`)}>GIF</SecondaryButton>
              )}
              <SecondaryButton onClick={downloadEngine} disabled={packing} title="Godot SpriteFrames, Unity frames, GameMaker strip and hitboxes">
                {packing && <Loader2 className="h-4 w-4 animate-spin" />} Engine pack
              </SecondaryButton>
              <SecondaryButton onClick={downloadZip} disabled={zipping} title="Every frame as its own PNG, plus the sheet">
                {zipping && <Loader2 className="h-4 w-4 animate-spin" />} Frames .zip
              </SecondaryButton>
            </>
          ) : undefined
        }
      >
        <CanvasFrame bg={bgMode}>
          {restoringResult ? (
            <ProcessingOverlay icon={<Film className="h-5 w-5" />} title="Opening animation…" />
          ) : !generationId && !result ? (
            <RecentAssetPicker toolPath="/animate" title="Animate a sprite" />
          ) : loadingSource ? (
            <ProcessingOverlay icon={<Film className="h-5 w-5" />} title="Loading sprite…" />
          ) : result ? (
            view !== "sheet" ? (
              <SpritePlayer sheetUrl={result.sheetUrl} frameCount={result.frameCount} frameWidth={result.frameWidth}
                frameHeight={result.frameHeight} fps={fps} pixel={pixel} mode={view === "game" ? "game" : "inspect"} sheetCols={result.sheetCols}
                moving={TRAVELS.test(resultMotion.text)} />
            ) : (
              <CanvasImage src={result.sheetUrl} alt="Sprite sheet" pixel={pixel} />
            )
          ) : source?.imageUrl ? (
            <>
              <CanvasImage src={source.imageUrl} alt="Your sprite" pixel={pixel} dim={loading} />
              {loading && (
                <ProcessingOverlay icon={<Wand2 className="h-5 w-5" />} title="Drawing frames…" hint="planning poses, then drawing" timed />
              )}
            </>
          ) : (
            <SourceMissing icon={<Film className="h-5 w-5" />} message={sourceError} />
          )}
        </CanvasFrame>
      </CanvasColumn>

      <HistoryPanel tool="animate" open={historyOpen} onOpenChange={setHistoryOpen} onSelect={openFromHistory}
        activeIds={[generationId, shownResultId]} refreshKey={shownResultId} />
    </ToolShell>
  );
}

function AnimatePageKeyed() {
  const router = useRouter();
  const { id, result } = parseToolParams(useSearchParams());
  // ?result= without ?id=: look up the sprite the animation was made from
  const [resolved, setResolved] = useState<string | null>(null);
  const needsSource = Boolean(result && !id && resolved !== result);
  // Bare /animate (sidebar, bottom nav): reopen the last session, if any.
  // null = not readable yet (server render / hydration), "" = no draft.
  const bare = !id && !result;
  const draftRaw = useStoredRaw(draftKey("animate"));
  const draft = useMemo(() => (draftRaw ? parseDraft("animate", draftRaw) : null), [draftRaw]);

  useEffect(() => {
    if (!needsSource || !result) return;
    let cancelled = false;
    resolveAnimationSource(result).then((src) => {
      if (cancelled) return;
      if (src) router.replace(buildToolHref("animate", { id: src, result }));
      else setResolved(result); // show the animation on its own
    });
    return () => { cancelled = true; };
  }, [needsSource, result, router]);

  useEffect(() => {
    if (!bare || !draft) return;
    reopenedFromDraft = true;
    router.replace(buildToolHref("animate", { id: draft.sourceId, result: draft.resultId }));
  }, [bare, draft, router]);

  if (needsSource || (bare && (draftRaw === null || draft))) return <PageFallback />;
  return <AnimatePageContent key={id ?? "none"} generationId={id} resultId={result} />;
}

/** Weapons and items move as one rigid piece (src/lib/image/item-motion.ts). */
const ITEM_FRAMES: Record<string, number> = { swing: 10, thrust: 8, spin: 8, shine: 12, pulse: 8 };
const ITEM_NOTES: Record<string, string> = {
  swing: "Your sprite swings around its grip: wind-up, fast slash, settle back",
  thrust: "Your sprite pulls back and stabs forward along its blade",
  spin: "Your sprite turns a full circle around its centre",
  shine: "A glint of light runs along the blade",
  pulse: "A glow in the sprite's own colour pulses around its outline",
};

export default function AnimatePage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <AnimatePageKeyed />
    </Suspense>
  );
}
