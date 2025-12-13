import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

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

    // Parse request
    const body: ReportRequest = await request.json();
    const { reason, description, reportedUserId, postId, generationId } = body;

    // Validation
    if (!reason || !VALID_REASONS.includes(reason)) {
      return NextResponse.json(
        { error: "Invalid report reason." },
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

    // Check if already reported (prevent spam)
    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId: user.id,
        OR: [
          reportedUserId ? { reportedUserId } : {},
          postId ? { postId } : {},
          generationId ? { generationId } : {},
        ].filter(obj => Object.keys(obj).length > 0),
        status: { in: ["PENDING", "REVIEWED"] },
      },
    });

    if (existingReport) {
      return NextResponse.json(
        { error: "You have already submitted a report for this content." },
        { status: 400 }
      );
    }

    // Create report
    const report = await prisma.report.create({
      data: {
        reporterId: user.id,
        reportedUserId: reportedUserId || null,
        postId: postId || null,
        generationId: generationId || null,
        reason,
        description: description?.trim() || null,
        status: "PENDING",
      },
    });

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
