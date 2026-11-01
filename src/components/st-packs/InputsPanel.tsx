"use client";

// Left / top panel of the ST Packs studio: pick a base (upload or describe),
// framing, the expression set, output size, pack options and the estimate.

import { useId, useRef } from "react";
import { Loader2, Package, Upload, WandSparkles } from "lucide-react";
import {
  ST_EXPRESSION_LABELS,
  resolveExpressionLabels,
  type StExpressionLabel,
  type StExpressionSet,
} from "@/config/st-expressions";
import { ST_DEFAULT_SIZE, ST_DEFAULT_VIDEO_MODEL, ST_SELECTABLE_VIDEO_MODELS, ST_VIDEO_COST_TABLE, ST_VIDEO_MODELS, ST_VIDEO_SECOND_CHOICES, estimateJobUsd, viduQ2TurboClipUsd, type StFraming, type StMatteMode, type StMotionMode, type StVideoSeconds } from "@/config/st-packs";
import { ErrorNote, Field } from "@/components/tools/ToolWorkspace";
import type { BaseCandidate } from "./api";
import { CheckRow, FIELD_CLS, SelectSlot, formatUsd, labelTitle } from "./ui";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export interface InputsState {
  source: "upload" | "prompt";
  prompt: string;
  styleNotes: string;
  framing: StFraming;
  expressionSet: StExpressionSet;
  customLabels: StExpressionLabel[];
  width: number;
  height: number;
  gif: boolean;
  png: boolean;
  grid: boolean;
  readme: boolean;
  matteMode: StMatteMode;
  lossless: boolean;
  videoSeconds: StVideoSeconds;
  motion: StMotionMode;
  videoModel: string;
  candidateCount: 2 | 3 | 4;
  /** Neutral idle. On for a new base; untick to leave it out of this pack. */
  includeNeutral: boolean;
}

/** The base the job will use, with how it was made so a framing change can be flagged. */
export interface ChosenBase extends BaseCandidate {
  source: "upload" | "prompt";
  framing: StFraming;
}

const FRAMING_LABEL: Record<StFraming, string> = { waist: "Waist-up", bust: "Bust/face" };

