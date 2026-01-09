import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// Define test combinations
const TEST_STYLES = [
  "PIXEL_ART_16",
  "PIXEL_ART_32",
  "HAND_PAINTED",
  "VECTOR_CLEAN",
  "ANIME_STYLE",
  "CARTOON_STYLE",
];

const TEST_CATEGORIES = [
  { categoryId: "WEAPONS", subcategoryId: "SWORDS", prompt: "fantasy sword with glowing runes" },
  { categoryId: "ARMOR", subcategoryId: "HELMETS", prompt: "knight helmet with golden crown" },
  { categoryId: "CHARACTERS", subcategoryId: "HEROES", prompt: "brave warrior knight" },
  { categoryId: "CREATURES", subcategoryId: "MYTHICAL", prompt: "small cute dragon" },
  { categoryId: "CONSUMABLES", subcategoryId: "POTIONS", prompt: "red health potion glowing" },
  { categoryId: "EFFECTS", subcategoryId: "MAGIC_EFFECTS", prompt: "magical ice spell effect" },
  { categoryId: "ENVIRONMENT", subcategoryId: "TREES_PLANTS", prompt: "fantasy oak tree" },
  { categoryId: "UI_ELEMENTS", subcategoryId: "ITEM_ICONS", prompt: "golden coin icon" },
];

interface TestJob {
  styleId: string;
  categoryId: string;
  subcategoryId: string;
  prompt: string;
}

// GET - Get test matrix info
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (!dbUser || !["ADMIN", "OWNER"].includes(dbUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generate test matrix
    const testJobs: TestJob[] = [];
    for (const style of TEST_STYLES) {
      for (const cat of TEST_CATEGORIES) {
        testJobs.push({
          styleId: style,
          categoryId: cat.categoryId,
          subcategoryId: cat.subcategoryId,
          prompt: cat.prompt,
        });
      }
    }

    return NextResponse.json({
      styles: TEST_STYLES,
      categories: TEST_CATEGORIES,
      totalTests: testJobs.length,
      testJobs,
    });
  } catch (error) {
    console.error("Batch Test API error:", error);
    return NextResponse.json(
      { error: "Failed to get test info" },
      { status: 500 }
    );
  }
}

// POST - Start batch test generation
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true, credits: true },
    });

    if (!dbUser || !["ADMIN", "OWNER"].includes(dbUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      selectedStyles = TEST_STYLES,
      selectedCategories = TEST_CATEGORIES,
      dryRun = false
    } = body;

    // Calculate how many generations we need
    const testJobs: TestJob[] = [];
    for (const style of selectedStyles) {
      for (const cat of selectedCategories) {
        testJobs.push({
          styleId: style,
          categoryId: cat.categoryId,
          subcategoryId: cat.subcategoryId,
          prompt: cat.prompt,
        });
      }
    }

    const totalCreditsNeeded = testJobs.length;

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        totalTests: testJobs.length,
        totalCreditsNeeded,
        currentCredits: dbUser.credits,
        hasEnoughCredits: dbUser.credits >= totalCreditsNeeded,
        testJobs,
      });
    }

    // Check if admin has enough credits
    if (dbUser.credits < totalCreditsNeeded) {
      return NextResponse.json({
        error: `Not enough credits. Need ${totalCreditsNeeded}, have ${dbUser.credits}`,
        totalCreditsNeeded,
        currentCredits: dbUser.credits,
      }, { status: 402 });
    }

    // Start generating in sequence (to avoid rate limits)
    const results: Array<{
      job: TestJob;
      success: boolean;
      imageUrl?: string;
      error?: string;
    }> = [];

    console.log(`[BatchTest] Starting ${testJobs.length} test generations for admin ${user.email}`);

    // Generate images one by one
    for (let i = 0; i < testJobs.length; i++) {
      const job = testJobs[i];
      console.log(`[BatchTest] ${i + 1}/${testJobs.length}: ${job.styleId} + ${job.categoryId}/${job.subcategoryId}`);

      try {
        // Call our own generate API
        const response = await fetch(new URL("/api/generate", request.url).toString(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Forward auth cookies
            cookie: request.headers.get("cookie") || "",
          },
          body: JSON.stringify({
            prompt: job.prompt,
            categoryId: job.categoryId,
            subcategoryId: job.subcategoryId,
            styleId: job.styleId,
            qualityPreset: "normal",
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          results.push({
            job,
            success: true,
            imageUrl: data.imageUrl,
          });
          console.log(`[BatchTest] ✅ Success: ${job.styleId} + ${job.categoryId}`);
        } else {
          results.push({
            job,
            success: false,
            error: data.error || "Unknown error",
          });
          console.log(`[BatchTest] ❌ Failed: ${job.styleId} + ${job.categoryId}: ${data.error}`);
        }

        // Small delay between generations to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.push({
          job,
          success: false,
          error: error instanceof Error ? error.message : "Request failed",
        });
        console.log(`[BatchTest] ❌ Error: ${job.styleId} + ${job.categoryId}: ${error}`);
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`[BatchTest] Complete: ${successCount} success, ${failCount} failed`);

    return NextResponse.json({
      success: true,
      totalTests: testJobs.length,
      successCount,
      failCount,
      results,
    });
  } catch (error) {
    console.error("Batch Test API error:", error);
    return NextResponse.json(
      { error: "Failed to run batch tests" },
      { status: 500 }
    );
  }
}
