import { readUtm } from "@/lib/funnel/events";
import { linkVisitorToUser } from "@/lib/funnel/store";
import { prismaQueryDb } from "@/lib/funnel/prisma-db";
import {
  TOUCH_COOKIE,
  parseTouchCookie,
  readCookie,
  recordServerEvent,
  stampUserFirstTouch,
  visitorIdFromCookie,
} from "@/lib/funnel/handle";

/**
 * Server-side signup for email confirmation and Google OAuth
 * (/auth/callback and One Tap's /api/auth/sync). Reads the first-touch
 * cookie from the landing view. Never throws, and does not change sign-in.
 */
export async function recordSignupFromRequest(request: Request, userId: string): Promise<void> {
  try {
    const header = request.headers.get("cookie");
    const visitorId = visitorIdFromCookie(header);
    const touch = parseTouchCookie(readCookie(header, TOUCH_COOKIE));
    const db = prismaQueryDb();
    await recordServerEvent(db, {
      name: "signup_complete",
      visitorId,
      userId,
      dedupeKey: `signup:${userId}`,
      utm: touch
        ? { source: touch.source, medium: touch.medium, campaign: touch.campaign, content: touch.content, term: touch.term }
        : readUtm(""),
      referrer: touch?.referrer ?? null,
      path: "/signup",
    });
    if (visitorId) await linkVisitorToUser(db, visitorId, userId);
    if (touch) await stampUserFirstTouch(userId, touch);
  } catch (err) {
    console.error("[funnel] signup note failed:", err instanceof Error ? err.message : err);
  }
}
