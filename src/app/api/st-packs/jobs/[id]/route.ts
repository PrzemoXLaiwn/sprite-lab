// GET /api/st-packs/jobs/[id] — snapshot; every poll also advances the job
// (claims the next steps and runs them after the response).
import { NextResponse, after } from "next/server";
import { JOB_ID_RE, requireStAdmin } from "../../_lib/guard";
import { runWork, tick } from "@/lib/st-packs/jobs";

export const maxDuration = 300;

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireStAdmin();
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  if (!JOB_ID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { snapshot, work } = await tick(id);
  if (!snapshot) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (work.length) after(() => runWork(work));
  return NextResponse.json(snapshot, { headers: { "Cache-Control": "no-store" } });
}
