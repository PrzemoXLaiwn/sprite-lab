import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPortalSession } from "@/lib/stripe";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    // Authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // Get user's Stripe customer ID
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { stripeCustomerId: true },
    });

    if (!dbUser?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No active subscription found." },
        { status: 400 }
      );
    }

    // Get the origin for return URL (use env variable for production)
    const origin = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "http://localhost:3000";

    // Create portal session
    const session = await createPortalSession(
      dbUser.stripeCustomerId,
      `${origin}/dashboard`
    );

    console.log("Portal session created:", session.id);

    return NextResponse.json({
      success: true,
      url: session.url,
    });

  } catch (error) {
    console.error("Portal error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create portal session" },
      { status: 500 }
    );
  }
}
