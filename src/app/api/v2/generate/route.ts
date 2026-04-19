/**
 * POST /api/v2/generate — module-2 pipeline entry point.
 *
 * Thin shell over `runPipeline`:
 *   1. Authenticate via Supabase (same pattern as v1 /api/generate).
 *   2. Parse + Zod-validate the JSON body.
 *   3. Resolve the target project — Inbox lookup + first-gen auto-create.
 *   4. Call `runPipeline`.
 *   5. Map outcomes to HTTP.
 *
 * All generation logic, credit handling, prompt composition, image
 * processing, and persistence lives in src/lib/pipeline/generate.ts
 * and its dependencies. This route is ~150 lines and intentionally
 * contains none of it.
 *
 * v1 /api/generate remains untouched — the dashboard UI continues to
 * hit it until Module 11 switches the client to v2.
 */

import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { childLogger, type Logger } from "@/lib/logger";
import {
  isPipelineError,
  toLogContext,
  ValidationError,
  PromptCompositionError,
  InsufficientCreditsError,
  CreditDeductionError,
} from "@/lib/pipeline/errors";
import { runPipeline, type GenerateRequest } from "@/lib/pipeline/generate";

// ─── Body schema ──────────────────────────────────────────────────────────
// Defence-in-depth: runPipeline re-validates via assertValidRequest, but Zod
// here produces better error messages for malformed HTTP payloads.

const BodySchema = z.object({
  rawInput: z
    .string()
    .min(1, "rawInput must be a non-empty string")
    .max(500, "rawInput too long (max 500 chars)"),
  categoryId: z.string().min(1, "categoryId required"),
  styleId: z.string().min(1, "styleId required"),
  projectId: z.string().min(1).optional(),
  enhance: z.boolean().optional().default(false),
});

// MVP: 1 credit per generation. Module 3 will tier-gate by style / quality.
const CREDITS_PER_GEN = 1;

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Find the user's Inbox project, auto-creating it on first generation.
 *
 * Known race: two concurrent first-generations could both see no Inbox
 * and both create one. Module 1 accepted this (app-layer enforcement,
 * no unique constraint). Consequence is cosmetic — future gens resolve
 * to whichever findFirst returns; the orphan Inbox stays empty. Partial
 * mitigation via $transaction narrows the window but doesn't eliminate
 * it at READ COMMITTED.
 */
async function resolveProjectId(
  userId: string,
  requested: string | undefined,
  log: Logger
): Promise<string> {
  if (requested) return requested;

  return prisma.$transaction(async (tx) => {
    const existing = await tx.project.findFirst({
      where: { userId, isInbox: true },
      select: { id: true },
    });
    if (existing) return existing.id;

    log.info("creating Inbox project (first-gen user)", { userId });
    const created = await tx.project.create({
      data: { userId, name: "Inbox", isInbox: true },
      select: { id: true },
    });
    return created.id;
  });
}

function mapError(err: unknown, requestId: string, log: Logger): NextResponse {
  // Specific PipelineError subclasses must be checked BEFORE isPipelineError
  // (all of these narrow down the generic PipelineError catch-all below).

  if (err instanceof InsufficientCreditsError) {
    log.warn("insufficient_credits", toLogContext(err));
    const available =
      typeof err.context?.available === "number" ? err.context.available : undefined;
    return NextResponse.json(
      {
        ok: false,
        error: "insufficient_credits",
        message: err.message,
        available,
        requestId,
      },
      { status: 402 }
    );
  }

  if (err instanceof ValidationError) {
    log.warn("validation", toLogContext(err));
    return NextResponse.json(
      {
        ok: false,
        error: "validation",
        message: err.message,
        context: err.context,
        requestId,
      },
      { status: 400 }
    );
  }

  if (err instanceof PromptCompositionError) {
    log.error("prompt_composition", toLogContext(err));
    return NextResponse.json(
      {
        ok: false,
        error: "prompt_composition",
        message: err.message,
        requestId,
      },
      { status: 500 }
    );
  }

  if (err instanceof CreditDeductionError) {
    log.error("credit_system", toLogContext(err));
    return NextResponse.json(
      {
        ok: false,
        error: "credit_system",
        message: err.message,
        requestId,
      },
      { status: 500 }
    );
  }

  if (isPipelineError(err)) {
    // RunwareError, BackgroundRemovalError, ImageProcessingError,
    // TileabilityError, StorageError, PersistenceError.
    log.error("pipeline_failure", toLogContext(err));
    return NextResponse.json(
      {
        ok: false,
        error: "pipeline",
        step: err.step,
        message: err.message,
        requestId,
      },
      { status: 500 }
    );
  }

  // Unknown — log the raw error but do NOT leak its message to the client.
  log.error("unknown error in route", { err });
  return NextResponse.json(
    {
      ok: false,
      error: "unknown",
      message: "unexpected error",
      requestId,
    },
    { status: 500 }
  );
}

// ─── POST handler ─────────────────────────────────────────────────────────
// Next.js App Router: unspecified methods auto-return 405 — no explicit
// GET/PUT/etc. shims needed.

export async function POST(request: Request): Promise<NextResponse> {
  const requestId = randomUUID();
  const log = childLogger({ requestId, component: "api/v2/generate" });
  log.info("request received");

  // ── 1. Auth ────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    log.warn("unauthenticated");
    return NextResponse.json(
      { ok: false, error: "unauthenticated", message: "please sign in", requestId },
      { status: 401 }
    );
  }

  // ── 2. Parse + validate body ───────────────────────────────────────────
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    log.warn("invalid JSON body");
    return NextResponse.json(
      { ok: false, error: "validation", message: "invalid JSON body", requestId },
      { status: 400 }
    );
  }

  const parsed = BodySchema.safeParse(rawBody);
  if (!parsed.success) {
    log.warn("body validation failed", { issues: parsed.error.issues });
    return NextResponse.json(
      {
        ok: false,
        error: "validation",
        message: "invalid body",
        context: { issues: parsed.error.issues },
        requestId,
      },
      { status: 400 }
    );
  }
  const { rawInput, categoryId, styleId, projectId: requestedProjectId, enhance } = parsed.data;

  // ── 3. Resolve project (Inbox auto-create on miss) ─────────────────────
  let projectId: string;
  try {
    projectId = await resolveProjectId(user.id, requestedProjectId, log);
  } catch (err) {
    log.error("project resolution failed", { err });
    return NextResponse.json(
      {
        ok: false,
        error: "inbox_resolution",
        message: "could not resolve project",
        requestId,
      },
      { status: 500 }
    );
  }

  // ── 4. Pipeline ────────────────────────────────────────────────────────
  const pipelineRequest: GenerateRequest = {
    requestId,
    userId: user.id,
    projectId,
    rawInput,
    categoryId,
    styleId,
    enhance,
    creditsToDeduct: CREDITS_PER_GEN,
  };

  try {
    const result = await runPipeline(pipelineRequest);
    log.info("success", {
      assetId: result.assetId,
      durationMs: result.durationMs,
    });
    return NextResponse.json({ ok: true, ...result, requestId }, { status: 200 });
  } catch (err) {
    return mapError(err, requestId, log);
  }
}
