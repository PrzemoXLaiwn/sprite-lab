// GET /api/st-packs/balance — admin-only Runware prepaid balance.
import { NextResponse } from "next/server";
import { requireStAdmin } from "../_lib/guard";
import { getRunwareBalance } from "@/lib/runware";

export async function GET() {
  const guard = await requireStAdmin();
  if (!guard.ok) return guard.response;
  const balance = await getRunwareBalance();
  if (!balance) return NextResponse.json({ amount: null }, { status: 200 });
  return NextResponse.json({ amount: balance.amount, currency: balance.currency });
}
