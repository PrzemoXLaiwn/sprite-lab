"use client";

// =============================================================================
// ST Packs studio (admin-only, BETA)
// =============================================================================
// One screen: inputs on the left (base, framing, expression set, options,
// estimate, Generate), the open job on the right (status, downloads, tiles),
// history underneath. All state lives here; the API lives in ./api.ts.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { ST_DEFAULT_LABELS, resolveExpressionLabels } from "@/config/st-expressions";
import { ST_DEFAULT_SIZE } from "@/config/st-packs";
import { zipButtonState } from "@/lib/st-packs/downloads";
import type { JobListItem, JobSnapshot } from "@/lib/st-packs/types";
import {
  cancelJob, createJob, errorText, generateBases, getJob, listJobs, regenerateExpression, uploadBase,
  type BaseCandidate,
} from "./api";
import { InputsPanel, MAX_UPLOAD_BYTES, type ChosenBase, type InputsState } from "./InputsPanel";
import { JobPanel } from "./JobPanel";
import { JobHistory } from "./JobHistory";
import type { PreviewMode } from "./ExpressionTile";

const POLL_MS = 4000;

const INITIAL_INPUTS: InputsState = {
  source: "upload",
  prompt: "",
  styleNotes: "",
  framing: "waist",
  expressionSet: "default8",
  customLabels: [...ST_DEFAULT_LABELS],
  width: ST_DEFAULT_SIZE.width,
  height: ST_DEFAULT_SIZE.height,
  gif: true,
  png: true,
  grid: true,
  readme: true,
  matteMode: "key",
  lossless: false,
  videoSeconds: 4,
  motion: "subtle",
  videoModel: "vidu:3@2",
  candidateCount: 3,
};

