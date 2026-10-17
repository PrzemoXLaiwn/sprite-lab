"use client";

import Link from "next/link";
import { Castle, Crown, Droplet, Eye, Feather, Flame, Heart, Loader2, RotateCcw, Share2, Shield, Sword, Target, Zap } from "lucide-react";
import { ELEMENT_DEFS, type GearSlot } from "@/lib/dungeon/config";
import type { BlessingCard, PartyMember } from "@/lib/dungeon/store";
import type { RunReport, RunTip } from "@/lib/dungeon/summary";
import { SpriteImg } from "./Sheet";

export const BLESSING_ICONS: Record<string, typeof Sword> = {
  sword: Sword, shield: Shield, heart: Heart, crown: Crown, castle: Castle, eye: Eye, target: Target, droplet: Droplet, feather: Feather, zap: Zap, flame: Flame,
};

export function BlessingChoice({ floor, offer, chosen, busy, onChoose }: {
  floor: number; offer: BlessingCard[]; chosen: BlessingCard[]; busy: string | null; onChoose: (id: string) => void;
}) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center overflow-y-auto bg-[#0B1022]/75 px-3 py-4" role="dialog" aria-modal="true" aria-labelledby="bless-h">
      <p className="text-[13px] text-[#C8CCE8]">Floor {floor} cleared</p>
      <h2 id="bless-h" className="mt-0.5 font-display text-[22px] font-semibold text-[#FFF1E8] sm:text-[26px]">Choose a blessing</h2>
      <ul className="mt-3 grid w-full max-w-[640px] grid-cols-3 gap-2 sm:gap-3">
        {offer.map((b) => {
          const Icon = BLESSING_ICONS[b.icon] ?? Sword;
          const color = b.element ? ELEMENT_DEFS[b.element].color : "#FFA300";
          return (
            <li key={b.id}>
              <button type="button" onClick={() => onChoose(b.id)} disabled={busy !== null}
                className="group flex h-full min-h-[170px] w-full flex-col items-center rounded-[8px] border border-white/[0.12] bg-[#19223F] px-2 pb-3 pt-0 text-center shadow-[0_4px_0_0_rgba(0,0,0,0.35)] transition hover:-translate-y-1 hover:border-[#FFA300]/80 focus-visible:-translate-y-1 disabled:opacity-60 disabled:hover:translate-y-0">
                <span className="h-[3px] w-full rounded-b-[2px]" style={{ background: color }} aria-hidden />
                <span className="mt-3 flex h-11 w-11 items-center justify-center rounded-[8px] bg-[#212B4E]" style={{ color }}>
                  {busy === b.id ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Icon className="h-5 w-5" aria-hidden />}
                </span>
                <span className="mt-2 font-display text-[14px] font-semibold leading-tight text-[#FFF1E8] sm:text-[16px]">{b.name}</span>
                <span className="mt-1 text-[12px] leading-snug text-[#C8CCE8] sm:text-[13px]">{b.text}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {chosen.length > 0 && (
        <p className="mt-3 max-w-[640px] text-center text-[12px] text-[#A7ADD4]">Active: {chosen.map((c) => c.name).join(", ")}</p>
      )}
    </div>
  );
}

export function ResultReport({ report, members, runsLeft, starting, onTryAgain, onShare, onTip, onClose }: {
  report: RunReport; members: PartyMember[]; runsLeft: number; starting: boolean;
  onTryAgain: () => void; onShare: () => void; onTip: (picker: { index: number; slot: GearSlot }) => void; onClose: () => void;
}) {
  const mvp = members[report.mvp];
  const fell = report.firstFallen !== null ? members[report.firstFallen] : null;
  const rank = report.rankAfter
    ? report.rankBefore && report.rankBefore !== report.rankAfter ? `#${report.rankBefore} → #${report.rankAfter}` : `#${report.rankAfter} of ${report.players}`
    : "Not ranked yet";
  const tipButton = (t: RunTip) => t.href
    ? <Link href={t.href} className="inline-flex h-10 shrink-0 items-center rounded-[7px] bg-[#212B4E] px-3 text-[13px] font-semibold text-[#FFC857] hover:bg-[#2A3560]">{t.action}</Link>
    : <button type="button" onClick={() => t.picker && onTip(t.picker)} className="inline-flex h-10 shrink-0 items-center rounded-[7px] bg-[#212B4E] px-3 text-[13px] font-semibold text-[#FFC857] hover:bg-[#2A3560]">{t.action}</button>;

  return (
    <div className="absolute inset-0 z-10 flex items-end justify-center overflow-y-auto bg-[#0B1022]/70 p-2 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="result-h">
      <div className="w-full max-w-[560px] rounded-[10px] border border-white/[0.12] bg-[#19223F] p-4 shadow-[0_6px_0_0_rgba(0,0,0,0.35)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[13px] text-[#A7ADD4]">Your party reached</p>
            <h2 id="result-h" className="font-display text-[40px] font-semibold leading-none text-[#FFF1E8]">Floor {report.floor}</h2>
          </div>
          {report.newBest && <span className="mt-1 rounded-[6px] bg-[#FFA300] px-2.5 py-1 font-display text-[14px] font-semibold text-[#131A31]">New best</span>}
        </div>
        {report.nearMiss.length > 0 && (
          <ul className="mt-2 space-y-0.5">
            {report.nearMiss.map((l) => <li key={l} className="text-[14px] text-[#FFC857]">{l}</li>)}
          </ul>
        )}

        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-white/[0.08] pt-3 text-[13.5px]">
          <div><dt className="text-[12px] text-[#A7ADD4]">This week</dt><dd className="text-[#FFF1E8]">{rank}</dd></div>
          <div><dt className="text-[12px] text-[#A7ADD4]">Stopped by</dt><dd className="text-[#FFF1E8]">{report.stoppedBy}</dd></div>
          {mvp && (
            <div className="flex items-center gap-2">
              <span className="checker checker-sm h-9 w-9 shrink-0 overflow-hidden rounded-[5px]"><SpriteImg s={mvp.hero} /></span>
              <div className="min-w-0"><dt className="text-[12px] text-[#A7ADD4]">MVP, {report.mvpDamage.toLocaleString("en")} damage</dt><dd className="truncate text-[#FFF1E8]">{mvp.hero.name}</dd></div>
            </div>
          )}
          {fell && (
            <div className="flex items-center gap-2">
              <span className="checker checker-sm h-9 w-9 shrink-0 overflow-hidden rounded-[5px] opacity-70"><SpriteImg s={fell.hero} /></span>
              <div className="min-w-0"><dt className="text-[12px] text-[#A7ADD4]">Fell first</dt><dd className="truncate text-[#FFF1E8]">{fell.hero.name}</dd></div>
            </div>
          )}
        </dl>

        {report.tips.length > 0 && (
          <ul className="mt-3 space-y-2">
            {report.tips.map((t) => (
              <li key={t.text} className="flex items-center justify-between gap-3 rounded-[8px] border border-[#FFA300]/35 bg-[#FFA300]/[0.06] px-3 py-2">
                <p className="text-[13.5px] leading-snug text-[#FFF1E8]">{t.text}</p>
                {tipButton(t)}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={onTryAgain} disabled={runsLeft === 0 || starting}
            className="inline-flex h-12 basis-full items-center justify-center gap-2 whitespace-nowrap rounded-[8px] bg-[#FFA300] px-5 text-[16px] sm:basis-auto sm:flex-1 font-semibold text-[#131A31] transition hover:bg-[#FFB733] disabled:cursor-not-allowed disabled:opacity-50">
            {starting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <RotateCcw className="h-5 w-5" aria-hidden />}
            {runsLeft === 0 ? "No climbs left today" : `Try again (${runsLeft} left)`}
          </button>
          <button type="button" onClick={onShare} className="inline-flex h-12 items-center gap-1.5 rounded-[8px] border border-white/[0.14] px-4 text-[14px] text-[#FFF1E8] hover:bg-white/[0.06]">
            <Share2 className="h-4 w-4" aria-hidden /> Share
          </button>
          <button type="button" onClick={onClose} className="inline-flex h-12 items-center rounded-[8px] px-3 text-[14px] text-[#C8CCE8] hover:bg-white/[0.06]">
            Edit party
          </button>
        </div>
      </div>
    </div>
  );
}
