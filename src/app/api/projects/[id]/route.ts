import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET — get single project with folders and generation counts
export async function GET(
  _req: NextRequest,
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

  return NextResponse.json({ project });
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

  const body = await req.json();
  const { name, gameType, perspective, artStyle, mood, systems, notes } = body;

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
}
