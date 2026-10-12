import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { rateLimitChat } from "@/lib/rate-limit";

// =============================================================================
// Community live chat
//   GET    ?limit=N   newest N messages (oldest first), public, CDN-cached 5 s
//                     so many open tabs cost one database read, not one each
//   POST   {message}  signed-in users only, 10 / minute, no links
//   DELETE ?id=…      moderators remove a message
// =============================================================================

const MAX_LENGTH = 500;
const MODERATOR_ROLES = new Set(["MODERATOR", "ADMIN", "OWNER"]);
// Links are the main spam vector in an open chat
const LINK = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|gg|xyz|ru|co|me|link|ly)\b)/i;

type Author = { name: string | null; username: string | null; avatarUrl: string | null; plan: string };

async function authors(ids: string[]): Promise<Map<string, Author>> {
  const users = await prisma.user.findMany({
    where: { id: { in: [...new Set(ids)] } },
    select: { id: true, name: true, username: true, avatarUrl: true, plan: true },
  });
  return new Map(users.map((u) => [u.id, u]));
}

function toDto(m: { id: string; userId: string; message: string; createdAt: Date }, a?: Author) {
  return {
    id: m.id,
    userId: m.userId,
    message: m.message,
    createdAt: m.createdAt.toISOString(),
    userName: a?.name || a?.username || null,
    userAvatar: a?.avatarUrl ?? null,
    userPlan: a?.plan ?? "FREE",
  };
}

export async function GET(req: NextRequest) {
  const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get("limit")) || 50, 1), 100);
  try {
    const rows = await prisma.chatMessage.findMany({ orderBy: { createdAt: "desc" }, take: limit });
    const byId = await authors(rows.map((r) => r.userId));
    const messages = rows.reverse().map((r) => toDto(r, byId.get(r.userId)));
    return NextResponse.json(
      { messages },
      { headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=25" } }
    );
  } catch (err) {
    console.error("[Chat] GET failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ messages: [] }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to chat." }, { status: 401 });

  const { blocked } = await rateLimitChat(user.id);
  if (blocked) return NextResponse.json({ error: "Slow down — max 10 messages a minute." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const message = typeof body?.message === "string"
    // strip control characters, collapse whitespace
    ? body.message.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim()
    : "";
  if (!message) return NextResponse.json({ error: "Type a message first." }, { status: 400 });
  if (message.length > MAX_LENGTH) return NextResponse.json({ error: `Max ${MAX_LENGTH} characters.` }, { status: 400 });
  if (LINK.test(message)) return NextResponse.json({ error: "Links aren't allowed in chat — share sprites in the gallery instead." }, { status: 400 });

  const author = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, username: true, avatarUrl: true, plan: true, isActive: true },
  });
  if (!author || !author.isActive) return NextResponse.json({ error: "Your account can't post right now." }, { status: 403 });

  const created = await prisma.chatMessage.create({ data: { userId: user.id, message } });
  return NextResponse.json({ message: toDto(created, author) });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } });
  if (!me || !MODERATOR_ROLES.has(me.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = req.nextUrl.searchParams.get("id")?.slice(0, 64);
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.chatMessage.deleteMany({ where: { id } });
  return NextResponse.json({ success: true });
}
