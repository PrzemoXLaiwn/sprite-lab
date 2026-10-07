import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// ===========================================
// GET USER'S PENDING GENERATIONS
// ===========================================

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please log in." },
        { status: 401 }
      );
    }

    // Get all pending and processing jobs for this user
    // Also include recently completed ones (last 5 minutes) so UI can transition smoothly
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const jobs = await prisma.pendingGeneration.findMany({
      where: {
        userId: user.id,
        OR: [
          { status: { in: ["pending", "processing"] } },
          {
            status: "completed",
            completedAt: { gte: fiveMinutesAgo }
          },
          {
            status: "failed",
            completedAt: { gte: fiveMinutesAgo }
          }
        ]
      },
      orderBy: { createdAt: "desc" },
      take: 50, // Limit to prevent abuse
    });

    // Format for UI
    const formattedJobs = jobs.map(job => ({
      id: job.id,
      prompt: job.prompt,
      categoryId: job.categoryId,
      subcategoryId: job.subcategoryId,
      styleId: job.styleId,
      mode: job.mode,
      status: job.status,
      progress: job.progress,
      progressMessage: job.progressMessage,
      errorMessage: job.errorMessage,
      creditsUsed: job.creditsUsed,
      resultUrl: job.resultUrl,
      resultSeed: job.resultSeed,
      generationId: job.generationId,
      model3DId: job.model3DId,
      quality3D: job.quality3D,
      createdAt: job.createdAt.toISOString(),
      startedAt: job.startedAt?.toISOString(),
      completedAt: job.completedAt?.toISOString(),
    }));

    // Count active jobs
    const activeCount = jobs.filter(j =>
      j.status === "pending" || j.status === "processing"
    ).length;

    return NextResponse.json({
      success: true,
      jobs: formattedJobs,
      activeCount,
      hasActiveJobs: activeCount > 0,
    });

  } catch (error) {
    console.error("[Queue Status] Error:", error);
    return NextResponse.json(
      { error: "Failed to get queue status." },
      { status: 500 }
    );
  }
}

// ===========================================
// DELETE (CANCEL) A PENDING JOB
// ===========================================

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please log in." },
        { status: 401 }
      );
    }

    let rawJobId: unknown;
    try {
      ({ jobId: rawJobId } = await request.json());
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    if (!rawJobId || typeof rawJobId !== "string" || rawJobId.length > 100) {
      return NextResponse.json(
        { error: "Job ID required." },
        { status: 400 }
      );
    }
    const jobId: string = rawJobId;

    // Find the job (for a precise error message only — the authoritative
    // check is the conditional delete below)
    const job = await prisma.pendingGeneration.findFirst({
      where: { id: jobId, userId: user.id },
      select: { id: true, status: true, creditsUsed: true, prompt: true },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found." },
        { status: 404 }
      );
    }

    // Only allow canceling pending jobs (not processing ones)
    if (job.status !== "pending") {
      return NextResponse.json(
        { error: "Can only cancel pending jobs." },
        { status: 400 }
      );
    }

    // Atomic cancel + refund: the delete only matches while the job is still
    // pending and owned by this user. Concurrent cancels (or the worker
    // claiming the job) make count 0 → no refund. Delete and refund commit
    // together or not at all.
    const refunded = await prisma.$transaction(async (tx) => {
      const { count } = await tx.pendingGeneration.deleteMany({
        where: { id: jobId, userId: user.id, status: "pending" },
      });
      if (count !== 1) return false;

      await tx.user.update({
        where: { id: user.id },
        data: { credits: { increment: job.creditsUsed } },
      });
      await tx.creditTransaction.create({
        data: {
          userId: user.id,
          amount: job.creditsUsed,
          type: "REFUND",
          description: `Queue job cancelled: ${job.prompt.substring(0, 50)}...`,
        },
      });
      return true;
    });

    if (!refunded) {
      return NextResponse.json(
        { error: "Can only cancel pending jobs." },
        { status: 409 }
      );
    }

    console.log(`[Queue] Job ${jobId} cancelled, ${job.creditsUsed} credits refunded`);

    return NextResponse.json({
      success: true,
      message: "Job cancelled and credits refunded.",
      creditsRefunded: job.creditsUsed,
    });

  } catch (error) {
    console.error("[Queue Cancel] Error:", error);
    return NextResponse.json(
      { error: "Failed to cancel job." },
      { status: 500 }
    );
  }
}
