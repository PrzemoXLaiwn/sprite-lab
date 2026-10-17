// Runware account: balance + cumulative usage counter (accountManagement API).
// The cumulative counter is timezone-free, so reconciliation compares deltas
// between two snapshots instead of Runware's "today".

export interface RunwareAccount {
  balance: number;
  totalUsd: number;
  todayUsd: number;
  last7Usd: number;
  last30Usd: number;
}

export async function fetchRunwareAccount(): Promise<RunwareAccount | null> {
  const key = process.env.RUNWARE_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.runware.ai/v1", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify([{ taskType: "accountManagement", taskUUID: crypto.randomUUID(), operation: "getDetails" }]),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const d = (await res.json())?.data?.[0];
    if (typeof d?.balance !== "number") return null;
    return {
      balance: d.balance,
      totalUsd: d.usage?.total?.credits ?? 0,
      todayUsd: d.usage?.today?.credits ?? 0,
      last7Usd: d.usage?.last7Days?.credits ?? 0,
      last30Usd: d.usage?.last30Days?.credits ?? 0,
    };
  } catch {
    return null;
  }
}
