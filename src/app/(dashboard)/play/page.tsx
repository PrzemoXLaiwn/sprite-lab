"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FastForward, HelpCircle, Info, Loader2, SkipForward, Swords, Volume2, VolumeX } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { TowerStage, type StageProgress, type TowerFlag } from "@/components/play/TowerStage";
import { PartyPanel, Picker, SkillSheet, WhySheet, type PickerMode } from "@/components/play/PartyPanel";
import { BLESSING_ICONS, BlessingChoice, DungeonIntro, ResultReport } from "@/components/play/RunOverlays";
import { ELEMENT_DEFS, type SkillSlot } from "@/lib/dungeon/config";
import { Badges, DamageSheet, LeaderboardPanel, TowerWeekPanel } from "@/components/play/InfoPanels";
import { boardAfterRun, removeHero, setGear, setHero, setSkill, toSlots } from "@/components/play/party-edit";
import { loadMuted, play, setMuted as storeMuted, unlockAudio } from "@/components/play/sfx";
import type { SlotIds } from "@/lib/dungeon/party";
import type { DungeonSprite, Leaderboard, PartyMember, Records, RunView, Trophy } from "@/lib/dungeon/store";
import type { ZoneWeek } from "@/lib/dungeon/tower";
import type { Upgrade } from "@/lib/dungeon/upgrades";
import { UpgradeCards } from "@/components/play/UpgradeCards";
import { ShareCardSheet } from "@/components/play/ShareCard";
import { FUNNEL, track } from "@/lib/analytics";

const INTRO_KEY = "sl:dungeon-intro-seen";
const introSeen = () => { try { return localStorage.getItem(INTRO_KEY) === "1"; } catch { return true; } };
const markIntroSeen = () => { try { localStorage.setItem(INTRO_KEY, "1"); } catch { /* storage blocked */ } };

interface PlayData {
  roster: DungeonSprite[];
  party: PartyMember[];
  active: RunView | null;
  tower: { week: string; zones: ZoneWeek[] };
  records: Records;
  trophies: Trophy[];
  runsPerDay: number;
  runsLeft: number;
  upgrades?: Upgrade[];
}

type Phase = "idle" | "replaying" | "choosing" | "result";
const SPEEDS = [1, 2, 4];

async function readJson(res: Response): Promise<Record<string, unknown>> {
  return (await res.json().catch(() => ({}))) as Record<string, unknown>;
}

