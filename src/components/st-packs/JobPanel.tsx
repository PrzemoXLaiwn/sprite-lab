"use client";

// Right / bottom panel: the open job's header (status, elapsed, cost, step
// timings, downloads, cancel), the preview backdrop toggle and the tile grid.

import { useEffect, useRef, useState } from "react";
import { Ban, Download, Loader2 } from "lucide-react";
import type { JobSnapshot } from "@/lib/st-packs/types";
import { zipButtonState } from "@/lib/st-packs/downloads";
import { ErrorNote, InfoNote } from "@/components/tools/ToolWorkspace";
import { downloadUrl } from "./api";
import { ExpressionTile, type PreviewMode } from "./ExpressionTile";
import { SIZE_LABEL, StatusChip, formatMs, formatUsd, jobStage, useNow } from "./ui";

/** Second click inside this window is ignored. The first click already started the browser download. */
const DOWNLOAD_LOCK_MS = 10_000;

function DownloadLink({ href, filename, mode, children, light }: {
  href: string; filename: string; mode: "off" | "preparing" | "link"; children: React.ReactNode; light?: boolean;
}) {
  const cls = `btn ${light ? "btn-light" : "btn-secondary"}`;
  const lock = useRef(false);
  const timer = useRef<number | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);
  if (mode === "preparing") {
    return (
      <button type="button" className={cls} disabled aria-busy="true">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Preparing ZIP…
      </button>
    );
  }
  if (mode !== "link") {
    return <button type="button" className={cls} disabled><Download className="h-4 w-4" aria-hidden />{children}</button>;
  }
  return (
    <a
      className={cls}
      href={href}
      download={filename}
      aria-disabled={busy || undefined}
      onClick={(e) => {
        if (lock.current) {
          e.preventDefault();
          return;
        }
        lock.current = true;
        setBusy(true);
        if (timer.current !== null) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
          lock.current = false;
          timer.current = null;
          setBusy(false);
        }, DOWNLOAD_LOCK_MS);
      }}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
      {busy ? "Downloading…" : children}
    </a>
  );
}

function Stat({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="min-w-0" title={title}>
      <dt className="text-[11px] text-[#8A92BF]">{label}</dt>
      <dd className="truncate font-mono text-[13px] font-semibold tabular-nums text-[#FFF1E8]">{value}</dd>
    </div>
  );
}

