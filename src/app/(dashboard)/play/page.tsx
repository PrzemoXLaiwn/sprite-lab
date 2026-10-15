"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FastForward, Loader2, Plus, Share2, SkipForward, Swords, Trophy, Wand2, X } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { DungeonStage, type StageProgress } from "@/components/play/DungeonStage";
import { ROLES, PARTY_SIZE, PRIZE_CREDITS, PRIZE_MIN_PAID_GENERATIONS, BADGE_RANKS } from "@/lib/dungeon/config";
import type { DungeonSprite, Leaderboard, Trophy as TrophyRow } from "@/lib/dungeon/store";
import type { RunLog } from "@/lib/dungeon/simulate";

interface PlayData {
  roster: DungeonSprite[];
  party: DungeonSprite[];
  runsPerDay: number;
  runsLeft: number;
  runsResetAt: string;
  trophies: TrophyRow[];
}

interface ActiveRun {
  log: RunLog;
  sprites: DungeonSprite[];
}

const BADGE_LABEL: Record<string, string> = { gold: "1st place", silver: "2nd place", bronze: "3rd place", top10: "Top 10" };
const BADGE_COLOR: Record<string, string> = { gold: "#FFA300", silver: "#C8CCE8", bronze: "#D08A4E", top10: "#29ADFF" };

async function readJson(res: Response): Promise<Record<string, unknown>> {
  return (await res.json().catch(() => ({}))) as Record<string, unknown>;
}

function SpriteImg({ s, className }: { s: DungeonSprite; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- user sprites from storage, drawn 1:1 with pixel scaling
    <img src={s.imageUrl} alt={s.name} loading="lazy" draggable={false}
      className={`h-full w-full object-contain ${className ?? ""}`}
      style={s.pixel ? { imageRendering: "pixelated" } : undefined} />
  );
}

function HpBar({ hp, max }: { hp: number; max: number }) {
  const blocks = 20;
  const filled = max > 0 ? Math.ceil((Math.max(0, hp) / max) * blocks) : 0;
  return (
    <div className="flex w-full max-w-[260px] gap-[3px]" role="progressbar" aria-label="Party HP" aria-valuemin={0} aria-valuemax={max} aria-valuenow={hp}>
      {Array.from({ length: blocks }, (_, i) => (
        <span key={i} className={`h-3 flex-1 rounded-[2px] ${i < filled ? "bg-[#00E436]" : "bg-white/[0.08]"}`} />
      ))}
    </div>
  );
}

