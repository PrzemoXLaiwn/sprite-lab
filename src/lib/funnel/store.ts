import { randomUUID } from "node:crypto";
import {
  hasUtm,
  sanitizePath,
  sanitizeProps,
  sanitizeReferrer,
  readUtm,
  type Utm,
} from "@/lib/funnel/events";
import {
  INSERT_FUNNEL_SQL,
  LINK_VISITOR_SQL,
  STAMP_FIRST_TOUCH_SQL,
  TRACE_SQL,
  TRACE_USER_SQL,
} from "@/lib/funnel/sql";

export interface QueryDb {
  query<T>(sql: string, params: unknown[]): Promise<T[]>;
}

export interface FunnelRow {
  id: string;
  visitor_id: string;
  user_id: string | null;
  name: string;
  path: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  created_at: Date | string;
}

export interface FirstTouch {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
  referrer: string | null;
  at: string;
}

export function firstTouchPatch(touch: FirstTouch): { firstTouch: FirstTouch } {
  return { firstTouch: touch };
}

export function touchFromUtm(utm: Utm, referrer: string | null, at = new Date().toISOString()): FirstTouch | null {
  const referrerClean = sanitizeReferrer(referrer);
  if (!hasUtm(utm) && !referrerClean) return null;
  return {
    source: utm.source,
    medium: utm.medium,
    campaign: utm.campaign,
    content: utm.content,
    term: utm.term,
    referrer: referrerClean,
    at,
  };
}

export async function insertFunnelEvent(db: QueryDb, row: {
  visitorId: string;
  userId: string | null;
  name: string;
  path: string | null;
  referrer: string | null;
  utm: Utm;
  dedupeKey: string | null;
  props: Record<string, string | number | boolean> | null;
}): Promise<void> {
  await db.query(INSERT_FUNNEL_SQL, [
    randomUUID(),
    row.visitorId,
    row.userId,
    row.name,
    sanitizePath(row.path),
    sanitizeReferrer(row.referrer),
    row.utm.source,
    row.utm.medium,
    row.utm.campaign,
    row.utm.content,
    row.utm.term,
    row.dedupeKey,
    row.props ? JSON.stringify(row.props) : null,
  ]);
}

export async function linkVisitorToUser(db: QueryDb, visitorId: string, userId: string): Promise<void> {
  await db.query(LINK_VISITOR_SQL, [visitorId, userId]);
}

export async function traceVisitor(db: QueryDb, visitorId: string): Promise<FunnelRow[]> {
  const linked = await db.query<{ user_id: string }>(TRACE_USER_SQL, [visitorId]);
  const userId = linked[0]?.user_id ?? null;
  return db.query<FunnelRow>(TRACE_SQL, [visitorId, userId]);
}

/** One-statement jsonb merge. Does not replace an existing firstTouch. Other keys stay. */
export async function stampFirstTouch(db: QueryDb, userId: string, touch: FirstTouch): Promise<void> {
  await db.query(STAMP_FIRST_TOUCH_SQL, [JSON.stringify(firstTouchPatch(touch)), userId]);
}

export function utmFromSearch(search: string | null | undefined): Utm {
  return readUtm(search ?? "");
}

export function cleanProps(raw: unknown): Record<string, string | number | boolean> | null {
  return sanitizeProps(raw);
}
