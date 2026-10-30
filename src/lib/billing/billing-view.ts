// Shape returned by GET /api/billing/subscription. Client-safe.

import { formatLongDate, type cancellationConsequences } from "@/lib/billing/retention";

export type BillingStatus = "free" | "lifetime" | "active" | "past_due" | "canceling" | "paused";

export interface BillingSubscriptionView {
  plan: string;
  planLabel: string;
  priceGbp: number | null;
  status: BillingStatus;
  statusLabel: string;
  /** ISO timestamp of the current period end, when Stripe has one. */
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  billingPaused: boolean;
  credits: number;
  projectCount: number;
  generationCount: number;
  isLifetime: boolean;
  canCancel: boolean;
  canResume: boolean;
  canResumePause: boolean;
  canOpenPortal: boolean;
  percentOff: number | null;
  amountOffGbp: number | null;
  consequences: ReturnType<typeof cancellationConsequences>;
}

export function billingStatus(input: {
  hasSubscription: boolean;
  isLifetime: boolean;
  cancelAtPeriodEnd: boolean;
  billingPaused: boolean;
  pastDue: boolean;
}): BillingStatus {
  if (!input.hasSubscription) return input.isLifetime ? "lifetime" : "free";
  if (input.cancelAtPeriodEnd) return "canceling";
  if (input.billingPaused) return "paused";
  if (input.pastDue) return "past_due";
  return "active";
}

export function billingStatusLabel(status: BillingStatus, periodEnd: Date | null, pauseResumesAt: Date | null): string {
  const until = formatLongDate(periodEnd);
  const resumes = formatLongDate(pauseResumesAt);
  switch (status) {
    case "canceling":
      return until ? `Cancels on ${until}. Access until then.` : "Cancels at the end of this period.";
    case "paused":
      return resumes ? `Billing paused until ${resumes}.` : "Billing is paused.";
    case "past_due":
      return "Payment past due.";
    case "lifetime":
      return "Lifetime access. No renewal.";
    case "free":
      return "No paid subscription.";
    default:
      return until ? `Renews on ${until}.` : "Active.";
  }
}
