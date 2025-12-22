import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from "./resend";
import { WelcomeEmail } from "./templates/WelcomeEmail";
import { ReEngagementEmail } from "./templates/ReEngagementEmail";
import { PromoEmail } from "./templates/PromoEmail";
import { AbandonedCartEmail } from "./templates/AbandonedCartEmail";
import { SpecialOfferEmail } from "./templates/SpecialOfferEmail";
import { prisma } from "@/lib/prisma";
import { render } from "@react-email/render";

export type EmailResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

export type EmailType = "WELCOME" | "RE_ENGAGEMENT" | "PROMO" | "SYSTEM" | "ABANDONED_CART" | "SPECIAL_OFFER";

/**
 * Log email to database for tracking
 */
async function logEmail(params: {
  email: string;
  userId?: string;
  type: EmailType;
  subject: string;
  status: "sent" | "failed";
  messageId?: string;
  errorMessage?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}): Promise<void> {
  try {
    await prisma.emailLog.create({
      data: {
        email: params.email,
        userId: params.userId,
        type: params.type,
        subject: params.subject,
        status: params.status,
        messageId: params.messageId,
        errorMessage: params.errorMessage,
        metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
      },
    });
  } catch (error) {
    console.error("[Email] Failed to log email:", error);
  }
}

/**
 * Send welcome email to new users
 */
export async function sendWelcomeEmail(
  email: string,
  userName?: string,
  credits: number = 8,
  userId?: string
): Promise<EmailResult> {
  const subject = `Welcome to SpriteLab! 🎮 Your ${credits} free credits are ready`;

  try {
    const html = await render(<WelcomeEmail userName={userName} credits={credits} />);

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      replyTo: EMAIL_REPLY_TO,
      subject,
      html,
    });

    if (error) {
      console.error("[Email] Welcome email error:", error);
      await logEmail({
        email,
        userId,
        type: "WELCOME",
        subject,
        status: "failed",
        errorMessage: error.message,
      });
      return { success: false, error: error.message };
    }

    console.log("[Email] Welcome email sent to:", email, "ID:", data?.id);
    await logEmail({
      email,
      userId,
      type: "WELCOME",
      subject,
      status: "sent",
      messageId: data?.id,
    });
    return { success: true, messageId: data?.id };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Email] Welcome email exception:", error);
    await logEmail({
      email,
      userId,
      type: "WELCOME",
      subject,
      status: "failed",
      errorMessage: errorMsg,
    });
    return { success: false, error: errorMsg };
  }
}

/**
 * Send re-engagement email to inactive users
 */
export async function sendReEngagementEmail(
  email: string,
  userName?: string,
  credits: number = 0,
  daysSinceLastVisit: number = 7,
  lastAssetType?: string,
  userId?: string
): Promise<EmailResult> {
  const subject = `We miss you! Your ${credits} credits are waiting 💫`;

  try {
    const html = await render(
      <ReEngagementEmail
        userName={userName}
        credits={credits}
        daysSinceLastVisit={daysSinceLastVisit}
        lastAssetType={lastAssetType}
      />
    );

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      replyTo: EMAIL_REPLY_TO,
      subject,
      html,
    });

    if (error) {
      console.error("[Email] Re-engagement email error:", error);
      await logEmail({
        email,
        userId,
        type: "RE_ENGAGEMENT",
        subject,
        status: "failed",
        errorMessage: error.message,
        metadata: { daysSinceLastVisit, lastAssetType },
      });
      return { success: false, error: error.message };
    }

    console.log("[Email] Re-engagement email sent to:", email, "ID:", data?.id);
    await logEmail({
      email,
      userId,
      type: "RE_ENGAGEMENT",
      subject,
      status: "sent",
      messageId: data?.id,
      metadata: { daysSinceLastVisit, lastAssetType },
    });
    return { success: true, messageId: data?.id };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Email] Re-engagement email exception:", error);
    await logEmail({
      email,
      userId,
      type: "RE_ENGAGEMENT",
      subject,
      status: "failed",
      errorMessage: errorMsg,
      metadata: { daysSinceLastVisit, lastAssetType },
    });
    return { success: false, error: errorMsg };
  }
}

/**
 * Send promotional email
 */
export async function sendPromoEmail(
  email: string,
  userName?: string,
  options: {
    promoCode?: string;
    discountPercent: number;
    creditsAmount: number;
    expiresIn: string;
    promoTitle: string;
    promoMessage: string;
    campaignId?: string;
  } = {
    discountPercent: 20,
    creditsAmount: 100,
    expiresIn: "48 hours",
    promoTitle: "Special Offer",
    promoMessage: "Get more credits at a special price!",
  },
  userId?: string
): Promise<EmailResult> {
  const subject = `${options.promoTitle} - ${options.discountPercent}% OFF! 🎉`;

  try {
    const html = await render(<PromoEmail userName={userName} {...options} />);

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      replyTo: EMAIL_REPLY_TO,
      subject,
      html,
    });

    if (error) {
      console.error("[Email] Promo email error:", error);
      await logEmail({
        email,
        userId,
        type: "PROMO",
        subject,
        status: "failed",
        errorMessage: error.message,
        metadata: { promoCode: options.promoCode, campaignId: options.campaignId },
      });
      return { success: false, error: error.message };
    }

    console.log("[Email] Promo email sent to:", email, "ID:", data?.id);
    await logEmail({
      email,
      userId,
      type: "PROMO",
      subject,
      status: "sent",
      messageId: data?.id,
      metadata: { promoCode: options.promoCode, campaignId: options.campaignId },
    });
    return { success: true, messageId: data?.id };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Email] Promo email exception:", error);
    await logEmail({
      email,
      userId,
      type: "PROMO",
      subject,
      status: "failed",
      errorMessage: errorMsg,
      metadata: { promoCode: options.promoCode, campaignId: options.campaignId },
    });
    return { success: false, error: errorMsg };
  }
}

