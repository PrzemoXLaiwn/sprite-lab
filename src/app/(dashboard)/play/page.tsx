"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown, FastForward, Gem, Loader2, Plus, Share2, Shield, SkipForward, Sparkles, Sword, Swords, Trophy, Wand2, X,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { DungeonStage, type StageProgress } from "@/components/play/DungeonStage";
import { boardAfterRun, removeHero, setGear, setHero, toSlots, wornBy } from "@/components/play/party-edit";
import {
  BADGE_RANKS, GEAR_LABEL, GEAR_MAKE_CATEGORY, GEAR_SLOTS, HERO_MAKE_CATEGORY, PARTY_SIZE, PRIZE_CREDITS,
  PRIZE_MIN_PAID_GENERATIONS, ROLES, themeFor, type GearSlot,
} from "@/lib/dungeon/config";
import type { SlotIds, Tip } from "@/lib/dungeon/party";
import type { DungeonSprite, Leaderboard, PartyMember, Records, Trophy as TrophyRow } from "@/lib/dungeon/store";
import type { RunLog } from "@/lib/dungeon/simulate";
import { summarizeRun } from "@/lib/dungeon/summary";
import type { StatBlock } from "@/lib/dungeon/stats";

interface PlayData {
  roster: DungeonSprite[];
  party: PartyMember[];
  runsPerDay: number;
  runsLeft: number;
  runsResetAt: string;
  trophies: TrophyRow[];
  records: Records;
}

interface RunResponse {
  log: RunLog;
  members: PartyMember[];
  runsLeft: number;
  board: Leaderboard;
  rankBefore: number | null;
  records: Records;
  newBest: boolean;
  tip: Tip | null;
}

type PickerMode = { kind: "hero"; index: number } | { kind: GearSlot; index: number };

const BADGE_LABEL: Record<string, string> = { gold: "1st place", silver: "2nd place", bronze: "3rd place", top10: "Top 10" };
const BADGE_COLOR: Record<string, string> = { gold: "#FFA300", silver: "#C8CCE8", bronze: "#D08A4E", top10: "#29ADFF" };
const GEAR_ICON: Record<GearSlot, typeof Sword> = { weapon: Sword, armor: Shield, trinket: Gem };
const MAKE_LABEL: Record<GearSlot, string> = { weapon: "Make a weapon", armor: "Make armor", trinket: "Make an item" };
const HOWTO_KEY = "sl-dungeon-howto-closed";
const SPEEDS = [1, 2, 4];

async function readJson(res: Response): Promise<Record<string, unknown>> {
  return (await res.json().catch(() => ({}))) as Record<string, unknown>;
}

function bonusText(b: StatBlock | null): string {
  if (!b) return "";
  const parts: string[] = [];
  if (b.atk) parts.push(`+${b.atk} ATK`);
  if (b.def) parts.push(`+${b.def} DEF`);
  if (b.hp) parts.push(`+${b.hp} HP`);
  if (b.heal) parts.push(`heals ${b.heal}`);
  return parts.join(" · ");
}

function SpriteImg({ s, className }: { s: DungeonSprite; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- user sprites from storage, pixel styles stay nearest-neighbour
    <img src={s.imageUrl} alt={s.name} loading="lazy" draggable={false}
      className={`h-full w-full object-contain ${className ?? ""}`}
      style={s.pixel ? { imageRendering: "pixelated" } : undefined} />
  );
}

function HpBar({ hp, max }: { hp: number; max: number }) {
  const blocks = 20;
  const filled = max > 0 ? Math.ceil((Math.max(0, hp) / max) * blocks) : 0;
  return (
    <div className="flex w-full max-w-[240px] gap-[3px]" role="progressbar" aria-label="Party HP" aria-valuemin={0} aria-valuemax={max} aria-valuenow={hp}>
      {Array.from({ length: blocks }, (_, i) => (
        <span key={i} className={`h-3 flex-1 rounded-[2px] ${i < filled ? "bg-[#00E436]" : "bg-white/[0.08]"}`} />
      ))}
    </div>
  );
}

