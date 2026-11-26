"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderOpen, Loader2, Sparkles } from "lucide-react";
import { FIRST_RUN_SPRITE_CREDITS, firstRunCreditCost } from "@/lib/billing/entitlements";
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

type Step = "choose" | "sprite" | "done";

export function FirstRun() {
  const router = useRouter();
  const [styleId, setStyleId] = useState<(typeof STYLES)[number]["id"]>("PIXEL_ART_16");
  const [classId, setClassId] = useState<(typeof CLASSES)[number]["id"]>("knight");
  const [step, setStep] = useState<Step>("choose");
  const [error, setError] = useState("");
  const [sprite, setSprite] = useState<{ id: string; imageUrl: string; prompt: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const chosen = CLASSES.find((c) => c.id === classId) ?? CLASSES[0];

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
      <h1 className="mt-2 font-display text-[32px] font-semibold leading-tight text-[#FFF1E8]">Make your first character.</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-[#C8CCE8]">
        A standard sprite is {FIRST_RUN_SPRITE_CREDITS} credit and stays on the free balance. Animations and direction sheets are on Starter or a credit pack.
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

      {step === "sprite" && !sprite && (
        <p className="mt-8 flex items-center gap-2 text-[15px] text-[#FFF1E8]"><Loader2 className="h-4 w-4 animate-spin text-[#FFA300]" /> Drawing your {chosen.label.toLowerCase()}…</p>
      )}

      {sprite && (
        <div className="mt-6">
          <div className="checker flex aspect-square items-center justify-center rounded-[10px] border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sprite.imageUrl} alt={chosen.label} className="pixel-perfect max-h-[80%] max-w-[80%] object-contain" />
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
            <Link href={starterCheckoutHref(true)} className="flex h-11 items-center justify-center rounded-xl border border-white/10 text-[14px] text-[#FFC857]">
              Animate this character on Starter
            </Link>
            <Link href="/pricing#credit-packs" className="flex h-11 items-center justify-center text-[14px] text-[#C8CCE8]">
              Or buy a credit pack
            </Link>
          </div>
        </div>
      )}

      {error && <p role="alert" className="mt-4 text-[14px] text-[#FFC857]">{error}</p>}
    </div>
  );
}
