import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { chooseInRun } from "@/lib/dungeon/store";

export const dynamic = "force-dynamic";

const Body = z.object({ runId: z.string().uuid(), blessingId: z.string().min(1).max(40).regex(/^[a-z-]+$/) });

const ERRORS = {
  "not-found": { status: 404, error: "That climb doesn't exist." },
  finished: { status: 409, error: "That climb is already over." },
  "not-offered": { status: 400, error: "That blessing wasn't offered on this floor." },
  conflict: { status: 409, error: "That choice was already made. Reload to continue." },
} as const;

/**
 * POST /api/play/run/choose { runId, blessingId } — applies a blessing the
 * server offered and climbs on to the next choice or the end. Not separately
 * rate-limited: each call needs a pending offer, so it's bounded by the run.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid choice." }, { status: 400 });

  try {
    const result = await chooseInRun(user.id, parsed.data.runId, parsed.data.blessingId);
    if (!result.ok) {
      const e = ERRORS[result.reason];
      return NextResponse.json({ error: e.error, code: result.reason }, { status: e.status });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[Dungeon] Choice failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't continue the climb. Try again in a moment." }, { status: 500 });
  }
}
