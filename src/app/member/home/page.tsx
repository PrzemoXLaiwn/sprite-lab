import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { HomePage } from "@/components/landing/HomePage";
import { metadata as publicMetadata } from "@/app/page";

// Signed-in home (rewritten here from / by the session proxy): "Open app" in
// the nav and the hero prompt goes straight to the generator.
export const metadata: Metadata = { ...publicMetadata, robots: { index: false, follow: true } };

export default async function MemberHome() {
  let signedIn = false;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    signedIn = Boolean(user);
  } catch {
    // Auth service unreachable: show the visitor version
  }
  return <HomePage signedIn={signedIn} />;
}
