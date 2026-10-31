import { notFound } from "next/navigation";
import { canUseStPacks } from "@/app/api/st-packs/_lib/guard";
import { StPacksStudio } from "@/components/st-packs/StPacksStudio";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "ST Packs (beta)",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** Admin-only beta: the page does not exist for anyone else (404), flag off included. */
export default async function StPacksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!(await canUseStPacks(user?.id))) notFound();
  return <StPacksStudio />;
}
