// POST /api/st-packs/jobs/[id]/expressions/[label]/regenerate
// { from: "edit" } redraws the still and the clip; { from: "video" } keeps
// the edited still and re-rolls the motion only. Also the "Retry" action.
import { NextResponse, after } from "next/server";
import { JOB_ID_RE, requireStAdmin } from "../../../../../_lib/guard";
import { isExpressionLabel } from "@/config/st-expressions";
import { rateLimitUserAction } from "@/lib/rate-limit";
import { regenerateExpression, runWork, tick } from "@/lib/st-packs/jobs";

export const maxDuration = 300;

export async function POST(request: Request, ctx: { params: Promise<{ id: string; label: string }> }) {
  const guard = await requireStAdmin();
  if (!guard.ok) return guard.response;
  const limited = await rateLimitUserAction("stpacks", guard.userId);
  if (limited.blocked) return limited.blocked;
  const { id, label } = await ctx.params;
  if (!JOB_ID_RE.test(id) || !isExpressionLabel(label)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as { from?: unknown };
  const from = body.from === "video" ? "video" : "edit";
  if (!(await regenerateExpression(id, label, from))) return NextResponse.json({ error: "Nothing to regenerate yet." }, { status: 409 });
  const { snapshot, work } = await tick(id);
  if (!snapshot) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (work.length) after(() => runWork(work));
  return NextResponse.json(snapshot, { headers: { "Cache-Control": "no-store" } });
}
