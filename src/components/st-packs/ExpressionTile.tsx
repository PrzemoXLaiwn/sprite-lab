"use client";

// One expression of a job: preview (animated WebP once done, the edited still
// before that), status, QA verdict, timings, cost and the per-tile actions.

import { Download, Film, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import type { ExpressionSnapshot, QaResult } from "@/lib/st-packs/types";
import { isProviderBalanceMessage, PROVIDER_BALANCE_MESSAGE } from "@/lib/provider-balance";
import { downloadUrl } from "./api";
import { StatusChip, expressionStage, formatMs, formatUsd, isExpressionBusy, labelTitle } from "./ui";

export type PreviewMode = "checker" | "chat";

function qaTooltip(qa: QaResult): string {
  const m = qa.metrics;
  const lines = [
    qa.flags.length ? `Flags: ${qa.flags.join("; ")}` : "All checks passed",
    `drift ${m.drift_px.toFixed(2)} px · head x range ${m.head_x_range}`,
    `seam ${m.seam.toFixed(2)} · consistency med ${m.cons_med.toFixed(2)} / max ${m.cons_max.toFixed(2)}`,
    `alpha coverage ${(m.alpha_coverage * 100).toFixed(1)}% · corner opaque ${(m.corner_opaque * 100).toFixed(1)}% · edge touch ${m.edge_touch ? "yes" : "no"}`,
    `halo ${m.halo.toFixed(1)}`,
    `${m.frames} frames @ ${m.fps} fps · ${m.width}×${m.height} · ${(m.bytes / 1024).toFixed(0)} KB`,
  ];
  return lines.join("\n");
}

/** Fake SillyTavern message strip so halos can be judged against chat chrome. */
function ChatStrip() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-1 border-t border-white/[0.08] bg-[#171a2b]/95 px-2 pb-2 pt-1.5">
      <div className="h-1.5 w-1/3 rounded-full bg-[#FFA300]/60" />
      <div className="h-1.5 w-11/12 rounded-full bg-white/[0.18]" />
      <div className="h-1.5 w-3/4 rounded-full bg-white/[0.12]" />
    </div>
  );
}

export function ExpressionTile({ jobId, expression: e, previewMode, pending, onRegenerate, onVideoOnly, onRetry }: {
  jobId: string;
  expression: ExpressionSnapshot;
  previewMode: PreviewMode;
  pending: boolean;
  onRegenerate: () => void;
  onVideoOnly: () => void;
  onRetry: () => void;
}) {
  const stage = expressionStage(e);
  const busy = pending || isExpressionBusy(e.status);
  const v = e.updatedAt;
  const previewSrc =
    e.status === "done" && e.has.webp ? downloadUrl(jobId, "webp", { label: e.label, v })
    : e.has.edit ? downloadUrl(jobId, "edit", { label: e.label, v })
    : null;
  const isAnimated = previewSrc !== null && e.status === "done" && e.has.webp;
  const t = e.timings;
  const totalMs = (t.edit ?? 0) + (t.video ?? 0) + (t.post ?? 0);
  const timingTitle = `edit ${formatMs(t.edit)} · video ${formatMs(t.video)} · post ${formatMs(t.post)}`;
  const title = labelTitle(e.label);

  return (
    <li className="sl-card flex min-w-0 flex-col gap-2 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="truncate text-[13px] font-semibold text-white" title={`${title} · attempt ${e.attempt}`}>{title}</h3>
        <StatusChip tone={stage.tone} title={e.attempt > 1 ? `attempt ${e.attempt}` : undefined}>{stage.label}</StatusChip>
      </div>

      <div className={`relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-white/[0.06] ${previewMode === "checker" ? "checker" : "bg-[#0f1220]"}`}>
        {previewSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewSrc} alt={isAnimated ? `${title}, animated` : `${title}, edited still`} decoding="async" loading="lazy"
            className="absolute inset-0 h-full w-full object-contain" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[11px] text-[#6F77A6]">
            {busy ? <Loader2 className="h-5 w-5 animate-spin text-[#FFA300]" aria-label="Working" /> : "No preview yet"}
          </div>
        )}
        {previewSrc && !isAnimated && (
          <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-full bg-black/55 px-1.5 py-0.5 font-mono text-[9.5px] text-[#C8CCE8]">still</span>
        )}
        {previewMode === "chat" && <ChatStrip />}
      </div>

      <div className="flex items-center justify-between gap-2 font-mono text-[11px] tabular-nums text-[#A7ADD4]">
        <span title={timingTitle}>{totalMs > 0 ? formatMs(totalMs) : "—"}</span>
        <span title="Reported cost so far">{formatUsd(e.costUsd)}</span>
      </div>

      {e.qa && (
        <StatusChip tone={e.qa.flagged ? "warn" : "ok"} title={qaTooltip(e.qa)}>
          {e.qa.flagged ? "flagged" : "QA ok"}
        </StatusChip>
      )}
      {e.qa?.flagged && e.qa.flags.length > 0 && (
        <p className="text-[11px] leading-snug text-amber-200" title={e.qa.flags.join("; ")}>{e.qa.flags.join("; ")}</p>
      )}

      {e.error && e.status === "failed" && (
        <p role="alert" className="line-clamp-3 text-[11px] leading-snug text-red-200" title={e.error}>
          {isProviderBalanceMessage(e.error) ? PROVIDER_BALANCE_MESSAGE : e.error}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-1.5">
        {e.status !== "failed" && (
          <button type="button" className="btn btn-secondary btn-icon" aria-label={`Regenerate ${title}`} title="Regenerate (new edit + video)"
            disabled={busy} onClick={onRegenerate}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
          </button>
        )}
        {e.has.edit && (
          <button type="button" className="btn btn-secondary btn-icon" aria-label={`Video only for ${title}`} title="Video only (keep the edit)"
            disabled={busy} onClick={onVideoOnly}>
            <Film className="h-4 w-4" aria-hidden />
          </button>
        )}
        {e.status === "failed" && (
          <button type="button" className="btn btn-secondary btn-icon" aria-label={`Retry ${title}`} title={e.has.video ? "Retry (post-processing only, free)" : e.has.edit ? "Retry (new video)" : "Retry (new edit + video)"}
            disabled={pending} onClick={onRetry}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RotateCcw className="h-4 w-4" aria-hidden />}
          </button>
        )}
        {e.has.webp && (
          <a className="btn btn-secondary btn-icon ml-auto" aria-label={`Download ${e.label}.webp`} title={`Download ${e.label}.webp`}
            href={downloadUrl(jobId, "webp", { label: e.label, v })} download={`${e.label}.webp`}>
            <Download className="h-4 w-4" aria-hidden />
          </a>
        )}
      </div>
    </li>
  );
}
