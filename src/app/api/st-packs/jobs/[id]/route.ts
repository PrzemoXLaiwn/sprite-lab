// GET /api/st-packs/jobs/[id] — snapshot. The background worker does the
// work. A poll starts one only when the job's worker lease has expired and
// no expression still holds its step lock (a quiet Vidu render is not a
// stall). With no QUEUE_SECRET the poll itself advances the job.
import { NextResponse, after } from "next/server";
import { JOB_ID_RE, requireStAdmin } from "../../_lib/guard";
import { getSnapshot, runWork, tick } from "@/lib/st-packs/jobs";
import { isStalled, kickWorker } from "@/lib/st-packs/worker";

export const maxDuration = 300;

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireStAdmin();
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  if (!JOB_ID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const snapshot = await getSnapshot(id);
  if (!snapshot) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (isStalled(snapshot)) {
    after(async () => {
      if (!(await kickWorker(id))) {
        const { work } = await tick(id);
        await runWork(work);
      }
    });
  }
  return NextResponse.json(snapshot, { headers: { "Cache-Control": "no-store" } });
}
