import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe, getPlanByPriceId, LIFETIME_DEALS } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import Stripe from "stripe";
import { z } from "zod";
import {
  fulfillOneTimePayment,
  getInvoiceSubscriptionId,
  getSubscriptionPeriodEnd,
  grantOneTimeCredits,
  grantSubscriptionInvoiceCredits,
  isActiveSubscriptionStatus,
  isUniqueViolation,
  reversePaymentCredits,
  stripeId,
} from "../_lib/fulfillment";

// ─── Metadata validators ──────────────────────────────────────────────────────
// IMPORTANT: Zod runs AFTER stripe.webhooks.constructEvent() succeeds.
// We never touch the raw body before signature verification — that would
// break Stripe's HMAC check.
//
// These schemas validate the metadata fields we read from verified events.
// They do not replace Stripe's own type definitions — they add safe guards
// on the string fields we control (userId, credits, type).

const CheckoutMetadataSchema = z.object({
  userId: z.string().min(1, "Missing userId in session metadata"),
  type: z.string().optional(),
  credits: z.string().optional(),
});

const CreditPackMetadataSchema = z.object({
  userId: z.string().min(1),
  credits: z
    .string()
    .refine((v) => !isNaN(parseInt(v, 10)) && parseInt(v, 10) > 0, {
      message: "credits metadata must be a positive integer string",
    }),
});

// ─── Env guard ───────────────────────────────────────────────────────────────
// Checked once at request time so misconfiguration produces a clear log.
function getWebhookSecret(): string | null {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[Webhook] STRIPE_WEBHOOK_SECRET is not set");
    return null;
  }
  return secret;
}

