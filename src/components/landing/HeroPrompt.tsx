"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Dices, Download, Loader2, Sparkles, ArrowRight } from "lucide-react";

const IDEAS = [
  "a knight with a flaming sword",
  "cute slime monster with big eyes",
  "treasure chest full of gold coins",
  "baby dragon breathing fire",
  "wizard with a purple robe and staff",
  "red health potion in a round flask",
  "goblin archer with a wooden bow",
  "ice crystal staff glowing blue",
];

/** Fired by the community wall ("Try this prompt") to fill the hero input. */
export const HERO_PROMPT_EVENT = "spritelab:hero-prompt";

/**
 * Meshy-style hero input: type → generate right on the landing page, no
 * account. Uses the guest endpoint (rate-limited, standard model).
 * Signed-in users are sent to the full generator with the prompt pre-filled
 * (their credits, all styles, saved to Assets).
 */
export function HeroPrompt({ registerUrl, signedIn = false }: { registerUrl: string; signedIn?: boolean }) {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<"pixel" | "cartoon">("pixel");
  const [isGenerating, setIsGenerating] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      const detail = (e as CustomEvent<{ prompt: string; pixel?: boolean }>).detail;
      if (!detail?.prompt) return;
      setPrompt(detail.prompt);
      if (detail.pixel !== undefined) setStyle(detail.pixel ? "pixel" : "cartoon");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 400);
    };
    window.addEventListener(HERO_PROMPT_EVENT, onPrompt);
    return () => window.removeEventListener(HERO_PROMPT_EVENT, onPrompt);
  }, []);

  useEffect(() => {
    if (!isGenerating) return;
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 250);
    return () => clearInterval(id);
  }, [isGenerating]);

  const generate = async () => {
    if (!prompt.trim() || isGenerating) return;
    if (signedIn) {
      const params = new URLSearchParams({
        prompt: prompt.trim().slice(0, 500),
        styleId: style === "pixel" ? "PIXEL_ART_16" : "CARTOON_WESTERN",
      });
      window.location.href = `/generate?${params.toString()}`;
      return;
    }
    setIsGenerating(true);
    setElapsed(0);
    setError(null);
    try {
      const res = await fetch("/api/generate-guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim().slice(0, 200), style }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 429 || data.code === "RATE_LIMITED") setLimitReached(true);
        setError(
          res.status === 429
            ? "You've used your free tries for now — sign up to keep creating (10 free credits)."
            : data.error || "Generation failed. Please try again."
        );
        return;
      }
      setImage(data.imageUrl);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const download = async () => {
    if (!image) return;
    try {
      const blob = await (await fetch(image)).blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `spritelab-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(image, "_blank");
    }
  };

  return (
    <div className="mx-auto w-full max-w-[760px]">
      <div className="rounded-3xl border border-white/[0.1] bg-[#12151C]/90 p-2 shadow-[0_30px_80px_-30px_rgba(255,122,26,0.25)] backdrop-blur transition-colors focus-within:border-[#FF8A3D]/50">
        <textarea
          ref={inputRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generate(); }
          }}
          maxLength={200}
          rows={2}
          placeholder="Describe a sprite… e.g. a knight with a flaming sword"
          className="w-full resize-none bg-transparent px-4 pt-3 text-[16px] leading-relaxed text-white outline-none placeholder:text-[#7A8294] sm:text-[17px]"
        />
        <div className="flex flex-wrap items-center gap-2 px-2 pb-1">
          <div className="flex rounded-xl bg-white/[0.05] p-1 font-mono text-[12px] font-medium">
            {(["pixel", "cartoon"] as const).map((s) => (
              <button key={s} type="button" onClick={() => setStyle(s)}
                className={`rounded-lg px-3 py-1.5 transition-colors ${style === s ? "bg-white/[0.12] text-white" : "text-[#8B93A5] hover:text-white"}`}>
                {s === "pixel" ? "Pixel art" : "Cartoon"}
              </button>
            ))}
          </div>
          <button type="button" title="Random idea"
            onClick={() => setPrompt(IDEAS[Math.floor(Math.random() * IDEAS.length)])}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#8B93A5] transition-colors hover:bg-white/[0.06] hover:text-white">
            <Dices className="h-4 w-4" />
          </button>
          <div className="flex-1" />
          {limitReached ? (
            <Link href={registerUrl}
              className="flex h-10 items-center gap-2 rounded-xl bg-white px-5 text-[14px] font-semibold text-black transition hover:bg-white/90">
              Sign up free <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <button type="button" onClick={generate} disabled={!prompt.trim() || isGenerating}
              className="px-corners flex h-10 items-center gap-2 bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] px-5 text-[14px] font-semibold text-white transition hover:brightness-110 disabled:opacity-40">
              {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin" /> <span className="font-mono">{elapsed}s</span></> : <><Sparkles className="h-4 w-4" /> Generate</>}
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-3 text-center text-[13px] text-amber-200/90">{error}</p>
      )}

      {(image || isGenerating) && (
        <div className="mx-auto mt-5 flex max-w-[560px] flex-col items-center gap-5 rounded-3xl border border-white/[0.08] bg-[#0E1016] p-5 sm:flex-row">
          <div className="relative aspect-square w-full max-w-[220px] shrink-0 overflow-hidden rounded-2xl border border-white/[0.06]"
            style={{ backgroundImage: "repeating-conic-gradient(#ffffff08 0% 25%, transparent 0% 50%)", backgroundSize: "16px 16px" }}>
            {isGenerating ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#8B93A5]">
                <Loader2 className="h-6 w-6 animate-spin text-[#FF8A3D]" />
                <span className="text-[12px]">Drawing your sprite…</span>
              </div>
            ) : image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt={prompt}
                className={`absolute inset-0 h-full w-full object-contain p-3 ${style === "pixel" ? "pixel-perfect" : ""}`} />
            ) : null}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="text-[15px] font-semibold text-white">{isGenerating ? "Generating…" : "Here's your sprite"}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-[#8B93A5]">
              Transparent PNG, ready for your engine. Create a free account for 10 credits, 12 art styles, HD quality and your own asset library.
            </p>
            {image && (
              <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                <button type="button" onClick={download}
                  className="flex h-9 items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3.5 text-[13px] text-[#C9CFDB] transition hover:bg-white/[0.08]">
                  <Download className="h-4 w-4" /> Download
                </button>
                <Link href={registerUrl}
                  className="flex h-9 items-center gap-2 rounded-xl bg-white px-3.5 text-[13px] font-semibold text-black transition hover:bg-white/90">
                  Get 10 free credits <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
