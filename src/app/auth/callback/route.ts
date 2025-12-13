import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/generate";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
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
