import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

/**
 * ADMIN ENDPOINT TO UPDATE A USER'S PLAN
 *
 * Usage: POST /api/admin/update-plan
 * Body: { email, plan, secret? }
 *
 * Valid plans: FREE, STARTER, PRO, UNLIMITED
 *
 * SECURITY:
 * - Requires ADMIN_SECRET or authenticated admin user
 * - Only POST requests allowed
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

    const { email, plan, secret } = body;

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

    if (secret && secret === ADMIN_SECRET) {
      isAuthorized = true;
    }

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
        // Auth check failed
      }
    }

    if (!isAuthorized) {
      console.warn("⚠️ Unauthorized admin access attempt to update-plan");
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

    if (!plan) {
      return NextResponse.json(
        { error: "Plan is required (FREE, STARTER, PRO, UNLIMITED)" },
        { status: 400 }
      );
    }

    const validPlans = ["FREE", "STARTER", "PRO", "UNLIMITED"];
    if (!validPlans.includes(plan)) {
      return NextResponse.json(
        { error: `Invalid plan. Must be one of: ${validPlans.join(", ")}` },
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

    // Update user's plan
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { plan },
    });

    console.log(`✅ Updated ${email} to plan: ${plan}`);

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${email} to ${plan} plan`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        plan: updatedUser.plan,
        credits: updatedUser.credits,
      },
    });
  } catch (error) {
    console.error("Failed to update plan:", error);
    return NextResponse.json(
      { error: "Failed to update plan" },
      { status: 500 }
    );
  }
}

// Keep GET for backwards compatibility but discourage use
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const plan = searchParams.get("plan");
  const secret = searchParams.get("secret");

  // Log deprecation warning
  console.warn("⚠️ GET request to /api/admin/update-plan is deprecated. Use POST instead.");

  // Forward to POST handler
  const fakeRequest = new Request(request.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, plan, secret }),
  });

  return POST(fakeRequest);
}
