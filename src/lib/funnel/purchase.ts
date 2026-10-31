import { recordServerEvent } from "@/lib/funnel/handle";
import { prismaQueryDb } from "@/lib/funnel/prisma-db";
import type { QueryDb } from "@/lib/funnel/store";

export interface PurchaseNote {
  dedupeKey: string;
  userId: string | null;
  kind: "subscription" | "credit_pack" | "lifetime_deal";
  amountMinor: number;
  currency: string;
  plan?: string | null;
}

/** Records a paid invoice or PaymentIntent. Swallows errors. Does not grant credits. */
export async function notePurchase(input: PurchaseNote, db?: QueryDb): Promise<void> {
  if (!input.userId) return;
  try {
    await recordServerEvent(db ?? prismaQueryDb(), {
      name: "purchase",
      visitorId: null,
      userId: input.userId,
      dedupeKey: input.dedupeKey,
      props: {
        type: input.kind,
        ...(input.plan ? { plan: input.plan } : {}),
        cost: input.amountMinor,
      },
    });
  } catch (err) {
    console.error("[funnel] purchase note failed:", err instanceof Error ? err.message : err);
  }
}
