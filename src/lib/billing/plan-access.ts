// What Settings says about a plan. Pure: Stripe is read elsewhere and passed in.
// A cancellation keeps the paid plan until the period already paid for.

export type PlanAccessStatus = "free" | "lifetime" | "renewing" | "ending" | "unknown";

export interface PlanAccess {
  planName: string;
  status: PlanAccessStatus;
  /** One or two sentences. No upsell, no reason-for-leaving form. */
  summary: string;
  canManageBilling: boolean;
}

const LONDON = "Europe/London";

export function planDisplayName(plan: string | null | undefined): string {
  const p = (plan || "FREE").toUpperCase();
  if (p === "UNLIMITED") return "Studio";
  if (p === "PRO") return "Pro";
  if (p === "STARTER") return "Starter";
  if (p === "LIFETIME") return "Lifetime";
  return "Free";
}

/** UK calendar date, so a period ending on 6 Dec does not slip to the 5th. */
export function formatAccessDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: LONDON,
  }).format(date);
}

export function describePlanAccess(input: {
  plan: string | null | undefined;
  isLifetime?: boolean;
  periodEnd?: Date | null;
  /** null when Stripe could not be read — do not guess renewal or cancellation. */
  cancelAtPeriodEnd: boolean | null;
  canManageBilling?: boolean;
  now?: Date;
}): PlanAccess {
  const now = input.now ?? new Date();
  const canManageBilling = input.canManageBilling === true;
  const name = planDisplayName(input.plan);

  if (input.isLifetime) {
    return {
      planName: name === "Free" ? "Lifetime" : name,
      status: "lifetime",
      summary: "Lifetime access. There is no renewal date and nothing to cancel.",
      canManageBilling,
    };
  }

  if (name === "Free") {
    return {
      planName: "Free",
      status: "free",
      summary: "Free plan. There is no subscription to renew or cancel.",
      canManageBilling,
    };
  }

  const end = input.periodEnd && !Number.isNaN(input.periodEnd.getTime()) ? input.periodEnd : null;
  const endLabel = end ? formatAccessDate(end) : null;
  const stillInPeriod = end ? end.getTime() > now.getTime() : false;

  if (input.cancelAtPeriodEnd === true) {
    if (endLabel && stillInPeriod) {
      return {
        planName: name,
        status: "ending",
        summary: `${name} is cancelled. You keep ${name} until ${endLabel}, then the plan becomes Free. It will not renew or charge again.`,
        canManageBilling,
      };
    }
    if (endLabel) {
      return {
        planName: name,
        status: "ending",
        summary: `${name} was cancelled and the paid period ended on ${endLabel}. If this page still shows ${name}, refresh in a moment.`,
        canManageBilling,
      };
    }
    return {
      planName: name,
      status: "ending",
      summary: `${name} is cancelled and will not renew. The end date isn't available right now. Access continues through the period already paid for.`,
      canManageBilling,
    };
  }

  if (input.cancelAtPeriodEnd === false && endLabel) {
    return {
      planName: name,
      status: "renewing",
      summary: `${name} renews on ${endLabel}.`,
      canManageBilling,
    };
  }

  if (endLabel) {
    return {
      planName: name,
      status: "unknown",
      summary: `The current ${name} period runs until ${endLabel}. We couldn't confirm whether it renews.`,
      canManageBilling,
    };
  }

  return {
    planName: name,
    status: "unknown",
    summary: `${name} plan. The renewal date isn't available right now.`,
    canManageBilling,
  };
}
