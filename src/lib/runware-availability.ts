// Ask Runware whether the prepaid balance can cover one job, before we charge
// the user. A failed lookup does not block: the job still refunds if the
// provider then says the balance is empty.

import { NextResponse } from "next/server";
import { getRunwareBalance } from "@/lib/runware";
import { providerUnavailableMessage } from "@/lib/provider-balance";
import { reportProviderBalanceLow } from "@/lib/ops/balance-alert";

const CACHE_MS = 60_000;
let cached: { at: number; amount: number } | null = null;

export async function cachedRunwareBalanceUsd(): Promise<number | null> {
  const now = Date.now();
  if (cached && now - cached.at < CACHE_MS) return cached.amount;
  try {
    const balance = await getRunwareBalance();
    if (!balance || typeof balance.amount !== "number") return null;
    cached = { at: now, amount: balance.amount };
    return balance.amount;
  } catch {
    return null;
  }
}

/** 503 before a charge when the balance is known and too low. Null means carry on. */
export async function providerBalanceBlock(feature: string, minUsd: number): Promise<NextResponse | null> {
  const amount = await cachedRunwareBalanceUsd();
  if (amount === null || amount >= minUsd) return null;
  void reportProviderBalanceLow(feature);
  return NextResponse.json(
    { error: providerUnavailableMessage(feature, false), code: "PROVIDER_BALANCE" },
    { status: 503 },
  );
}
