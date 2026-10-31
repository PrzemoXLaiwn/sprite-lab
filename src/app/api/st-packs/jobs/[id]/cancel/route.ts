// POST /api/st-packs/jobs/[id]/cancel — stop a running job. Clips already
// queued at the provider may still be billed; nothing new is started.
import { NextResponse } from "next/server";
import { JOB_ID_RE, requireStAdmin } from "../../../_lib/guard";
import { cancelJob, getSnapshot } from "@/lib/st-packs/jobs";

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireStAdmin();
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  if (!JOB_ID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await cancelJob(id);
  const snapshot = await getSnapshot(id);
  if (!snapshot) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(snapshot, { headers: { "Cache-Control": "no-store" } });
}
