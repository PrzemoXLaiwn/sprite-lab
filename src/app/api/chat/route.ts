import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// ===========================================
// HELPERS
// ===========================================

// Sanitize message to prevent XSS
function sanitizeMessage(message: string): string {
  return message
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .trim();
}

// Validate message content
function validateMessage(message: unknown): { valid: boolean; error?: string; sanitized?: string } {
  if (typeof message !== "string") {
    return { valid: false, error: "Message must be a string." };
  }

  const trimmed = message.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: "Please provide a message." };
  }

  if (trimmed.length > 500) {
    return { valid: false, error: "Message too long (max 500 characters)." };
  }

  // Check for spam patterns
  const spamPatterns = [
    /(.)\1{10,}/i, // Same character repeated 10+ times
    /(https?:\/\/[^\s]+\s*){3,}/i, // 3+ URLs in a message
  ];

  if (spamPatterns.some((pattern) => pattern.test(trimmed))) {
    return { valid: false, error: "Message appears to be spam." };
  }

  return { valid: true, sanitized: sanitizeMessage(trimmed) };
}

// ===========================================
// GET - Fetch chat messages
// ===========================================
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = Math.min(Math.max(parseInt(limitParam || "50", 10) || 50, 1), 100);

    // Fetch messages with user info using raw query
    const messages = await prisma.$queryRaw<Array<{
      id: string;
      userId: string;
      message: string;
      createdAt: Date;
      userName: string | null;
      userAvatar: string | null;
      userPlan: string;
    }>>`
      SELECT
        cm.id,
        cm.user_id as "userId",
        cm.message,
        cm.created_at as "createdAt",
        u.name as "userName",
        u.avatar_url as "userAvatar",
        u.plan as "userPlan"
      FROM chat_messages cm
      LEFT JOIN users u ON cm.user_id = u.id
      ORDER BY cm.created_at DESC
      LIMIT ${limit}
    `;

    // Reverse to get chronological order and format dates
    const formattedMessages = messages.reverse().map((msg) => ({
      ...msg,
      createdAt: msg.createdAt instanceof Date ? msg.createdAt.toISOString() : msg.createdAt,
    }));

    return NextResponse.json({
      success: true,
      messages: formattedMessages,
    });
  } catch (error) {
    console.error("[Chat GET] Error:", error);
    return NextResponse.json({
      success: true,
      messages: [],
    });
  }
}

// ===========================================
// POST - Send a chat message
// ===========================================
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please log in to chat." },
        { status: 401 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    // Validate message
    const validation = validateMessage(body?.message);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Rate limiting - max 10 messages per minute
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const recentMessages = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM chat_messages
      WHERE user_id = ${user.id} AND created_at > ${oneMinuteAgo}
    `;

    if (Number(recentMessages[0]?.count || 0) >= 10) {
      return NextResponse.json(
        { error: "Too many messages. Please wait a moment." },
        { status: 429 }
      );
    }

    // Create message
    const messageId = `msg_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
    const now = new Date();

    await prisma.$executeRaw`
      INSERT INTO chat_messages (id, user_id, message, created_at)
      VALUES (${messageId}, ${user.id}, ${validation.sanitized}, ${now})
    `;

    // Get user info
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, avatarUrl: true, plan: true },
    });

    return NextResponse.json({
      success: true,
      message: {
        id: messageId,
        userId: user.id,
        message: validation.sanitized,
        createdAt: now.toISOString(),
        userName: dbUser?.name || null,
        userAvatar: dbUser?.avatarUrl || null,
        userPlan: dbUser?.plan || "FREE",
      },
    });
  } catch (error) {
    console.error("[Chat POST] Error:", error);
    return NextResponse.json(
      { error: "Failed to send message. Please try again." },
      { status: 500 }
    );
  }
}
