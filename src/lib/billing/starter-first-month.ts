import { prisma } from "@/lib/prisma";
import {
  SUBSCRIPTION_CANCELLED_MARKER,
  SUBSCRIPTION_GRANT_MARKER,
  SUBSCRIPTION_INVOICE_PREFIX,
  qualifiesForStarterFirstMonth,
} from "@/config/starter-first-month";

/**
 * Server-side eligibility for the Starter intro price.
 * Never subscribed: no current subscription id, no leftover price id, and no
 * credit row from a subscription invoice or a cancellation. Does not call
 * Stripe and does not trust anything the browser sends.
 */
export async function loadStarterFirstMonthEligibility(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, stripeSubscriptionId: true, stripePriceId: true },
  });
  if (!user) return false;

  if (!qualifiesForStarterFirstMonth({ ...user, hadSubscriptionHistory: false })) {
    return false;
  }

  const history = await prisma.creditTransaction.findFirst({
    where: {
      userId,
      OR: [
        { stripeInvoiceId: { startsWith: SUBSCRIPTION_INVOICE_PREFIX } },
        { description: { contains: SUBSCRIPTION_CANCELLED_MARKER } },
        { description: { contains: SUBSCRIPTION_GRANT_MARKER } },
      ],
    },
    select: { id: true },
  });

  return qualifiesForStarterFirstMonth({
    ...user,
    hadSubscriptionHistory: history !== null,
  });
}
