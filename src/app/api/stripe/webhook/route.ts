import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe, getPlanByPriceId, getCreditsForPlan } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import Stripe from "stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "No signature provided" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  console.log("===========================================");
  console.log("STRIPE WEBHOOK EVENT:", event.type);
  console.log("===========================================");

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

      default:
        console.log(`Unhandled event type: ${event.type}`);
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
// WEBHOOK HANDLERS
// ===========================================

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;

  if (!userId) {
    console.error("No userId in session metadata");
    return;
  }

  console.log("Checkout completed for user:", userId);
  console.log("Session mode:", session.mode);
  console.log("Session metadata:", session.metadata);

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
  const creditsStr = session.metadata?.credits;

  if (!creditsStr) {
    console.error("No credits amount in session metadata");
    return;
  }

  const credits = parseInt(creditsStr, 10);

  if (isNaN(credits) || credits <= 0) {
    console.error("Invalid credits amount:", creditsStr);
    return;
  }

  const amountPaid = (session.amount_total || 0) / 100;

  console.log(`Processing credit pack purchase: ${credits} credits for $${amountPaid}`);

  // Add credits to user
  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeCustomerId: session.customer as string,
      credits: {
        increment: credits,
      },
      totalSpent: {
        increment: amountPaid,
      },
    },
  });

  // Log credit transaction
  await prisma.creditTransaction.create({
    data: {
      userId,
      amount: credits,
      type: "PURCHASE",
      description: `Credit pack purchase (${credits} credits)`,
      moneyAmount: amountPaid,
    },
  });

  console.log(`Added ${credits} credits to user ${userId} (Credit Pack purchase)`);

  // Check and process referral reward
  await processReferralReward(userId, amountPaid);
}

// ===========================================
// REFERRAL REWARD SYSTEM
// ===========================================
const REFERRAL_REWARD_CREDITS = 10;

async function processReferralReward(userId: string, _amountPaid: number) {
  try {
    // Get user and check if they were referred
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        referredBy: true,
        referralRewardClaimed: true,
        totalSpent: true,
      },
    });

    // Skip if no referrer or reward already claimed
    if (!user?.referredBy || user.referralRewardClaimed) {
      return;
    }

    // This is user's first purchase - reward the referrer!
    console.log(`Processing referral reward for referrer ${user.referredBy}`);

    await prisma.$transaction([
      // Mark reward as claimed for the referred user
      prisma.user.update({
        where: { id: userId },
        data: { referralRewardClaimed: true },
      }),
      // Add credits to referrer
      prisma.user.update({
        where: { id: user.referredBy },
        data: {
          credits: { increment: REFERRAL_REWARD_CREDITS },
          referralEarnings: { increment: REFERRAL_REWARD_CREDITS },
        },
      }),
      // Log credit transaction for referrer
      prisma.creditTransaction.create({
        data: {
          userId: user.referredBy,
          amount: REFERRAL_REWARD_CREDITS,
          type: "BONUS",
          description: `Referral reward - your friend made their first purchase!`,
        },
      }),
      // Create notification for referrer
      prisma.notification.create({
        data: {
          userId: user.referredBy,
          type: "REFERRAL_REWARD",
          title: "Referral Reward! +10 Credits",
          message: `Your friend just made their first purchase! You earned ${REFERRAL_REWARD_CREDITS} bonus credits. Keep sharing your referral link!`,
          data: JSON.stringify({ credits: REFERRAL_REWARD_CREDITS, referredUserId: userId }),
        },
      }),
    ]);

    console.log(`Referral reward: ${REFERRAL_REWARD_CREDITS} credits added to referrer ${user.referredBy}`);
  } catch (error) {
    console.error("Error processing referral reward:", error);
    // Don't throw - we don't want to fail the main purchase
  }
}

