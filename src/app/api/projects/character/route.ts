import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function characterName(prompt: string): string {
  const head = prompt.replace(/^(\[[^\]]*\]\s*)+/, "").split(/[,.]/)[0].trim();
  return (head || "Character").slice(0, 60);
}

/** Files a sprite (and animations made from it) into a new project. No model call. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const generationId = typeof body?.generationId === "string" ? body.generationId : "";
  if (!generationId) return NextResponse.json({ error: "Pick a character." }, { status: 400 });

  const generation = await prisma.generation.findFirst({
    where: { id: generationId, userId: user.id },
    select: { id: true, prompt: true, styleId: true, seed: true, projectId: true },
  });
  if (!generation) return NextResponse.json({ error: "Sprite not found." }, { status: 404 });
  if (generation.projectId) return NextResponse.json({ projectId: generation.projectId, already: true });

  const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim().slice(0, 60) : characterName(generation.prompt);
  const project = await prisma.project.create({
    data: {
      userId: user.id,
      name,
      artStyle: generation.styleId,
      styleLockEnabled: true,
      styleLockedSeed: generation.seed,
      styleLockedPromptPrefix: generation.prompt.slice(0, 500),
      gameType: "RPG",
    },
    select: { id: true, name: true },
  });

  await prisma.generation.updateMany({
    where: {
      userId: user.id,
      OR: [{ id: generation.id }, { sourceGenerationId: generation.id }],
    },
    data: { projectId: project.id },
  });

  return NextResponse.json({ projectId: project.id, name: project.name });
}
