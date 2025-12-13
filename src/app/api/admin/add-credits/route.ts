import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

/**
 * ADMIN ENDPOINT TO ADD CREDITS TO A USER
 *
 * Usage: POST /api/admin/add-credits
 * Body: { email, credits, reason?, secret }
 *
 * This endpoint is for manually adding credits (e.g., for failed webhook purchases)
 *
 * SECURITY:
 * - Requires ADMIN_SECRET environment variable to be set
 * - Only POST requests allowed
 * - Validates admin status if logged in
 * - Rate limited in middleware
 */
export async function POST(request: Request) {
  try {
    // Parse JSON body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { email, credits, secret, reason = "Manual credit addition" } = body;

    // Security: require ADMIN_SECRET from env (must be set in production!)
    const ADMIN_SECRET = process.env.ADMIN_SECRET;

    if (!ADMIN_SECRET) {
      console.error("❌ ADMIN_SECRET is not set in environment variables!");
      return NextResponse.json(
        { error: "Admin endpoint not configured. Set ADMIN_SECRET in environment." },
        { status: 500 }
      );
    }

    // Two-factor validation: secret OR authenticated admin user
    let isAuthorized = false;

    // Check secret first
    if (secret && secret === ADMIN_SECRET) {
      isAuthorized = true;
    }

    // Also check if request is from authenticated admin
    if (!isAuthorized) {
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const adminCheck = await isAdmin(user.id);
          if (adminCheck) {
            isAuthorized = true;
          }
        }
      } catch {
        // Auth check failed, fall back to secret validation
      }
    }

    if (!isAuthorized) {
      console.warn("⚠️ Unauthorized admin access attempt to add-credits");
      return NextResponse.json(
        { error: "Unauthorized: Invalid credentials" },
        { status: 401 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (!credits) {
      return NextResponse.json(
        { error: "Credits amount is required" },
        { status: 400 }
      );
    }

    const creditsAmount = typeof credits === "number" ? credits : parseInt(credits, 10);

    if (isNaN(creditsAmount) || creditsAmount <= 0) {
      return NextResponse.json(
        { error: "Credits must be a positive number" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: `User with email ${email} not found` },
        { status: 404 }
      );
    }

    // Add credits to user
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        credits: {
          increment: creditsAmount,
        },
      },
    });

    // Log the transaction
    await prisma.creditTransaction.create({
      data: {
        userId: user.id,
        amount: creditsAmount,
        type: "PURCHASE",
        description: reason,
      },
    });

    console.log(`✅ Added ${creditsAmount} credits to ${email}`);

    return NextResponse.json({
      success: true,
      message: `Successfully added ${creditsAmount} credits to ${email}`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        credits: updatedUser.credits,
      },
    });
  } catch (error) {
    console.error("Failed to add credits:", error);
    return NextResponse.json(
      { error: "Failed to add credits" },
      { status: 500 }
    );
  }
}
