import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail } from "@/lib/email/send";

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
    const prefs = dbUser.emailPreferences as { marketing?: boolean } | null;
    if (prefs?.marketing === false) {
      return NextResponse.json({
        success: false,
        message: "User has disabled marketing emails",
      });
    }

    // Send welcome email
    const result = await sendWelcomeEmail(
      dbUser.email,
      dbUser.name || undefined,
      dbUser.credits
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // Mark that welcome email was sent
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailPreferences: {
          ...(prefs || {}),
          welcomeEmailSent: true,
          welcomeEmailSentAt: new Date().toISOString(),
        },
      },
    });

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