// ── Picker sheet ─────────────────────────────────────────────────────────────
function Picker({
  mode, roster, slots, members, onPick, onClear, onClose,
}: {
  mode: PickerMode; roster: DungeonSprite[]; slots: SlotIds[]; members: PartyMember[];
  onPick: (id: string) => void; onClear: () => void; onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const list = roster.filter((s) => s.slot === mode.kind).sort((a, b) => b.power - a.power);
  const current = mode.kind === "hero" ? slots[mode.index]?.hero : slots[mode.index]?.[mode.kind];
  const heroName = members[mode.index]?.hero.name;
  const title = mode.kind === "hero"
    ? current ? "Swap hero" : "Add a hero"
    : `${GEAR_LABEL[mode.kind]}${heroName ? ` for ${heroName.length > 20 ? `${heroName.slice(0, 19)}…` : heroName}` : ""}`;
  const makeHref = `/generate?categoryId=${mode.kind === "hero" ? HERO_MAKE_CATEGORY : GEAR_MAKE_CATEGORY[mode.kind]}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="picker-title"
        className="flex max-h-[85vh] w-full flex-col rounded-t-[14px] border border-white/[0.1] bg-[#19223F] sm:max-w-2xl sm:rounded-[14px]"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3">
          <h2 id="picker-title" className="min-w-0 truncate font-display text-[19px] font-semibold text-[#FFF1E8]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] text-[#C8CCE8] hover:bg-white/[0.06]">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-3">
          <div className="mb-3 flex flex-wrap gap-2">
            {current && (
              <button type="button" onClick={onClear}
                className="inline-flex h-10 items-center rounded-[7px] border border-white/[0.14] px-3.5 text-[13.5px] text-[#FFF1E8] hover:bg-white/[0.06]">
                {mode.kind === "hero" ? "Remove from party" : "Unequip"}
              </button>
            )}
            <Link href={makeHref} className="inline-flex h-10 items-center gap-1.5 rounded-[7px] border border-white/[0.14] px-3.5 text-[13.5px] text-[#FFC857] hover:bg-white/[0.06]">
              <Wand2 className="h-4 w-4" aria-hidden /> {mode.kind === "hero" ? "Make a character or creature" : MAKE_LABEL[mode.kind]}
            </Link>
          </div>
          {list.length === 0 ? (
            <p className="rounded-[10px] border border-dashed border-white/[0.16] p-4 text-[14px] text-[#C8CCE8]">
              {mode.kind === "hero"
                ? "Make a character or creature — it joins your party."
                : `You don't have any ${mode.kind === "trinket" ? "items" : mode.kind === "armor" ? "armor" : "weapons"} yet. Every one you make becomes loot for your heroes.`}
            </p>
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {list.map((s) => {
                const owner = wornBy(slots, s.id);
                const here = owner === mode.index;
                const heroTaken = mode.kind === "hero" && owner >= 0 && !here;
                const note = here ? "Equipped" : heroTaken ? "In party" : owner >= 0 ? `Move from ${members[owner]?.hero.name.slice(0, 12) ?? "hero"}` : mode.kind === "hero" ? (s.animated ? "Animated" : " ") : bonusText(s.bonus);
                return (
                  <li key={s.id}>
                    <button type="button" disabled={heroTaken || here} onClick={() => onPick(s.id)}
                      className="flex w-full flex-col items-stretch rounded-[8px] border border-white/[0.08] bg-[#212B4E] p-1.5 text-left transition hover:border-[#FFA300]/70 disabled:opacity-45 disabled:hover:border-white/[0.08]">
                      <span className="checker checker-sm block aspect-square overflow-hidden rounded-[6px]"><SpriteImg s={s} /></span>
                      <span className="mt-1.5 px-0.5 text-[12.5px] font-semibold text-[#FFF1E8]">Power {s.power}</span>
                      <span className="truncate px-0.5 text-[11.5px] leading-tight text-[#A7ADD4]">{note}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Hero card ────────────────────────────────────────────────────────────────
function HeroCard({
  m, index, locked, canAdd, hasFigures, onPick,
}: {
  m: PartyMember | undefined; index: number; locked: boolean; canAdd: boolean; hasFigures: boolean;
  onPick: (mode: PickerMode) => void;
}) {
  const [details, setDetails] = useState(false);
  if (!m) {
    if (!hasFigures) {
      return (
        <li className="flex min-h-[176px] flex-col items-center justify-center rounded-[10px] border border-dashed border-white/[0.16] p-3 text-center">
          <Link href={`/generate?categoryId=${HERO_MAKE_CATEGORY}`} className="inline-flex min-h-10 items-center text-[13px] font-medium text-[#FFC857]">Make a hero</Link>
        </li>
      );
    }
    return (
      <li>
        <button type="button" disabled={!canAdd || locked} onClick={() => onPick({ kind: "hero", index })} aria-label="Add a hero"
          className="flex min-h-[176px] w-full flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-white/[0.18] text-[#A7ADD4] transition hover:border-[#FFA300]/70 hover:text-[#FFF1E8] disabled:opacity-40 disabled:hover:border-white/[0.18]">
          <Plus className="h-6 w-6" aria-hidden />
          <span className="text-[13px]">Add hero</span>
        </button>
      </li>
    );
  }
  const s = m.stats;
  return (
    <li className="flex flex-col rounded-[10px] border border-white/[0.1] bg-[#19223F] p-2">
      <button type="button" disabled={locked} onClick={() => onPick({ kind: "hero", index })} aria-label={`Swap ${m.hero.name}`}
        className="checker checker-sm block aspect-square overflow-hidden rounded-[7px] transition hover:ring-2 hover:ring-[#FFA300]/70 disabled:opacity-70">
        <SpriteImg s={m.hero} />
      </button>
      <button type="button" onClick={() => setDetails((d) => !d)} aria-expanded={details}
        title={`HP ${s.hp} · ATK ${s.atk} · DEF ${s.def}${s.heal ? ` · heals ${s.heal}` : ""}`}
        className="mt-1.5 flex min-h-10 flex-col items-start rounded-[6px] px-1 text-left hover:bg-white/[0.04]">
        <span className="text-[14px] font-semibold text-[#FFF1E8]">Power {s.power}</span>
        <span className="w-full truncate text-[11.5px] text-[#A7ADD4]">{ROLES[s.role].label}{m.hero.animated ? " · animated" : ""}{m.hero.hd ? " · HD" : ""}</span>
        {details && (
          <span className="mt-0.5 font-mono text-[11.5px] text-[#C8CCE8]">HP {s.hp} · ATK {s.atk} · DEF {s.def}{s.heal ? ` · heal ${s.heal}` : ""}</span>
        )}
      </button>
      <div className="mt-1 grid grid-cols-3 gap-1">
        {GEAR_SLOTS.map((g) => {
          const item = m[g];
          const Icon = GEAR_ICON[g];
          return (
            <button key={g} type="button" disabled={locked} onClick={() => onPick({ kind: g, index })}
              aria-label={item ? `${GEAR_LABEL[g]}: ${item.name}. Change` : `Empty ${GEAR_LABEL[g].toLowerCase()} slot`}
              title={item ? `${GEAR_LABEL[g]}: ${bonusText(item.bonus)}` : `${GEAR_LABEL[g]} (empty)`}
              className={`flex aspect-square min-h-10 items-center justify-center overflow-hidden rounded-[6px] transition disabled:opacity-60 ${item ? "checker checker-sm border border-white/[0.1] hover:ring-2 hover:ring-[#FFA300]/70" : "border border-dashed border-white/[0.18] text-[#7F86B5] hover:border-[#FFA300]/70 hover:text-[#FFF1E8]"}`}>
              {item ? <SpriteImg s={item} /> : <Icon className="h-4 w-4" aria-hidden />}
            </button>
          );
        })}
      </div>
    </li>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function PlayPage() {
  const [data, setData] = useState<PlayData | null>(null);
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [boardError, setBoardError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<PickerMode | null>(null);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [run, setRun] = useState<RunResponse | null>(null);
  const [replaying, setReplaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [skipToken, setSkipToken] = useState(0);
  const [progress, setProgress] = useState<StageProgress | null>(null);
  const [howto, setHowto] = useState(false);

  useEffect(() => {
    try { setHowto(localStorage.getItem(HOWTO_KEY) !== "1"); } catch { setHowto(true); }
  }, []);
  const toggleHowto = () => {
    setHowto((open) => {
      try { localStorage.setItem(HOWTO_KEY, open ? "1" : "0"); } catch { /* private mode: just don't remember */ }
      return !open;
    });
  };

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
  // Coming back to the tab: the board may have moved
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") void loadBoard(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadBoard]);

  const save = async (body: { slots: SlotIds[] } | { auto: true }) => {
    if (!data) return;
    setSaving(true);
    try {
      const res = await fetch("/api/play/party", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await readJson(res);
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Couldn't save your party.");
      setData((d) => (d ? { ...d, party: json.party as PartyMember[] } : d));
      setRun(null);
      setProgress(null);
    } catch (e) {
      toast({ title: "Party not saved", description: e instanceof Error ? e.message : "Try again in a moment.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const slots = useMemo(() => toSlots(data?.party ?? []), [data?.party]);

  const pick = (id: string) => {
    if (!picker) return;
    const next = picker.kind === "hero" ? setHero(slots, picker.index, id) : setGear(slots, picker.index, picker.kind, id);
    setPicker(null);
    void save({ slots: next });
  };
  const clear = () => {
    if (!picker) return;
    const next = picker.kind === "hero" ? removeHero(slots, picker.index) : setGear(slots, picker.index, picker.kind, null);
    setPicker(null);
    void save({ slots: next });
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
      const r = json as unknown as RunResponse;
      setRun(r);
      // The server read the board after storing this run, so it already includes it
      setBoard((b) => boardAfterRun(b, r.board));
      setBoardError(false);
      setData({ ...data, runsLeft: Number(r.runsLeft) });
      setReplaying(true);
      setSkipToken(0);
    } catch (e) {
      toast({ title: "Run not started", description: e instanceof Error ? e.message : "Try again in a moment.", variant: "destructive" });
    } finally {
      setStarting(false);
    }
  };

  const runRef = useRef<RunResponse | null>(null);
  useEffect(() => { runRef.current = run; }, [run]);
  const onDone = useCallback(() => {
    setReplaying(false);
    const r = runRef.current;
    if (r) setData((d) => (d ? { ...d, records: r.records } : d));
  }, []);

  const share = async (floor: number) => {
    const text = `I reached floor ${floor} in Sprite Dungeon with sprites I made on sprite-lab.com/play`;
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

  const stageMembers = run?.members ?? data?.party ?? [];
  const maxHp = stageMembers.reduce((a, m) => a + m.stats.hp, 0);
  const hud = progress ?? { floor: 0, hp: maxHp, maxHp, line: "", done: false };
  const partyPower = (data?.party ?? []).reduce((a, m) => a + m.stats.power, 0);
  const summary = useMemo(() => (run ? summarizeRun(run.log) : null), [run]);

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

  const figures = data.roster.filter((s) => s.slot === "hero");
  const hasItems = data.roster.some((s) => s.slot !== "hero");
  const locked = replaying || saving;
  const canRun = data.party.length > 0 && data.runsLeft > 0 && !starting && !replaying && !saving;
  const rec = data.records;
  const mvp = run && summary ? run.members[summary.mvp] : null;
  const theme = hud.floor > 0 ? themeFor(hud.floor) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-4 sm:px-6 sm:pt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="font-display text-[26px] font-semibold leading-tight text-[#FFF1E8] sm:text-[34px]">Sprite Dungeon</h1>
        <p className="text-[13px] text-[#A7ADD4]">
          Best <span className="font-mono text-[#FFF1E8]">{rec.bestEver ?? "–"}</span>
          {" · "}This week <span className="font-mono text-[#FFF1E8]">{rec.bestWeek ?? "–"}</span>
          {" · "}<span className="font-mono text-[#FFF1E8]">{rec.runsWeek}</span> runs this week
        </p>
      </div>

      {/* HUD */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="shrink-0 font-display text-[19px] font-semibold text-[#FFF1E8]">
          {hud.floor > 0 ? `Floor ${hud.floor}` : "Ready"}
          {theme && <span className="ml-2 text-[13px] font-normal text-[#A7ADD4]">{theme.name}</span>}
        </p>
        <HpBar hp={hud.hp} max={hud.maxHp} />
      </div>

      {/* Stage */}
      <div className="mt-2">
        <DungeonStage members={stageMembers} log={run?.log ?? null} speed={speed} skipToken={skipToken} onProgress={setProgress} onDone={onDone} />
      </div>
      <p className="mt-1.5 min-h-[20px] truncate text-[13px] text-[#C8CCE8]" aria-live="polite">{progress?.line ?? ""}</p>

      {/* The one main action */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {replaying ? (
          <>
            <button type="button" onClick={() => setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length])}
              className="inline-flex h-12 flex-1 items-center justify-center gap-1.5 rounded-[8px] border border-white/[0.14] px-4 text-[15px] text-[#FFF1E8] hover:bg-white/[0.06] sm:flex-none">
              <FastForward className="h-4 w-4" aria-hidden /> Speed ×{speed}
            </button>
            <button type="button" onClick={() => setSkipToken((n) => n + 1)}
              className="inline-flex h-12 flex-1 items-center justify-center gap-1.5 rounded-[8px] border border-white/[0.14] px-4 text-[15px] text-[#FFF1E8] hover:bg-white/[0.06] sm:flex-none">
              <SkipForward className="h-4 w-4" aria-hidden /> Skip
            </button>
          </>
        ) : (
          <button type="button" onClick={() => void startRun()} disabled={!canRun}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-[#FFA300] px-6 text-[16px] font-semibold text-[#131A31] transition hover:bg-[#FFB733] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
            {starting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Swords className="h-5 w-5" aria-hidden />}
            {data.runsLeft === 0 ? "No runs left today" : data.party.length === 0 ? "Add a hero to start" : `Start run · ${data.runsLeft} left`}
          </button>
        )}
        <div className="ml-auto hidden items-center gap-1 sm:flex" aria-label={`${data.runsLeft} of ${data.runsPerDay} runs left today`}>
          {Array.from({ length: data.runsPerDay }, (_, i) => (
            <span key={i} className={`h-3 w-3 rounded-[3px] ${i < data.runsLeft ? "bg-[#FFA300]" : "bg-white/[0.1]"}`} />
          ))}
        </div>
      </div>

      {/* Result card */}
      {run && summary && !replaying && (
        <section aria-label="Run result" className="mt-4 rounded-[12px] border border-white/[0.1] bg-[#19223F] p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-display text-[24px] font-semibold text-[#FFF1E8]">Floor {summary.floor}</p>
            {run.newBest && <p className="rounded-[6px] bg-[#00E436]/15 px-2.5 py-1 text-[13px] font-semibold text-[#00E436]">New personal best!</p>}
          </div>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-[12.5px] text-[#A7ADD4]">This week</p>
              <p className="text-[15px] text-[#FFF1E8]">
                {run.board.me
                  ? run.rankBefore && run.rankBefore !== run.board.me.rank ? <>#{run.rankBefore} → <span className="font-semibold">#{run.board.me.rank}</span></> : <>#{run.board.me.rank} of {run.board.players}</>
                  : "Not ranked yet"}
              </p>
            </div>
            {mvp && (
              <div className="flex items-center gap-2">
                <span className="checker checker-sm h-11 w-11 shrink-0 overflow-hidden rounded-[6px]"><SpriteImg s={mvp.hero} /></span>
                <div className="min-w-0">
                  <p className="text-[12.5px] text-[#A7ADD4]">MVP · {summary.mvpDamage.toLocaleString()} damage</p>
                  <p className="truncate text-[14px] text-[#FFF1E8]">{mvp.hero.name}</p>
                </div>
              </div>
            )}
            <div>
              <p className="text-[12.5px] text-[#A7ADD4]">Stopped by</p>
              <p className="text-[15px] text-[#FFF1E8]">{summary.stoppedBy}</p>
            </div>
          </div>
          {run.tip && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-[#FFA300]/40 bg-[#FFA300]/[0.06] px-3 py-2">
              <p className="flex items-start gap-2 text-[13.5px] text-[#FFF1E8]"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#FFC857]" aria-hidden />{run.tip.text}</p>
              <Link href={run.tip.href} className="inline-flex h-10 items-center rounded-[7px] bg-[#FFA300] px-3.5 text-[13.5px] font-semibold text-[#131A31] hover:bg-[#FFB733]">{run.tip.action}</Link>
            </div>
          )}
          <button type="button" onClick={() => void share(summary.floor)}
            className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-[7px] border border-white/[0.14] px-3.5 text-[14px] text-[#FFF1E8] hover:bg-white/[0.06]">
            <Share2 className="h-4 w-4" aria-hidden /> Share
          </button>
        </section>
      )}

      {/* How it works (first visit, collapsible) */}
      <section className="mt-5 rounded-[12px] border border-white/[0.08] bg-[#19223F]">
        <button type="button" onClick={toggleHowto} aria-expanded={howto}
          className="flex min-h-11 w-full items-center justify-between gap-2 px-4 text-left text-[14px] font-semibold text-[#FFF1E8]">
          How it works
          <ChevronDown className={`h-4 w-4 text-[#A7ADD4] transition ${howto ? "rotate-180" : ""}`} aria-hidden />
        </button>
        {howto && (
          <div className="px-4 pb-4">
            <ol className="grid gap-2 sm:grid-cols-3">
              {[
                ["Pick heroes", "Your characters and creatures are the party. Up to 4."],
                ["Equip gear", "Your weapons, armor and other items power them up."],
                ["Start a run", `${data.runsPerDay} runs a day. The server plays it, you watch.`],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-3 rounded-[8px] bg-[#212B4E] p-3">
                  <span className="font-display text-[20px] font-semibold leading-none text-[#FFA300]">{i + 1}</span>
                  <span><span className="block text-[14px] font-semibold text-[#FFF1E8]">{t}</span><span className="block text-[12.5px] text-[#C8CCE8]">{d}</span></span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-[13px] leading-relaxed text-[#C8CCE8]">
              New sprites you make become new heroes and loot. Animated sprites are 40% stronger, HD sprites 15%, and mixing art styles gives a small team bonus.
              Weekly board resets Monday 00:00 UTC: the top {BADGE_RANKS} get a badge, the top 3 get {PRIZE_CREDITS.join(" / ")} credits if they made at least {PRIZE_MIN_PAID_GENERATIONS} paid generations that week.
            </p>
          </div>
        )}
      </section>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* Party */}
        <section aria-labelledby="party-h">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="party-h" className="font-display text-[21px] font-semibold text-[#FFF1E8]">
              Your party {data.party.length > 0 && <span className="ml-1 text-[14px] font-normal text-[#FFC857]">Power {partyPower}</span>}
            </h2>
            <div className="flex items-center gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin text-[#A7ADD4]" aria-label="Saving party" />}
              {figures.length > 0 && (
                <button type="button" onClick={() => void save({ auto: true })} disabled={locked}
                  className="inline-flex h-10 items-center gap-1.5 rounded-[7px] border border-white/[0.14] px-3.5 text-[13.5px] text-[#FFF1E8] hover:bg-white/[0.06] disabled:opacity-50">
                  <Sparkles className="h-4 w-4 text-[#FFC857]" aria-hidden /> Auto-equip
                </button>
              )}
            </div>
          </div>
          {figures.length === 0 ? (
            <div className="mt-3 rounded-[10px] border border-dashed border-white/[0.16] bg-[#19223F] p-5">
              <p className="text-[15px] font-semibold text-[#FFF1E8]">Make a character or creature — it joins your party</p>
              <p className="mt-1 text-[13.5px] text-[#A7ADD4]">
                {hasItems ? "Your weapons, armor and items are ready as loot; they need a hero to carry them." : "Weapons, armor and items you make become their gear."}
              </p>
              <Link href={`/generate?categoryId=${HERO_MAKE_CATEGORY}`} className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-[7px] bg-[#FFA300] px-4 text-[14px] font-semibold text-[#131A31] hover:bg-[#FFB733]">
                <Wand2 className="h-4 w-4" aria-hidden /> Create a character
              </Link>
            </div>
          ) : (
            <>
              <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {Array.from({ length: PARTY_SIZE }, (_, i) => (
                  <HeroCard key={data.party[i]?.hero.id ?? `empty-${i}`} m={data.party[i]} index={i} locked={locked}
                    canAdd={i === data.party.length} hasFigures={figures.length > data.party.length} onPick={setPicker} />
                ))}
              </ul>
              <p className="mt-2 text-[12.5px] text-[#A7ADD4]">Tap a hero to swap it, a slot to change its gear, Power for the details.</p>
            </>
          )}
        </section>

        <div>
          {/* Leaderboard */}
          <section aria-labelledby="board-h">
            <h2 id="board-h" className="font-display text-[21px] font-semibold text-[#FFF1E8]">This week</h2>
            {!board ? (
              boardError ? (
                <div className="mt-3 text-[14px] text-[#C8CCE8]">
                  Couldn&apos;t load the leaderboard.{" "}
                  <button type="button" onClick={() => void loadBoard()} className="inline-flex h-10 items-center underline underline-offset-2">Try again</button>
                </div>
              ) : <Loader2 className="mt-4 h-5 w-5 animate-spin text-[#A7ADD4]" aria-label="Loading leaderboard" />
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
            {board && boardError && (
              <p className="mt-1 text-[12.5px] text-[#A7ADD4]">
                Couldn&apos;t refresh the board.{" "}
                <button type="button" onClick={() => void loadBoard()} className="inline-flex min-h-10 items-center underline underline-offset-2">Try again</button>
              </p>
            )}
          </section>

          {data.trophies.length > 0 && (
            <section aria-labelledby="trophy-h" className="mt-8">
              <h2 id="trophy-h" className="font-display text-[21px] font-semibold text-[#FFF1E8]">Your badges</h2>
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

      {picker && (
        <Picker mode={picker} roster={data.roster} slots={slots} members={data.party} onPick={pick} onClear={clear} onClose={() => setPicker(null)} />
      )}
    </div>
  );
}
