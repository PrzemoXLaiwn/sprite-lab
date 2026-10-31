import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleFunnelPost, stampUserFirstTouch } from "@/lib/funnel/handle";
import { prismaQueryDb } from "@/lib/funnel/prisma-db";

export const dynamic = "force-dynamic";

async function sessionUserId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/** First-party funnel event. Never required for the page to work. */
export async function POST(request: Request) {
  try {
    return await handleFunnelPost(request, {
      db: prismaQueryDb(),
      userId: await sessionUserId(),
      stampUser: stampUserFirstTouch,
    });
  } catch (err) {
    console.error("[funnel] write failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false }, { status: 204 });
  }
}