function Picker({
  roster, party, slot, onPick, onRemove, onClose,
}: {
  roster: DungeonSprite[]; party: DungeonSprite[]; slot: number;
  onPick: (id: string) => void; onRemove: () => void; onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const inParty = new Set(party.map((p) => p.id));
  const current = party[slot];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="picker-title"
        className="flex max-h-[85vh] w-full flex-col rounded-t-[14px] border border-white/[0.1] bg-[#19223F] sm:max-w-2xl sm:rounded-[14px]"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3">
          <h2 id="picker-title" className="font-display text-[19px] font-semibold text-[#FFF1E8]">{current ? "Swap party member" : "Add to your party"}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-[8px] text-[#C8CCE8] hover:bg-white/[0.06]">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-3">
          {current && (
            <button type="button" onClick={onRemove}
              className="mb-3 inline-flex h-10 items-center rounded-[7px] border border-white/[0.14] px-3.5 text-[13.5px] text-[#FFF1E8] hover:bg-white/[0.06]">
              Remove {current.name.length > 24 ? `${current.name.slice(0, 23)}…` : current.name}
            </button>
          )}
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {roster.map((s) => {
              const taken = inParty.has(s.id);
              return (
                <li key={s.id}>
                  <button type="button" disabled={taken} onClick={() => onPick(s.id)}
                    className="flex w-full flex-col items-stretch rounded-[8px] border border-white/[0.08] bg-[#212B4E] p-1.5 text-left transition hover:border-[#FFA300]/70 disabled:opacity-45 disabled:hover:border-white/[0.08]">
                    <span className="checker checker-sm block aspect-square overflow-hidden rounded-[6px]"><SpriteImg s={s} /></span>
                    <span className="mt-1.5 flex items-baseline justify-between gap-1 px-0.5">
                      <span className="text-[12.5px] font-semibold text-[#FFF1E8]">{ROLES[s.stats.role].label}</span>
                      <span className="font-mono text-[12px] text-[#FFC857]">{s.stats.power}</span>
                    </span>
                    <span className="px-0.5 text-[11.5px] leading-tight text-[#A7ADD4]">
                      {taken ? "In party" : [s.stats.animated && "Animated", s.stats.hd && "HD"].filter(Boolean).join(" · ") || " "}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function PlayPage() {
  const [data, setData] = useState<PlayData | null>(null);
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [boardError, setBoardError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [run, setRun] = useState<ActiveRun | null>(null);
  const [replaying, setReplaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [skipToken, setSkipToken] = useState(0);
  const [progress, setProgress] = useState<StageProgress | null>(null);

  const loadBoard = useCallback(async () => {
    try {
      const res = await fetch("/api/play/leaderboard", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setBoard((await res.json()) as Leaderboard);
      setBoardError(false);
    } catch {
      setBoardError(true);
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/play", { cache: "no-store" });
      const json = await readJson(res);
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Couldn't open the dungeon.");
      setData(json as unknown as PlayData);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open the dungeon.");
    }
  }, []);

  useEffect(() => { void load(); void loadBoard(); }, [load, loadBoard]);

  const saveSlots = async (slots: string[]) => {
    if (!data) return;
    setSaving(true);
    try {
      const res = await fetch("/api/play/party", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slots }) });
      const json = await readJson(res);
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Couldn't save your party.");
      setData({ ...data, party: json.party as DungeonSprite[] });
      setRun(null);
      setProgress(null);
    } catch (e) {
      toast({ title: "Party not saved", description: e instanceof Error ? e.message : "Try again in a moment.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const pick = (id: string) => {
    if (!data || picker === null) return;
    const slots = data.party.map((p) => p.id);
    if (picker < slots.length) slots[picker] = id;
    else slots.push(id);
    setPicker(null);
    void saveSlots(slots.slice(0, PARTY_SIZE));
  };

  const remove = () => {
    if (!data || picker === null) return;
    const slots = data.party.map((p) => p.id).filter((_, i) => i !== picker);
    setPicker(null);
    void saveSlots(slots);
  };

  const startRun = async () => {
    if (!data) return;
    setStarting(true);
    try {
      const res = await fetch("/api/play/run", { method: "POST" });
      const json = await readJson(res);
      if (!res.ok) {
        if (json.code === "DAILY_LIMIT") setData({ ...data, runsLeft: 0 });
        throw new Error(typeof json.error === "string" ? json.error : "Couldn't start the run.");
      }
      setRun({ log: json.log as RunLog, sprites: json.sprites as DungeonSprite[] });
      setData({ ...data, runsLeft: Number(json.runsLeft) });
      setReplaying(true);
      setSkipToken(0);
    } catch (e) {
      toast({ title: "Run not started", description: e instanceof Error ? e.message : "Try again in a moment.", variant: "destructive" });
    } finally {
      setStarting(false);
    }
  };

  const onDone = useCallback(() => {
    setReplaying(false);
    void loadBoard();
  }, [loadBoard]);

  const bestFloor = board?.me?.floor ?? null;
  const shareFloor = run && !replaying ? Math.max(run.log.floor, bestFloor ?? 0) : bestFloor;

  const share = async () => {
    if (!shareFloor) return;
    const text = `I reached floor ${shareFloor} in Sprite Dungeon with sprites I made on sprite-lab.com/play`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Sprite Dungeon", text, url: "https://www.sprite-lab.com/play" });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: "Paste it anywhere to share your run." });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      toast({ title: "Couldn't share", description: text });
    }
  };

  const stageParty = run?.sprites ?? data?.party ?? [];
  const maxHp = stageParty.reduce((a, p) => a + p.stats.hp, 0);
  const hud = progress ?? { floor: run?.log.floor ?? 0, hp: maxHp, maxHp, line: "", done: false };
  const partyPower = useMemo(() => (data?.party ?? []).reduce((a, p) => a + p.stats.power, 0), [data?.party]);

  if (error && !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-[15px] text-[#C8CCE8]">{error}</p>
        <button type="button" onClick={() => void load()} className="mt-4 inline-flex h-10 items-center rounded-[7px] border border-white/[0.14] px-4 text-[14px] text-[#FFF1E8] hover:bg-white/[0.06]">Try again</button>
      </div>
    );
  }
  if (!data) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#A7ADD4]" aria-label="Loading the dungeon" /></div>;
  }

  const noSprites = data.roster.length === 0;
  const canRun = data.party.length > 0 && data.runsLeft > 0 && !starting && !replaying && !saving;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-6 sm:pt-10">
      <h1 className="font-display text-[30px] font-semibold leading-tight text-[#FFF1E8] sm:text-[38px]">Sprite Dungeon</h1>
      <p className="mt-1.5 max-w-xl text-[14.5px] leading-relaxed text-[#A7ADD4]">
        Your sprites are your party. Send them down, see how deep they get, and climb this week&apos;s board.
      </p>

      {/* HUD */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="font-display text-[24px] font-semibold text-[#FFF1E8]">
          {hud.floor > 0 ? `Floor ${hud.floor}` : "Ready"}
        </p>
        <div className="flex min-w-[200px] flex-1 items-center justify-end gap-2">
          <span className="text-[12.5px] text-[#A7ADD4]">HP</span>
          <HpBar hp={hud.hp} max={hud.maxHp} />
        </div>
      </div>

      {/* Stage */}
      <div className="mt-3">
        <DungeonStage party={stageParty} log={run?.log ?? null} speed={speed} skipToken={skipToken} onProgress={setProgress} onDone={onDone} />
      </div>
      <p className="mt-2 min-h-[20px] text-[13px] text-[#C8CCE8]" aria-live="polite">
        {progress?.line || (data.party.length ? `Party power ${partyPower}. Pick a run when you're ready.` : "")}
      </p>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void startRun()} disabled={!canRun}
          className="inline-flex h-11 items-center gap-2 rounded-[8px] bg-[#FFA300] px-5 text-[15px] font-semibold text-[#131A31] transition hover:bg-[#FFB733] disabled:cursor-not-allowed disabled:opacity-50">
          {starting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Swords className="h-4 w-4" aria-hidden />}
          {data.runsLeft === 0 ? "No runs left today" : "Start a run"}
        </button>
        {replaying && (
          <>
            <button type="button" onClick={() => setSpeed((s) => (s === 1 ? 3 : 1))} aria-pressed={speed === 3}
              className="inline-flex h-11 items-center gap-1.5 rounded-[8px] border border-white/[0.14] px-3.5 text-[14px] text-[#FFF1E8] hover:bg-white/[0.06]">
              <FastForward className="h-4 w-4" aria-hidden /> {speed === 1 ? "Speed ×3" : "Speed ×1"}
            </button>
            <button type="button" onClick={() => setSkipToken((n) => n + 1)}
              className="inline-flex h-11 items-center gap-1.5 rounded-[8px] border border-white/[0.14] px-3.5 text-[14px] text-[#FFF1E8] hover:bg-white/[0.06]">
              <SkipForward className="h-4 w-4" aria-hidden /> Skip
            </button>
          </>
        )}
        {!replaying && shareFloor ? (
          <button type="button" onClick={() => void share()}
            className="inline-flex h-11 items-center gap-1.5 rounded-[8px] border border-white/[0.14] px-3.5 text-[14px] text-[#FFF1E8] hover:bg-white/[0.06]">
            <Share2 className="h-4 w-4" aria-hidden /> Share
          </button>
        ) : null}
        <div className="ml-auto flex items-center gap-2" aria-label={`${data.runsLeft} of ${data.runsPerDay} runs left today`}>
          <span className="text-[13px] text-[#A7ADD4]">Runs today</span>
          <span className="flex gap-1">
            {Array.from({ length: data.runsPerDay }, (_, i) => (
              <span key={i} className={`h-3 w-3 rounded-[3px] ${i < data.runsLeft ? "bg-[#FFA300]" : "bg-white/[0.1]"}`} />
            ))}
          </span>
        </div>
      </div>

      {run && !replaying && (
        <p className="mt-3 rounded-[10px] border border-white/[0.09] bg-[#19223F] px-4 py-3 text-[14px] text-[#C8CCE8]">
          Your party reached <span className="font-semibold text-[#FFF1E8]">floor {run.log.floor}</span>.
          {board?.me ? <> Best this week: floor {board.me.floor}, rank #{board.me.rank} of {board.players}.</> : null}
        </p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div>
          {/* Party */}
          <section aria-labelledby="party-h">
            <div className="flex items-baseline justify-between gap-2">
              <h2 id="party-h" className="font-display text-[22px] font-semibold text-[#FFF1E8]">Your party</h2>
              {saving && <Loader2 className="h-4 w-4 animate-spin text-[#A7ADD4]" aria-label="Saving party" />}
            </div>
            {noSprites ? (
              <div className="mt-3 rounded-[10px] border border-dashed border-white/[0.16] bg-[#19223F] p-5">
                <p className="text-[15px] font-semibold text-[#FFF1E8]">Make your first sprite — it joins your party</p>
                <p className="mt-1 text-[13.5px] text-[#A7ADD4]">Every sprite you generate becomes a recruit you can bring into the dungeon.</p>
                <Link href="/generate" className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-[7px] bg-[#FFA300] px-4 text-[14px] font-semibold text-[#131A31] hover:bg-[#FFB733]">
                  <Wand2 className="h-4 w-4" aria-hidden /> Create a sprite
                </Link>
              </div>
            ) : (
              <>
                <ul className="mt-3 grid grid-cols-4 gap-2">
                  {Array.from({ length: PARTY_SIZE }, (_, i) => {
                    const s = data.party[i];
                    const locked = replaying || saving;
                    if (!s) {
                      const isNext = i === data.party.length;
                      return (
                        <li key={i}>
                          <button type="button" disabled={!isNext || locked} onClick={() => setPicker(i)} aria-label="Add a sprite to your party"
                            className="flex aspect-square w-full items-center justify-center rounded-[8px] border border-dashed border-white/[0.18] text-[#A7ADD4] transition hover:border-[#FFA300]/70 hover:text-[#FFF1E8] disabled:opacity-40 disabled:hover:border-white/[0.18]">
                            {isNext ? <Plus className="h-6 w-6" aria-hidden /> : null}
                          </button>
                        </li>
                      );
                    }
                    return (
                      <li key={s.id}>
                        <button type="button" disabled={locked} onClick={() => setPicker(i)} aria-label={`Swap ${s.name}`}
                          className="flex w-full flex-col rounded-[8px] border border-white/[0.1] bg-[#19223F] p-1.5 text-left transition hover:border-[#FFA300]/70 disabled:opacity-60">
                          <span className="checker checker-sm block aspect-square overflow-hidden rounded-[6px]"><SpriteImg s={s} /></span>
                          <span className="mt-1 flex items-baseline justify-between gap-1 px-0.5">
                            <span className="truncate text-[12px] font-semibold text-[#FFF1E8]">{ROLES[s.stats.role].label}</span>
                            <span className="font-mono text-[11.5px] text-[#FFC857]">{s.stats.power}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {data.party.length === 0 && <p className="mt-2 text-[13.5px] text-[#A7ADD4]">Tap + to add your sprites. Up to {PARTY_SIZE}.</p>}
                <p className="mt-2 text-[12.5px] text-[#A7ADD4]">Numbers are power. Changing the party is free.</p>
              </>
            )}
          </section>

          {/* How it works */}
          <section aria-labelledby="how-h" className="mt-8">
            <h2 id="how-h" className="font-display text-[22px] font-semibold text-[#FFF1E8]">How it works</h2>
            <ul className="mt-3 space-y-2 text-[14px] leading-relaxed text-[#C8CCE8]">
              <li><span className="font-semibold text-[#FFF1E8]">New sprites are new recruits.</span> Characters fight as Heroes, Creatures as Beasts (more HP), Weapons as Blades (hit hardest), Armor as Guards (draw attacks). Anything else is a Charm that heals.</li>
              <li><span className="font-semibold text-[#FFF1E8]">Animated sprites hit harder.</span> A sprite you&apos;ve animated gets +40% HP and attack, an HD sprite +15%. Mixing art styles gives the whole party a small bonus.</li>
              <li><span className="font-semibold text-[#FFF1E8]">{data.runsPerDay} runs a day</span>, reset at 00:00 UTC. The server plays the whole run; you watch the replay.</li>
              <li><span className="font-semibold text-[#FFF1E8]">Weekly prizes.</span> Top {BADGE_RANKS} get a badge; the top 3 get {PRIZE_CREDITS.join(" / ")} credits if they made at least {PRIZE_MIN_PAID_GENERATIONS} paid generations that week. The board resets Monday 00:00 UTC.</li>
            </ul>
          </section>
        </div>

        <div>
          {/* Leaderboard */}
          <section aria-labelledby="board-h">
            <h2 id="board-h" className="font-display text-[22px] font-semibold text-[#FFF1E8]">This week</h2>
            {boardError && !board ? (
              <div className="mt-3 text-[14px] text-[#C8CCE8]">
                Couldn&apos;t load the leaderboard.{" "}
                <button type="button" onClick={() => void loadBoard()} className="inline-flex h-10 items-center underline underline-offset-2">Try again</button>
              </div>
            ) : !board ? (
              <Loader2 className="mt-4 h-5 w-5 animate-spin text-[#A7ADD4]" aria-label="Loading leaderboard" />
            ) : board.top.length === 0 ? (
              <p className="mt-3 rounded-[10px] border border-white/[0.08] bg-[#19223F] p-4 text-[14px] text-[#C8CCE8]">No runs yet this week. Be the first on the board.</p>
            ) : (
              <>
                <ol className="mt-3 overflow-hidden rounded-[10px] border border-white/[0.08] bg-[#19223F]">
                  {board.top.slice(0, 10).map((r) => (
                    <li key={r.rank} className={`flex items-center gap-3 border-b border-white/[0.06] px-3 py-2.5 last:border-b-0 ${r.you ? "bg-[#FFA300]/[0.08]" : ""}`}>
                      <span className="w-7 shrink-0 font-mono text-[13px] text-[#A7ADD4]">#{r.rank}</span>
                      <span className={`min-w-0 flex-1 truncate text-[14px] ${r.you ? "font-semibold text-[#FFF1E8]" : "text-[#C8CCE8]"}`}>{r.name}{r.you ? " (you)" : ""}</span>
                      {r.rank <= PRIZE_CREDITS.length && <Trophy className="h-4 w-4 shrink-0" style={{ color: BADGE_COLOR[["gold", "silver", "bronze"][r.rank - 1]] }} aria-label={`${PRIZE_CREDITS[r.rank - 1]} credit prize`} />}
                      <span className="shrink-0 font-mono text-[13px] text-[#FFF1E8]">floor {r.floor}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-2 text-[13px] text-[#A7ADD4]">
                  {board.me
                    ? board.me.rank > 10 ? <>You&apos;re <span className="text-[#FFF1E8]">#{board.me.rank}</span> with floor {board.me.floor}, of {board.players} players.</> : <>{board.players} players this week.</>
                    : "Finish a run to get on the board."}
                </p>
              </>
            )}
          </section>

          {/* Trophies */}
          {data.trophies.length > 0 && (
            <section aria-labelledby="trophy-h" className="mt-8">
              <h2 id="trophy-h" className="font-display text-[22px] font-semibold text-[#FFF1E8]">Your badges</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {data.trophies.map((t) => (
                  <li key={t.week} className="flex items-center gap-2 rounded-[8px] border border-white/[0.08] bg-[#19223F] px-3 py-2">
                    <Trophy className="h-4 w-4" style={{ color: BADGE_COLOR[t.badge] ?? "#29ADFF" }} aria-hidden />
                    <span className="text-[13px] text-[#FFF1E8]">{BADGE_LABEL[t.badge] ?? `Rank ${t.rank}`}</span>
                    <span className="font-mono text-[12px] text-[#A7ADD4]">{t.week}{t.credits > 0 ? ` · +${t.credits} cr` : ""}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {picker !== null && (
        <Picker roster={data.roster} party={data.party} slot={picker} onPick={pick} onRemove={remove} onClose={() => setPicker(null)} />
      )}
    </div>
  );
}
