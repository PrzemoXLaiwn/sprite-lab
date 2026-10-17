"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Award, Check, Clock, Coins, Film, FolderOpen, Heart, Loader2, Lock, Share2, Sparkles, UserRound, Wand2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import type { QuestState } from "@/lib/quests/progress";

interface Offer {
  kind: "welcome" | "launch";
  endsAt: string | null;
  packs: { id: string; name: string; price: number; credits: number; bonus: number }[];
}
interface QuestData {
  xp: number;
  level: number;
  title: string;
  levelXp: number;
  nextXp: number;
  quests: QuestState[];
  claimable: number;
  weekResetsAt: string;
  offer: Offer | null;
}

const PACK_SLUG: Record<string, string> = { PACK_25: "ember", PACK_75: "blaze", PACK_200: "inferno", PACK_500: "supernova" };

const ICONS: Record<string, typeof Sparkles> = {
  first_sprite: Wand2, first_animation: Film, first_project: FolderOpen, first_share: Share2, username: UserRound,
  week_sprites: Wand2, week_animations: Film, week_days: Clock,
};

function countdown(to: string, now: number): string {
  const ms = Math.max(0, new Date(to).getTime() - now);
  const d = Math.floor(ms / 86_400_000), h = Math.floor((ms % 86_400_000) / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000);
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
}

/** Segmented XP bar: 20 blocks, like a game HUD. */
function XpBar({ value, max }: { value: number; max: number }) {
  const filled = Math.round((Math.max(0, Math.min(value, max)) / Math.max(1, max)) * 20);
  return (
    <div className="flex gap-[3px]" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label="Experience to next level">
      {Array.from({ length: 20 }, (_, i) => (
        <span key={i} className={`h-3 flex-1 rounded-[2px] ${i < filled ? "bg-[#FFA300]" : "bg-white/[0.08]"}`} />
      ))}
    </div>
  );
}