/**
 * Send abandoned cart email to users who didn't complete checkout
 */
export async function sendAbandonedCartEmail(
  email: string,
  userName: string | undefined,
  options: {
    planName: string;
    planPrice: string;
    planCredits: string;
    checkoutUrl?: string;
  },
  userId?: string
): Promise<EmailResult> {
  const subject = `Complete your ${options.planName} purchase - your credits are waiting! 🛒`;

  try {
    const html = await render(
      <AbandonedCartEmail
        userName={userName}
        planName={options.planName}
        planPrice={options.planPrice}
        planCredits={options.planCredits}
        checkoutUrl={options.checkoutUrl}
      />
    );

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      replyTo: EMAIL_REPLY_TO,
      subject,
      html,
    });

    if (error) {
      console.error("[Email] Abandoned cart email error:", error);
      await logEmail({
        email,
        userId,
        type: "ABANDONED_CART",
        subject,
        status: "failed",
        errorMessage: error.message,
        metadata: { planName: options.planName },
      });
      return { success: false, error: error.message };
    }

    console.log("[Email] Abandoned cart email sent to:", email, "ID:", data?.id);
    await logEmail({
      email,
      userId,
      type: "ABANDONED_CART",
      subject,
      status: "sent",
      messageId: data?.id,
      metadata: { planName: options.planName },
    });
    return { success: true, messageId: data?.id };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Email] Abandoned cart email exception:", error);
    await logEmail({
      email,
      userId,
      type: "ABANDONED_CART",
      subject,
      status: "failed",
      errorMessage: errorMsg,
      metadata: { planName: options.planName },
    });
    return { success: false, error: errorMsg };
  }
}

/**
 * Send special offer email to users with 0 credits
 */
export async function sendSpecialOfferEmail(
  email: string,
  userName?: string,
  options: {
    offerTitle?: string;
    offerDescription?: string;
    discountPercent?: number;
    expiresIn?: string;
    promoCode?: string;
  } = {},
  userId?: string
): Promise<EmailResult> {
  const subject = options.discountPercent
    ? `Special ${options.discountPercent}% off just for you! 🎁`
    : "We miss you! Special offer inside 🎁";

  try {
    const html = await render(
      <SpecialOfferEmail
        userName={userName}
        offerTitle={options.offerTitle}
        offerDescription={options.offerDescription}
        discountPercent={options.discountPercent}
        expiresIn={options.expiresIn}
        promoCode={options.promoCode}
      />
    );

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      replyTo: EMAIL_REPLY_TO,
      subject,
      html,
    });

    if (error) {
      console.error("[Email] Special offer email error:", error);
      await logEmail({
        email,
        userId,
        type: "SPECIAL_OFFER",
        subject,
        status: "failed",
        errorMessage: error.message,
        metadata: { promoCode: options.promoCode, discountPercent: options.discountPercent },
      });
      return { success: false, error: error.message };
    }

    console.log("[Email] Special offer email sent to:", email, "ID:", data?.id);
    await logEmail({
      email,
      userId,
      type: "SPECIAL_OFFER",
      subject,
      status: "sent",
      messageId: data?.id,
      metadata: { promoCode: options.promoCode, discountPercent: options.discountPercent },
    });
    return { success: true, messageId: data?.id };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Email] Special offer email exception:", error);
    await logEmail({
      email,
      userId,
      type: "SPECIAL_OFFER",
      subject,
      status: "failed",
      errorMessage: errorMsg,
      metadata: { promoCode: options.promoCode, discountPercent: options.discountPercent },
    });
    return { success: false, error: errorMsg };
  }
}

/**
 * Get email statistics from database
 */
export async function getEmailStats(days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [total, byType, byStatus, recentEmails] = await Promise.all([
    // Total emails
    prisma.emailLog.count({
      where: { createdAt: { gte: startDate } },
    }),
    // By type
    prisma.emailLog.groupBy({
      by: ["type"],
      where: { createdAt: { gte: startDate } },
      _count: true,
    }),
    // By status
    prisma.emailLog.groupBy({
      by: ["status"],
      where: { createdAt: { gte: startDate } },
      _count: true,
    }),
    // Recent emails
    prisma.emailLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        email: true,
        type: true,
        subject: true,
        status: true,
        createdAt: true,
        errorMessage: true,
      },
    }),
  ]);

  return {
    total,
    byType: Object.fromEntries(byType.map((t) => [t.type, t._count])),
    byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
    recentEmails,
  };
}