export function InputsPanel({
  inputs, onChange,
  base, candidates, baseBusy, baseError, fileName,
  onUpload, onGenerateBases, onPickCandidate,
  submitting, submitError, jobRunning, onSubmit,
  neutralReuse = false,
}: {
  inputs: InputsState;
  onChange: (patch: Partial<InputsState>) => void;
  base: ChosenBase | null;
  candidates: BaseCandidate[];
  baseBusy: "upload" | "generate" | null;
  baseError: string;
  fileName: string;
  onUpload: (file: File) => void;
  onGenerateBases: () => void;
  onPickCandidate: (c: BaseCandidate) => void;
  submitting: boolean;
  submitError: string;
  jobRunning: boolean;
  onSubmit: () => void;
  /** A done neutral already exists for this base, so including it does not generate a clip. */
  neutralReuse?: boolean;
}) {
  const uid = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const includeNeutral = inputs.includeNeutral !== false;
  const labels = resolveExpressionLabels(inputs.expressionSet, inputs.customLabels, includeNeutral);
  const estimate = estimateJobUsd(
    labels,
    { videoSeconds: inputs.videoSeconds, matteMode: inputs.matteMode, model: inputs.videoModel },
    includeNeutral && neutralReuse ? ["neutral"] : [],
  );
  const busy = baseBusy !== null;
  const canSubmit = !!base && !submitting && !jobRunning && !busy && labels.length > 0;
  const framingMismatch = base && base.framing !== inputs.framing;

  const toggleCustom = (label: StExpressionLabel, on: boolean) => {
    const next = on
      ? [...inputs.customLabels, label]
      : inputs.customLabels.filter((l) => l !== label);
    onChange({ customLabels: ST_EXPRESSION_LABELS.filter((l) => next.includes(l)) });
  };

  return (
    <section aria-labelledby={`${uid}-title`} className="sl-panel flex flex-col gap-5 p-4 sm:p-5">
      <h2 id={`${uid}-title`} className="font-display text-[17px] font-semibold tracking-tight text-white">Inputs</h2>

      {/* Source */}
      <Field label="Source" hint={base ? `Base ready (${base.source === "upload" ? "uploaded" : "generated"}, ${FRAMING_LABEL[base.framing].toLowerCase()}).` : "Every job starts from one normalised base image."}>
        <div className="sl-track" role="group" aria-label="Base source">
          {(["upload", "prompt"] as const).map((s) => (
            <button key={s} type="button" aria-pressed={inputs.source === s} onClick={() => onChange({ source: s })}
              className="sl-seg flex-1">
              {s === "upload" ? "Upload image" : "Describe character"}
            </button>
          ))}
        </div>

        {inputs.source === "upload" ? (
          <div className="mt-3 flex flex-col gap-2">
            <input ref={fileRef} id={`${uid}-file`} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(f);
                e.target.value = "";
              }} />
            <button type="button" className="btn btn-secondary w-full" disabled={busy} onClick={() => fileRef.current?.click()}>
              {baseBusy === "upload" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
              {baseBusy === "upload" ? "Normalising…" : base?.source === "upload" ? "Replace image" : "Choose image"}
            </button>
            <p className="text-[11.5px] text-[#8A92BF]">PNG, JPEG or WebP, up to 10 MB. One character, plain background works best.{fileName ? ` Selected: ${fileName}` : ""}</p>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            <div className="sl-inset">
              <textarea id={`${uid}-prompt`} value={inputs.prompt} onChange={(e) => onChange({ prompt: e.target.value })} rows={3}
                placeholder="A red-haired knight in dented plate armour, freckles, calm eyes"
                aria-label="Character description" disabled={busy}
                className={`${FIELD_CLS} resize-y leading-snug`} />
            </div>
            <div className="flex gap-2">
              <div className="w-[88px] shrink-0">
                <SelectSlot ariaLabel="Candidate count" value={String(inputs.candidateCount)} disabled={busy}
                  onChange={(v) => onChange({ candidateCount: Number(v) as 2 | 3 | 4 })}>
                  {[2, 3, 4].map((n) => <option key={n} value={n}>{n} bases</option>)}
                </SelectSlot>
              </div>
              <button type="button" className="btn btn-secondary flex-1" disabled={busy || !inputs.prompt.trim()} onClick={onGenerateBases}>
                {baseBusy === "generate" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <WandSparkles className="h-4 w-4" aria-hidden />}
                {baseBusy === "generate" ? "Generating…" : "Generate base"}
              </button>
            </div>
            {candidates.length > 0 && (
              <div role="group" aria-label="Base candidates" className="grid grid-cols-4 gap-2">
                {candidates.map((c, i) => {
                  const selected = base?.id === c.id;
                  return (
                    <button key={c.id} type="button" onClick={() => onPickCandidate(c)}
                      aria-current={selected ? "true" : undefined} aria-label={`Use base ${i + 1}`}
                      className="sl-thumb checker checker-sm relative aspect-[3/4] overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c.url} alt="" decoding="async" className="absolute inset-0 h-full w-full object-contain" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {base && (
          <div className="sl-card mt-3 flex items-center gap-3 p-2">
            <div className="checker checker-sm relative h-[72px] w-[54px] shrink-0 overflow-hidden rounded-lg border border-white/[0.06]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={base.url} alt="Chosen base" decoding="async" className="absolute inset-0 h-full w-full object-contain" />
            </div>
            <div className="min-w-0 text-[12px] text-[#C8CCE8]">
              <p className="font-medium text-white">Base chosen</p>
              <p className="truncate font-mono text-[11px] text-[#8A92BF]" title={base.id}>{base.id}</p>
              {framingMismatch && (
                <p className="mt-1 text-[11.5px] leading-snug text-amber-200">
                  Made as {FRAMING_LABEL[base.framing].toLowerCase()}. Re-upload or regenerate to use {FRAMING_LABEL[inputs.framing].toLowerCase()}.
                </p>
              )}
            </div>
          </div>
        )}
        {baseError && <ErrorNote>{baseError}</ErrorNote>}
      </Field>

      {/* Framing */}
      <Field label="Framing">
        <div className="sl-track" role="group" aria-label="Framing">
          {(["waist", "bust"] as const).map((f) => (
            <button key={f} type="button" aria-pressed={inputs.framing === f} onClick={() => onChange({ framing: f })} className="sl-seg flex-1">
              {FRAMING_LABEL[f]}
            </button>
          ))}
        </div>
      </Field>

      {/* Expression set */}
      <Field label="Expression set" hint={`${labels.length} expression${labels.length === 1 ? "" : "s"} will be made.`}>
        <div className="sl-track" role="group" aria-label="Expression set">
          {([["default8", "Default 8"], ["all28", "All 28"], ["custom", "Custom"]] as const).map(([id, text]) => (
            <button key={id} type="button" aria-pressed={inputs.expressionSet === id} onClick={() => onChange({ expressionSet: id })} className="sl-seg flex-1">
              {text}
            </button>
          ))}
        </div>
        {inputs.expressionSet === "custom" && (
          <div role="group" aria-label="Custom expressions" className="sl-card mt-3 grid grid-cols-2 gap-x-1 p-1.5 sm:grid-cols-3">
            {ST_EXPRESSION_LABELS.filter((label) => label !== "neutral").map((label) => (
              <CheckRow key={label} checked={inputs.customLabels.includes(label)} onChange={(on) => toggleCustom(label, on)}>
                {labelTitle(label)}
              </CheckRow>
            ))}
          </div>
        )}
        <div className="sl-card mt-3 p-1.5">
          <CheckRow checked={includeNeutral} onChange={(on) => onChange({ includeNeutral: on })}>
            Include neutral idle
          </CheckRow>
        </div>
        <p className="mt-1.5 text-[11.5px] leading-snug text-[#8A92BF]">
          {includeNeutral && neutralReuse
            ? "A finished neutral for this base will be copied in. That clip is not generated again."
            : includeNeutral
              ? "On for the first pack of a base. Untick it to skip the idle clip."
              : "Neutral is left out of this pack."}
        </p>
      </Field>

      {/* Style notes */}
      <Field label="Style notes" labelFor={`${uid}-style`} hint="Optional. e.g. anime cel shading, soft light">
        <div className="sl-inset">
          <input id={`${uid}-style`} type="text" value={inputs.styleNotes} onChange={(e) => onChange({ styleNotes: e.target.value })}
            placeholder="anime cel shading, soft light" maxLength={200} className={FIELD_CLS} />
        </div>
      </Field>

      <Field label="Output" hint={`Native video frame, ${ST_DEFAULT_SIZE.width}×${ST_DEFAULT_SIZE.height}. The clip is processed at that size, not scaled up and back down.`}>
        <div className="sl-card p-1.5">
          <CheckRow checked={inputs.lossless} onChange={(v) => onChange({ lossless: v })}>
            Lossless WebP
          </CheckRow>
        </div>
        <p className="mt-1.5 text-[11.5px] leading-snug text-[#8A92BF]">Off is HQ lossy (quality 90, full alpha). Lossless keeps every pixel and makes a larger file.</p>
      </Field>

      {/* Options */}
      <Field label="Pack options">
        <div className="sl-card grid grid-cols-1 gap-x-1 p-1.5 sm:grid-cols-2">
          <CheckRow checked={inputs.gif} onChange={(v) => onChange({ gif: v })}>GIF fallbacks</CheckRow>
          <CheckRow checked={inputs.png} onChange={(v) => onChange({ png: v })}>Static PNG pack</CheckRow>
          <CheckRow checked={inputs.grid} onChange={(v) => onChange({ grid: v })}>Preview grid GIF</CheckRow>
          <CheckRow checked={inputs.readme} onChange={(v) => onChange({ readme: v })}>README.txt</CheckRow>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <label htmlFor={`${uid}-matte`} className="mb-1.5 block text-[11.5px] font-medium text-[#A7ADD4]">Matte mode</label>
            <SelectSlot id={`${uid}-matte`} value={inputs.matteMode} onChange={(v) => onChange({ matteMode: v === "runware" ? "runware" : "key" })}>
              <option value="key">Key (free)</option>
              <option value="runware">Runware per frame</option>
            </SelectSlot>
          </div>
          <div>
            <label htmlFor={`${uid}-motion`} className="mb-1.5 block text-[11.5px] font-medium text-[#A7ADD4]">Motion</label>
            <SelectSlot id={`${uid}-motion`} value={inputs.motion} onChange={(v) => onChange({ motion: v === "expressive" ? "expressive" : "subtle" })}>
              <option value="subtle">Subtle</option>
              <option value="expressive">Expressive</option>
            </SelectSlot>
          </div>
          <div className="col-span-2">
            <label htmlFor={`${uid}-model`} className="mb-1.5 block text-[11.5px] font-medium text-[#A7ADD4]">Video model</label>
            <SelectSlot id={`${uid}-model`} value={inputs.videoModel} onChange={(v) => onChange({ videoModel: (ST_SELECTABLE_VIDEO_MODELS as readonly string[]).includes(v) ? v : ST_DEFAULT_VIDEO_MODEL })}>
              {ST_SELECTABLE_VIDEO_MODELS.map((air) => <option key={air} value={air}>{ST_VIDEO_MODELS[air].label}</option>)}
            </SelectSlot>
          </div>
          <div className="col-span-2">
            <label htmlFor={`${uid}-video`} className="mb-1.5 block text-[11.5px] font-medium text-[#A7ADD4]">Video length</label>
            <SelectSlot id={`${uid}-video`} value={String(inputs.videoSeconds)} onChange={(v) => onChange({ videoSeconds: Number(v) as StVideoSeconds })}>
              {ST_VIDEO_SECOND_CHOICES.map((s) => <option key={s} value={s}>{s} s</option>)}
            </SelectSlot>
          </div>
        </div>
        <p className="mt-1.5 text-[11.5px] leading-snug text-[#8A92BF]">
          {inputs.motion === "expressive"
            ? `Expressive eases into one gesture, holds it, then returns to the still. Admin test only. This model is about ${formatUsd(inputs.videoModel === "vidu:3@1" ? 0.179 : viduQ2TurboClipUsd(inputs.videoSeconds))} per clip before the edit. Credit prices are unchanged.`
            : "Subtle is a still idle: breathing and a little hair. 6 s and 8 s are the longer lengths."}
        </p>
        <table className="mt-2 w-full text-left text-[11px] text-[#A7ADD4]">
          <caption className="mb-1 text-left text-[11.5px] text-[#C8CCE8]">720p, about 6 s. Only Vidu is wired. First and last frame stay the still.</caption>
          <thead>
            <tr className="text-[#8A92BF]"><th className="py-1 font-medium">Model</th><th className="py-1 font-medium">6 s</th><th className="py-1 font-medium">Note</th></tr>
          </thead>
          <tbody>
            {ST_VIDEO_COST_TABLE.map((row) => (
              <tr key={row.label} className="align-top">
                <td className="py-1 pr-2 text-[#FFF1E8]">{row.label}</td>
                <td className="py-1 pr-2 font-mono tabular-nums">{formatUsd(row.usd6)}</td>
                <td className="py-1">{row.wired ? row.note : `Not wired. ${row.note}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Field>

      {/* Estimate + submit */}
      <div className="sl-card p-3 text-[12.5px] text-[#C8CCE8]">
        <p className="flex items-baseline justify-between gap-3">
          <span>Estimate for {labels.length} expression{labels.length === 1 ? "" : "s"}</span>
          <span className="font-mono text-[15px] font-semibold text-white">{formatUsd(estimate)}</span>
        </p>
        <p className="mt-1 text-[11.5px] leading-snug text-[#8A92BF]">
          Estimate only; the job reports the real cost. Neutral uses the base, no edit.
          {includeNeutral && neutralReuse ? " Reused neutral is not charged." : ""}
          {inputs.matteMode === "runware" ? " Runware matte adds per-frame charges." : ""}
        </p>
      </div>

      <div>
        <button type="button" className="btn btn-primary min-h-12 w-full text-[14px]" disabled={!canSubmit} onClick={onSubmit} aria-busy={submitting || undefined}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Package className="h-4 w-4" aria-hidden />}
          {submitting ? "Starting…" : "Generate pack"}
        </button>
        {!base && !submitError && (
          <p className="mt-2 text-center text-[11.5px] text-[#8A92BF]">Choose a base first.</p>
        )}
        {base && jobRunning && !submitError && (
          <p className="mt-2 text-center text-[11.5px] text-[#8A92BF]">A job is running. Wait for it or cancel it to start another.</p>
        )}
        {submitError && <ErrorNote>{submitError}</ErrorNote>}
      </div>
    </section>
  );
}