async function handleSubscriptionPurchase(session: Stripe.Checkout.Session, userId: string) {
  // Get subscription details
  const subscriptionId = session.subscription as string;

  if (!subscriptionId) {
    console.error("No subscription ID in session");
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const priceId = subscription.items.data[0].price.id;
  const planName = getPlanByPriceId(priceId);

  if (!planName) {
    console.error("Unknown price ID:", priceId);
    return;
  }

  const credits = getCreditsForPlan(planName);

  // Get period end safely
  const periodEnd = (subscription as unknown as { current_period_end: number }).current_period_end;

  // Update user in database
  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: planName,
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      stripeCurrentPeriodEnd: new Date(periodEnd * 1000),
      credits: {
        increment: credits,
      },
    },
  });

  // Log credit transaction
  await prisma.creditTransaction.create({
    data: {
      userId,
      amount: credits,
      type: "PURCHASE",
      description: `${planName} plan subscription`,
      moneyAmount: (subscription.items.data[0].price.unit_amount || 0) / 100,
    },
  });

  console.log(`User ${userId} upgraded to ${planName} with ${credits} credits`);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  // Try to get userId from subscription metadata first
  let userId = subscription.metadata?.userId;

  // If not in metadata, try to find user by Stripe customer ID
  if (!userId) {
    const customerId = subscription.customer as string;
    console.log("No userId in metadata, looking up by customer ID:", customerId);

    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: customerId },
      select: { id: true },
    });

    if (user) {
      userId = user.id;
    }
  }

  if (!userId) {
    console.error("Could not find userId for subscription:", subscription.id);
    return;
  }

  const priceId = subscription.items.data[0].price.id;
  const planName = getPlanByPriceId(priceId);

  if (!planName) {
    console.error("Unknown price ID:", priceId);
    return;
  }

  console.log("Subscription updated for user:", userId, "to plan:", planName);

  // Get period end safely
  const periodEnd = (subscription as unknown as { current_period_end: number }).current_period_end;

  // Update user subscription details
  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: planName,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      stripeCurrentPeriodEnd: new Date(periodEnd * 1000),
    },
  });

  console.log(`User ${userId} subscription updated to ${planName}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Try to get userId from subscription metadata first
  let userId = subscription.metadata?.userId;

  // If not in metadata, try to find user by Stripe customer ID
  if (!userId) {
    const customerId = subscription.customer as string;
    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: customerId },
      select: { id: true },
    });
    if (user) {
      userId = user.id;
    }
  }

  if (!userId) {
    console.error("Could not find userId for deleted subscription:", subscription.id);
    return;
  }

  console.log("Subscription deleted for user:", userId);

  // Downgrade to free plan
  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: "FREE",
      stripeSubscriptionId: null,
      stripePriceId: null,
      stripeCurrentPeriodEnd: null,
      credits: 8, // Reset to free tier credits
    },
  });

  // Log transaction
  await prisma.creditTransaction.create({
    data: {
      userId,
      amount: -(subscription.items.data[0]?.quantity || 0),
      type: "REFUND",
      description: "Subscription cancelled - downgraded to FREE",
    },
  });
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  // Get subscription ID safely
  const subscriptionId = (invoice as unknown as { subscription?: string }).subscription;

  if (!subscriptionId) {
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Try to get userId from subscription metadata first
  let userId = subscription.metadata?.userId;

  // If not in metadata, try to find user by Stripe customer ID
  if (!userId) {
    const customerId = subscription.customer as string;
    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: customerId },
      select: { id: true },
    });
    if (user) {
      userId = user.id;
    }
  }

  if (!userId) {
    console.error("Could not find userId for invoice payment");
    return;
  }

  const priceId = subscription.items.data[0].price.id;
  const planName = getPlanByPriceId(priceId);

  if (!planName) {
    console.error("Unknown price ID:", priceId);
    return;
  }

  const credits = getCreditsForPlan(planName);

  console.log("Invoice payment succeeded for user:", userId);

  // Get period end safely
  const periodEnd = (subscription as unknown as { current_period_end: number }).current_period_end;

  // Add credits for the new billing period
  await prisma.user.update({
    where: { id: userId },
    data: {
      credits: {
        increment: credits,
      },
      stripeCurrentPeriodEnd: new Date(periodEnd * 1000),
      totalSpent: {
        increment: (invoice.amount_paid || 0) / 100,
      },
    },
  });

  // Log transaction
  await prisma.creditTransaction.create({
    data: {
      userId,
      amount: credits,
      type: "PURCHASE",
      description: `${planName} plan renewal`,
      moneyAmount: (invoice.amount_paid || 0) / 100,
    },
  });

  console.log(`Added ${credits} credits to user ${userId} for ${planName} renewal`);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  // Get subscription ID safely
  const subscriptionId = (invoice as unknown as { subscription?: string }).subscription;

  if (!subscriptionId) {
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error("No userId in subscription metadata");
    return;
  }

  console.log("Invoice payment failed for user:", userId);

  // Optionally: Send email notification, mark account as past due, etc.
  // For now, just log it
  await prisma.creditTransaction.create({
    data: {
      userId,
      amount: 0,
      type: "PURCHASE",
      description: "Payment failed - subscription may be cancelled",
    },
  });
}