"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Film, FolderOpen, Loader2, Sparkles } from "lucide-react";
import { FIRST_RUN_FRAMES, FIRST_RUN_SPRITE_CREDITS, firstRunCreditCost } from "@/lib/billing/entitlements";
import { animationCredits } from "@/config/animations";
import { starterCheckoutHref } from "@/config/starter-first-month";

const STYLES = [
  { id: "PIXEL_ART_16", label: "Pixel" },
  { id: "HAND_PAINTED", label: "Hand-painted" },
  { id: "CARTOON_WESTERN", label: "Cartoon" },
  { id: "ANIME_GAME", label: "Anime" },
] as const;

const CLASSES = [
  { id: "knight", label: "Knight", prompt: "a knight in simple armour with a short sword and a kite shield, standing, full body" },
  { id: "mage", label: "Mage", prompt: "a mage in a long robe with a wooden staff, standing, full body" },
  { id: "rogue", label: "Rogue", prompt: "a rogue in a hooded cloak with a dagger, standing, full body" },
  { id: "ranger", label: "Ranger", prompt: "a ranger with a bow and a leather coat, standing, full body" },
] as const;

type Step = "choose" | "sprite" | "animating" | "done";

export function FirstRun() {
  const router = useRouter();
  const [styleId, setStyleId] = useState<(typeof STYLES)[number]["id"]>("PIXEL_ART_16");
  const [classId, setClassId] = useState<(typeof CLASSES)[number]["id"]>("knight");
  const [step, setStep] = useState<Step>("choose");
  const [error, setError] = useState("");
  const [sprite, setSprite] = useState<{ id: string; imageUrl: string; prompt: string } | null>(null);
  const [animation, setAnimation] = useState<{ id: string; sheetUrl: string; gifUrl: string | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const chosen = CLASSES.find((c) => c.id === classId) ?? CLASSES[0];
  const animCost = animationCredits(FIRST_RUN_FRAMES, false);

  const generate = async () => {
    setError("");
    setStep("sprite");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: chosen.prompt,
          categoryId: "CHARACTERS",
          subcategoryId: "HEROES",
          styleId,
          view: "DEFAULT",
          qualityPreset: "normal",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.generationId !== "string" || typeof data.imageUrl !== "string") {
        throw new Error(typeof data.error === "string" ? data.error : "The character didn't generate. Try again.");
      }
      setSprite({ id: data.generationId, imageUrl: data.imageUrl, prompt: chosen.prompt });
      try { window.localStorage.setItem("spritelab_seen_first_run", "1"); } catch { /* ignore */ }
    } catch (err) {
      setStep("choose");
      setError(err instanceof Error ? err.message : "The character didn't generate. Try again.");
    }
  };

  const animate = async () => {
    if (!sprite) return;
    setError("");
    setStep("animating");
    try {
      const res = await fetch("/api/animate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generationId: sprite.id,
          action: "walk",
          frames: FIRST_RUN_FRAMES,
          smooth: false,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.sheetUrl !== "string") {
        throw new Error(typeof data.error === "string" ? data.error : "The walk didn't finish. Your character is saved.");
      }
      setAnimation({
        id: typeof data.generationId === "string" ? data.generationId : sprite.id,
        sheetUrl: data.sheetUrl,
        gifUrl: typeof data.gifUrl === "string" ? data.gifUrl : null,
      });
      setStep("done");
    } catch (err) {
      setStep("sprite");
      setError(err instanceof Error ? err.message : "The walk didn't finish. Your character is saved.");
    }
  };

  const saveProject = async () => {
    if (!sprite || saving) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/projects/character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generationId: sprite.id, name: chosen.label }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.projectId !== "string") throw new Error(data.error || "Couldn't save the project.");
      setProjectId(data.projectId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the project.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8">
      <p className="font-mono text-[12px] text-[#A7ADD4]">First character · {firstRunCreditCost()} of your free credits</p>
      <h1 className="mt-2 font-display text-[32px] font-semibold leading-tight text-[#FFF1E8]">Make a character, then make it walk.</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-[#C8CCE8]">
        A standard sprite is {FIRST_RUN_SPRITE_CREDITS} credit. A 4-frame walk is {animCost}. Smooth motion stays off so this fits the free balance.
      </p>

      {step === "choose" && (
        <>
          <fieldset className="mt-6">
            <legend className="text-[13px] font-medium text-white">Style</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {STYLES.map((style) => (
                <button key={style.id} type="button" aria-pressed={styleId === style.id} onClick={() => setStyleId(style.id)}
                  className={`min-h-11 rounded-xl border px-3 text-[14px] ${styleId === style.id ? "border-[#FFA300] bg-[#FFA300]/10 text-white" : "border-white/10 bg-[#212B4E] text-[#C8CCE8]"}`}>
                  {style.label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="mt-4">
            <legend className="text-[13px] font-medium text-white">Character</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {CLASSES.map((item) => (
                <button key={item.id} type="button" aria-pressed={classId === item.id} onClick={() => setClassId(item.id)}
                  className={`min-h-11 rounded-xl border px-3 text-[14px] ${classId === item.id ? "border-[#FFA300] bg-[#FFA300]/10 text-white" : "border-white/10 bg-[#212B4E] text-[#C8CCE8]"}`}>
                  {item.label}
                </button>
              ))}
            </div>
          </fieldset>
          <button type="button" onClick={generate} className="px-corners mt-6 flex h-12 w-full items-center justify-center gap-2 bg-[#FFA300] text-[15px] font-semibold text-[#131A31] hover:bg-[#FFB733]">
            <Sparkles className="h-4 w-4" /> Create {chosen.label.toLowerCase()}
          </button>
          <button type="button" onClick={() => router.push("/generate")} className="mt-2 flex h-11 w-full items-center justify-center text-[14px] text-[#C8CCE8] hover:text-white">
            I&apos;ll write my own prompt
          </button>
        </>
      )}

      {(step === "sprite" || step === "animating") && !sprite && (
        <p className="mt-8 flex items-center gap-2 text-[15px] text-[#FFF1E8]"><Loader2 className="h-4 w-4 animate-spin text-[#FFA300]" /> Drawing your {chosen.label.toLowerCase()}…</p>
      )}

      {sprite && step !== "done" && (
        <div className="mt-6">
          <div className="checker flex aspect-square items-center justify-center rounded-[10px] border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sprite.imageUrl} alt={chosen.label} className="pixel-perfect max-h-[80%] max-w-[80%] object-contain" />
          </div>
          <button type="button" onClick={animate} disabled={step === "animating"} className="px-corners mt-4 flex h-12 w-full items-center justify-center gap-2 bg-[#FFA300] text-[15px] font-semibold text-[#131A31] disabled:opacity-60">
            {step === "animating" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
            {step === "animating" ? "Animating the walk…" : `Animate a walk · ${animCost} credits`}
          </button>
        </div>
      )}

      {step === "done" && sprite && animation && (
        <div className="mt-6">
          <div className="checker flex aspect-square items-center justify-center rounded-[10px] border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={animation.gifUrl || animation.sheetUrl} alt={`${chosen.label} walking`} className="pixel-perfect max-h-[80%] max-w-[80%] object-contain" />
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {projectId ? (
              <Link href={`/projects/${projectId}`} className="px-corners flex h-12 items-center justify-center gap-2 bg-[#FFA300] text-[15px] font-semibold text-[#131A31]">
                <FolderOpen className="h-4 w-4" /> Open the project
              </Link>
            ) : (
              <button type="button" onClick={saveProject} disabled={saving} className="px-corners flex h-12 items-center justify-center gap-2 bg-[#FFA300] text-[15px] font-semibold text-[#131A31] disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderOpen className="h-4 w-4" />}
                Save {chosen.label.toLowerCase()} to a project
              </button>
            )}
            <a href={animation.gifUrl || animation.sheetUrl} download className="flex h-11 items-center justify-center rounded-xl border border-white/10 text-[14px] text-[#FFF1E8]">
              Download
            </a>
            <Link href={starterCheckoutHref(false)} className="flex h-11 items-center justify-center text-[14px] text-[#FFC857]">
              Starter adds a commercial licence, engine export and private sprites
            </Link>
            <Link href={`/animate?id=${encodeURIComponent(sprite.id)}`} className="flex h-11 items-center justify-center text-[14px] text-[#C8CCE8]">
              Make another motion
            </Link>
          </div>
        </div>
      )}

      {error && <p role="alert" className="mt-4 text-[14px] text-[#FFC857]">{error}</p>}
    </div>
  );
}
