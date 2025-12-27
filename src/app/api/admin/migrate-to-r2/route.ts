import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { uploadToR2, isR2Configured, isSupabaseUrl, isR2Url } from "@/lib/r2";

/**
 * Migration API for moving images from Supabase Storage to Cloudflare R2
 *
 * GET: Returns migration stats
 * POST: Migrates a batch of images
 */

// GET /api/admin/migrate-to-r2
// Returns count of images on Supabase vs R2
export async function GET() {
  try {
    // Auth check - admin only
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
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get counts
    const [totalGenerations, generations] = await Promise.all([
      prisma.generation.count(),
      prisma.generation.findMany({
        select: { imageUrl: true },
      }),
    ]);

    // Categorize URLs
    let supabaseCount = 0;
    let r2Count = 0;
    let otherCount = 0;

    for (const gen of generations) {
      if (isSupabaseUrl(gen.imageUrl)) {
        supabaseCount++;
      } else if (isR2Url(gen.imageUrl)) {
        r2Count++;
      } else {
        otherCount++;
      }
    }

    return NextResponse.json({
      success: true,
      r2Configured: isR2Configured(),
      stats: {
        total: totalGenerations,
        onSupabase: supabaseCount,
        onR2: r2Count,
        other: otherCount, // Temporary URLs or other storage
        percentMigrated: totalGenerations > 0
          ? ((r2Count / totalGenerations) * 100).toFixed(1) + "%"
          : "0%",
      },
      message: supabaseCount === 0
        ? "All images are already on R2 or other storage!"
        : `${supabaseCount} images need migration from Supabase to R2`,
    });

  } catch (error) {
    console.error("[Migration] Stats error:", error);
    return NextResponse.json(
      { error: "Failed to get migration stats" },
      { status: 500 }
    );
  }
}

// POST /api/admin/migrate-to-r2
// Migrates a batch of images from Supabase to R2
export async function POST(request: Request) {
  try {
    // Auth check - admin only
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
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Check R2 configuration
    if (!isR2Configured()) {
      return NextResponse.json(
        { error: "R2 is not configured. Please set R2_* environment variables." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      batchSize = 50,
      dryRun = true,
      deleteAfter = false, // Whether to delete from Supabase after migration
    } = body;

    console.log(`[Migration] Starting migration (batchSize: ${batchSize}, dryRun: ${dryRun}, deleteAfter: ${deleteAfter})`);

    // Find generations with Supabase URLs
    const generations = await prisma.generation.findMany({
      where: {
        imageUrl: {
          contains: "supabase",
        },
      },
      take: batchSize,
      orderBy: { createdAt: "asc" }, // Oldest first
    });

    if (generations.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No images to migrate! All images are already on R2.",
        migrated: 0,
        failed: 0,
        remaining: 0,
      });
    }

    console.log(`[Migration] Found ${generations.length} images to migrate`);

    const results: Array<{
      id: string;
      status: "success" | "failed" | "skipped";
      oldUrl?: string;
      newUrl?: string;
      error?: string;
    }> = [];

    for (const generation of generations) {
      try {
        // Skip if already R2
        if (isR2Url(generation.imageUrl)) {
          results.push({
            id: generation.id,
            status: "skipped",
            oldUrl: generation.imageUrl,
          });
          continue;
        }

        if (dryRun) {
          // Dry run - just report what would be done
          results.push({
            id: generation.id,
            status: "success",
            oldUrl: generation.imageUrl,
            newUrl: "[DRY RUN - would upload to R2]",
          });
          continue;
        }

        // Actually migrate the image
        console.log(`[Migration] Migrating ${generation.id}...`);

        const r2Result = await uploadToR2(generation.imageUrl, generation.userId);

        if (!r2Result.success || !r2Result.url) {
          results.push({
            id: generation.id,
            status: "failed",
            oldUrl: generation.imageUrl,
            error: r2Result.error || "Upload failed",
          });
          continue;
        }

        // Update database with new URL
        await prisma.generation.update({
          where: { id: generation.id },
          data: { imageUrl: r2Result.url },
        });

        results.push({
          id: generation.id,
          status: "success",
          oldUrl: generation.imageUrl,
          newUrl: r2Result.url,
        });

        // Optionally delete from Supabase
        if (deleteAfter) {
          try {
            // Extract path from Supabase URL and delete
            const urlParts = generation.imageUrl.split("/storage/v1/object/public/generations/");
            if (urlParts.length === 2) {
              const filePath = urlParts[1];
              await supabase.storage.from("generations").remove([filePath]);
              console.log(`[Migration] Deleted from Supabase: ${filePath}`);
            }
          } catch (deleteError) {
            console.log(`[Migration] Failed to delete from Supabase (non-critical):`, deleteError);
          }
        }

        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 200));

      } catch (error) {
        console.error(`[Migration] Error migrating ${generation.id}:`, error);
        results.push({
          id: generation.id,
          status: "failed",
          oldUrl: generation.imageUrl,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Count remaining
    const remainingCount = await prisma.generation.count({
      where: {
        imageUrl: {
          contains: "supabase",
        },
      },
    });

    // Summary
    const migrated = results.filter(r => r.status === "success").length;
    const failed = results.filter(r => r.status === "failed").length;
    const skipped = results.filter(r => r.status === "skipped").length;

    console.log(`[Migration] Complete: ${migrated} migrated, ${failed} failed, ${skipped} skipped, ${remainingCount} remaining`);

    return NextResponse.json({
      success: true,
      dryRun,
      migrated,
      failed,
      skipped,
      remaining: remainingCount,
      results: results.slice(0, 20), // Only return first 20 results for brevity
      message: dryRun
        ? `[DRY RUN] Would migrate ${migrated} images. Run with dryRun: false to actually migrate.`
        : `Migrated ${migrated} images to R2. ${remainingCount} remaining.`,
    });

  } catch (error) {
    console.error("[Migration] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Migration failed" },
      { status: 500 }
    );
  }
}
