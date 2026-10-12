import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { pickFolder, type FolderLite } from "@/lib/projects/auto-folder";

export const dynamic = "force-dynamic";

// =============================================================================
// Project asset membership
//   POST   { generationId, folderId?, folderHint? } → accept a sprite into the project.
//          folderId   = the user picked this folder explicitly → used as-is.
//          folderHint = the folder the user was generating for → preferred only
//                       when the sprite's type fits it.
//          Otherwise the sprite is auto-filed by type + prompt (src/lib/projects/
//          auto-folder.ts), creating a folder for its type when none fits.
//   PATCH  {}                               → re-sort every sprite in the project.
//   DELETE { generationId }                 → remove it from the project (the sprite
//                                             stays in My Assets).
// Every id is checked against the signed-in user (project, folder, generation).
// =============================================================================

const FOLDER_SELECT = {
  id: true, name: true, category: true, subcategory: true, description: true, suggestedAssets: true, sortOrder: true,
} as const;

async function authorize(projectId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
    select: { id: true, folders: { select: FOLDER_SELECT } },
  });
  if (!project) return { error: NextResponse.json({ error: "Project not found" }, { status: 404 }) };
  return { userId: user.id, project };
}

function readId(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 && v.length <= 64 ? v : null;
}

/** Resolve the auto-filing decision, creating the folder when needed (mutates `folders`). */
async function fileInto(
  projectId: string,
  folders: FolderLite[],
  sprite: { categoryId: string | null; subcategoryId: string | null; prompt: string },
  hint: string | null
): Promise<{ folder: FolderLite; created: boolean }> {
  const pick = pickFolder(sprite, folders, hint);
  if (pick.kind === "existing") return { folder: pick.folder, created: false };
  // Reuse a folder created earlier in this request / by name
  const same = folders.find((f) => f.name.toLowerCase() === pick.name.toLowerCase());
  if (same) return { folder: same, created: false };
  const created = await prisma.projectFolder.create({
    data: {
      projectId,
      name: pick.name,
      category: pick.category,
      subcategory: pick.subcategory,
      description: "Created automatically when sorting sprites",
      sortOrder: folders.reduce((m, f) => Math.max(m, f.sortOrder), 0) + 1,
    },
    select: FOLDER_SELECT,
  });
  folders.push(created);
  return { folder: created, created: true };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorize(id);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const generationId = readId(body?.generationId);
  const requestedFolderId = readId(body?.folderId);
  const folderHint = readId(body?.folderHint);
  if (!generationId) return NextResponse.json({ error: "generationId is required" }, { status: 400 });

  const generation = await prisma.generation.findFirst({
    where: { id: generationId, userId: auth.userId },
    select: { id: true, categoryId: true, subcategoryId: true, prompt: true },
  });
  if (!generation) return NextResponse.json({ error: "Sprite not found" }, { status: 404 });

  let folder: FolderLite;
  let created = false;
  if (requestedFolderId) {
    const chosen = auth.project.folders.find((f) => f.id === requestedFolderId);
    if (!chosen) return NextResponse.json({ error: "Folder not found in this project" }, { status: 404 });
    folder = chosen;
  } else {
    ({ folder, created } = await fileInto(id, auth.project.folders, generation, folderHint));
  }

  await prisma.generation.update({
    where: { id: generation.id },
    data: { projectId: id, folderId: folder.id },
  });

  return NextResponse.json({ success: true, folderId: folder.id, folderName: folder.name, createdFolder: created });
}

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorize(id);
  if ("error" in auth) return auth.error;

  const sprites = await prisma.generation.findMany({
    where: { projectId: id, userId: auth.userId },
    select: { id: true, categoryId: true, subcategoryId: true, prompt: true, folderId: true },
    orderBy: { createdAt: "asc" },
    take: 2000,
  });
  const folders = [...auth.project.folders];
  let moved = 0;
  const createdNames: string[] = [];
  for (const s of sprites) {
    const { folder, created } = await fileInto(id, folders, s, null);
    if (created) createdNames.push(folder.name);
    if (folder.id !== s.folderId) {
      await prisma.generation.update({ where: { id: s.id }, data: { folderId: folder.id } });
      moved++;
    }
  }
  return NextResponse.json({ success: true, moved, total: sprites.length, createdFolders: createdNames });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorize(id);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const generationId = readId(body?.generationId);
  if (!generationId) return NextResponse.json({ error: "generationId is required" }, { status: 400 });

  const result = await prisma.generation.updateMany({
    where: { id: generationId, userId: auth.userId, projectId: id },
    data: { projectId: null, folderId: null },
  });
  if (result.count === 0) return NextResponse.json({ error: "Sprite not in this project" }, { status: 404 });
  return NextResponse.json({ success: true });
}
