import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getUserRole, type UserRole } from "@/lib/admin";

export const dynamic = "force-dynamic";

// =============================================================================
// POST /api/moderation — community moderation for MODERATOR and above
//   unpublish        take a sprite out of the public gallery (the owner keeps it)
//   delete_comment   remove a gallery comment
//   delete_chat      remove a live-chat message
//   ban / unban      block an account from the community: it can't share,
//                    comment or chat, its shared sprites, comments and chat
//                    messages disappear from public view (rows are kept, so an
//                    unban restores comments and chat; shared sprites stay private)
// Every action is logged as a RESOLVED report (moderator, target, action).
// Staff accounts can only be moderated by someone of a higher role.
// =============================================================================

const LEVEL: Record<UserRole, number> = { USER: 0, SUPPORT: 1, MODERATOR: 2, ADMIN: 3, OWNER: 4 };
const id = z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/);
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("unpublish"), generationId: id, note: z.string().max(300).optional() }),
  z.object({ action: z.literal("delete_comment"), commentId: id }),
  z.object({ action: z.literal("delete_chat"), messageId: id }),
  // By account id, or by one of the account's sprites (the gallery doesn't expose user ids)
  z.object({ action: z.literal("ban"), userId: id.optional(), generationId: id.optional(), note: z.string().max(300).optional() }),
  z.object({ action: z.literal("unban"), userId: id }),
]);

async function log(moderatorId: string, action: string, target: { userId?: string | null; generationId?: string | null }, note?: string) {
  await prisma.report.create({
    data: {
      reporterId: moderatorId, moderatorId, reportedUserId: target.userId ?? null, generationId: target.generationId ?? null,
      reason: "OTHER", description: `moderation:${action}`, status: "RESOLVED", moderatorNote: note ?? null,
    },
  }).catch((err) => console.error("[Moderation] log failed:", err instanceof Error ? err.message : err));
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = await getUserRole(user.id);
  if (!role || LEVEL[role] < LEVEL.MODERATOR) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const b = parsed.data;

  // Staff can't be moderated by an equal or lower role
  const canTouch = async (targetUserId: string) => {
    const targetRole = (await getUserRole(targetUserId)) ?? "USER";
    return LEVEL[targetRole] < LEVEL[role];
  };

  try {
    switch (b.action) {
      case "unpublish": {
        const g = await prisma.generation.findUnique({ where: { id: b.generationId }, select: { userId: true } });
        if (!g) return NextResponse.json({ error: "Not found" }, { status: 404 });
        await prisma.generation.update({ where: { id: b.generationId }, data: { isPublic: false } });
        revalidateTag("featured-generations", { expire: 0 });
        revalidatePath("/community");
        await log(user.id, "unpublish", { userId: g.userId, generationId: b.generationId }, b.note);
        return NextResponse.json({ ok: true });
      }
      case "delete_comment": {
        const c = await prisma.comment.findUnique({ where: { id: b.commentId }, select: { userId: true, generationId: true } });
        if (!c) return NextResponse.json({ ok: true });
        await prisma.comment.delete({ where: { id: b.commentId } });
        await log(user.id, "delete_comment", { userId: c.userId, generationId: c.generationId });
        return NextResponse.json({ ok: true });
      }
      case "delete_chat": {
        const m = await prisma.chatMessage.findUnique({ where: { id: b.messageId }, select: { userId: true } });
        if (!m) return NextResponse.json({ ok: true });
        await prisma.chatMessage.delete({ where: { id: b.messageId } });
        await log(user.id, "delete_chat", { userId: m.userId });
        return NextResponse.json({ ok: true });
      }
      case "ban":
      case "unban": {
        if (b.action === "ban" && !b.userId) {
          const g = b.generationId
            ? await prisma.generation.findUnique({ where: { id: b.generationId }, select: { userId: true } })
            : null;
          if (!g) return NextResponse.json({ error: "Not found" }, { status: 404 });
          b.userId = g.userId;
        }
        if (!b.userId) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        if (b.userId === user.id) return NextResponse.json({ error: "You can't do that to your own account." }, { status: 400 });
        if (!(await canTouch(b.userId))) return NextResponse.json({ error: "Only a higher role can moderate this account." }, { status: 403 });
        if (b.action === "ban") {
          // Banned: no community access; shared sprites go private (they don't come back on unban)
          await prisma.$transaction([
            prisma.user.update({ where: { id: b.userId }, data: { isActive: false } }),
            prisma.generation.updateMany({ where: { userId: b.userId, isPublic: true }, data: { isPublic: false } }),
          ]);
          revalidateTag("featured-generations", { expire: 0 });
        revalidatePath("/community");
        } else {
          await prisma.user.update({ where: { id: b.userId }, data: { isActive: true } });
        }
        await log(user.id, b.action, { userId: b.userId }, "note" in b ? b.note : undefined);
        return NextResponse.json({ ok: true });
      }
    }
  } catch (err) {
    console.error("[Moderation] failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't apply that. Try again." }, { status: 500 });
  }
}
