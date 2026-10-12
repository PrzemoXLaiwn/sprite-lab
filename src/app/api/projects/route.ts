import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import { rateLimitFeedback } from "@/lib/rate-limit";
import { parseProjectFields } from "./validation";

export const dynamic = "force-dynamic";

// GET — list user's projects
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    include: {
      folders: { orderBy: { sortOrder: "asc" } },
      _count: { select: { generations: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ projects });
}

// POST — create project + AI-generate folders
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Each create triggers a paid Anthropic call — limit per user (10/hour,
  // reusing the generic per-user feedback limiter under its own bucket).
  const { blocked } = await rateLimitFeedback(`project:${user.id}`);
  if (blocked) return blocked;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = parseProjectFields(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { name, gameType, perspective, artStyle, mood, systems, notes } = parsed.fields;

  if (!name) {
    return NextResponse.json({ error: "Project name is required" }, { status: 400 });
  }

  try {
    // Create the project first
    const project = await prisma.project.create({
      data: {
        userId: user.id,
        name,
        gameType: gameType || null,
        perspective: perspective || null,
        artStyle: artStyle || null,
        mood: mood || null,
        systems: systems || null,
        notes: notes || null,
      },
    });

    // Generate folder plan with AI
    const folders = (await generateFolderPlan({
      name,
      gameType: gameType ?? undefined,
      perspective: perspective ?? undefined,
      artStyle: artStyle ?? undefined,
      mood: mood ?? undefined,
      systems: systems ?? undefined,
      notes: notes ?? undefined,
    })).filter(
      // AI output is untrusted — drop entries missing the required string fields
      (f) => f && typeof f.name === "string" && typeof f.category === "string"
    );

    // Map perspective to default view
    const viewMap: Record<string, string> = {
      "top-down": "TOP_DOWN",
      "side-scroll": "SIDE_VIEW",
      "isometric": "DEFAULT",
      "front": "FRONT",
    };

    // Map artStyle to style ID
    const styleMap: Record<string, string> = {
      "pixel art": "PIXEL_ART_16",
      "pixel art hd": "PIXEL_ART_32",
      "hand-painted": "HAND_PAINTED",
      "anime": "ANIME_GAME",
      "dark fantasy": "DARK_SOULS",
      "cartoon": "CARTOON_WESTERN",
      "vector": "VECTOR_CLEAN",
      "realistic": "REALISTIC_PAINTED",
    };

    const defaultView = viewMap[(perspective || "").toLowerCase()] || "DEFAULT";
    const defaultStyleId = styleMap[(artStyle || "").toLowerCase()] || "PIXEL_ART_16";

    // Create folders in DB
    if (folders.length > 0) {
      await prisma.projectFolder.createMany({
        data: folders.map((f, i) => ({
          projectId: project.id,
          name: f.name,
          category: f.category,
          subcategory: typeof f.subcategory === "string" ? f.subcategory : null,
          description: typeof f.description === "string" ? f.description : null,
          suggestedAssets: f.suggestedAssets ? JSON.stringify(f.suggestedAssets) : null,
          defaultStyleId,
          defaultView,
          sortOrder: i,
        })),
      });
    }

    // Fetch complete project with folders
    const fullProject = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        folders: { orderBy: { sortOrder: "asc" } },
        _count: { select: { generations: true } },
      },
    });

    return NextResponse.json({ project: fullProject });
  } catch (error) {
    console.error("[Projects POST] Error:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}

// ─── AI Folder Plan Generator ─────────────────────────────────────────────────

interface FolderPlan {
  name: string;
  category: string;
  subcategory?: string;
  description?: string;
  suggestedAssets?: string[];
}

async function generateFolderPlan(brief: {
  name?: string; gameType?: string; perspective?: string;
  artStyle?: string; mood?: string; systems?: string; notes?: string;
}): Promise<FolderPlan[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Fallback: return default folders
    return getDefaultFolders(brief.systems || "");
  }

  try {
    const anthropic = new Anthropic({ apiKey });

    const briefText = [
      brief.gameType && `Game type: ${brief.gameType}`,
      brief.perspective && `Perspective: ${brief.perspective}`,
      brief.artStyle && `Art style: ${brief.artStyle}`,
      brief.mood && `Mood: ${brief.mood}`,
      brief.systems && `Systems: ${brief.systems}`,
      brief.notes && `Notes: ${brief.notes}`,
    ].filter(Boolean).join("\n");

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      system: `You create asset folder plans for 2D game projects. Output ONLY a JSON array.

Each folder object has:
- name: display name (e.g. "Player Character", "Floor Tiles")
- category: one of CHARACTERS, CREATURES, WEAPONS, ARMOR, CONSUMABLES, RESOURCES, QUEST_ITEMS, UI_ELEMENTS, ENVIRONMENT, EFFECTS, PROJECTILES
- subcategory: specific type (e.g. HEROES, ENEMIES, SWORDS, POTIONS, ITEM_ICONS)
- description: 1 sentence about what assets go here
- suggestedAssets: array of 3-5 specific asset ideas

Create 8-15 folders based on the game brief. Be specific to the game type.
Output raw JSON array only, no markdown, no explanation.`,
      messages: [{
        role: "user",
        content: `Create an asset folder plan for this game:\n${briefText}`,
      }],
    });

    const text = response.content[0];
    if (text.type !== "text") return getDefaultFolders(brief.systems || "");

    const parsed = JSON.parse(text.text) as FolderPlan[];
    if (!Array.isArray(parsed)) return getDefaultFolders(brief.systems || "");

    return parsed.slice(0, 20); // Cap at 20 folders
  } catch (error) {
    console.error("[ProjectPlan] AI generation failed:", error);
    return getDefaultFolders(brief.systems || "");
  }
}

function getDefaultFolders(systems: string): FolderPlan[] {
  const folders: FolderPlan[] = [
    { name: "Player Character", category: "CHARACTERS", subcategory: "HEROES", description: "Main playable character", suggestedAssets: ["idle pose", "walking", "attack animation"] },
    { name: "Enemies", category: "CHARACTERS", subcategory: "ENEMIES", description: "Hostile enemies", suggestedAssets: ["basic enemy", "ranged enemy", "fast enemy"] },
    { name: "Bosses", category: "CHARACTERS", subcategory: "BOSSES", description: "Boss encounters", suggestedAssets: ["main boss", "mini boss"] },
    { name: "Weapons", category: "WEAPONS", subcategory: "SWORDS", description: "Combat weapons", suggestedAssets: ["starter sword", "fire sword", "legendary blade"] },
    { name: "Environment Props", category: "ENVIRONMENT", subcategory: "PROPS", description: "World decoration", suggestedAssets: ["barrel", "crate", "torch", "signpost"] },
  ];

  if (systems?.toLowerCase().includes("inventory")) {
    folders.push({ name: "Inventory Icons", category: "UI_ELEMENTS", subcategory: "ITEM_ICONS", description: "Item icons for inventory", suggestedAssets: ["sword icon", "potion icon", "key icon"] });
  }
  if (systems?.toLowerCase().includes("potion") || systems?.toLowerCase().includes("consumable")) {
    folders.push({ name: "Potions", category: "CONSUMABLES", subcategory: "POTIONS", description: "Consumable items", suggestedAssets: ["health potion", "mana potion", "speed potion"] });
  }
  if (systems?.toLowerCase().includes("loot")) {
    folders.push({ name: "Loot Items", category: "QUEST_ITEMS", subcategory: "COLLECTIBLES", description: "Collectible loot", suggestedAssets: ["gold coin", "gem", "treasure chest"] });
  }

  return folders;
}
