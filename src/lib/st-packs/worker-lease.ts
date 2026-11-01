// =============================================================================
// ST Packs — one background worker per job
// =============================================================================
// A Vidu render (and the wait between polls) does not touch the expression
// row, so "no row changed for 45 s" is not "the worker died". Ownership is a
// timestamp on the job. Compare-and-swap on that exact value means only the
// holder can extend it, and a successor can take it over without a gap where
// the page poll starts a second 240 s function.
// =============================================================================
import { prisma } from "@/lib/prisma";

/** How long one loop owns the job. Renewed at the start of every loop, so a dead worker is replaced within this. */
export const WORKER_LEASE_MS = 60_000;

function extend(now: Date, leaseMs: number): Date {
  return new Date(now.getTime() + leaseMs);
}

/**
 * Take the lease iff nobody holds it (null or already expired). Returns the
 * timestamp this caller must pass to renew / release, or null if another
 * worker owns the job.
 */
export async function claimWorkerLease(jobId: string, now = new Date(), leaseMs = WORKER_LEASE_MS): Promise<Date | null> {
  const until = extend(now, leaseMs);
  const r = await prisma.stPackJob.updateMany({
    where: {
      id: jobId,
      status: "running",
      OR: [{ workerLeaseUntil: null }, { workerLeaseUntil: { lt: now } }],
    },
    data: { workerLeaseUntil: until },
  });
  return r.count === 1 ? until : null;
}

/** Extend the lease iff `heldUntil` is still the value on the row (the previous holder lost a race otherwise). */
export async function renewWorkerLease(jobId: string, heldUntil: Date, now = new Date(), leaseMs = WORKER_LEASE_MS): Promise<Date | null> {
  const until = extend(now, leaseMs);
  const r = await prisma.stPackJob.updateMany({
    where: { id: jobId, workerLeaseUntil: heldUntil },
    data: { workerLeaseUntil: until },
  });
  return r.count === 1 ? until : null;
}

/**
 * Hand the lease to the next invocation without clearing it first. Fails when
 * the job is no longer running or another worker already replaced `heldUntil`.
 */
export async function takeOverWorkerLease(jobId: string, heldUntil: Date, now = new Date(), leaseMs = WORKER_LEASE_MS): Promise<Date | null> {
  const until = extend(now, leaseMs);
  const r = await prisma.stPackJob.updateMany({
    where: { id: jobId, status: "running", workerLeaseUntil: heldUntil },
    data: { workerLeaseUntil: until },
  });
  return r.count === 1 ? until : null;
}

/** Drop the lease iff we still hold it, so a retry or the next poll can claim. */
export async function releaseWorkerLease(jobId: string, heldUntil: Date): Promise<boolean> {
  const r = await prisma.stPackJob.updateMany({
    where: { id: jobId, workerLeaseUntil: heldUntil },
    data: { workerLeaseUntil: null },
  });
  return r.count === 1;
}
