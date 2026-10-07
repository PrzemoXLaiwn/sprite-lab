import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyUnsubscribe } from "@/lib/email/unsubscribe";

export const dynamic = "force-dynamic";

// GET  = the link in the email footer → unsubscribe, then show a confirmation page.
// POST = RFC 8058 one-click from the mail client's own "Unsubscribe" button.

async function unsubscribe(userId: string, token: string): Promise<boolean> {
  if (!verifyUnsubscribe(userId, token)) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { emailPreferences: true } });
  if (!user) return false;
  const prefs = (user.emailPreferences as Record<string, unknown> | null) ?? {};
  await prisma.user.update({
    where: { id: userId },
    data: {
      emailPreferences: {
        ...prefs,
        marketing: false,
        dailyReminders: false,
        weeklyDigest: false,
        unsubscribedAt: new Date().toISOString(),
      },
    },
  });
  return true;
}

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u") ?? "";
  const t = req.nextUrl.searchParams.get("t") ?? "";
  const ok = await unsubscribe(u, t).catch(() => false);
  return NextResponse.redirect(new URL(ok ? "/unsubscribed" : "/unsubscribed?error=1", req.nextUrl.origin));
}

export async function POST(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u") ?? "";
  const t = req.nextUrl.searchParams.get("t") ?? "";
  const ok = await unsubscribe(u, t).catch(() => false);
  return NextResponse.json({ success: ok }, { status: ok ? 200 : 400 });
}
