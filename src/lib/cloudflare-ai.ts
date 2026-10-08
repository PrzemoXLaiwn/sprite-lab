// =============================================================================
// Cloudflare Workers AI — free fallback image provider
// =============================================================================
// Used only when Runware can't serve a request (e.g. the prepaid balance ran
// out). Workers AI includes a free daily allowance on every plan, so basic
// sprite generation keeps working at $0 until Runware is topped up again.
//   standard → FLUX.2 [klein] 4B   (~100 images/day inside the free allowance)
//   hd       → also 4B by default (9B uses ~13× the allowance; opt in with
//              CLOUDFLARE_AI_ALLOW_9B=true)
// Needs CLOUDFLARE_AI_TOKEN (API token with the "Workers AI" permission) and
// the account id (R2_ACCOUNT_ID, same Cloudflare account as storage).
// =============================================================================

const MODELS = {
  klein4b: "@cf/black-forest-labs/flux-2-klein-4b",
  klein9b: "@cf/black-forest-labs/flux-2-klein-9b",
} as const;

export function cloudflareAiConfigured(): boolean {
  return Boolean(process.env.CLOUDFLARE_AI_TOKEN && (process.env.CLOUDFLARE_ACCOUNT_ID || process.env.R2_ACCOUNT_ID));
}

async function run(model: string, prompt: string, seed?: number): Promise<Buffer> {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.R2_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_AI_TOKEN;
  if (!account || !token) throw new Error("Cloudflare Workers AI is not configured");

  const form = new FormData();
  form.append("prompt", prompt.slice(0, 2000));
  form.append("width", "1024");
  form.append("height", "1024");
  if (seed !== undefined) form.append("seed", String(seed));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
      signal: controller.signal,
    });
    const json = (await res.json().catch(() => null)) as
      | { success?: boolean; result?: { image?: string }; errors?: { message?: string; code?: number }[] }
      | null;
    const b64 = json?.result?.image;
    if (!res.ok || !b64) {
      const e = json?.errors?.[0];
      throw new Error(`Cloudflare AI ${res.status}${e?.code ? ` ${e.code}` : ""}: ${e?.message ?? "no image returned"}`);
    }
    return Buffer.from(b64, "base64");
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Tries the preferred model, then the other one. Cloudflare's safety filter
 * sometimes flags harmless game art (code 3030) — a new seed usually passes,
 * so each model gets a second attempt with a different seed. The 9B model's
 * free allowance is small, so it leads only for HD requests.
 */
export async function generateWithCloudflare(opts: { prompt: string; hd: boolean; seed?: number }): Promise<{ image: Buffer; model: string }> {
  // 9B costs ~13× more of the shared daily free allowance than 4B — a few
  // HD requests would use up the whole day for everyone, so production uses
  // 4B only (CLOUDFLARE_AI_ALLOW_9B=true re-enables 9B for HD).
  const allow9b = process.env.CLOUDFLARE_AI_ALLOW_9B === "true";
  const order = opts.hd && allow9b ? [MODELS.klein9b, MODELS.klein4b] : [MODELS.klein4b];
  const firstSeed = opts.seed ?? Math.floor(Math.random() * 2_147_483_647);
  let lastErr: unknown;
  for (const model of order) {
    for (const seed of [firstSeed, (firstSeed + 7919) % 2_147_483_647]) {
      try {
        return { image: await run(model, opts.prompt, seed), model };
      } catch (err) {
        lastErr = err;
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[CloudflareAI] ${model} failed:`, msg);
        // Only a flagged output is worth a second seed on the same model
        if (!/3030|flagged/i.test(msg)) break;
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Cloudflare AI failed");
}
