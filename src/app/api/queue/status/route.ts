// @ts-nocheck - Remove after running: npx prisma generate
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

    const { jobId } = await request.json();

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID required." },
        { status: 400 }
      );
    }

    // Find the job
    const job = await prisma.pendingGeneration.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found." },
        { status: 404 }
      );
    }

    // Verify ownership
    if (job.userId !== user.id) {
      return NextResponse.json(
        { error: "Not authorized." },
        { status: 403 }
      );
    }

    // Only allow canceling pending jobs (not processing ones)
    if (job.status !== "pending") {
      return NextResponse.json(
        { error: "Can only cancel pending jobs." },
        { status: 400 }
      );
    }

    // Refund credits
    await prisma.user.update({
      where: { id: user.id },
      data: {
        credits: { increment: job.creditsUsed }
      }
    });

    // Log the refund
    await prisma.creditTransaction.create({
      data: {
        userId: user.id,
        amount: job.creditsUsed,
        type: "REFUND",
        description: `Queue job cancelled: ${job.prompt.substring(0, 50)}...`
      }
    });

    // Delete the job
    await prisma.pendingGeneration.delete({
      where: { id: jobId }
    });

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
