import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { parseProjectFields } from "../validation";

export const dynamic = "force-dynamic";

// GET — single project with folders + counts. `?assets=1` also returns the
// project's sprites (for the project page and pack download).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
    include: {
      folders: {
        orderBy: { sortOrder: "asc" },
        include: {
          _count: { select: { generations: true } },
        },
      },
      _count: { select: { generations: true } },
    },
  });

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const withAssets = req.nextUrl.searchParams.get("assets") === "1";
  const assets = withAssets
    ? await prisma.generation.findMany({
        where: { projectId: id, userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 1000,
        select: {
          id: true, imageUrl: true, prompt: true, styleId: true, categoryId: true,
          subcategoryId: true, folderId: true, seed: true, createdAt: true,
        },
      })
    : undefined;

  return NextResponse.json({ project, assets });
}

// DELETE — delete project and all folders
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.project.deleteMany({
    where: { id, userId: user.id },
  });

  return NextResponse.json({ success: true });
}

// PATCH — update project details
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = parseProjectFields(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { name, gameType, perspective, artStyle, mood, systems, notes } = parsed.fields;

  // name is required on the model — it may be omitted but not cleared
  if (name === null) {
    return NextResponse.json({ error: "Project name cannot be empty" }, { status: 400 });
  }

  try {
    const project = await prisma.project.updateMany({
      where: { id, userId: user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(gameType !== undefined && { gameType }),
        ...(perspective !== undefined && { perspective }),
        ...(artStyle !== undefined && { artStyle }),
        ...(mood !== undefined && { mood }),
        ...(systems !== undefined && { systems }),
        ...(notes !== undefined && { notes }),
      },
    });

    if (project.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Projects PATCH] Error:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}
