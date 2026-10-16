"use client";

import { Trophy } from "lucide-react";
import {
  BADGE_RANKS, BLESSING_EVERY, CRIT_MULTIPLIER, ELEMENTS, ELEMENT_DEFS, PRIZE_CREDITS, PRIZE_MIN_PAID_GENERATIONS, RESIST_MULTIPLIER,
  WEAK_MULTIPLIER,
} from "@/lib/dungeon/config";
import type { Leaderboard, Trophy as TrophyRow } from "@/lib/dungeon/store";
import type { ZoneWeek } from "@/lib/dungeon/tower";
import { ElementTag, Sheet } from "./Sheet";

const BADGE_LABEL: Record<string, string> = { gold: "1st place", silver: "2nd place", bronze: "3rd place", top10: "Top 10" };
const BADGE_COLOR: Record<string, string> = { gold: "#FFA300", silver: "#C8CCE8", bronze: "#D08A4E", top10: "#29ADFF" };

export function TowerWeekPanel({ zones }: { zones: ZoneWeek[] }) {
  return (
    <ol className="mt-2 overflow-hidden rounded-[8px] border border-white/[0.08] bg-[#19223F]">
      {zones.map((z) => (
        <li key={z.id} className="grid grid-cols-[64px_1fr] gap-x-3 border-b border-white/[0.06] px-3 py-2 last:border-b-0">
          <span className="font-mono text-[12.5px] text-[#A7ADD4]">{z.to ? `${z.from}–${z.to}` : `${z.from}+`}</span>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-x-2 text-[14px] text-[#FFF1E8]">{z.name} <ElementTag e={z.element} small /></p>
            <p className="text-[12.5px] text-[#A7ADD4]">
              {z.weakTo.length ? <>Weak to {z.weakTo.map((e) => ELEMENT_DEFS[e].label).join(" and ")}</> : "No weakness"}
              {z.resists.length ? <>, resists {z.resists.map((e) => ELEMENT_DEFS[e].label).join(" and ")}</> : null}. Boss: {z.boss}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function LeaderboardPanel({ board, error, onRetry }: { board: Leaderboard | null; error: boolean; onRetry: () => void }) {
  if (!board) {
    return error
      ? <p className="mt-2 text-[14px] text-[#C8CCE8]">Couldn&apos;t load the leaderboard. <button type="button" onClick={onRetry} className="inline-flex h-10 items-center underline underline-offset-2">Try again</button></p>
      : <p className="mt-2 text-[13px] text-[#A7ADD4]">Loading the board…</p>;
  }
  return (
    <>
      {board.top.length === 0 ? (
        <p className="mt-2 rounded-[8px] border border-white/[0.08] bg-[#19223F] p-4 text-[14px] text-[#C8CCE8]">No climbs yet this week. Be the first flag on the tower.</p>
      ) : (
        <ol className="mt-2 overflow-hidden rounded-[8px] border border-white/[0.08] bg-[#19223F]">
          {board.top.slice(0, 10).map((r) => (
            <li key={r.rank} className={`flex items-center gap-3 border-b border-white/[0.06] px-3 py-2 last:border-b-0 ${r.you ? "bg-[#FFA300]/[0.08]" : ""}`}>
              <span className="w-7 shrink-0 font-mono text-[13px] text-[#A7ADD4]">#{r.rank}</span>
              <span className={`min-w-0 flex-1 truncate text-[14px] ${r.you ? "font-semibold text-[#FFF1E8]" : "text-[#C8CCE8]"}`}>{r.name}{r.you ? " (you)" : ""}</span>
              {r.rank <= PRIZE_CREDITS.length && <Trophy className="h-4 w-4 shrink-0" style={{ color: BADGE_COLOR[["gold", "silver", "bronze"][r.rank - 1]] }} aria-label={`${PRIZE_CREDITS[r.rank - 1]} credit prize`} />}
              <span className="shrink-0 font-display text-[14px] text-[#FFF1E8]">{r.floor}</span>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-2 text-[12.5px] text-[#A7ADD4]">
        {board.me && board.me.rank > 10 ? <>You&apos;re #{board.me.rank} of {board.players}. </> : null}
        Resets Monday 00:00 UTC. Top {BADGE_RANKS} get a badge; the top 3 get {PRIZE_CREDITS.join(" / ")} credits with at least {PRIZE_MIN_PAID_GENERATIONS} paid generations that week.
      </p>
      {error && <p className="mt-1 text-[12.5px] text-[#A7ADD4]">Couldn&apos;t refresh the board. <button type="button" onClick={onRetry} className="inline-flex min-h-10 items-center underline underline-offset-2">Try again</button></p>}
    </>
  );
}

export function Badges({ trophies }: { trophies: TrophyRow[] }) {
  if (!trophies.length) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {trophies.map((t) => (
        <li key={t.week} className="flex items-center gap-2 rounded-[7px] border border-white/[0.08] bg-[#19223F] px-3 py-2">
          <Trophy className="h-4 w-4" style={{ color: BADGE_COLOR[t.badge] ?? "#29ADFF" }} aria-hidden />
          <span className="text-[13px] text-[#FFF1E8]">{BADGE_LABEL[t.badge] ?? `Rank ${t.rank}`}</span>
          <span className="font-mono text-[12px] text-[#A7ADD4]">{t.week}{t.credits > 0 ? `, +${t.credits} credits` : ""}</span>
        </li>
      ))}
    </ul>
  );
}

export function DamageSheet({ onClose }: { onClose: () => void }) {
  const els = ELEMENTS.filter((e) => e !== "neutral");
  return (
    <Sheet title="How damage works" onClose={onClose} wide>
      <div className="rounded-[8px] bg-[#212B4E] p-3 font-code text-[13px] leading-relaxed text-[#FFF1E8]">
        damage = ATK × 100 / (100 + DEF)<br />
        &nbsp;&nbsp;× element (weak ×{WEAK_MULTIPLIER}, resisted ×{RESIST_MULTIPLIER}, else ×1)<br />
        &nbsp;&nbsp;× crit (×{CRIT_MULTIPLIER})<br />
        &nbsp;&nbsp;× blessings<br />
        &nbsp;&nbsp;× a roll between 0.9 and 1.1
      </div>
      <ul className="mt-3 space-y-1 text-[13.5px] text-[#C8CCE8]">
        <li>Defence softens hits but never blocks them: 100 DEF halves damage.</li>
        <li>A hero attacks with its weapon&apos;s element, or its own if the weapon has none.</li>
        <li>Casters hit every enemy at 65%. Staves splash the other enemies. Blades and bows add crit chance.</li>
        <li>Every {BLESSING_EVERY} floors you pick a blessing for the rest of the climb. Bosses drop a chest with a small buff.</li>
        <li>The tower is the same for everyone this week; only the dice differ per climb.</li>
      </ul>
      <h3 className="mt-4 text-[14px] font-semibold text-[#FFF1E8]">Elements</h3>
      <table className="mt-1 w-full text-left text-[13px]">
        <thead><tr className="text-[12px] text-[#A7ADD4]"><th className="py-1 font-normal">Enemy</th><th className="py-1 font-normal">Weak to</th><th className="py-1 font-normal">Resists</th></tr></thead>
        <tbody>
          {els.map((e) => (
            <tr key={e} className="border-t border-white/[0.06]">
              <td className="py-1.5"><ElementTag e={e} /></td>
              <td className="py-1.5 text-[#FFF1E8]">{ELEMENT_DEFS[e].weakTo.map((x) => ELEMENT_DEFS[x].label).join(", ") || "–"}</td>
              <td className="py-1.5 text-[#C8CCE8]">{ELEMENT_DEFS[e].resists.map((x) => ELEMENT_DEFS[x].label).join(", ") || "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Sheet>
  );
}