function QuestRow({ q, onClaim, busy }: { q: QuestState; onClaim: (id: string) => void; busy: boolean }) {
  const Icon = ICONS[q.id] ?? Sparkles;
  const pct = Math.round((q.progress / q.goal) * 100);
  return (
    <li className="flex items-center gap-3 rounded-[10px] border border-white/[0.08] bg-[#19223F] p-3 sm:gap-4 sm:p-4">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] ${q.claimed ? "bg-[#00E436]/15 text-[#00E436]" : "bg-[#212B4E] text-[#FFC857]"}`}>
        {q.claimed ? <Check className="h-5 w-5" aria-hidden /> : <Icon className="h-5 w-5" aria-hidden />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-[#FFF1E8]">{q.title}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-[#A7ADD4]">{q.description}</p>
        {q.goal > 1 && !q.claimed && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
              <div className="h-full rounded-full bg-[#29ADFF]" style={{ width: `${pct}%` }} />
            </div>
            <span className="font-mono text-[12px] text-[#C8CCE8]">{q.progress}/{q.goal}</span>
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="font-mono text-[12.5px] font-semibold text-[#FFC857]">+{q.reward} cr</span>
        {q.claimed ? (
          <span className="text-[12.5px] text-[#A7ADD4]">Claimed</span>
        ) : q.complete ? (
          <button type="button" onClick={() => onClaim(q.id)} disabled={busy}
            className="inline-flex h-10 items-center gap-1.5 rounded-[7px] bg-[#FFA300] px-3.5 text-[13.5px] font-semibold text-[#131A31] transition hover:bg-[#FFB733] disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Coins className="h-4 w-4" aria-hidden />} Claim
          </button>
        ) : (
          <Link href={q.href} className="inline-flex h-10 items-center rounded-[7px] border border-white/[0.14] px-3.5 text-[13.5px] font-medium text-[#FFF1E8] transition hover:bg-white/[0.06]">
            Go
          </Link>
        )}
      </div>
    </li>
  );
}

const BADGE_ICONS: Record<string, typeof Award> = { sprites: Wand2, anims: Film, likes: Heart };

function Badge({ q, onClaim, busy }: { q: QuestState; onClaim: (id: string) => void; busy: boolean }) {
  const Icon = BADGE_ICONS[q.id.split("_")[0]] ?? Award;
  const color = q.color ?? "#FFA300";
  return (
    <li className={`flex flex-col items-center rounded-[10px] border p-3 text-center ${q.complete ? "border-white/[0.12] bg-[#19223F]" : "border-white/[0.06] bg-[#161E39]"}`}>
      <span className="checker checker-sm relative flex h-16 w-16 items-center justify-center rounded-[8px]">
        <span className="flex h-11 w-11 items-center justify-center rounded-[6px]" style={{ background: q.complete ? color : "#263260" }}>
          {q.complete ? <Icon className="h-6 w-6 text-[#131A31]" aria-hidden /> : <Lock className="h-5 w-5 text-[#8A92BF]" aria-hidden />}
        </span>
      </span>
      <p className={`mt-2 text-[13.5px] font-semibold ${q.complete ? "text-[#FFF1E8]" : "text-[#A7ADD4]"}`}>{q.title}</p>
      <p className="mt-0.5 text-[12px] leading-snug text-[#A7ADD4]">{q.description}</p>
      {!q.complete && <p className="mt-1.5 font-mono text-[12px] text-[#C8CCE8]">{q.progress.toLocaleString()}/{q.goal.toLocaleString()}</p>}
      {q.complete && !q.claimed && (
        <button type="button" onClick={() => onClaim(q.id)} disabled={busy}
          className="mt-2 inline-flex h-10 items-center gap-1.5 rounded-[7px] bg-[#FFA300] px-3 text-[13px] font-semibold text-[#131A31] transition hover:bg-[#FFB733] disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Coins className="h-4 w-4" aria-hidden />} Claim +{q.reward}
        </button>
      )}
      {q.claimed && <p className="mt-1.5 text-[12px] text-[#00E436]">Unlocked</p>}
    </li>
  );
}

export default function QuestsPage() {
  const [data, setData] = useState<QuestData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/quests", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't load your quests.");
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your quests.");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(id); }, []);

  const claim = async (id: string) => {
    setBusy(id);
    try {
      const res = await fetch("/api/quests/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't claim the reward.");
      toast({ title: `+${json.reward} credits added`, description: `You now have ${json.credits} credits.` });
      window.dispatchEvent(new Event("credits-updated"));
      window.dispatchEvent(new Event("quests-updated"));
      await load();
    } catch (e) {
      toast({ title: "Reward not claimed", description: e instanceof Error ? e.message : "Try again in a moment.", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  if (error && !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-[15px] text-[#C8CCE8]">{error}</p>
        <button type="button" onClick={() => void load()} className="mt-4 inline-flex h-10 items-center rounded-[7px] border border-white/[0.14] px-4 text-[14px] text-[#FFF1E8] hover:bg-white/[0.06]">Try again</button>
      </div>
    );
  }
  if (!data) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#A7ADD4]" aria-label="Loading quests" /></div>;
  }

  const onboarding = data.quests.filter((q) => q.kind === "onboarding");
  const weekly = data.quests.filter((q) => q.kind === "weekly");
  const milestones = data.quests.filter((q) => q.kind === "milestone");
  const onboardingDone = onboarding.every((q) => q.claimed);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-28 pt-6 sm:px-6 sm:pt-10">
      <h1 className="font-display text-[30px] font-semibold leading-tight text-[#FFF1E8] sm:text-[38px]">Quests</h1>
      <p className="mt-1.5 max-w-xl text-[14.5px] leading-relaxed text-[#A7ADD4]">
        Make things, level up and earn credits. Progress counts what you actually create, so it updates after each sprite or animation.
      </p>

      {/* Level */}
      <section className="mt-6 rounded-[12px] border border-white/[0.09] bg-[#19223F] p-4 sm:p-6" aria-label="Your level">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[13px] text-[#A7ADD4]">Creator level</p>
            <p className="font-display text-[44px] font-semibold leading-none text-[#FFF1E8]">{data.level}<span className="ml-3 align-middle text-[18px] text-[#FFC857]">{data.title}</span></p>
          </div>
          <p className="text-right font-mono text-[13px] text-[#C8CCE8]">{data.xp.toLocaleString()} XP<br /><span className="text-[#A7ADD4]">next at {data.nextXp.toLocaleString()}</span></p>
        </div>
        <div className="mt-4"><XpBar value={data.xp - data.levelXp} max={data.nextXp - data.levelXp} /></div>
        <p className="mt-2 text-[12.5px] text-[#A7ADD4]">Sprite +10 XP, animation +40, shared sprite +5, sprite saved to a project +2.</p>
      </section>

      {/* Offer */}
      {data.offer && (
        <section className="mt-4 rounded-[12px] border border-[#FFA300]/50 bg-[#FFA300]/[0.07] p-4 sm:p-5" aria-label="Credit pack offer">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[16px] font-semibold text-[#FFF1E8]">{data.offer.kind === "welcome" ? "Welcome offer: bonus credits on every pack" : "Launch bonus on every pack"}</h2>
            {data.offer.endsAt && <p className="font-mono text-[13px] text-[#FFC857]">ends in {countdown(data.offer.endsAt, now)}</p>}
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {data.offer.packs.map((p) => (
              <li key={p.id}>
                <Link href={`/checkout/credits/${PACK_SLUG[p.id] ?? p.id}`} className="flex h-full flex-col rounded-[8px] border border-white/[0.1] bg-[#19223F] p-3 transition hover:border-[#FFA300]/60">
                  <span className="text-[13px] text-[#A7ADD4]">{p.name}</span>
                  <span className="mt-0.5 text-[15px] font-semibold text-[#FFF1E8]">{p.credits} <span className="text-[#00E436]">+{p.bonus}</span> credits</span>
                  <span className="mt-1 font-mono text-[13px] text-[#C8CCE8]">£{(p.price / 100).toFixed(2)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Onboarding */}
      {!onboardingDone && (
        <section className="mt-8" aria-labelledby="q-start">
          <h2 id="q-start" className="font-display text-[22px] font-semibold text-[#FFF1E8]">Getting started</h2>
          <ul className="mt-3 space-y-2">{onboarding.map((q) => <QuestRow key={q.id} q={q} onClaim={claim} busy={busy === q.id} />)}</ul>
        </section>
      )}

      {/* Weekly */}
      <section className="mt-8" aria-labelledby="q-week">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="q-week" className="font-display text-[22px] font-semibold text-[#FFF1E8]">This week</h2>
          <p className="text-[13px] text-[#A7ADD4]">New quests in <span className="font-mono text-[#C8CCE8]">{countdown(data.weekResetsAt, now)}</span></p>
        </div>
        <ul className="mt-3 space-y-2">{weekly.map((q) => <QuestRow key={q.id} q={q} onClaim={claim} busy={busy === q.id} />)}</ul>
      </section>

      {/* Sprite Dungeon (not in the phone tab bar, so it's linked here) */}
      <Link href="/play" className="mt-8 flex min-h-12 items-center justify-between gap-3 rounded-[10px] border border-white/[0.09] bg-[#19223F] p-4 transition hover:border-[#FFA300]/60">
        <span>
          <span className="block text-[15px] font-semibold text-[#FFF1E8]">Sprite Dungeon</span>
          <span className="block text-[13px] text-[#A7ADD4]">Your sprites fight as a party. Weekly leaderboard with credit prizes.</span>
        </span>
        <span className="shrink-0 text-[13.5px] font-medium text-[#FFC857]">Play</span>
      </Link>

      {/* Achievements */}
      <section className="mt-8" aria-labelledby="q-badges">
        <h2 id="q-badges" className="font-display text-[22px] font-semibold text-[#FFF1E8]">Achievements</h2>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{milestones.map((q) => <Badge key={q.id} q={q} onClaim={claim} busy={busy === q.id} />)}</ul>
      </section>
    </div>
  );
}
