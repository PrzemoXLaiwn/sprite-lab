"use client";

// Collapsible list of the last 20 jobs with a neutral thumbnail and "Open".

import { useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import type { JobListItem } from "@/lib/st-packs/types";
import { downloadUrl } from "./api";
import { StatusChip, formatUsd, formatWhen, jobStage } from "./ui";

/** neutral.webp when the job finished, else the base; hides itself when neither loads. */
function HistoryThumb({ item }: { item: JobListItem }) {
  const finished = item.status === "done" || item.status === "partial";
  const [src, setSrc] = useState<string | null>(() =>
    finished ? downloadUrl(item.id, "webp", { label: "neutral" }) : item.hasBase ? downloadUrl(item.id, "base") : null,
  );
  return (
    <div className="checker checker-sm relative h-16 w-12 shrink-0 overflow-hidden rounded-lg border border-white/[0.06]">
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-contain"
          onError={() => setSrc((cur) => (cur && cur.includes("kind=webp") && item.hasBase ? downloadUrl(item.id, "base") : null))} />
      )}
    </div>
  );
}

export function JobHistory({ jobs, loading, error, currentId, openingId, onOpen }: {
  jobs: JobListItem[];
  loading: boolean;
  error: string;
  currentId: string | null;
  openingId: string | null;
  onOpen: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const panelId = "st-packs-history";

  return (
    <section aria-label="Job history" className="sl-panel p-2 sm:p-3">
      <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)}
        className="flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-2 text-left hover:bg-white/[0.04]">
        <span className="text-[13px] font-semibold text-[#C8CCE8]">
          Job history <span className="font-mono text-[11px] font-normal text-[#8A92BF]">{loading ? "…" : `(${jobs.length})`}</span>
        </span>
        <ChevronDown className={`h-4 w-4 text-[#8A92BF] transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {open && (
        <div id={panelId} className="px-1 pb-1 pt-2">
          {loading ? (
            <p role="status" className="flex items-center gap-2 px-1 py-2 text-[12.5px] text-[#9AA1CC]">
              <Loader2 className="h-4 w-4 animate-spin text-[#FFA300]" aria-hidden /> Loading history…
            </p>
          ) : error ? (
            <p role="alert" className="px-1 py-2 text-[12.5px] text-red-200">{error}</p>
          ) : jobs.length === 0 ? (
            <p className="px-1 py-2 text-[12.5px] text-[#9AA1CC]">No jobs yet. The last 20 will show up here.</p>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {jobs.map((item) => {
                const stage = jobStage(item.status);
                const isCurrent = item.id === currentId;
                const opening = item.id === openingId;
                return (
                  <li key={item.id} className="flex items-center gap-3 py-2.5">
                    <HistoryThumb key={`${item.id}:${item.status}`} item={item} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-[13px] font-medium text-white">{item.labels} expression{item.labels === 1 ? "" : "s"}</span>
                        <StatusChip tone={stage.tone}>{stage.label}</StatusChip>
                      </div>
                      <p className="mt-0.5 font-mono text-[11px] tabular-nums text-[#A7ADD4]">
                        {formatUsd(item.costUsd)} <span className="text-[#8A92BF]">(est. {formatUsd(item.estCostUsd)})</span> · {formatWhen(item.createdAt)}
                      </p>
                      <p className="truncate text-[11.5px] text-[#8A92BF]" title={item.prompt ?? undefined}>{item.prompt || "Uploaded base"}</p>
                    </div>
                    <button type="button" className="btn btn-secondary shrink-0" aria-current={isCurrent ? "true" : undefined}
                      disabled={opening} onClick={() => onOpen(item.id)} aria-label={`Open job ${item.id}`}>
                      {opening ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                      {isCurrent ? "Open now" : "Open"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