export function StPacksStudio() {
  // ── Inputs ────────────────────────────────────────────────────────────────
  const [inputs, setInputs] = useState<InputsState>(INITIAL_INPUTS);
  const patchInputs = useCallback((patch: Partial<InputsState>) => setInputs((s) => ({ ...s, ...patch })), []);
  const [base, setBase] = useState<ChosenBase | null>(null);
  const [candidates, setCandidates] = useState<BaseCandidate[]>([]);
  const [baseBusy, setBaseBusy] = useState<"upload" | "generate" | null>(null);
  const [baseError, setBaseError] = useState("");
  const [fileName, setFileName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // ── Job ───────────────────────────────────────────────────────────────────
  const [job, setJob] = useState<JobSnapshot | null>(null);
  const [jobLoading, setJobLoading] = useState(false);
  const [jobError, setJobError] = useState("");
  const [providerBalance, setProviderBalance] = useState<number | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [previewMode, setPreviewMode] = useState<PreviewMode>("checker");

  // ── History ───────────────────────────────────────────────────────────────
  const [history, setHistory] = useState<JobListItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const jobs = await listJobs();
      if (!mounted.current) return;
      setHistory(jobs);
      setHistoryError("");
    } catch (e) {
      if (!mounted.current) return;
      setHistoryError(errorText(e, "Couldn't load the job history."));
    } finally {
      if (mounted.current) setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  useEffect(() => {
    let stopped = false;
    void fetch("/api/st-packs/balance")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { amount?: number } | null) => {
        if (!stopped && typeof data?.amount === "number") setProviderBalance(data.amount);
      })
      .catch(() => {});
    return () => { stopped = true; };
  }, []);

  // Poll while the job runs, and after it finishes until pack.zip is stored.
  // The row flips to done before the worker writes the zip; stopping there
  // left the button enabled with nothing to download.
  const jobId = job?.id ?? null;
  const jobStatus = job?.status ?? null;
  const doneCount = job?.expressions.filter((e) => e.status === "done").length ?? 0;
  const zipState = job
    ? zipButtonState({ status: job.status, hasZip: job.has.zip, doneCount, error: job.error, finishedAt: job.finishedAt })
    : "idle";
  useEffect(() => {
    const waitingOnZip = zipState === "preparing" || (zipState === "fallback" && !job?.has.zip && !job?.error);
    if (!jobId || (jobStatus !== "running" && !waitingOnZip)) return;
    let stopped = false;
    let inFlight = false;
    const tick = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const snap = await getJob(jobId);
        if (!stopped) {
          setJob(snap);
          setJobError("");
        }
      } catch (e) {
        // Keep polling through a transient failure; the message stays visible until the next good read.
        if (!stopped) setJobError(errorText(e, "Couldn't refresh the job."));
      } finally {
        inFlight = false;
      }
    };
    const timer = setInterval(() => { void tick(); }, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [jobId, jobStatus, zipState]);

  // Refresh the history once the open job reaches a final state.
  useEffect(() => {
    if (!jobId || !jobStatus) return;
    if (jobStatus === "done" || jobStatus === "partial" || jobStatus === "failed" || jobStatus === "cancelled") void loadHistory();
  }, [jobId, jobStatus, loadHistory]);

  // ── Base handlers ─────────────────────────────────────────────────────────
  const handleUpload = async (file: File) => {
    setFileName(file.name);
    setBaseError("");
    if (file.size > MAX_UPLOAD_BYTES) {
      setBaseError("That file is over 10 MB. Export a smaller PNG, JPEG or WebP.");
      return;
    }
    setBaseBusy("upload");
    const framing = inputs.framing;
    try {
      const bases = await uploadBase(file, framing);
      const first = bases[0];
      if (!first) throw new Error("The server didn't return a base image.");
      if (!mounted.current) return;
      setBase({ ...first, source: "upload", framing });
      setCandidates([]);
    } catch (e) {
      if (mounted.current) setBaseError(errorText(e, "Couldn't upload the image."));
    } finally {
      if (mounted.current) setBaseBusy(null);
    }
  };

  const handleGenerateBases = async () => {
    const prompt = inputs.prompt.trim();
    if (!prompt) {
      setBaseError("Describe the character first.");
      return;
    }
    setBaseError("");
    setBaseBusy("generate");
    try {
      const bases = await generateBases({
        prompt,
        styleNotes: inputs.styleNotes.trim() || undefined,
        framing: inputs.framing,
        count: inputs.candidateCount,
      });
      if (!mounted.current) return;
      if (bases.length === 0) throw new Error("No candidates came back. Try a different description.");
      setCandidates(bases);
      setBase(null);
    } catch (e) {
      if (mounted.current) setBaseError(errorText(e, "Couldn't generate a base."));
    } finally {
      if (mounted.current) setBaseBusy(null);
    }
  };

  const handlePickCandidate = (c: BaseCandidate) => {
    setBase({ ...c, source: "prompt", framing: inputs.framing });
    setBaseError("");
  };

  // ── Job handlers ──────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!base || submitting) return;
    setSubmitting(true);
    setSubmitError("");
    setJobError("");
    try {
      const labels = resolveExpressionLabels(inputs.expressionSet, inputs.customLabels);
      const id = await createJob({
        baseId: base.id,
        source: base.source,
        prompt: base.source === "prompt" ? inputs.prompt.trim() || undefined : undefined,
        styleNotes: inputs.styleNotes.trim() || undefined,
        framing: base.framing,
        expressionSet: inputs.expressionSet,
        labels: inputs.expressionSet === "custom" ? labels : undefined,
        width: inputs.width,
        height: inputs.height,
        options: {
          gif: inputs.gif,
          png: inputs.png,
          grid: inputs.grid,
          readme: inputs.readme,
          matteMode: inputs.matteMode,
          videoSeconds: inputs.videoSeconds,
          motion: inputs.motion,
          videoModel: inputs.videoModel,
          lossless: inputs.lossless,
        },
      });
      const snap = await getJob(id);
      if (!mounted.current) return;
      setJob(snap);
      setPending({});
      void loadHistory();
    } catch (e) {
      if (mounted.current) setSubmitError(errorText(e, "Couldn't start the job."));
    } finally {
      if (mounted.current) setSubmitting(false);
    }
  };

  const handleOpen = async (id: string) => {
    if (openingId) return;
    setOpeningId(id);
    setJobError("");
    if (!job) setJobLoading(true);
    try {
      const snap = await getJob(id);
      if (!mounted.current) return;
      setJob(snap);
      setPending({});
    } catch (e) {
      if (mounted.current) setJobError(errorText(e, "Couldn't open that job."));
    } finally {
      if (mounted.current) {
        setOpeningId(null);
        setJobLoading(false);
      }
    }
  };

  const handleCancel = async () => {
    if (!job || cancelling) return;
    setCancelling(true);
    try {
      const snap = await cancelJob(job.id);
      if (mounted.current) setJob(snap);
    } catch (e) {
      if (mounted.current) setJobError(errorText(e, "Couldn't cancel the job."));
    } finally {
      if (mounted.current) setCancelling(false);
    }
  };

  const handleExpressionAction = async (label: string, from: "edit" | "video" | "post") => {
    if (!job || pending[label]) return;
    const id = job.id;
    setPending((p) => ({ ...p, [label]: true }));
    setJobError("");
    try {
      const snap = await regenerateExpression(id, label, from);
      if (mounted.current) setJob(snap);
    } catch (e) {
      if (mounted.current) setJobError(errorText(e, `Couldn't regenerate ${label}.`));
    } finally {
      if (mounted.current) {
        setPending((p) => {
          const next = { ...p };
          delete next[label];
          return next;
        });
      }
    }
  };

  const jobRunning = job?.status === "running";

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-5 text-[#FFF1E8] sm:px-5 sm:py-6 lg:px-8">
      <header className="mb-5 sm:mb-6">
        <div className="flex items-center gap-2.5">
          <h1 className="font-display text-[22px] font-semibold tracking-tight text-white">ST Packs</h1>
          <span className="rounded-full border border-[#FFA300]/40 bg-[#FFA300]/10 px-2 py-0.5 font-mono text-[10.5px] font-semibold leading-4 text-[#FFC857]">BETA</span>
        </div>
        <p className="mt-1 text-[13px] text-[#C8CCE8]">SillyTavern expression packs: one character, animated transparent sprites, flat ZIP.</p>
        <p className="mt-0.5 text-[12px] text-[#8A92BF]">Admin-only internal tool. Each run spends real provider credit; the estimate is a guide, not a cap.</p>
        {providerBalance !== null && (
          <p role="status" className={`mt-1 text-[12px] ${providerBalance < 2 ? "text-amber-200" : "text-[#8A92BF]"}`}>
            Runware balance ${providerBalance.toFixed(2)}{providerBalance < 2 ? ". Provider balance too low — top up before the next pack." : ""}
          </p>
        )}
      </header>

      <div className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start">
        <InputsPanel
          inputs={inputs} onChange={patchInputs}
          base={base} candidates={candidates} baseBusy={baseBusy} baseError={baseError} fileName={fileName}
          onUpload={(f) => { void handleUpload(f); }}
          onGenerateBases={() => { void handleGenerateBases(); }}
          onPickCandidate={handlePickCandidate}
          submitting={submitting} submitError={submitError} jobRunning={jobRunning}
          onSubmit={() => { void handleSubmit(); }} />

        <div className="flex min-w-0 flex-col gap-5">
          <JobPanel
            job={job} loading={jobLoading} error={jobError}
            previewMode={previewMode} onPreviewMode={setPreviewMode}
            cancelling={cancelling} onCancel={() => { void handleCancel(); }}
            pending={pending} onExpressionAction={(label, from) => { void handleExpressionAction(label, from); }} />
          <JobHistory
            jobs={history} loading={historyLoading} error={historyError}
            currentId={jobId} openingId={openingId}
            onOpen={(id) => { void handleOpen(id); }} />
        </div>
      </div>
    </div>
  );
}
