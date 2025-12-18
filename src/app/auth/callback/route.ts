import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/generate";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Get the authenticated user
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Ensure user exists in database (auto-sync from Supabase Auth)
        try {
          await prisma.user.upsert({
            where: { id: user.id },
            update: {
              // Update name/avatar if changed
              name: user.user_metadata?.full_name || user.user_metadata?.name || undefined,
              avatarUrl: user.user_metadata?.avatar_url || undefined,
            },
            create: {
              id: user.id,
              email: user.email!,
              name: user.user_metadata?.full_name || user.user_metadata?.name || null,
              avatarUrl: user.user_metadata?.avatar_url || null,
              credits: 15,
              plan: "FREE",
              role: "USER",
              isActive: true,
            },
          });
        } catch (err) {
          console.error("[Auth Callback] Failed to sync user to DB:", err);
        }
      }

      // If this is email confirmation (signup), redirect to success page
      if (type === "signup") {
        return NextResponse.redirect(`${origin}/auth/confirm`);
      }
      // Password reset - redirect to update-password page
      if (type === "recovery" || next === "/update-password") {
        return NextResponse.redirect(`${origin}/update-password`);
      }
      // Otherwise redirect to the next page
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate`);
}
