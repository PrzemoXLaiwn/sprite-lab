import { isUploadedPrompt } from "@/lib/image/import-sprite";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { BLOCKED_MESSAGE, isBlockedText } from "@/lib/moderation/content-filter";
import { deleteImageFromStorage } from "@/lib/storage";
import { deleteFromR2, isR2Configured, isR2Url } from "@/lib/r2";
import { findAnimationSourceId } from "@/lib/db/generations";
import { parseAnimationPrompt } from "@/lib/workspace/history";

// ===========================================
// DELETE - Delete a generation
// ===========================================
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    // Authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const generationId = params.id;

    // Find the generation
    const generation = await prisma.generation.findUnique({
      where: { id: generationId },
    });

    if (!generation) {
      return NextResponse.json(
        { error: "Generation not found." },
        { status: 404 }
      );
    }

    // Check ownership
    if (generation.userId !== user.id) {
      return NextResponse.json(
        { error: "You don't have permission to delete this generation." },
        { status: 403 }
      );
    }

    // Delete from storage (Supabase or R2). Best-effort: a storage failure
    // must not block removing the DB record.
    try {
      if (generation.imageUrl.includes("supabase")) {
        await deleteImageFromStorage(generation.imageUrl);
      } else if (isR2Configured() && isR2Url(generation.imageUrl)) {
        await deleteFromR2(generation.imageUrl);
      }
    } catch (storageError) {
      console.error("[Delete Generation] Storage delete failed:", storageError);
    }

    // Delete from database
    await prisma.generation.delete({
      where: { id: generationId },
    });

    return NextResponse.json({
      success: true,
      message: "Generation deleted successfully.",
    });
  } catch (error) {
    console.error("[Delete Generation] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete generation" },
      { status: 500 }
    );
  }
}

// ===========================================
// PATCH - Update generation (toggle public, etc.)
// Note: Requires migration to add isPublic field
// ===========================================
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const generationId = params.id;
    const body = await request.json();
    const { isPublic } = body;

    // Find the generation
    const generation = await prisma.generation.findUnique({
      where: { id: generationId },
    });

    if (!generation) {
      return NextResponse.json(
        { error: "Generation not found." },
        { status: 404 }
      );
    }

    // Check ownership
    if (generation.userId !== user.id) {
      return NextResponse.json(
        { error: "You don't have permission to update this generation." },
        { status: 403 }
      );
    }

    // Nothing the content filter catches goes public, and banned accounts can't share
    if (isPublic === true) {
      if (isBlockedText(generation.prompt)) {
        return NextResponse.json({ error: BLOCKED_MESSAGE }, { status: 403 });
      }
      const owner = await prisma.user.findUnique({ where: { id: user.id }, select: { isActive: true } });
      if (!owner?.isActive) {
        return NextResponse.json({ error: "Your account can't share to the community right now." }, { status: 403 });
      }
    }

    // Uploaded images (and animations or edits made from them) stay private:
    // we can't vouch for who owns the original art
    if (isPublic === true) {
      const source = generation.sourceGenerationId
        ? await prisma.generation.findUnique({ where: { id: generation.sourceGenerationId }, select: { fullPrompt: true } })
        : null;
      if (isUploadedPrompt(generation.fullPrompt) || isUploadedPrompt(source?.fullPrompt)) {
        return NextResponse.json(
          { error: "Sprites made from an uploaded image can't be shared to the community gallery." },
          { status: 403 }
        );
      }
    }

    // Update the generation - isPublic field will work after migration
    const updateData: Record<string, unknown> = {};
    if (typeof isPublic === "boolean") {
      updateData.isPublic = isPublic;
    }

    const updated = await prisma.generation.update({
      where: { id: generationId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      generation: updated,
      message: isPublic ? "Shared to community!" : "Removed from community.",
    });
  } catch (error) {
    console.error("[Update Generation] Error:", error);
    return NextResponse.json(
      { error: "Failed to update generation" },
      { status: 500 }
    );
  }
}

// ===========================================
// GET - Get single generation
// ===========================================
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    // Authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const generationId = params.id;

    // Find the generation
    const generation = await prisma.generation.findUnique({
      where: { id: generationId },
    });

    if (!generation) {
      return NextResponse.json(
        { error: "Generation not found." },
        { status: 404 }
      );
    }

    // Check ownership
    if (generation.userId !== user.id) {
      return NextResponse.json(
        { error: "You don't have permission to view this generation." },
        { status: 403 }
      );
    }

    // Animations: point back to the sprite they were made from, so the
    // Animate tool can reopen both (best-effort match, see findAnimationSourceId)
    let sourceGenerationId: string | null = null;
    const parsed = generation.subcategoryId === "ANIMATION" ? parseAnimationPrompt(generation.prompt) : null;
    if (parsed && generation.sourceGenerationId) {
      sourceGenerationId = generation.sourceGenerationId; // stored link (Oct 2026+)
    } else if (parsed) {
      sourceGenerationId = await findAnimationSourceId(user.id, {
        sourcePrompt: parsed.sourcePrompt,
        createdAt: generation.createdAt,
        savedPromptLength: generation.prompt.length,
      });
    }

    return NextResponse.json({
      success: true,
      generation,
      ...(parsed ? { sourceGenerationId } : {}),
    });
  } catch (error) {
    console.error("[Get Generation] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch generation" },
      { status: 500 }
    );
  }
}
