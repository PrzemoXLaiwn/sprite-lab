import { NextRequest, NextResponse } from "next/server";
import { processPendingJobs } from "@/lib/analytics/image-analyzer";
import { runAutoLearning, updateHallucinationPrevention } from "@/lib/analytics/auto-learner";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

// Vercel Cron Job - Automatyczna analiza obrazów
// Runs hourly ("5 * * * *" in vercel.json). It used to run every 2 minutes —
// 720 invocations a day used up the Vercel plan's function limits and the
// site was switched off with HTTP 402 (2026-09).

export const maxDuration = 60; // Max 60 sekund na wykonanie
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Weryfikacja CRON_SECRET (Vercel wysyła go jako Bearer token)
    if (!isAuthorizedCronRequest(request)) {
      console.log("[CRON] ❌ Unauthorized cron request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Sprawdź czy mamy klucz Anthropic
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log("[CRON] ⚠️ ANTHROPIC_API_KEY not configured, skipping");
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "ANTHROPIC_API_KEY not configured",
      });
    }

    console.log("[CRON] 🔄 Starting automatic analysis...");
    const startTime = Date.now();

    // 1. Przetwórz oczekujące analizy obrazów (hourly run → bigger batch)
    const processedJobs = await processPendingJobs(30);
    console.log(`[CRON] ✅ Processed ${processedJobs} analysis jobs`);

    // 2. Every run (hourly) - aktualizuj wzorce halucynacji
    const hallucinationFixes = await updateHallucinationPrevention();
    console.log(`[CRON] 🛡️ Updated ${hallucinationFixes} hallucination patterns`);

    // 3. Co 6 godzin - uruchom pełne uczenie (0:00, 6:00, 12:00, 18:00 UTC)
    const hour = new Date().getUTCHours();
    let learningResult = null;

    if ([0, 6, 12, 18].includes(hour)) {
      learningResult = await runAutoLearning();
      console.log(`[CRON] 🧠 Auto-learning: ${learningResult.updated} updated, ${learningResult.skipped} skipped`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[CRON] ✨ Completed in ${duration}s`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}s`,
      results: {
        processedJobs,
        hallucinationFixes,
        learning: learningResult,
      },
    });
  } catch (error) {
    console.error("[CRON] ❌ Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Cron job failed",
      },
      { status: 500 }
    );
  }
}
