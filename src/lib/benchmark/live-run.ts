// Live probe used only by scripts/benchmark/run.ts --live.
// The harness test injects fetch so the cap can be checked without a network call.

export interface LiveRequest {
  id: string;
  listUsd: number;
  body: unknown;
}

export interface LiveResult {
  id: string;
  reportedUsd: number | null;
  listUsd: number;
  image: Buffer | null;
  error?: string;
}

export async function runCappedLive(
  requests: LiveRequest[],
  opts: {
    capUsd: number;
    apiKey: string;
    fetchImpl?: typeof fetch;
    /** Already spent. The next call is skipped when spent + list price would pass the cap. */
    alreadySpentUsd?: number;
  },
): Promise<{ results: LiveResult[]; spendUsd: number; skipped: string[] }> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const results: LiveResult[] = [];
  const skipped: string[] = [];
  let spent = opts.alreadySpentUsd ?? 0;
  for (const req of requests) {
    if (spent + req.listUsd > opts.capUsd + 1e-9) {
      skipped.push(req.id);
      continue;
    }
    // Reserve the list price before the call so a timeout still counts.
    spent += req.listUsd;
    try {
      const res = await fetchImpl("https://api.runware.ai/v1", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${opts.apiKey}` },
        body: JSON.stringify(req.body),
      });
      const json = await res.json() as { data?: { imageURL?: string; cost?: number }[]; errors?: { message?: string }[] };
      if (json.errors?.length || !json.data?.[0]?.imageURL) {
        results.push({ id: req.id, reportedUsd: null, listUsd: req.listUsd, image: null, error: json.errors?.[0]?.message ?? `HTTP ${res.status}` });
        continue;
      }
      const reported = typeof json.data[0].cost === "number" ? json.data[0].cost : null;
      if (reported !== null) spent += reported - req.listUsd;
      const imgRes = await fetchImpl(json.data[0].imageURL);
      const image = imgRes.ok ? Buffer.from(await imgRes.arrayBuffer()) : null;
      results.push({ id: req.id, reportedUsd: reported, listUsd: req.listUsd, image });
    } catch (err) {
      results.push({ id: req.id, reportedUsd: null, listUsd: req.listUsd, image: null, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return { results, spendUsd: spent, skipped };
}
