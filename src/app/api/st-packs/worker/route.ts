// POST /api/st-packs/worker — internal. Authenticated with QUEUE_SECRET (not a
// user session), kicked by the job routes and by itself. Answers 202 at once
// and keeps working in after(). The kick passes the lease it just claimed;
// when the time budget ends with the job still running, the successor takes
// that lease over instead of starting a second worker.
import { timingSafeEqual } from "node:crypto";
import { NextResponse, after } from "next/server";
import { isStPacksEnabled } from "@/config/st-packs";
import { JOB_ID_RE } from "../_lib/guard";
import { WORKER_HEADER, kickWorker, workerLoop } from "@/lib/st-packs/worker";

export const maxDuration = 300; // keep in step with WORKER_MAX_MS

function secretMatches(given: string | null): boolean {
  const expected = process.env.QUEUE_SECRET;
  if (!expected || !given) return false;
  const a = Buffer.from(given), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!isStPacksEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!secretMatches(request.headers.get(WORKER_HEADER))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { jobId?: unknown; leaseUntil?: unknown } | null;
  const jobId = typeof body?.jobId === "string" ? body.jobId : "";
  if (!JOB_ID_RE.test(jobId)) return NextResponse.json({ error: "Bad job id" }, { status: 400 });
  const leaseRaw = typeof body?.leaseUntil === "string" ? new Date(body.leaseUntil) : null;
  const leaseUntil = leaseRaw && !Number.isNaN(leaseRaw.getTime()) ? leaseRaw : null;

  after(async () => {
    try {
      const { continueNeeded, handoffFrom } = await workerLoop(jobId, { leaseUntil });
      // Take the lease over (compare-and-swap). A poll that also noticed the
      // budget ending cannot claim it while this hand-off still holds it.
      if (continueNeeded && handoffFrom) await kickWorker(jobId, { handoffFrom });
    } catch (err) {
      console.error(`[st-packs] worker for ${jobId} crashed:`, err instanceof Error ? err.message : err);
    }
  });
  return NextResponse.json({ accepted: true }, { status: 202 });
}
