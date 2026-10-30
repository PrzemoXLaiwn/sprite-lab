"use client";

import type { CancellationReport } from "@/lib/admin";

function outcomeLabel(outcome: string): string {
  if (outcome === "cancelled") return "Cancelled";
  if (outcome === "retained") return "Kept plan";
  if (outcome === "in_progress") return "Not finished";
  return outcome;
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CancellationPanel({
  report,
  error,
}: {
  report: CancellationReport | null;
  error: string | null;
}) {
  return (
    <section className="mb-6 rounded-2xl border border-white/[0.06] bg-[#19223F] p-4 sm:mb-8 sm:p-6">
      <div className="mb-4">
        <h2 className="text-[15px] font-semibold text-white">Cancellations</h2>
        <p className="mt-1 text-[13px] text-[#9AA1CC]">
          Attempts, the reason given, and whether they cancelled or stayed.
        </p>
      </div>

      {error && <p className="text-[13px] text-red-200">{error}</p>}

      {report && (
        <>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Count label="Cancelled" value={report.totals.cancelled} />
            <Count label="Kept plan" value={report.totals.retained} />
            <Count label="Not finished" value={report.totals.inProgress} />
          </div>

          {report.byReason.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {report.byReason.map((row) => (
                <li
                  key={row.reason ?? "none"}
                  className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[12px] text-[#C8CCE8]"
                >
                  {row.label} · {row.count}
                </li>
              ))}
            </ul>
          )}

          {report.recent.length > 0 ? (
            <ul className="mt-4 divide-y divide-white/[0.06]">
              {report.recent.map((row) => (
                <li key={row.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-[#FFF1E8]">{row.name || row.email}</p>
                    {row.name && <p className="truncate text-[12px] text-[#9AA1CC]">{row.email}</p>}
                    <p className="mt-1 text-[12px] text-[#C8CCE8]">
                      {row.planLabel} · {row.reasonLabel}
                      {row.offerShown ? ` · offered ${row.offerShown}` : ""}
                      {row.offerAccepted ? " · offer accepted" : ""}
                    </p>
                    {row.note && <p className="mt-1 line-clamp-2 text-[12px] text-[#9AA1CC]">{row.note}</p>}
                  </div>
                  <div className="shrink-0 sm:text-right">
                    <p className="text-[13px] font-medium text-white">{outcomeLabel(row.outcome)}</p>
                    <p className="font-mono text-[11px] text-[#8A92BF]">{formatWhen(row.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-white/[0.08] py-8 text-center text-[13px] text-[#9AA1CC]">
              No cancellation attempts yet.
            </p>
          )}
        </>
      )}
    </section>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#212B4E] px-3 py-3">
      <p className="text-[12px] text-[#9AA1CC]">{label}</p>
      <p className="mt-1 font-sans text-[22px] font-semibold tabular-nums text-white">{value}</p>
    </div>
  );
}
