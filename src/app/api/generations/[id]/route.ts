import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { deleteImageFromStorage } from "@/lib/storage";

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

    // Delete from storage (if it's a Supabase storage URL)
    if (generation.imageUrl.includes("supabase")) {
      await deleteImageFromStorage(generation.imageUrl);
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
      { error: error instanceof Error ? error.message : "Failed to delete generation" },
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
      { error: error instanceof Error ? error.message : "Failed to update generation" },
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

    return NextResponse.json({
      success: true,
      generation,
    });
  } catch (error) {
    console.error("[Get Generation] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch generation" },
      { status: 500 }
    );
  }
}
