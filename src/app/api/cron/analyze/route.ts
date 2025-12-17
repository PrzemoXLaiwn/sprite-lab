import { NextRequest, NextResponse } from "next/server";
import { processPendingJobs } from "@/lib/analytics/image-analyzer";
import { runAutoLearning, updateHallucinationPrevention } from "@/lib/analytics/auto-learner";

// Vercel Cron Job - Automatyczna analiza obrazów
// Wywoływany automatycznie co 2 minuty przez Vercel
// Harmonogram w vercel.json: "*/2 * * * *" (co 2 minuty)

export const maxDuration = 60; // Max 60 sekund na wykonanie
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Weryfikacja że to Vercel Cron (opcjonalnie CRON_SECRET)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Vercel dodaje specjalny header dla cron jobs
    const isVercelCron = request.headers.get("x-vercel-cron") === "true";

    // Akceptuj jeśli to Vercel Cron LUB poprawny secret
    const isAuthorized =
      isVercelCron || (cronSecret && authHeader === `Bearer ${cronSecret}`);

    if (!isAuthorized && process.env.NODE_ENV === "production") {
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

    // 1. Przetwórz oczekujące analizy obrazów (max 10 na raz)
    const processedJobs = await processPendingJobs(10);
    console.log(`[CRON] ✅ Processed ${processedJobs} analysis jobs`);

    // 2. Co godzinę - aktualizuj wzorce halucynacji
    const minute = new Date().getMinutes();
    let hallucinationFixes = 0;

    if (minute < 10) {
      // Tylko w pierwszych 10 minutach każdej godziny
      hallucinationFixes = await updateHallucinationPrevention();
      console.log(`[CRON] 🛡️ Updated ${hallucinationFixes} hallucination patterns`);
    }

    // 3. Co 6 godzin - uruchom pełne uczenie (0:00, 6:00, 12:00, 18:00)
    const hour = new Date().getHours();
    let learningResult = null;

    if ([0, 6, 12, 18].includes(hour) && minute < 2) {
      // W pierwszych 2 minutach co 6 godzin
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
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