export async function POST(request: Request) {
  // ── 1. Env guard — fail fast with a clear error if secret is missing ────────
  const webhookSecret = getWebhookSecret();
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 }
    );
  }

  // ── 2. Read raw body as text — MUST happen before any JSON parsing ──────────
  // stripe.webhooks.constructEvent() computes an HMAC over the exact raw bytes.
  // Any transformation (JSON.parse → re-stringify) would break the signature.
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "No signature provided" },
      { status: 400 }
    );
  }

  // ── 3. Verify signature — all validation happens on the verified event ──────
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  console.log("STRIPE WEBHOOK EVENT:", event.type, event.id);

  // ── 4. Event dedupe ─────────────────────────────────────────────────────────
  // Every side effect below is idempotent on its own (unique keys on
  // CreditTransaction.stripePaymentIntentId / stripeInvoiceId, conditional
  // updates for referral + refund reversal, plain "set" updates for plan
  // state). The event record is therefore written AFTER successful handling:
  // a crash mid-handler leaves no marker, Stripe retries, and the retry is
  // safe. The pre-check just short-circuits already-handled redeliveries.
  const alreadyProcessed = await prisma.processedStripeEvent.findUnique({
    where: { id: event.id },
    select: { id: true },
  });
  if (alreadyProcessed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeRefunded(charge);
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        await handleDisputeCreated(dispute);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    try {
      await prisma.processedStripeEvent.create({
        data: { id: event.id, type: event.type },
      });
    } catch (error) {
      // A concurrent delivery of the same event finished first — fine.
      if (!isUniqueViolation(error)) throw error;
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

// ===========================================
// HELPERS
// ===========================================

/**
 * Resolve our user id from (server-set) metadata, falling back to the Stripe
 * customer id. Returns null if neither maps to an existing user.
 */
async function resolveUserId(
  metadataUserId: string | null | undefined,
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): Promise<string | null> {
  if (metadataUserId) {
    const user = await prisma.user.findUnique({
      where: { id: metadataUserId },
      select: { id: true },
    });
    if (user) return user.id;
  }

  const customerId = stripeId(customer);
  if (!customerId) return null;

  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  return user?.id ?? null;
}

// ===========================================
// WEBHOOK HANDLERS
// ===========================================

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Validate the metadata fields we depend on
  const metaParsed = CheckoutMetadataSchema.safeParse(session.metadata);
  if (!metaParsed.success) {
    console.error(
      "handleCheckoutCompleted: invalid metadata:",
      metaParsed.error.issues[0]?.message,
      "raw metadata:",
      session.metadata
    );
    return;
  }

  const { userId } = metaParsed.data;

  console.log("Checkout completed for user:", userId, "mode:", session.mode);

  // Handle one-time credit pack purchases
  if (session.mode === "payment" && session.metadata?.type === "credit_pack") {
    await handleCreditPackPurchase(session, userId);
    return;
  }

  // Handle subscription purchases
  if (session.mode === "subscription") {
    await handleSubscriptionPurchase(session, userId);
    return;
  }

  console.log("Unhandled checkout mode:", session.mode);
}

async function handleCreditPackPurchase(session: Stripe.Checkout.Session, userId: string) {
  if (session.payment_status !== "paid") {
    console.log(`Checkout ${session.id} not paid yet (${session.payment_status}) — skipping`);
    return;
  }

  // Validate credits metadata before using parseInt
  const packMetaParsed = CreditPackMetadataSchema.safeParse(session.metadata);
  if (!packMetaParsed.success) {
    console.error(
      "handleCreditPackPurchase: invalid credits metadata:",
      packMetaParsed.error.issues[0]?.message,
      "raw metadata:",
      session.metadata
    );
    return;
  }

  const paymentIntentId = stripeId(session.payment_intent);
  if (!paymentIntentId) {
    console.error(`Checkout ${session.id} has no payment_intent — cannot credit idempotently`);
    return;
  }

  const credits = parseInt(packMetaParsed.data.credits, 10);
  const amountPaid = (session.amount_total || 0) / 100;

  const customerId = stripeId(session.customer);
  if (customerId) {
    await prisma.user.updateMany({
      where: { id: userId, stripeCustomerId: null },
      data: { stripeCustomerId: customerId },
    });
  }

  // Keyed on the PaymentIntent id — safe against webhook retries.
  const result = await grantOneTimeCredits({
    userId,
    paymentIntentId,
    credits,
    moneyAmount: amountPaid,
    description: `Credit pack purchase (${credits} credits) - ${paymentIntentId}`,
  });

  if (result) {
    console.log(`Added ${credits} credits to user ${userId} (Credit Pack checkout)`);
  } else {
    console.log(`Credit pack ${paymentIntentId} already credited — skipping`);
  }
}

async function handleSubscriptionPurchase(session: Stripe.Checkout.Session, userId: string) {
  const subscriptionId = stripeId(session.subscription);

  if (!subscriptionId) {
    console.error("No subscription ID in session");
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  if (!isActiveSubscriptionStatus(subscription.status)) {
    console.log(`Subscription ${subscriptionId} is ${subscription.status} — not activating plan`);
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;
  const planName = priceId ? getPlanByPriceId(priceId) : null;

  if (!planName) {
    console.error("Unknown price ID:", priceId);
    return;
  }

  const periodEnd = getSubscriptionPeriodEnd(subscription);

  // Link the subscription only. Credits are granted per paid invoice by
  // handleInvoicePaymentSucceeded (see _lib/fulfillment.ts) — granting here
  // too would double-credit the first month.
  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: planName,
      stripeCustomerId: stripeId(subscription.customer),
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      ...(periodEnd ? { stripeCurrentPeriodEnd: periodEnd } : {}),
    },
  });

  console.log(`User ${userId} upgraded to ${planName} via Checkout`);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const userId = await resolveUserId(subscription.metadata?.userId, subscription.customer);

  if (!userId) {
    console.error("Could not find userId for subscription:", subscription.id);
    return;
  }

  // incomplete / incomplete_expired / unpaid / canceled must not grant a paid
  // plan. Cancellation is handled by customer.subscription.deleted.
  if (!isActiveSubscriptionStatus(subscription.status)) {
    console.log(`Subscription ${subscription.id} is ${subscription.status} — plan not updated`);
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;
  const planName = priceId ? getPlanByPriceId(priceId) : null;

  if (!planName) {
    console.error("Unknown price ID:", priceId);
    return;
  }

  console.log("Subscription updated for user:", userId, "to plan:", planName);

  const periodEnd = getSubscriptionPeriodEnd(subscription);

  // Update user subscription details
  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: planName,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      ...(periodEnd ? { stripeCurrentPeriodEnd: periodEnd } : {}),
    },
  });

  console.log(`User ${userId} subscription updated to ${planName}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = await resolveUserId(subscription.metadata?.userId, subscription.customer);

  if (!userId) {
    console.error("Could not find userId for deleted subscription:", subscription.id);
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeSubscriptionId: true, isLifetime: true, lifetimeDeal: true, plan: true },
  });

  // Ignore deletion of an old subscription when the user has since moved to
  // a different one.
  if (user?.stripeSubscriptionId && user.stripeSubscriptionId !== subscription.id) {
    console.log(`Deleted subscription ${subscription.id} is not the current one for ${userId} — ignoring`);
    return;
  }

  console.log("Subscription deleted for user:", userId);

  // Downgrade to free plan WITHOUT touching the credit balance. The credits
  // they have were already paid for; resetting to 10 wipes purchased credits
  // and is legally sketchy. Future monthly grants stop because they're tied
  // to invoice.payment_succeeded which won't fire after cancellation.
  // Lifetime users fall back to their LIFETIME deal's plan — not whatever
  // subscription plan they had (otherwise: buy Starter Lifetime, subscribe to
  // Studio for one month, cancel → Studio forever).
  const lifetimePlan = user?.isLifetime
    ? LIFETIME_DEALS[(user.lifetimeDeal ?? "") as keyof typeof LIFETIME_DEALS]?.basePlan
      ?? (user.plan === "FREE" ? "FREE" : "STARTER")
    : null;
  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: lifetimePlan ?? "FREE",
      stripeSubscriptionId: null,
      stripePriceId: null,
      stripeCurrentPeriodEnd: null,
    },
  });

  // Audit-only transaction. Use 0 amount so this is purely a status marker
  // and doesn't show up as a debit in user-facing credit history.
  await prisma.creditTransaction.create({
    data: {
      userId,
      amount: 0,
      type: "REFUND",
      description: "Subscription cancelled — downgraded to FREE (existing credits preserved)",
    },
  });
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = getInvoiceSubscriptionId(invoice);

  if (!subscriptionId) {
    return;
  }

  // Only the first invoice and regular renewals grant a month of credits.
  // Proration invoices (subscription_update) and manual invoices do not.
  const billingReason = invoice.billing_reason;
  if (billingReason !== "subscription_create" && billingReason !== "subscription_cycle") {
    console.log(`Invoice ${invoice.id} billing_reason=${billingReason} — no credit grant`);
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const userId = await resolveUserId(subscription.metadata?.userId, subscription.customer);

  if (!userId) {
    console.error("Could not find userId for invoice payment", invoice.id);
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;
  const planName = priceId ? getPlanByPriceId(priceId) : null;

  if (!planName) {
    console.error("Unknown price ID:", priceId);
    return;
  }

  console.log("Invoice payment succeeded for user:", userId);

  const periodEnd = getSubscriptionPeriodEnd(subscription);
  if (periodEnd) {
    await prisma.user.update({
      where: { id: userId },
      data: { stripeCurrentPeriodEnd: periodEnd },
    });
  }

  // Source of truth for subscription credits — exactly once per invoice id.
  await grantSubscriptionInvoiceCredits({
    userId,
    invoiceId: invoice.id,
    planName,
    amountPaid: (invoice.amount_paid || 0) / 100,
    description:
      billingReason === "subscription_create"
        ? `${planName} plan subscription`
        : `${planName} plan renewal`,
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = getInvoiceSubscriptionId(invoice);

  if (!subscriptionId) {
    return;
  }

  const userId = await resolveUserId(
    invoice.parent?.subscription_details?.metadata?.userId,
    invoice.customer
  );

  if (!userId) {
    console.error("Could not find user for failed invoice", invoice.id);
    return;
  }

  console.log("Invoice payment failed for user:", userId);

  // Audit marker only (not a PURCHASE — admin revenue stats count PURCHASE rows).
  await prisma.creditTransaction.create({
    data: {
      userId,
      amount: 0,
      type: "PAYMENT_FAILED",
      description: `Payment failed for invoice ${invoice.id} - subscription may be cancelled`,
    },
  });
}

/**
 * Fallback for Elements purchases (credit packs / lifetime deals) when the
 * client never calls confirm-* (closed tab, 3DS redirect, network error).
 * Shares the PaymentIntent unique key with confirm-*, so it never doubles.
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const type = paymentIntent.metadata?.type;
  if (type !== "credit_pack" && type !== "lifetime_deal") {
    return; // Subscription invoices / Checkout payments are handled elsewhere
  }

  const result = await fulfillOneTimePayment(paymentIntent.id);
  console.log(`payment_intent.succeeded ${paymentIntent.id}: ${result.status}`);
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId = stripeId(charge.payment_intent);
  if (!paymentIntentId || charge.amount <= 0) {
    return;
  }

  const refundedFraction = charge.refunded ? 1 : charge.amount_refunded / charge.amount;
  await reversePaymentCredits({ paymentIntentId, refundedFraction, reason: "refund" });
}

async function handleDisputeCreated(dispute: Stripe.Dispute) {
  let paymentIntentId = stripeId(dispute.payment_intent);

  if (!paymentIntentId) {
    const chargeId = stripeId(dispute.charge);
    if (chargeId) {
      const charge = await stripe.charges.retrieve(chargeId);
      paymentIntentId = stripeId(charge.payment_intent);
    }
  }

  if (!paymentIntentId) {
    console.error("Dispute without payment intent:", dispute.id);
    return;
  }

  console.warn(`Dispute ${dispute.id} opened for ${paymentIntentId} (reason: ${dispute.reason}) — reversing credits`);
  await reversePaymentCredits({ paymentIntentId, refundedFraction: 1, reason: "dispute" });
}
