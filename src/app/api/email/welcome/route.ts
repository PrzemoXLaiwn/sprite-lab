import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail } from "@/lib/email/send";
import { Prisma } from "@prisma/client";

// Send welcome email to current user (called after registration)
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user data
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        email: true,
        name: true,
        credits: true,
        emailPreferences: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check email preferences
    const prefs = dbUser.emailPreferences as
      | { marketing?: boolean; welcomeEmailSent?: boolean }
      | null;

    // Send-once guard: the welcome email is only ever sent a single time
    if (prefs?.welcomeEmailSent) {
      return NextResponse.json({
        success: true,
        alreadySent: true,
      });
    }

    if (prefs?.marketing === false) {
      return NextResponse.json({
        success: false,
        message: "User has disabled marketing emails",
      });
    }

    // Claim the send before sending so concurrent calls can't both send.
    // The conditional update only succeeds if emailPreferences is unchanged
    // since we read it (i.e. nobody else has marked it sent in between).
    const claimed = await prisma.user.updateMany({
      where: {
        id: user.id,
        emailPreferences: dbUser.emailPreferences === null
          ? { equals: Prisma.AnyNull }
          : { equals: dbUser.emailPreferences as Prisma.InputJsonValue },
      },
      data: {
        emailPreferences: {
          ...(prefs || {}),
          welcomeEmailSent: true,
          welcomeEmailSentAt: new Date().toISOString(),
        },
      },
    });

    if (claimed.count === 0) {
      return NextResponse.json({
        success: true,
        alreadySent: true,
      });
    }

    // Send welcome email — always to the logged-in user's own DB email
    const result = await sendWelcomeEmail(
      dbUser.email,
      dbUser.name || undefined,
      dbUser.credits
    );

    if (!result.success) {
      console.error("[API] Welcome email send failed:", result.error);
      // Release the claim so a later call can retry
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailPreferences: prefs ? (prefs as Prisma.InputJsonValue) : Prisma.DbNull,
        },
      }).catch(console.error);
      return NextResponse.json(
        { error: "Failed to send welcome email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("[API] Welcome email error:", error);
    return NextResponse.json(
      { error: "Failed to send welcome email" },
      { status: 500 }
    );
  }
}
