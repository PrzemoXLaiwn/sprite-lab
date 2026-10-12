"use client";

import { useState } from "react";
import { Check, Loader2, Package, X } from "lucide-react";
import { MOVESETS, moveCredits, movesetCredits, type Moveset } from "@/config/movesets";
import { buildEnginePack, saveBlob, type PackAnimation } from "@/lib/export/engine-pack";
import { triggerCreditsRefresh } from "@/components/dashboard/CreditsDisplay";
import { triggerUpgradeModal } from "@/components/dashboard/UpgradeModal";

type Status = "waiting" | "running" | "done" | "failed";
interface MoveResult { status: Status; anim?: PackAnimation; error?: string }

/**
 * "Make the whole set": runs a curated list of /api/animate requests one
 * after another (each saved to assets and charged like a single animation),
 * then offers one engine pack with every move.
 */
export function MovesetBuilder({ generationId, characterName, disabled }: { generationId: string; characterName: string; disabled?: boolean }) {
  const [setId, setSetId] = useState<Moveset["id"]>("fighting");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Record<string, MoveResult>>({});
  const [packing, setPacking] = useState(false);
  const [error, setError] = useState("");
  const set = MOVESETS.find((s) => s.id === setId)!;
  const total = movesetCredits(set);
  const done = set.moves.filter((m) => results[m.name]?.status === "done");
  const finished = !running && set.moves.every((m) => results[m.name]?.status === "done" || results[m.name]?.status === "failed");

  const run = async () => {
    if (running) return;
    setRunning(true);
    setError("");
    setResults(Object.fromEntries(set.moves.map((m) => [m.name, { status: "waiting" as Status }])));
    for (const m of set.moves) {
      setResults((r) => ({ ...r, [m.name]: { status: "running" } }));
      try {
        const res = await fetch("/api/animate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ generationId, action: m.action, frames: m.frames, smooth: false, ...(m.customMotion ? { customMotion: m.customMotion } : {}) }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 402 || data.noCredits) {
            triggerUpgradeModal();
            setResults((r) => ({ ...r, [m.name]: { status: "failed", error: "Not enough credits" } }));
            setError("Out of credits — the moves made so far are saved in your assets.");
            break;
          }
          throw new Error(data.error || "failed");
        }
        const anim: PackAnimation = {
          name: m.name, sheetUrl: data.sheetUrl, frameCount: data.frameCount, frameWidth: data.frameWidth, frameHeight: data.frameHeight,
          fps: typeof data.fps === "number" ? data.fps : 10, loop: ["idle", "walk", "run"].includes(m.name), sheetCols: data.sheetCols,
        };
        setResults((r) => ({ ...r, [m.name]: { status: "done", anim } }));
      } catch (e) {
        setResults((r) => ({ ...r, [m.name]: { status: "failed", error: e instanceof Error ? e.message : "failed" } }));
      }
      triggerCreditsRefresh();
    }
    setRunning(false);
  };

  const download = async () => {
    const anims = set.moves.map((m) => results[m.name]?.anim).filter((a): a is PackAnimation => Boolean(a));
    if (!anims.length || packing) return;
    setPacking(true);
    try {
      saveBlob(await buildEnginePack(characterName, anims), `spritelab_${set.id}_set.zip`);
    } catch {
      setError("Couldn't build the pack — try again.");
    } finally {
      setPacking(false);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Move set">
        {MOVESETS.map((s) => {
          const active = s.id === setId;
          return (
            <button key={s.id} type="button" role="radio" aria-checked={active} disabled={running || disabled}
              onClick={() => { setSetId(s.id); setResults({}); setError(""); }}
              className={`min-h-[56px] rounded-xl border px-2 py-2 text-left transition-colors disabled:cursor-not-allowed ${active ? "border-[#FF8A3D] bg-[#FF8A3D]/[0.06] ring-2 ring-[#FF8A3D]/25" : "border-white/[0.08] bg-[#151922] hover:border-white/20"}`}>
              <span className="block text-[12.5px] font-medium leading-tight text-white">{s.label}</span>
              <span className="mt-0.5 block text-[11px] leading-tight text-[#8B93A5]">{s.hint}</span>
            </button>
          );
        })}
      </div>

      <ul className="divide-y divide-white/[0.05] rounded-xl border border-white/[0.08] bg-[#12151C]">
        {set.moves.map((m) => {
          const r = results[m.name];
          return (
            <li key={m.name} className="flex items-center gap-2.5 px-3 py-2 text-[12.5px]">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                {r?.status === "running" ? <Loader2 className="h-4 w-4 animate-spin text-[#FF8A3D]" />
                  : r?.status === "done" ? <Check className="h-4 w-4 text-emerald-300" />
                  : r?.status === "failed" ? <X className="h-4 w-4 text-red-300" />
                  : <span className="h-1.5 w-1.5 rounded-full bg-white/25" />}
              </span>
              <span className={`flex-1 ${r?.status === "done" ? "text-white" : "text-[#C9CFDB]"}`}>{m.label}</span>
              <span className="font-mono text-[11px] text-[#8B93A5]">{moveCredits(m)} cr</span>
            </li>
          );
        })}
      </ul>

      {!finished ? (
        <button type="button" onClick={run} disabled={running || disabled}
          className="px-corners flex h-11 w-full items-center justify-center gap-2 bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] text-[14px] font-semibold text-white transition hover:brightness-110 disabled:opacity-60">
          {running ? <><Loader2 className="h-4 w-4 animate-spin" /> Making move {Math.min(done.length + 1, set.moves.length)} of {set.moves.length}…</> : <>Make the whole set · {total} credits</>}
        </button>
      ) : (
        <button type="button" onClick={download} disabled={packing || done.length === 0}
          className="px-corners flex h-11 w-full items-center justify-center gap-2 bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] text-[14px] font-semibold text-white transition hover:brightness-110 disabled:opacity-60">
          {packing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />} Download engine pack ({done.length} moves)
        </button>
      )}
      <p className="text-[11.5px] leading-snug text-[#8B93A5]">
        {running ? "Keep this tab open — each move takes about 30–60 s and is saved to your assets as it finishes. You're only charged for moves that succeed."
          : "Makes every move of the set one after another, then gives you one pack for Godot (SpriteFrames), Unity, GameMaker — with hitboxes."}
      </p>
      {error && <p role="alert" className="text-[12px] text-amber-200">{error}</p>}
    </div>
  );
}
