import { NextResponse } from "next/server";
import { claimGift } from "@/lib/gifts";

export const dynamic = "force-dynamic";

/** GET /api/gift/claim?u=&g=&t= — one-click gift from an email. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const u = url.searchParams.get("u") ?? "";
  const g = url.searchParams.get("g") ?? "";
  const t = url.searchParams.get("t") ?? "";
  const result = await claimGift(u, g, t).catch(() => ({ ok: false as const, reason: "invalid" as const }));
  const to = new URL("/gift", url.origin);
  if (result.ok) { to.searchParams.set("status", "claimed"); to.searchParams.set("amount", String(result.amount)); }
  else to.searchParams.set("status", result.reason);
  return NextResponse.redirect(to);
}
