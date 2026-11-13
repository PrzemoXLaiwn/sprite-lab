import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isFunnelEventName, sanitizeFunnelProps, type FunnelEventName } from "@/lib/funnel-events";

/** Writes one funnel row. A database error never fails the action that called it. */
export async function recordFunnelEvent(input: {
  name: FunnelEventName;
  userId?: string | null;
  props?: unknown;
}): Promise<void> {
  if (!isFunnelEventName(input.name)) return;
  try {
    await prisma.funnelEvent.create({
      data: {
        id: crypto.randomUUID(),
        userId: input.userId || null,
        name: input.name,
        props: sanitizeFunnelProps(input.props) as Prisma.InputJsonObject | undefined,
      },
    });
  } catch (error) {
    console.error("[funnel] write failed:", error);
  }
}
