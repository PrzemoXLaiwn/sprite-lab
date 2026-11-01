// =============================================================================
// ST Packs — client calls to /api/st-packs/* and the download URL builder
// =============================================================================
// Thin fetch wrappers so the components only deal with typed results and one
// readable error string. Every error the API returns is `{ error: string }`.
// =============================================================================

import type { StExpressionSet } from "@/config/st-expressions";
import type { StFraming, StMatteMode } from "@/config/st-packs";
import type { DownloadKind, JobListItem, JobSnapshot } from "@/lib/st-packs/types";

const BASE = "/api/st-packs";

export interface BaseCandidate {
  id: string;
  url: string;
}

export interface CreateJobBody {
  baseId: string;
  source: "upload" | "prompt";
  prompt?: string;
  styleNotes?: string;
  framing: StFraming;
  expressionSet: StExpressionSet;
  labels?: string[];
  width: number;
  height: number;
  options: {
    gif: boolean;
    png: boolean;
    grid: boolean;
    readme: boolean;
    matteMode?: StMatteMode;
    videoSeconds?: number;
    lossless?: boolean;
  };
}

export class StApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "StApiError";
    this.status = status;
  }
}

/** One plain sentence for a failed request. The server message wins when it has one. */
function messageFor(status: number, data: unknown, fallback: string): string {
  const serverMsg =
    data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string"
      ? (data as { error: string }).error.trim()
      : "";
  if (serverMsg) return serverMsg;
  if (status === 401) return "Your session has expired. Refresh the page and sign in again.";
  if (status === 403) return "Admins only. Your account can't use ST Packs.";
  if (status === 404) return "ST Packs is switched off on this deployment (ST_PACKS_ENABLED), or the item no longer exists.";
  if (status === 413) return "That file is too large. The limit is 10 MB.";
  if (status === 429) return "Going a bit fast. Wait a few seconds and try again.";
  if (status === 503) return `${fallback} The service is at capacity. Try again in a minute.`;
  if (status >= 500) return `${fallback} The service had a hiccup. Try again.`;
  return fallback;
}

async function request<T>(input: string, init: RequestInit, fallback: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(input, { cache: "no-store", ...init });
  } catch {
    throw new StApiError(`${fallback} Check your connection.`, 0);
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) throw new StApiError(messageFor(res.status, data, fallback), res.status);
  return data as T;
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

/** Turns any thrown value into the message the UI shows. */
export function errorText(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

// ── Bases ────────────────────────────────────────────────────────────────────

export async function uploadBase(file: File, framing: StFraming): Promise<BaseCandidate[]> {
  const form = new FormData();
  form.append("file", file);
  form.append("framing", framing);
  const data = await request<{ bases: BaseCandidate[] }>(`${BASE}/base`, { method: "POST", body: form }, "Couldn't upload the image.");
  return Array.isArray(data?.bases) ? data.bases : [];
}

export async function generateBases(body: { prompt: string; styleNotes?: string; framing: StFraming; count: 2 | 3 | 4 }): Promise<BaseCandidate[]> {
  const data = await request<{ bases: BaseCandidate[] }>(`${BASE}/base`, json(body), "Couldn't generate a base.");
  return Array.isArray(data?.bases) ? data.bases : [];
}

// ── Jobs ─────────────────────────────────────────────────────────────────────

export async function createJob(body: CreateJobBody): Promise<string> {
  const data = await request<{ id: string }>(`${BASE}/jobs`, json(body), "Couldn't start the job.");
  if (!data?.id) throw new StApiError("The server didn't return a job id.", 0);
  return data.id;
}

export async function listJobs(): Promise<JobListItem[]> {
  const data = await request<{ jobs: JobListItem[] }>(`${BASE}/jobs`, { method: "GET" }, "Couldn't load the job history.");
  return Array.isArray(data?.jobs) ? data.jobs : [];
}

/** Reads the snapshot; the server also advances the job on every read. */
export function getJob(id: string): Promise<JobSnapshot> {
  return request<JobSnapshot>(`${BASE}/jobs/${encodeURIComponent(id)}`, { method: "GET" }, "Couldn't load the job.");
}

export function regenerateExpression(jobId: string, label: string, from: "edit" | "video" | "post"): Promise<JobSnapshot> {
  return request<JobSnapshot>(
    `${BASE}/jobs/${encodeURIComponent(jobId)}/expressions/${encodeURIComponent(label)}/regenerate`,
    json({ from }),
    `Couldn't regenerate ${label}.`,
  );
}

export function cancelJob(jobId: string): Promise<JobSnapshot> {
  return request<JobSnapshot>(`${BASE}/jobs/${encodeURIComponent(jobId)}/cancel`, { method: "POST" }, "Couldn't cancel the job.");
}

// ── Downloads / previews ─────────────────────────────────────────────────────

/**
 * Download (and <img>) URL for a job file. `label` is required for webp /
 * still / edit; `v` busts the browser cache after a regenerate.
 */
export function downloadUrl(jobId: string, kind: DownloadKind, opts: { label?: string; v?: string } = {}): string {
  const params = new URLSearchParams({ kind });
  if (opts.label) params.set("label", opts.label);
  if (opts.v) params.set("v", opts.v);
  return `${BASE}/jobs/${encodeURIComponent(jobId)}/download?${params.toString()}`;
}
