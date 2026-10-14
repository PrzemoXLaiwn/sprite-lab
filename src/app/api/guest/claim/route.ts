import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateUser } from "@/lib/database";
import { rateLimitUserAction } from "@/lib/rate-limit";
import { parseJsonBody, validateBody } from "@/lib/validation/common";
import { MAX_GUEST_TOKENS, isValidGuestToken } from "@/lib/guest-claim/token";
import { claimGuestSprite, type ClaimOutcome } from "@/lib/guest-claim/server";

// =============================================================================
// CLAIM GUEST SPRITES
// =============================================================================
// After signup the browser sends the claim tokens it kept from the landing
// page; each sprite is copied into the user's library as a normal Generation
// (shows up in Assets) and the guest objects are deleted. No credits move.
// =============================================================================

const ClaimSchema = z.object({
  tokens: z
    .array(z.string())
    .min(1, "No sprites to claim.")
    .max(MAX_GUEST_TOKENS, `At most ${MAX_GUEST_TOKENS} sprites per request.`),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Please sign in first." }, { status: 401 });
  }

  const { blocked } = await rateLimitUserAction("claim", user.id);
  if (blocked) return blocked;

  const rawBody = await parseJsonBody(request);
  const parsed = rawBody === null ? null : validateBody(ClaimSchema, rawBody);
  if (!parsed || !parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed?.error ?? "Invalid request body.", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const tokens = [...new Set(parsed.data.tokens)];
  if (!tokens.every(isValidGuestToken)) {
    return NextResponse.json(
      { success: false, error: "Invalid sprite token.", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  // One Tap / first visit: the Generation row needs the user row to exist.
  await getOrCreateUser(user.id, user.email ?? "");

  // Sequential: at most 3, and it keeps R2/DB load predictable.
  const results: ClaimOutcome[] = [];
  for (const token of tokens) results.push(await claimGuestSprite(user.id, token));

  const claimed = results.filter((r) => r.status === "claimed").length;
  const failed = results.filter((r) => r.status === "error").length;
  return NextResponse.json({
    success: true,
    claimed,
    // Storage/DB trouble: the client may keep the tokens and retry later.
    retryable: failed > 0,
    results: results.map((r) => ({ status: r.status, generationId: r.generationId })),
  });
}