export function JobPanel({ job, loading, error, previewMode, onPreviewMode, cancelling, onCancel, pending, onExpressionAction }: {
  job: JobSnapshot | null;
  loading: boolean;
  error: string;
  previewMode: PreviewMode;
  onPreviewMode: (m: PreviewMode) => void;
  cancelling: boolean;
  onCancel: () => void;
  pending: Record<string, boolean>;
  onExpressionAction: (label: string, from: "edit" | "video" | "post") => void;
}) {
  const running = job?.status === "running";
  const now = useNow(running);

  if (!job) {
    return (
      <section aria-label="Job" className="sl-panel flex min-h-[260px] flex-col items-center justify-center gap-2 p-6 text-center">
        {loading ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-[#FFA300]" aria-hidden />
            <p role="status" className="text-[13px] text-[#C8CCE8]">Loading job…</p>
          </>
        ) : (
          <>
            <p className="text-[15px] font-semibold text-white">No job open</p>
            <p className="max-w-[320px] text-[12.5px] text-[#9AA1CC]">Choose a base and generate a pack, or open one from the history below.</p>
          </>
        )}
        {error && <div className="w-full max-w-[420px] text-left"><ErrorNote>{error}</ErrorNote></div>}
      </section>
    );
  }

  const stage = jobStage(job.status);
  const startedMs = job.startedAt ? new Date(job.startedAt).getTime() : NaN;
  const endMs = job.finishedAt ? new Date(job.finishedAt).getTime() : running && now ? now : NaN;
  const elapsedMs = Number.isFinite(startedMs) && Number.isFinite(endMs) ? Math.max(0, endMs - startedMs) : null;

  const failed = job.expressions.filter((e) => e.status === "failed").length;
  const flagged = job.expressions.filter((e) => e.flagged).length;
  const done = job.expressions.filter((e) => e.status === "done").length;
  const zipState = zipButtonState({
    status: job.status,
    hasZip: job.has.zip,
    doneCount: done,
    error: job.error,
  });
  const zipMode = zipState === "preparing" ? "preparing" : zipState === "ready" || zipState === "fallback" ? "link" : "off";
  const extrasReady = zipState === "ready" || zipState === "fallback";
  const isDone = job.status === "done";
  const short = job.id.length > 10 ? `${job.id.slice(0, 8)}…` : job.id;

  return (
    <section aria-label="Job" className="sl-panel flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h2 className="font-display text-[17px] font-semibold tracking-tight text-white">Job <span className="font-mono text-[12px] font-normal text-[#8A92BF]" title={job.id}>{short}</span></h2>
          <StatusChip tone={stage.tone}>{stage.label}</StatusChip>
          <span className="font-mono text-[12px] tabular-nums text-[#C8CCE8]" title={job.startedAt ? `started ${job.startedAt}` : "not started"}>
            {elapsedMs === null ? (running ? "…" : "not started") : `${formatMs(elapsedMs)} elapsed`}
          </span>
          {running && <span className="text-[11px] text-[#8A92BF]">{done}/{job.expressions.length} done · refreshes every 4 s</span>}
          {zipState === "preparing" && <span role="status" className="text-[11px] text-[#8A92BF]">Preparing the ZIP · refreshes every 4 s</span>}
        </div>
        <p className="text-[12px] text-[#A7ADD4]">
          {job.labels.length} expression{job.labels.length === 1 ? "" : "s"} · {SIZE_LABEL(job.width, job.height)} · {job.framing === "bust" ? "bust/face" : "waist-up"} ·{" "}
          {job.options.matteMode === "runware" ? "Runware matte" : "key matte"} · {job.options.lossless ? "lossless WebP" : "WebP q90"} · {job.options.videoSeconds} s video
          {job.prompt ? <> · <span className="text-[#C8CCE8]" title={job.prompt}>“{job.prompt.length > 60 ? `${job.prompt.slice(0, 60)}…` : job.prompt}”</span></> : " · uploaded base"}
        </p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          <Stat label="Cost" value={formatUsd(job.costUsd)} title={`reported ${formatUsd(job.costUsd)}, estimate ${formatUsd(job.estCostUsd)}`} />
          <Stat label="Edit" value={formatMs(job.timings.edit)} title="Total wall time of the image edits" />
          <Stat label="Video" value={formatMs(job.timings.video)} title="Total wall time of the video clips" />
          <Stat label="Post" value={formatMs(job.timings.post)} title="Total wall time of matte, loop and encode" />
        </dl>
        <p className="-mt-1 font-mono text-[11px] text-[#8A92BF]">reported {formatUsd(job.costUsd)} (est. {formatUsd(job.estCostUsd)})</p>

        <div className="flex flex-wrap items-center gap-2">
          <DownloadLink light mode={zipMode} href={downloadUrl(job.id, "zip")} filename={`st-pack-${job.id}.zip`}>Download ZIP</DownloadLink>
          {job.has.grid && (
            <DownloadLink mode="link" href={downloadUrl(job.id, "grid")} filename={`st-pack-${job.id}-grid.gif`}>Download preview grid</DownloadLink>
          )}
          {job.options.png && isDone && (
            <DownloadLink mode={extrasReady ? "link" : "off"} href={downloadUrl(job.id, "png")} filename={`st-pack-${job.id}-png.zip`}>Download PNG pack</DownloadLink>
          )}
          {job.options.gif && isDone && (
            <DownloadLink mode={extrasReady ? "link" : "off"} href={downloadUrl(job.id, "gif")} filename={`st-pack-${job.id}-gif.zip`}>Download GIF pack</DownloadLink>
          )}
          {running && (
            <button type="button" className="btn btn-danger sm:ml-auto" disabled={cancelling} onClick={onCancel}>
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Ban className="h-4 w-4" aria-hidden />}
              {cancelling ? "Cancelling…" : "Cancel"}
            </button>
          )}
        </div>

        {flagged > 0 && (
          <InfoNote tone="warning">
            {flagged} expression{flagged === 1 ? " is" : "s are"} flagged by QA. Look at {flagged === 1 ? "it" : "them"} before shipping the ZIP; regenerate what looks wrong.
          </InfoNote>
        )}
        {failed > 0 && job.status !== "running" && (
          <InfoNote tone="warning">
            {failed} expression{failed === 1 ? "" : "s"} failed. Retry {failed === 1 ? "it" : "them"} or ship the ZIP without.
          </InfoNote>
        )}
        {job.error && <ErrorNote>{job.error}</ErrorNote>}
        {error && <ErrorNote>{error}</ErrorNote>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-[#C8CCE8]">Expressions</h3>
        <div className="sl-track" role="group" aria-label="Preview background">
          <button type="button" className="sl-seg" aria-pressed={previewMode === "checker"} onClick={() => onPreviewMode("checker")}>Checker</button>
          <button type="button" className="sl-seg" aria-pressed={previewMode === "chat"} onClick={() => onPreviewMode("chat")}>Chat</button>
        </div>
      </div>

      {job.expressions.length === 0 ? (
        <p className="text-[12.5px] text-[#9AA1CC]">No expressions on this job yet.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {job.expressions.map((e) => (
            <ExpressionTile key={e.id} jobId={job.id} expression={e} previewMode={previewMode} pending={!!pending[e.label]}
              onRegenerate={() => onExpressionAction(e.label, "edit")}
              onVideoOnly={() => onExpressionAction(e.label, "video")}
              // Retry from the last step that has something to work with: free when the clip exists
              onRetry={() => onExpressionAction(e.label, e.has.video ? "post" : e.has.edit ? "video" : "edit")} />
          ))}
        </ul>
      )}
    </section>
  );
}
