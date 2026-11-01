import { createElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { JobSnapshot } from "@/lib/st-packs/types";
import { JobPanel } from "./JobPanel";

vi.mock("./ExpressionTile", () => ({ ExpressionTile: () => null }));
vi.mock("@/components/tools/ToolWorkspace", () => ({
  ErrorNote: ({ children }: { children: ReactNode }) => createElement("p", null, children),
  InfoNote: ({ children }: { children: ReactNode }) => createElement("p", null, children),
}));

function snapshot(over: { status: JobSnapshot["status"]; hasZip: boolean; error?: string | null; finishedAgoMs?: number }): JobSnapshot {
  const finishedAt = over.status === "running" ? null : new Date(Date.now() - (over.finishedAgoMs ?? 0)).toISOString();
  return {
    id: "job1abcdefg",
    status: over.status,
    source: "upload",
    prompt: null,
    styleNotes: null,
    framing: "waist",
    expressionSet: "custom",
    labels: ["joy"],
    width: 720,
    height: 960,
    options: { gif: true, png: true, grid: false, readme: true, matteMode: "key", motion: "subtle", videoModel: "vidu:3@2", keyColour: "#00FF00", videoSeconds: 4, lossless: false },
    estCostUsd: 1,
    costUsd: 1,
    error: over.error ?? null,
    createdAt: "2026-11-01T00:00:00.000Z",
    startedAt: "2026-11-01T00:00:00.000Z",
    finishedAt,
    workerLeaseUntil: null,
    has: { base: true, zip: over.hasZip, grid: false },
    timings: { edit: 0, video: 0, post: 0 },
    expressions: [{
      id: "e1",
      label: "joy",
      status: "done",
      attempt: 1,
      flagged: false,
      qa: null,
      costUsd: 1,
      timings: {},
      error: null,
      frames: 60,
      bytes: 1,
      has: { edit: true, video: true, webp: true, gif: false, png: true },
      updatedAt: "2026-11-01T00:03:00.000Z",
      lockedUntil: null,
    }],
  };
}

const noop = () => {};

function html(job: JobSnapshot) {
  return renderToStaticMarkup(createElement(JobPanel, {
    job,
    loading: false,
    error: "",
    previewMode: "checker",
    onPreviewMode: noop,
    cancelling: false,
    onCancel: noop,
    pending: {},
    onExpressionAction: noop,
  }));
}

describe("JobPanel downloads", () => {
  it("disables the zip control and says it is preparing until the file is stored", () => {
    const preparing = html(snapshot({ status: "done", hasZip: false }));
    expect(preparing).toContain("Preparing ZIP…");
    expect(preparing).toContain("Preparing the ZIP · refreshes every 4 s");
    expect(preparing).not.toContain("download?kind=zip");
    expect(preparing).not.toContain("download?kind=png");

    const ready = html(snapshot({ status: "done", hasZip: true }));
    expect(ready).toContain("Download ZIP");
    expect(ready).toContain("download?kind=zip");
    expect(ready).toContain("download?kind=png");
    expect(ready).not.toContain("Preparing ZIP…");
  });

  it("keeps the zip disabled while the job is running and offers the fallback link after a packaging error", () => {
    const running = html(snapshot({ status: "running", hasZip: false }));
    expect(running).toContain("Download ZIP");
    expect(running).not.toContain("download?kind=zip");
    expect(running).not.toContain("Preparing ZIP…");

    const failed = html(snapshot({ status: "done", hasZip: false, error: "Packaging failed: storage" }));
    expect(failed).toContain("download?kind=zip");
    expect(failed).not.toContain("Preparing ZIP…");

    const stuck = html(snapshot({ status: "done", hasZip: false, finishedAgoMs: 30_000 }));
    expect(stuck).toContain("download?kind=zip");
    expect(stuck).toContain("download?kind=png");
    expect(stuck).not.toContain("Preparing ZIP…");
  });
});