export default function PlayPage() {
  const [data, setData] = useState<PlayData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [boardError, setBoardError] = useState(false);
  const [view, setView] = useState<RunView | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [bestBefore, setBestBefore] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState<PickerMode | null>(null);
  const [why, setWhy] = useState<number | null>(null);
  const [skillSheet, setSkillSheet] = useState<{ index: number; slot: SkillSlot } | null>(null);
  const [damageInfo, setDamageInfo] = useState(false);
  const [speed, setSpeed] = useState(2);
  const [skipToken, setSkipToken] = useState(0);
  const [progress, setProgress] = useState<StageProgress | null>(null);
  const [muted, setMutedState] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [intro, setIntro] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const partyRef = useRef<HTMLElement>(null);
  // Analytics: each event once per real transition, never again on a re-render
  const sent = useRef(new Set<string>());
  const once = useCallback((key: string, event: string, props?: Record<string, string | number | boolean>) => {
    if (sent.current.has(key)) return;
    sent.current.add(key);
    track(event, props);
  }, []);

  useEffect(() => {
    setMutedState(loadMuted());
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const on = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

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
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Couldn't open the tower.");
      const d = json as unknown as PlayData;
      setData(d);
      setError(null);
      const firstVisit = d.records.bestEver === null && d.records.runsWeek === 0;
      once("viewed", FUNNEL.dungeonViewed, { first_visit: firstVisit, party: d.party.length, resumable: Boolean(d.active) });
      if (d.upgrades?.length) once("upgrades", FUNNEL.dungeonUpgradeShown, { count: d.upgrades.length, kinds: d.upgrades.map((u) => u.kind).join(",") });
      if (firstVisit && !d.active && !introSeen()) setIntro(true);
      if (d.active) {
        once(`resume:${d.active.id}`, FUNNEL.dungeonRunResumed, { floor: d.active.floor, at: d.active.status });
        // An unfinished climb: continue from its blessing choice
        setView(d.active);
        setBestBefore(d.records.bestEver);
        setPhase(d.active.status === "choosing" ? "choosing" : "result");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open the tower.");
    }
  }, [once]);

  useEffect(() => { void load(); void loadBoard(); }, [load, loadBoard]);
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") void loadBoard(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadBoard]);

  const slots = useMemo(() => toSlots(data?.party ?? []), [data?.party]);

  const save = async (body: { slots: SlotIds[] } | { auto: true }) => {
    setSaving(true);
    try {
      const res = await fetch("/api/play/party", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await readJson(res);
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Couldn't save your party.");
      setData((d) => (d ? { ...d, party: json.party as PartyMember[] } : d));
    } catch (e) {
      toast({ title: "Party not saved", description: e instanceof Error ? e.message : "Try again in a moment.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

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

  const applyView = (v: RunView) => {
    setView(v);
    setSkipToken(0);
    if (v.board) setBoard((b) => boardAfterRun(b, v.board));
    if (v.floors.length) setPhase("replaying");
    else setPhase(v.status === "choosing" ? "choosing" : "result");
  };

  const startClimb = async () => {
    if (!data) return;
    unlockAudio();
    setStarting(true);
    try {
      const res = await fetch("/api/play/run", { method: "POST" });
      const json = await readJson(res);
      if (!res.ok) {
        if (json.code === "DAILY_LIMIT") setData({ ...data, runsLeft: 0 });
        throw new Error(typeof json.error === "string" ? json.error : "Couldn't start the climb.");
      }
      if (!json.resumed) setBestBefore(data.records.bestEver);
      if (intro) { setIntro(false); markIntroSeen(); }
      const v = json.view as RunView;
      if (json.resumed) once(`resume:${v.id}`, FUNNEL.dungeonRunResumed, { floor: v.floor, at: v.status });
      else once(`start:${v.id}`, FUNNEL.dungeonRunStarted, { first_run: data.records.bestEver === null, runs_left: Number(json.runsLeft) });
      setData({ ...data, runsLeft: Number(json.runsLeft) });
      applyView(json.view as RunView);
    } catch (e) {
      toast({ title: "Climb not started", description: e instanceof Error ? e.message : "Try again in a moment.", variant: "destructive" });
    } finally {
      setStarting(false);
    }
  };

  const choose = async (blessingId: string) => {
    if (!view) return;
    unlockAudio();
    play(view.offer?.find((b) => b.id === blessingId)?.tier === "epic" ? "pickEpic" : "pick");
    setBusy(blessingId);
    try {
      const res = await fetch("/api/play/run/choose", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ runId: view.id, blessingId }),
      });
      const json = await readJson(res);
      if (!res.ok) {
        if (res.status === 409) { await load(); }
        throw new Error(typeof json.error === "string" ? json.error : "Couldn't continue the climb.");
      }
      once(`bless:${view.id}:${view.floor}`, FUNNEL.dungeonBlessingSelected, { floor: view.floor, blessing: blessingId });
      applyView(json.view as RunView);
    } catch (e) {
      toast({ title: "Blessing not applied", description: e instanceof Error ? e.message : "Try again in a moment.", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  // A blessing choice on screen, and a finished climb (with its real report)
  useEffect(() => {
    if (!view) return;
    if (phase === "choosing") once(`shown:${view.id}:${view.floor}`, FUNNEL.dungeonBlessingShown, { floor: view.floor });
    if (phase === "result" && view.report) {
      once(`done:${view.id}`, FUNNEL.dungeonRunFinished, {
        floor: view.report.floor, new_best: view.report.newBest, boss_stop: view.report.bossStop, first_run: view.report.bestBefore === null,
      });
    }
  }, [phase, view, once]);

  const viewRef = useRef<RunView | null>(null);
  useEffect(() => { viewRef.current = view; }, [view]);
  const onDone = useCallback(() => {
    const v = viewRef.current;
    if (!v) return;
    if (v.status === "choosing") setPhase("choosing");
    else {
      setPhase("result");
      if (v.records) setData((d) => (d ? { ...d, records: v.records! } : d));
    }
  }, []);

  const toggleMute = () => {
    unlockAudio();
    const m = !muted;
    setMutedState(m);
    storeMuted(m);
  };

  const flags = useMemo<TowerFlag[]>(() => {
    const out: TowerFlag[] = [];
    if (data?.records.bestEver) out.push({ floor: data.records.bestEver, label: "Your best", you: true });
    for (const r of board?.top.slice(0, 3) ?? []) if (!r.you) out.push({ floor: r.floor, label: `#${r.rank} ${r.name.slice(0, 12)}`, you: false });
    return out;
  }, [data?.records.bestEver, board]);

  if (error && !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-[15px] text-[#C8CCE8]">{error}</p>
        <button type="button" onClick={() => void load()} className="mt-4 inline-flex h-10 items-center rounded-[7px] border border-white/[0.14] px-4 text-[14px] text-[#FFF1E8] hover:bg-white/[0.06]">Try again</button>
      </div>
    );
  }
  if (!data) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#A7ADD4]" aria-label="Loading the tower" /></div>;
  }

  const members = view && phase !== "idle" ? view.members : data.party;
  const figures = data.roster.filter((s) => s.slot === "hero").length;
  const hasItems = data.roster.some((s) => s.slot !== "hero");
  const inRun = phase === "replaying" || phase === "choosing";
  const hud = progress ?? { floor: 0, zone: "Entrance", hp: 0, maxHp: 0, combo: 0, line: "", done: true };
  const rec = data.records;
  const canStart = data.party.length > 0 && data.runsLeft > 0 && !starting && !saving;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-3 sm:px-6 sm:pt-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <div className="flex items-center gap-1">
          <h1 className="font-display text-[24px] font-semibold leading-none text-[#FFF1E8] sm:text-[30px]">Sprite Dungeon</h1>
          <button type="button" onClick={() => setIntro(true)} aria-label="How the Dungeon works" title="How the Dungeon works"
            className="btn btn-ghost btn-icon h-10 w-10"><HelpCircle className="h-5 w-5" aria-hidden /></button>
        </div>
        <dl className="flex gap-5 text-[12.5px] text-[#A7ADD4]">
          <div><dt>Best floor</dt><dd className="font-display text-[17px] text-[#FFF1E8]">{rec.bestEver ?? "–"}</dd></div>
          <div><dt>This week</dt><dd className="font-display text-[17px] text-[#FFF1E8]">{rec.bestWeek ?? "–"}</dd></div>
          <div><dt>Climbs this week</dt><dd className="font-display text-[17px] text-[#FFF1E8]">{rec.runsWeek}</dd></div>
        </dl>
      </div>

      {/* The tower */}
      <section aria-label="The tower" className="relative mt-3 h-[62vh] min-h-[400px] max-h-[760px] overflow-hidden lg:h-[74vh] lg:max-h-[860px] rounded-[10px] border border-white/[0.1] bg-[#0B1022]">
        <TowerStage
          members={members}
          floors={phase === "replaying" && view ? view.floors : null}
          restFloor={view && phase !== "idle" ? view.floor : 0}
          restHp={view && phase !== "idle" ? view.hp : null}
          bestBefore={bestBefore}
          flags={flags}
          speed={speed}
          skipToken={skipToken}
          reducedMotion={reducedMotion}
          onProgress={setProgress}
          onDone={onDone}
        />

        {/* HUD */}
        <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-2">
          <div className="flex flex-col items-start gap-1">
            <div className="rounded-[6px] border border-white/[0.1] bg-[#131A31]/85 px-2.5 py-1.5">
              <p className="font-display text-[20px] font-semibold leading-none text-[#FFF1E8]">{hud.floor > 0 ? `Floor ${hud.floor}` : "Ground floor"}</p>
              <p className="mt-0.5 text-[12px] text-[#A7ADD4]">{hud.zone}</p>
            </div>
            {view && phase !== "idle" && view.blessings.length + view.buffs.length > 0 && (
              <ul className="pointer-events-auto flex max-w-[176px] flex-wrap gap-1" aria-label="Active blessings">
                {[...view.blessings, ...view.buffs].map((b) => {
                  const Icon = BLESSING_ICONS[b.icon] ?? Swords;
                  const color = b.element ? ELEMENT_DEFS[b.element].color : "#FFA300";
                  return (
                    <li key={b.id}>
                      <button type="button" title={`${b.name}: ${b.text}`} aria-label={`${b.name}: ${b.text}`}
                        onClick={() => toast({ title: b.name, description: b.text })}
                        className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-white/[0.1] bg-[#131A31]/85 hover:bg-[#212B4E]">
                        <Icon className="h-4 w-4" style={{ color }} aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 rounded-[6px] border border-white/[0.1] bg-[#131A31]/85 px-2.5 py-1.5">
            <div className="flex w-[132px] gap-[2px] sm:w-[180px]" role="progressbar" aria-label="Party HP" aria-valuemin={0} aria-valuemax={hud.maxHp} aria-valuenow={hud.hp}>
              {Array.from({ length: 16 }, (_, i) => (
                <span key={i} className={`h-2.5 flex-1 rounded-[1px] ${hud.maxHp > 0 && i < Math.ceil((hud.hp / hud.maxHp) * 16) ? "bg-[#00E436]" : "bg-white/[0.1]"}`} />
              ))}
            </div>
            <p className="text-[12px] text-[#A7ADD4]">
              {hud.combo >= 3 ? <span className="font-display text-[14px] font-semibold text-[#FFA300]">{hud.combo} hit combo</span> : "Party HP"}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="absolute inset-x-2 bottom-2 flex items-end justify-between gap-2">
          <div className="flex gap-2">
            {phase === "replaying" && (
              <>
                <button type="button" onClick={() => setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length])}
                  className="inline-flex h-11 items-center gap-1.5 rounded-[7px] border border-white/[0.14] bg-[#131A31]/90 px-3 text-[14px] text-[#FFF1E8] hover:bg-[#212B4E]">
                  <FastForward className="h-4 w-4" aria-hidden /> ×{speed}
                </button>
                <button type="button" onClick={() => setSkipToken((n) => n + 1)}
                  className="inline-flex h-11 items-center gap-1.5 rounded-[7px] border border-white/[0.14] bg-[#131A31]/90 px-3 text-[14px] text-[#FFF1E8] hover:bg-[#212B4E]">
                  <SkipForward className="h-4 w-4" aria-hidden /> Skip
                </button>
              </>
            )}
          </div>
          {phase === "idle" && (
            <button type="button" onClick={() => void startClimb()} disabled={!canStart}
              className="absolute bottom-0 left-1/2 inline-flex h-12 -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-[8px] bg-[#FFA300] px-6 text-[16px] font-semibold text-[#131A31] shadow-[0_4px_0_0_#B36F00] transition hover:bg-[#FFB733] active:translate-y-[2px] active:shadow-[0_2px_0_0_#B36F00] disabled:cursor-not-allowed disabled:opacity-60">
              {starting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Swords className="h-5 w-5" aria-hidden />}
              {data.runsLeft === 0 ? "No climbs left today" : data.party.length === 0 ? "Add a hero to climb" : `Start climb (${data.runsLeft} left)`}
            </button>
          )}
          <button type="button" onClick={toggleMute} aria-label={muted ? "Turn sound on" : "Turn sound off"} aria-pressed={!muted}
            className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-[7px] border border-white/[0.14] bg-[#131A31]/90 text-[#FFF1E8] hover:bg-[#212B4E]">
            {muted ? <VolumeX className="h-5 w-5" aria-hidden /> : <Volume2 className="h-5 w-5" aria-hidden />}
          </button>
        </div>

        {phase === "idle" && intro && (
          <DungeonIntro canStart={canStart} starting={starting} runsLeft={data.runsLeft}
            onStart={() => void startClimb()}
            onClose={() => { setIntro(false); markIntroSeen(); once("intro-dismissed", FUNNEL.dungeonIntroDismissed); }} />
        )}
        {phase === "choosing" && view?.offer && (
          <BlessingChoice floor={view.floor} offer={view.offer} chosen={view.blessings} busy={busy} onChoose={(id) => void choose(id)} />
        )}
        {phase === "result" && view?.report && (
          <ResultReport report={view.report} members={view.members} runsLeft={data.runsLeft} starting={starting}
            onTryAgain={() => { setPhase("idle"); setView(null); void startClimb(); }}
            onShare={() => setShareOpen(true)}
            onTip={(p) => { setPhase("idle"); setView(null); setPicker({ kind: p.slot, index: p.index }); }}
            onClose={() => { setPhase("idle"); setView(null); partyRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" }); }} />
        )}
      </section>
      <p className="mt-1.5 min-h-[20px] truncate text-[13px] text-[#C8CCE8]" aria-live="polite">{progress?.line ?? ""}</p>
      {phase === "idle" && data.upgrades && (
        <UpgradeCards upgrades={data.upgrades} members={data.party} onPicker={(p) => setPicker({ kind: p.slot, index: p.index })} />
      )}

      <div className="mt-4 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <section ref={partyRef} aria-labelledby="party-h">
          <h2 id="party-h" className="font-display text-[20px] font-semibold text-[#FFF1E8]">Your party</h2>
          <p className="mb-2 text-[13px] text-[#A7ADD4]">Characters and creatures you made are heroes; weapons, armor and items are their gear. New sprites join as you make them.</p>
          <PartyPanel members={data.party} figures={figures} hasItems={hasItems} locked={inRun} saving={saving}
            onPick={setPicker} onWhy={setWhy} onAuto={() => void save({ auto: true })} onSkill={(index, slot) => setSkillSheet({ index, slot })} />
        </section>

        <div className="space-y-7">
          <section aria-labelledby="tower-h">
            <div className="flex items-center justify-between gap-2">
              <h2 id="tower-h" className="font-display text-[20px] font-semibold text-[#FFF1E8]">This week&apos;s tower</h2>
              <button type="button" onClick={() => setDamageInfo(true)} className="inline-flex h-10 items-center gap-1.5 rounded-[7px] px-2 text-[13px] text-[#C8CCE8] hover:bg-white/[0.06]">
                <Info className="h-4 w-4" aria-hidden /> How damage works
              </button>
            </div>
            <p className="text-[12.5px] text-[#A7ADD4]">The same tower for everyone until Monday. Bring weapons of the elements each zone is weak to.</p>
            <TowerWeekPanel zones={data.tower.zones} />
          </section>
          <section aria-labelledby="board-h">
            <h2 id="board-h" className="font-display text-[20px] font-semibold text-[#FFF1E8]">Leaderboard</h2>
            <LeaderboardPanel board={board} error={boardError} onRetry={() => void loadBoard()} />
          </section>
          {data.trophies.length > 0 && (
            <section aria-labelledby="badges-h">
              <h2 id="badges-h" className="font-display text-[20px] font-semibold text-[#FFF1E8]">Your badges</h2>
              <Badges trophies={data.trophies} />
            </section>
          )}
        </div>
      </div>

      {picker && <Picker mode={picker} roster={data.roster} slots={slots} members={data.party} onPick={pick} onClear={clear} onClose={() => setPicker(null)} />}
      {why !== null && data.party[why] && (
        <WhySheet m={data.party[why]} onClose={() => setWhy(null)} onEquip={(slot) => { const i = why; setWhy(null); setPicker({ kind: slot, index: i }); }} />
      )}
      {damageInfo && <DamageSheet onClose={() => setDamageInfo(false)} />}
      {shareOpen && view?.report && <ShareCardSheet report={view.report} members={view.members} onClose={() => setShareOpen(false)} />}
      {skillSheet && data.party[skillSheet.index] && (
        <SkillSheet m={data.party[skillSheet.index]} slot={skillSheet.slot} onClose={() => setSkillSheet(null)}
          onAssign={(id) => { const k = skillSheet; setSkillSheet(null); void save({ slots: setSkill(slots, k.index, k.slot, id) }); }} />
      )}
    </div>
  );
}
