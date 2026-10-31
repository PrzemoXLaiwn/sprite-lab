import { NextResponse } from "next/server";
import { mergeEmailPreferences } from "@/app/api/_lib/email-prefs";
import { isClientFunnelEvent, isStoredFunnelEvent, readUtm, sanitizeProps, sanitizeReferrer } from "@/lib/funnel/events";
import { assignVariant, EXPERIMENTS } from "@/lib/funnel/experiments";
import {
  cleanProps,
  insertFunnelEvent,
  linkVisitorToUser,
  touchFromUtm,
  type FirstTouch,
  type QueryDb,
} from "@/lib/funnel/store";

export const VISITOR_COOKIE = "sl_vid";
export const TOUCH_COOKIE = "sl_ft";

const VISITOR_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function visitorIdFromCookie(header: string | null): string | null {
  const value = readCookie(header, VISITOR_COOKIE);
  return value && VISITOR_RE.test(value) ? value : null;
}

export function newVisitorId(): string {
  return crypto.randomUUID();
}

export function cookieHeader(name: string, value: string, secure: boolean): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", "Max-Age=31536000", "SameSite=Lax", "HttpOnly"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

interface ClientBody {
  name?: unknown;
  path?: unknown;
  referrer?: unknown;
  search?: unknown;
  props?: unknown;
}

export interface FunnelDeps {
  db: QueryDb;
  userId: string | null;
  /** Persist first-touch on the user row. Production uses email_preferences. */
  stampUser: (userId: string, touch: FirstTouch) => Promise<void>;
  now?: () => Date;
}

/**
 * Writes one funnel event. The user id always comes from the session
 * (`deps.userId`), never from the JSON body.
 */
export async function handleFunnelPost(request: Request, deps: FunnelDeps): Promise<Response> {
  const text = await request.text();
  if (text.length > 4000) return NextResponse.json({ error: "Too large" }, { status: 413 });
  let body: ClientBody;
  try {
    body = text ? JSON.parse(text) as ClientBody : {};
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }
  if (!isClientFunnelEvent(body.name)) return NextResponse.json({ error: "Unknown event" }, { status: 400 });

  const header = request.headers.get("cookie");
  const existingVisitor = visitorIdFromCookie(header);
  const visitorId = existingVisitor ?? newVisitorId();
  const search = typeof body.search === "string" ? body.search : "";
  const utm = readUtm(search);
  const referrer = sanitizeReferrer(typeof body.referrer === "string" ? body.referrer : null);
  const path = typeof body.path === "string" ? body.path : null;
  const props = sanitizeProps(body.props);
  const userId = deps.userId;

  const prior = readCookie(header, TOUCH_COOKIE);
  const touch = parseTouchCookie(prior) ?? touchFromUtm(utm, referrer, (deps.now ?? (() => new Date()))().toISOString());

  await insertFunnelEvent(deps.db, {
    visitorId,
    userId,
    name: body.name,
    path,
    referrer,
    utm: touch ? { source: touch.source, medium: touch.medium, campaign: touch.campaign, content: touch.content, term: touch.term } : utm,
    dedupeKey: null,
    props,
  });

  if (userId) await linkVisitorToUser(deps.db, visitorId, userId);
  if (userId && body.name === "signup_complete" && touch) {
    await deps.stampUser(userId, touch);
  }

  if (body.name === "landing_view" || body.name === "signup_complete") {
    const experimentId = typeof props?.experiment === "string" ? props.experiment : null;
    if (experimentId) {
      const variant = assignVariant(visitorId, experimentId);
      if (variant) {
        await insertFunnelEvent(deps.db, {
          visitorId,
          userId,
          name: "experiment_exposure",
          path,
          referrer: null,
          utm: { source: null, medium: null, campaign: null, content: null, term: null },
          dedupeKey: `exp:${experimentId}:${visitorId}`,
          props: { experiment: experimentId, variant },
        });
      }
    }
  }

  const response = NextResponse.json({ ok: true, visitorId });
  const secure = process.env.NODE_ENV === "production";
  if (!existingVisitor) response.headers.append("Set-Cookie", cookieHeader(VISITOR_COOKIE, visitorId, secure));
  if (!prior && touch) response.headers.append("Set-Cookie", cookieHeader(TOUCH_COOKIE, JSON.stringify(touch), secure));
  return response;
}

export function parseTouchCookie(raw: string | null): FirstTouch | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<FirstTouch>;
    if (!parsed || typeof parsed !== "object") return null;
    const utm = {
      source: typeof parsed.source === "string" ? parsed.source : null,
      medium: typeof parsed.medium === "string" ? parsed.medium : null,
      campaign: typeof parsed.campaign === "string" ? parsed.campaign : null,
      content: typeof parsed.content === "string" ? parsed.content : null,
      term: typeof parsed.term === "string" ? parsed.term : null,
    };
    return touchFromUtm(utm, typeof parsed.referrer === "string" ? parsed.referrer : null, typeof parsed.at === "string" ? parsed.at : new Date().toISOString());
  } catch {
    return null;
  }
}

/** Production stamp: jsonb merge through mergeEmailPreferences, only the firstTouch key. */
export async function stampUserFirstTouch(userId: string, touch: FirstTouch): Promise<void> {
  await mergeEmailPreferences(userId, { firstTouch: touch });
}

export async function recordServerEvent(db: QueryDb, input: {
  name: string;
  visitorId: string | null;
  userId: string | null;
  dedupeKey: string;
  props?: Record<string, string | number | boolean> | null;
  utm?: ReturnType<typeof readUtm>;
  referrer?: string | null;
  path?: string | null;
}): Promise<void> {
  if (!isStoredFunnelEvent(input.name)) return;
  const visitorId = input.visitorId && VISITOR_RE.test(input.visitorId) ? input.visitorId : input.userId ? `user:${input.userId}` : newVisitorId();
  await insertFunnelEvent(db, {
    visitorId,
    userId: input.userId,
    name: input.name,
    path: input.path ?? null,
    referrer: input.referrer ?? null,
    utm: input.utm ?? { source: null, medium: null, campaign: null, content: null, term: null },
    dedupeKey: input.dedupeKey,
    props: cleanProps(input.props ?? null),
  });
  if (input.userId && visitorId && !visitorId.startsWith("user:")) {
    await linkVisitorToUser(db, visitorId, input.userId);
  }
}

export { EXPERIMENTS };
