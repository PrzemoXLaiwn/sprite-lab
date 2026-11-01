// Whether a new pack generates a neutral clip, copies one, or leaves it out.
// The per-clip price does not change. A reused clip adds nothing to the estimate.

import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import type { StExpressionLabel } from "@/config/st-expressions";
import { prisma } from "@/lib/prisma";

export type NeutralPlan = "omit" | "reuse" | "generate";

/**
 * Bumped whenever the neutral still is built differently. It is part of the
 * hash, so a neutral made by an older pipeline (before the segmented
 * reference: a dark upload kept its backdrop) is never reused.
 */
export const NEUTRAL_PIPELINE_VERSION = 2;

/** sha256 of the stored base PNG and the pipeline version. The same upload normalises to the same bytes. */
export function hashBasePng(png: Buffer): string {
  return createHash("sha256").update(`neutral-v${NEUTRAL_PIPELINE_VERSION}\0`).update(png).digest("hex");
}

/**
 * Default is to include neutral (the first pack of a base needs an idle).
 * Unticking omits it. A finished neutral for this base is copied, not generated.
 */
export function planNeutral(includeNeutral: boolean, reusable: boolean): NeutralPlan {
  if (!includeNeutral) return "omit";
  return reusable ? "reuse" : "generate";
}

/** Labels whose video is not generated, so they add nothing to the estimate. */
export function skippedEstimateLabels(plan: NeutralPlan): StExpressionLabel[] {
  return plan === "reuse" ? ["neutral"] : [];
}

/** A finished neutral whose files can be copied onto a new job. */
export interface ReusableNeutral {
  jobId: string;
  webpKey: string;
  pngKey: string | null;
  gifKey: string | null;
  editKey: string | null;
  videoKey: string | null;
  videoUrl: string | null;
  qa: Prisma.JsonValue | null;
  frames: number | null;
  bytes: number | null;
  flagged: boolean;
}

/** Latest done neutral for this user and this base image. Null when none is stored. */
export async function findReusableNeutral(userId: string, baseHash: string): Promise<ReusableNeutral | null> {
  const job = await prisma.stPackJob.findFirst({
    where: {
      userId,
      options: { path: ["baseHash"], equals: baseHash },
      expressions: { some: { label: "neutral", status: "done", webpKey: { not: null } } },
    },
    orderBy: { createdAt: "desc" },
    include: { expressions: { where: { label: "neutral", status: "done" }, take: 1 } },
  });
  const e = job?.expressions[0];
  if (!job || !e?.webpKey) return null;
  return {
    jobId: job.id,
    webpKey: e.webpKey,
    pngKey: e.pngKey,
    gifKey: e.gifKey,
    editKey: e.editKey,
    videoKey: e.videoKey,
    videoUrl: e.videoUrl,
    qa: e.qa,
    frames: e.frames,
    bytes: e.bytes,
    flagged: e.flagged,
  };
}
