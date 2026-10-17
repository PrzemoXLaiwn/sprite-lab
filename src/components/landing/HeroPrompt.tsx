"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Dices, Download, Loader2, Sparkles, ArrowRight } from "lucide-react";
import { track, FUNNEL } from "@/lib/analytics";
import { SIGNUP_CREDITS, SIGNUP_CTA } from "@/config/signup";
import { showcaseIconSrc } from "@/lib/image/sprite-thumb";
import { readGuestTokens, rememberGuestToken } from "@/lib/guest-claim/local-tokens";

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

/** One-tap examples under the input — each chip shows a real SpriteLab sprite. */
const QUICK = [
  { label: "knight", icon: "/showcase/knight.png", prompt: "knight in silver armour with a sword and a blue shield" },
  { label: "fire sword", icon: "/showcase/fire-sword.png", prompt: "flaming sword with a glowing orange blade" },
  { label: "fox wizard", icon: "/showcase/fox-mage.png", prompt: "fox wizard with a purple hat and a wooden staff" },
  { label: "potion", icon: "/showcase/health-potion.png", prompt: "red health potion in a round glass flask" },
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
  /** True when at least one guest sprite is waiting in localStorage to be claimed after signup. */
  const [hasKeepable, setHasKeepable] = useState(false);
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

  const generate = async (override?: string) => {
    const text = (override ?? prompt).trim();
    if (isGenerating) return;
    if (!text) { inputRef.current?.focus(); return; }
    if (signedIn) {
      const params = new URLSearchParams({
        prompt: text.slice(0, 500),
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
        body: JSON.stringify({ prompt: text.slice(0, 200), style }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const limited = res.status === 429 || data.code === "RATE_LIMITED";
        const keepable = readGuestTokens().length > 0;
        if (limited) {
          setLimitReached(true);
          setHasKeepable(keepable);
          track(FUNNEL.guestLimitReached, { style, keepable });
        }
        setError(
          res.status === 429
            ? keepable
              ? `You've used your free tries for now. Sign up to keep your sprites and get ${SIGNUP_CREDITS} free credits.`
              : `You've used your free tries for now. Sign up to keep creating (${SIGNUP_CREDITS} free credits).`
            : data.error || "Generation failed. Please try again."
        );
        return;
      }
      setImage(data.imageUrl);
      const keepable = typeof data.claimToken === "string";
      if (keepable) rememberGuestToken(data.claimToken);
      setHasKeepable(keepable);
      track(FUNNEL.guestGenerateSuccess, { style, keepable });
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
    <div className="w-full max-w-[760px]">
      <div className="rounded-[10px] border border-white/[0.14] bg-[#19223F] p-2 transition-colors focus-within:border-[#FFA300]">
        <textarea
          ref={inputRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void generate(); }
          }}
          maxLength={200}
          rows={2}
          aria-label="Describe the sprite you want"
          placeholder="Describe a sprite… e.g. a knight with a flaming sword"
          className="w-full resize-none bg-transparent px-4 pt-3 text-[16px] leading-relaxed text-white outline-none placeholder:text-[#8A92BF] sm:text-[17px]"
        />
        <div className="flex flex-wrap items-center gap-2 px-2 pb-1">
          <div role="group" aria-label="Art style" className="flex rounded-[7px] bg-white/[0.05] p-1 text-[13px] font-medium">
            {(["pixel", "cartoon"] as const).map((s) => (
              <button key={s} type="button" onClick={() => setStyle(s)} aria-pressed={style === s}
                className={`h-9 rounded-[5px] px-3 transition-colors ${style === s ? "bg-white/[0.12] text-white" : "text-[#9AA1CC] hover:text-white"}`}>
                {s === "pixel" ? "Pixel art" : "Cartoon"}
              </button>
            ))}
          </div>
          <button type="button" title="Random idea" aria-label="Random idea"
            onClick={() => setPrompt(IDEAS[Math.floor(Math.random() * IDEAS.length)])}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-[#9AA1CC] transition-colors hover:bg-white/[0.06] hover:text-white">
            <Dices className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="flex-1" />
          {limitReached ? (
            <Link href={registerUrl}
              onClick={() => track(FUNNEL.guestSignupClick, { source: "limit", keepable: hasKeepable })}
              className="px-corners flex h-11 w-full items-center justify-center gap-2 bg-[#FFA300] px-5 text-[14px] font-semibold text-[#131A31] transition hover:bg-[#FFB733] sm:w-auto">
              {hasKeepable ? "Sign up to keep this sprite" : "Sign up free"} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : (
            <button type="button" onClick={() => void generate()} disabled={isGenerating}
              className="px-corners flex h-11 w-full items-center justify-center gap-2 bg-[#FFA300] px-5 text-[14px] font-semibold text-[#131A31] transition hover:bg-[#FFB733] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto">
              {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin" /> <span className="font-mono">{elapsed}s</span></> : <><Sparkles className="h-4 w-4" /> Generate</>}
            </button>
          )}
        </div>
      </div>

      {/* One tap = a finished sprite: most visitors are on phones and never
          type a prompt (2% of visitors started a generation). */}
      {!image && !isGenerating && !limitReached && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-[#A7ADD4]">Try</span>
          {QUICK.map((q) => (
            <button key={q.label} type="button"
              onClick={() => { setPrompt(q.prompt); void generate(q.prompt); }}
              className="flex h-10 items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.03] pl-2 pr-3.5 text-[13px] text-[#C8CCE8] transition-colors hover:border-[#FFA300]/50 hover:text-white sm:h-9">
              {/* 40px derivative, lazy: these chips are not the LCP image and must not preload the full PNGs. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={showcaseIconSrc(q.icon)} alt="" width={20} height={20} loading="lazy" decoding="async" className="pixel-perfect h-5 w-5 object-contain" />
              {q.label}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-center text-[13px] text-[#FFC857]">{error}</p>
      )}

      {(image || isGenerating) && (
        <div aria-live="polite" className="mx-auto mt-5 flex max-w-[560px] flex-col items-center gap-5 rounded-3xl border border-white/[0.08] bg-[#19223F] p-5 sm:flex-row">
          <div className="relative aspect-square w-full max-w-[220px] shrink-0 overflow-hidden rounded-2xl border border-white/[0.06]"
            style={{ backgroundImage: "repeating-conic-gradient(#ffffff08 0% 25%, transparent 0% 50%)", backgroundSize: "16px 16px" }}>
            {isGenerating ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#9AA1CC]">
                <Loader2 className="h-6 w-6 animate-spin text-[#FFA300]" />
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
            <p className="mt-1 text-[13px] leading-relaxed text-[#9AA1CC]">
              {hasKeepable
                ? `Transparent PNG, ready for your engine. Sign up and this sprite goes straight into your Assets, plus ${SIGNUP_CREDITS} free credits, 12 art styles and HD quality.`
                : `Transparent PNG, ready for your engine. Create a free account for ${SIGNUP_CREDITS} credits, 12 art styles, HD quality and your own asset library.`}
            </p>
            {image && (
              <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                <button type="button" onClick={download}
                  className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-[13px] text-[#FFF1E8] transition hover:bg-white/[0.08]">
                  <Download className="h-4 w-4" aria-hidden="true" /> Download
                </button>
                <Link href={registerUrl}
                  onClick={() => track(FUNNEL.guestSignupClick, { source: "result", keepable: hasKeepable })}
                  className="px-corners flex h-10 items-center gap-2 bg-[#FFA300] px-4 text-[13px] font-semibold text-[#131A31] transition hover:bg-[#FFB733]">
                  {hasKeepable ? "Sign up to keep this sprite" : SIGNUP_CTA} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
