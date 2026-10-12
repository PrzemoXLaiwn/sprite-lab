import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { rateLimitFeedback } from "@/lib/rate-limit";
import { Prisma } from "@prisma/client";

// Report reasons
const VALID_REASONS = [
  "SPAM",
  "INAPPROPRIATE",
  "HARASSMENT",
  "COPYRIGHT",
  "NSFW",
  "OTHER",
] as const;

type ReportReason = typeof VALID_REASONS[number];

const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_ID_LENGTH = 100;

interface ReportRequest {
  reason: ReportReason;
  description?: string;
  reportedUserId?: string;
  postId?: string;
  generationId?: string;
}

export async function POST(request: Request) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please log in to submit a report." },
        { status: 401 }
      );
    }

    // Per-user rate limit (shares the 10/hour feedback limiter, own bucket)
    const { blocked } = await rateLimitFeedback(`report:${user.id}`);
    if (blocked) return blocked;

    // Parse request
    const body: ReportRequest | null = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }
    const { reason, description } = body;
    // Only accept non-empty string IDs; anything else is treated as absent
    const asId = (v: unknown) =>
      typeof v === "string" && v.length > 0 && v.length <= MAX_ID_LENGTH ? v : undefined;
    const reportedUserId = asId(body.reportedUserId);
    const postId = asId(body.postId);
    const generationId = asId(body.generationId);

    // Validation
    if (!reason || !VALID_REASONS.includes(reason)) {
      return NextResponse.json(
        { error: "Invalid report reason." },
        { status: 400 }
      );
    }

    if (description !== undefined && description !== null && typeof description !== "string") {
      return NextResponse.json(
        { error: "Invalid description." },
        { status: 400 }
      );
    }

    if (typeof description === "string" && description.trim().length > MAX_DESCRIPTION_LENGTH) {
      return NextResponse.json(
        { error: `Description too long (max ${MAX_DESCRIPTION_LENGTH} characters).` },
        { status: 400 }
      );
    }

    // Must report at least something
    if (!reportedUserId && !postId && !generationId) {
      return NextResponse.json(
        { error: "Must specify what you are reporting (user, post, or generation)." },
        { status: 400 }
      );
    }

    // Prevent self-reporting
    if (reportedUserId === user.id) {
      return NextResponse.json(
        { error: "You cannot report yourself." },
        { status: 400 }
      );
    }

    // Check if already reported (prevent spam). Match the exact target so a
    // report on one generation doesn't block reporting a different one by the
    // same user. There is no DB unique constraint, so a concurrent duplicate is
    // still possible; the rate limit above bounds how many can slip through.
    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId: user.id,
        reportedUserId: reportedUserId ?? null,
        postId: postId ?? null,
        generationId: generationId ?? null,
        status: { in: ["PENDING", "REVIEWED"] },
      },
      select: { id: true },
    });

    if (existingReport) {
      return NextResponse.json(
        { error: "You have already submitted a report for this content." },
        { status: 400 }
      );
    }

    // Create report
    let report: { id: string };
    try {
      report = await prisma.report.create({
        data: {
          reporterId: user.id,
          reportedUserId: reportedUserId || null,
          postId: postId || null,
          generationId: generationId || null,
          reason,
          description: description?.trim() || null,
          status: "PENDING",
        },
        select: { id: true },
      });
    } catch (createError) {
      if (createError instanceof Prisma.PrismaClientKnownRequestError) {
        // P2002: unique violation (if a unique constraint is added later)
        if (createError.code === "P2002") {
          return NextResponse.json(
            { error: "You have already submitted a report for this content." },
            { status: 400 }
          );
        }
        // P2003: reported user / post does not exist
        if (createError.code === "P2003") {
          return NextResponse.json(
            { error: "The reported content could not be found." },
            { status: 404 }
          );
        }
      }
      throw createError;
    }

    console.log(`[Report] User ${user.id} reported: ${JSON.stringify({ reportedUserId, postId, generationId, reason })}`);

    return NextResponse.json({
      success: true,
      reportId: report.id,
      message: "Thank you for your report. Our team will review it shortly.",
    });

  } catch (error) {
    console.error("[Report] Error:", error);
    return NextResponse.json(
      { error: "Failed to submit report. Please try again." },
      { status: 500 }
    );
  }
}

// GET - Check if user has already reported something
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const reportedUserId = searchParams.get("userId");
    const postId = searchParams.get("postId");
    const generationId = searchParams.get("generationId");

    if (!reportedUserId && !postId && !generationId) {
      return NextResponse.json({ hasReported: false });
    }

    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId: user.id,
        OR: [
          reportedUserId ? { reportedUserId } : {},
          postId ? { postId } : {},
          generationId ? { generationId } : {},
        ].filter(obj => Object.keys(obj).length > 0),
      },
    });

    return NextResponse.json({
      hasReported: !!existingReport,
      status: existingReport?.status || null,
    });

  } catch (error) {
    console.error("[Report] Error checking report status:", error);
    return NextResponse.json(
      { error: "Failed to check report status." },
      { status: 500 }
    );
  }
}
