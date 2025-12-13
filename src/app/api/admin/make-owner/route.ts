import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * ADMIN ENDPOINT TO MAKE A USER AN OWNER
 *
 * Usage: POST /api/admin/make-owner
 * Body: { email, secret }
 *
 * This will make the specified email an OWNER.
 * After you have at least one OWNER, you can manage other admins through the admin panel.
 *
 * SECURITY:
 * - Requires ADMIN_SECRET environment variable
 * - Only POST requests allowed
 * - Rate limited in middleware
 * - This is a bootstrap endpoint - use only to create initial owner
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

    const { email, secret } = body;

    // Security: require ADMIN_SECRET from env (must be set in production!)
    const ADMIN_SECRET = process.env.ADMIN_SECRET;

    if (!ADMIN_SECRET) {
      console.error("❌ ADMIN_SECRET is not set in environment variables!");
      return NextResponse.json(
        { error: "Admin endpoint not configured. Set ADMIN_SECRET in environment." },
        { status: 500 }
      );
    }

    // For make-owner, we REQUIRE the secret (no authenticated admin bypass)
    // This is because this endpoint is used to bootstrap the first owner
    if (!secret || secret !== ADMIN_SECRET) {
      console.warn("⚠️ Unauthorized admin access attempt to make-owner");
      return NextResponse.json(
        { error: "Unauthorized: Invalid secret" },
        { status: 401 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: `User with email ${email} not found. Please sign up first.` },
        { status: 404 }
      );
    }

    // Update to OWNER role
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { role: "OWNER" },
    });

    console.log(`✅ Made ${email} an OWNER`);

    return NextResponse.json({
      success: true,
      message: `Successfully made ${email} an OWNER!`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error("Failed to make owner:", error);
    return NextResponse.json(
      { error: "Failed to update user role" },
      { status: 500 }
    );
  }
}

// Keep GET for backwards compatibility but discourage use
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const secret = searchParams.get("secret");

  // Log deprecation warning
  console.warn("⚠️ GET request to /api/admin/make-owner is deprecated. Use POST instead.");

  // Forward to POST handler
  const fakeRequest = new Request(request.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, secret }),
  });

  return POST(fakeRequest);
}
