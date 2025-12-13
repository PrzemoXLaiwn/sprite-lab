import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    // Get user info (optional - for context)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const { type, message, email, context } = body;

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Please provide a message" },
        { status: 400 }
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: "Message too long (max 2000 characters)" },
        { status: 400 }
      );
    }

    // Send directly to Discord
    const webhookUrl = process.env.DISCORD_FEEDBACK_WEBHOOK_URL;
    if (!webhookUrl) {
      console.error("[Feedback] Discord webhook not configured");
      return NextResponse.json(
        { error: "Feedback system not configured" },
        { status: 500 }
      );
    }

    const typeEmojis: Record<string, string> = {
      bug: "🐛",
      feature: "💡",
      other: "📝",
    };
    const typeEmoji = typeEmojis[type as string] || "📝";

    const typeLabels: Record<string, string> = {
      bug: "Bug Report",
      feature: "Feature Request",
      other: "General Feedback",
    };
    const typeLabel = typeLabels[type as string] || "Feedback";

    // Parse context if available
    let contextInfo = "";
    if (context) {
      try {
        const ctx = JSON.parse(context);
        if (ctx.page) contextInfo += `**Page:** ${ctx.page}\n`;
        if (ctx.mode) contextInfo += `**Mode:** ${ctx.mode}\n`;
        if (ctx.error) contextInfo += `**Error:** ${ctx.error}\n`;
      } catch {
        // Ignore parse errors
      }
    }

    const feedbackId = `FB-${Date.now().toString(36).toUpperCase()}`;
    const userEmail = email?.trim() || user?.email || null;

    const embed = {
      title: `${typeEmoji} ${typeLabel}`,
      description: message.trim(),
      color: type === "bug" ? 0xff4444 : type === "feature" ? 0x44ff44 : 0x4444ff,
      fields: [
        ...(userEmail ? [{ name: "📧 Email", value: userEmail, inline: true }] : []),
        ...(user?.id ? [{ name: "👤 User ID", value: user.id.slice(0, 8) + "...", inline: true }] : []),
        { name: "🆔 ID", value: feedbackId, inline: true },
      ],
      footer: {
        text: "Sprite Lab Feedback",
      },
      timestamp: new Date().toISOString(),
    };

    if (contextInfo) {
      embed.fields.push({ name: "📍 Context", value: contextInfo, inline: false });
    }

    const discordResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [embed],
      }),
    });

    if (!discordResponse.ok) {
      console.error("[Feedback] Discord error:", discordResponse.status);
      return NextResponse.json(
        { error: "Failed to send feedback" },
        { status: 500 }
      );
    }

    console.log("[Feedback] Sent to Discord:", feedbackId);

    return NextResponse.json({
      success: true,
      message: "Thank you for your feedback!",
    });

  } catch (error) {
    console.error("[Feedback] Error:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 }
    );
  }
}
