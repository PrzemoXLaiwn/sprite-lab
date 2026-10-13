"use client";

// =============================================================================
// Admin usage charts — tiny dependency-free SVG (stacked bars + lines)
// =============================================================================
// Dark categorical palette validated for CVD + contrast on #19223F (fixed
// order, never cycled). Recessive grid, one y-axis per chart, hover tooltip
// per day, legend always shown for ≥2 series, table view under each chart.
// =============================================================================

import { useEffect, useRef, useState } from "react";

export const SERIES_COLORS = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181"];

export interface Series {
  key: string;
  label: string;
  color: string;
  values: number[];
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, Math.floor(e.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** 1-2-5 nice ceiling so gridlines land on round numbers. */
function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

const shortDate = (d: string) => {
  const dt = new Date(d + "T00:00:00Z");
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
};

export function Legend({ series }: { series: Series[] }) {
  if (series.length < 2) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5 text-[12px] text-[#C8CCE8]">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: s.color }} aria-hidden />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

interface ChartProps {
  dates: string[];
  series: Series[];
  format?: (v: number) => string;
  height?: number;
  kind?: "bars" | "lines";
  title: string;
}

export function UsageChart({ dates, series, format = (v) => String(Math.round(v)), height = 180, kind = "bars", title }: ChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const padL = 40, padR = 8, padT = 10, padB = 22;
  const n = dates.length;
  const innerW = width - padL - padR, innerH = height - padT - padB;
  const step = innerW / Math.max(1, n);
  const totals = dates.map((_, i) => series.reduce((a, s) => a + (s.values[i] ?? 0), 0));
  const max = niceMax(kind === "bars" ? Math.max(...totals, 0) : Math.max(0, ...series.flatMap((s) => s.values)));
  const y = (v: number) => padT + innerH - (v / max) * innerH;
  const barW = Math.max(2, Math.min(28, step - 2));
  const labelEvery = Math.ceil(n / Math.max(2, Math.floor(innerW / 64)));
  const peak = totals.indexOf(Math.max(...totals));

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.floor((e.clientX - rect.left - padL) / step);
    setHover(i >= 0 && i < n ? i : null);
  };

  return (
    <figure className="min-w-0">
      <div ref={ref} className="relative">
        <svg width={width} height={height} role="img" aria-label={title} onPointerMove={onMove} onPointerLeave={() => setHover(null)} className="block touch-pan-y">
          {[0, 0.5, 1].map((t) => (
            <g key={t}>
              <line x1={padL} x2={width - padR} y1={y(max * t)} y2={y(max * t)} stroke="rgba(255,255,255,0.07)" />
              <text x={padL - 6} y={y(max * t) + 3.5} textAnchor="end" className="fill-[#8A92BF] font-mono text-[10px]">{format(max * t)}</text>
            </g>
          ))}
          {dates.map((d, i) => (i % labelEvery === 0 ? (
            <text key={d} x={padL + i * step + step / 2} y={height - 6} textAnchor="middle" className="fill-[#8A92BF] font-mono text-[10px]">{shortDate(d)}</text>
          ) : null))}
          {hover !== null && <rect x={padL + hover * step} y={padT} width={step} height={innerH} fill="rgba(255,255,255,0.04)" />}

          {kind === "bars" && dates.map((d, i) => {
            let acc = 0;
            const segs = series.filter((s) => (s.values[i] ?? 0) > 0);
            return (
              <g key={d}>
                {segs.map((s, si) => {
                  const v = s.values[i];
                  const y1 = y(acc), y0 = y(acc + v);
                  acc += v;
                  const top = si === segs.length - 1;
                  // 2px surface gap between stacked segments; rounded data-end on top only
                  const h = Math.max(1, y1 - y0 - (si > 0 ? 2 : 0));
                  const x = padL + i * step + (step - barW) / 2;
                  const r = top ? Math.min(4, barW / 2, h) : 0;
                  return r > 0 ? (
                    <path key={s.key} fill={s.color} d={`M${x},${y0 + h} V${y0 + r} Q${x},${y0} ${x + r},${y0} H${x + barW - r} Q${x + barW},${y0} ${x + barW},${y0 + r} V${y0 + h} Z`} />
                  ) : (
                    <rect key={s.key} x={x} y={y0} width={barW} height={h} fill={s.color} />
                  );
                })}
              </g>
            );
          })}
          {kind === "bars" && totals[peak] > 0 && (
            <text x={padL + peak * step + step / 2} y={y(totals[peak]) - 4} textAnchor="middle" className="fill-[#C8CCE8] font-mono text-[10px]">{format(totals[peak])}</text>
          )}

          {kind === "lines" && series.map((s) => (
            <g key={s.key}>
              <polyline fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"
                points={s.values.map((v, i) => `${padL + i * step + step / 2},${y(v)}`).join(" ")} />
              {hover !== null && <circle cx={padL + hover * step + step / 2} cy={y(s.values[hover] ?? 0)} r={4} fill={s.color} stroke="#19223F" strokeWidth={2} />}
            </g>
          ))}
        </svg>

        {hover !== null && (
          <div className="pointer-events-none absolute top-1 z-10 min-w-[140px] rounded-lg border border-white/[0.1] bg-[#212B4E]/95 px-3 py-2 shadow-xl"
            style={{ left: Math.min(Math.max(0, padL + hover * step + step / 2 - 70), width - 150) }}>
            <p className="mb-1 font-mono text-[11px] text-[#9AA1CC]">{shortDate(dates[hover])}</p>
            {series.map((s) => (
              <p key={s.key} className="flex items-center justify-between gap-3 text-[12px] text-[#C8CCE8]">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px]" style={{ background: s.color }} />{s.label}</span>
                <span className="font-mono tabular-nums text-white">{format(s.values[hover] ?? 0)}</span>
              </p>
            ))}
            {kind === "bars" && series.length > 1 && (
              <p className="mt-1 flex justify-between border-t border-white/[0.08] pt-1 text-[12px] text-[#9AA1CC]">
                <span>Total</span><span className="font-mono tabular-nums text-white">{format(totals[hover])}</span>
              </p>
            )}
          </div>
        )}
      </div>

      <details className="mt-2">
        <summary className="cursor-pointer select-none text-[11.5px] text-[#8A92BF] hover:text-[#C8CCE8]">Show as table</summary>
        <div className="mt-2 max-h-56 overflow-auto rounded-lg border border-white/[0.06]">
          <table className="w-full text-left text-[12px]">
            <thead className="sticky top-0 bg-[#161E39] text-[#9AA1CC]">
              <tr><th className="px-2.5 py-1.5 font-medium">Day</th>{series.map((s) => <th key={s.key} className="px-2.5 py-1.5 text-right font-medium">{s.label}</th>)}</tr>
            </thead>
            <tbody>
              {dates.map((d, i) => ({ d, i })).reverse().map(({ d, i }) => (
                <tr key={d} className="border-t border-white/[0.04] text-[#C8CCE8]">
                  <td className="px-2.5 py-1 font-mono">{d}</td>
                  {series.map((s) => <td key={s.key} className="px-2.5 py-1 text-right font-mono tabular-nums">{format(s.values[i] ?? 0)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
