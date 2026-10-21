// =============================================================================
// Lifecycle emails — load today's audience from the database (read-only)
// =============================================================================
// 1. every active user + the marketing emails we sent in the last 7 days +
//    bounced/complained addresses
// 2. the cheap gates (opt-out, quiet period, caps) drop most users before we
//    touch `generations`
// 3. for the rest, their 12 most recent generations in batches (one window
//    query per batch) and whether they ever made an animation
// 4. one query for the community picks shared by everyone today (fewer than
//    3 usable → the curated /showcase examples, see showcase.ts)
// =============================================================================

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publicGenerationWhere } from "@/lib/moderation/visibility";
import type { InspirationPick } from "./content";
import type { SendStats } from "./limits";
import { DAY, LIFECYCLE_LOG_TYPES, MARKETING_LOG_TYPES, gate, parseLifecyclePrefs, type SkipReason, type UserSnapshot } from "./rules";
import { showcaseInspiration } from "./showcase";
import { pickInspiration, summarizeWork, type CommunityRow, type GenerationRow } from "./snapshot";

const BATCH = 300;
const RECENT_PER_USER = 12;

export interface LifecycleAudience {
  /** Users who passed the gates, with their work loaded. */
  users: UserSnapshot[];
  /** Users dropped by a gate before their work was loaded. */
  gated: Partial<Record<SkipReason, number>>;
  scanned: number;
  inspiration: InspirationPick | null;
}

export async function loadLifecycleAudience(now: Date): Promise<LifecycleAudience> {
  const weekAgo = new Date(now.getTime() - 7 * DAY);
  const [users, sends, bounced] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, email: true, name: true, credits: true, createdAt: true, lastActiveAt: true, emailPreferences: true },
    }),
    prisma.emailLog.findMany({
      // Anything that left us counts (the webhook later turns "sent" into delivery_delayed / bounced / complained)
      where: { createdAt: { gte: weekAgo }, status: { not: "failed" }, type: { in: [...MARKETING_LOG_TYPES] } },
      select: { userId: true, email: true, createdAt: true },
    }),
    prisma.emailLog.findMany({
      where: { status: { in: ["bounced", "complained"] } },
      select: { email: true },
      distinct: ["email"],
    }),
  ]);

  const sendsByUser = new Map<string, Date[]>();
  const sendsByEmail = new Map<string, Date[]>();
  for (const s of sends) {
    if (s.userId) sendsByUser.set(s.userId, [...(sendsByUser.get(s.userId) ?? []), s.createdAt]);
    const e = s.email.toLowerCase();
    sendsByEmail.set(e, [...(sendsByEmail.get(e) ?? []), s.createdAt]);
  }
  const suppressed = new Set(bounced.map((b) => b.email.toLowerCase()));

  const gated: LifecycleAudience["gated"] = {};
  const candidates: UserSnapshot[] = [];
  for (const u of users) {
    const email = (u.email ?? "").trim();
    // Logged by user id or by address (older rows have no user id): de-duplicate by time
    const all = [...(sendsByUser.get(u.id) ?? []), ...(sendsByEmail.get(email.toLowerCase()) ?? [])];
    const marketingSends = [...new Map(all.map((d) => [d.getTime(), d])).values()];
    const snap: UserSnapshot = {
      id: u.id,
      email,
      name: u.name,
      credits: u.credits,
      createdAt: u.createdAt,
      lastActiveAt: u.lastActiveAt,
      prefs: parseLifecyclePrefs(u.emailPreferences),
      marketingSends,
      suppressed: suppressed.has(email.toLowerCase()),
      latestItem: null,
      latestSprite: null,
      hasAnimation: false,
      lastCreatedAt: null,
    };
    const reason = gate(snap, now);
    if (reason) gated[reason] = (gated[reason] ?? 0) + 1;
    else candidates.push(snap);
  }

  for (let i = 0; i < candidates.length; i += BATCH) {
    const batch = candidates.slice(i, i + BATCH);
    const ids = batch.map((u) => u.id);
    const [rows, animated] = await Promise.all([
      prisma.$queryRaw<GenerationRow[]>(Prisma.sql`
        SELECT id, user_id AS "userId", prompt, category_id AS "categoryId", subcategory_id AS "subcategoryId",
               style_id AS "styleId", image_url AS "imageUrl", created_at AS "createdAt",
               source_generation_id AS "sourceGenerationId"
        FROM (
          SELECT id, user_id, prompt, category_id, subcategory_id, style_id, image_url, created_at, source_generation_id,
                 row_number() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
          FROM generations
          WHERE user_id = ANY(${ids})
        ) recent
        WHERE rn <= ${RECENT_PER_USER}`),
      prisma.generation.findMany({
        where: { userId: { in: ids }, subcategoryId: "ANIMATION" },
        select: { userId: true },
        distinct: ["userId"],
      }),
    ]);
    const byUser = new Map<string, GenerationRow[]>();
    for (const r of rows) byUser.set(r.userId, [...(byUser.get(r.userId) ?? []), r]);
    const hasAnim = new Set(animated.map((a) => a.userId));
    for (const u of batch) {
      Object.assign(u, summarizeWork(byUser.get(u.id) ?? []));
      u.hasAnimation = hasAnim.has(u.id);
    }
  }

  const community = await prisma.generation.findMany({
    where: {
      // Only what the public gallery may show (moderation/visibility)
      AND: [publicGenerationWhere()],
      createdAt: { gte: new Date(now.getTime() - 30 * DAY) },
      NOT: [{ subcategoryId: "ANIMATION" }, { styleId: { startsWith: "3D_" } }],
      imageUrl: { startsWith: "https://" },
    },
    orderBy: [{ likes: "desc" }, { createdAt: "desc" }],
    take: 80,
    select: { id: true, userId: true, prompt: true, categoryId: true, subcategoryId: true, styleId: true, imageUrl: true, createdAt: true, likes: true },
  });

  return {
    users: candidates,
    gated,
    scanned: users.length,
    // Too few public works → curated examples, labelled as such
    inspiration: pickInspiration(community as CommunityRow[], now) ?? showcaseInspiration(now),
  };
}

/** Today's (UTC) sends across every sender, and when lifecycle sending first went live. */
export async function loadSendStats(now: Date): Promise<SendStats> {
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const [sentToday, first] = await Promise.all([
    prisma.emailLog.count({ where: { createdAt: { gte: dayStart }, status: { not: "failed" } } }),
    prisma.emailLog.findFirst({
      where: { type: { in: Object.values(LIFECYCLE_LOG_TYPES) }, status: { not: "failed" } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);
  return { sentToday, firstLiveSendAt: first?.createdAt ?? null };
}
