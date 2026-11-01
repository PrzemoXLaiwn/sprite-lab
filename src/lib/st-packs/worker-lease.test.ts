// One job, one worker: the lease is compare-and-swap on the exact timestamp.
import { beforeEach, describe, expect, it, vi } from "vitest";

interface Job {
  id: string;
  status: string;
  workerLeaseUntil: Date | null;
}

const db = vi.hoisted(() => ({ jobs: [] as Job[] }));

function sameTime(a: Date | null, b: Date | null): boolean {
  if (a === null || b === null) return a === b;
  return a.getTime() === b.getTime();
}

function leaseMatches(job: Job, value: unknown): boolean {
  if (value === null) return job.workerLeaseUntil === null;
  if (value instanceof Date) return sameTime(job.workerLeaseUntil, value);
  if (value && typeof value === "object" && "lt" in value) {
    const lt = (value as { lt: Date }).lt;
    return job.workerLeaseUntil !== null && job.workerLeaseUntil.getTime() < lt.getTime();
  }
  return false;
}

vi.mock("@/lib/prisma", () => ({
  prisma: {
    stPackJob: {
      updateMany: async ({ where, data }: {
        where: { id?: string; status?: string; workerLeaseUntil?: unknown; OR?: Array<{ workerLeaseUntil?: unknown }> };
        data: { workerLeaseUntil?: Date | null };
      }) => {
        let count = 0;
        for (const job of db.jobs) {
          if (where.id && job.id !== where.id) continue;
          if (where.status && job.status !== where.status) continue;
          if ("workerLeaseUntil" in where && !leaseMatches(job, where.workerLeaseUntil)) continue;
          if (where.OR && !where.OR.some((clause) => leaseMatches(job, clause.workerLeaseUntil))) continue;
          if ("workerLeaseUntil" in data) job.workerLeaseUntil = data.workerLeaseUntil ?? null;
          count++;
        }
        return { count };
      },
    },
  },
}));

import { claimWorkerLease, releaseWorkerLease, renewWorkerLease, takeOverWorkerLease } from "./worker-lease";

const T0 = new Date("2030-01-01T00:00:00.000Z");

describe("worker lease", () => {
  beforeEach(() => {
    db.jobs = [{ id: "job1", status: "running", workerLeaseUntil: null }];
  });

  it("lets only the first claim own the job", async () => {
    const first = await claimWorkerLease("job1", T0);
    const second = await claimWorkerLease("job1", new Date(T0.getTime() + 1_000));
    expect(first).toEqual(new Date(T0.getTime() + 60_000));
    expect(second).toBeNull();
    expect(db.jobs[0].workerLeaseUntil).toEqual(first);
  });

  it("renews only the holder, and a second renew of the old timestamp loses", async () => {
    const held = await claimWorkerLease("job1", T0);
    const next = await renewWorkerLease("job1", held!, new Date(T0.getTime() + 5_000));
    const lost = await renewWorkerLease("job1", held!, new Date(T0.getTime() + 6_000));
    expect(next).toEqual(new Date(T0.getTime() + 5_000 + 60_000));
    expect(lost).toBeNull();
    expect(db.jobs[0].workerLeaseUntil).toEqual(next);
  });

  it("refuses a claim while the lease is in the future and allows it once the lease has expired", async () => {
    const held = await claimWorkerLease("job1", T0);
    expect(await claimWorkerLease("job1", new Date(held!.getTime() - 1))).toBeNull();
    const again = await claimWorkerLease("job1", new Date(held!.getTime() + 1));
    expect(again).not.toBeNull();
    expect(await renewWorkerLease("job1", held!, new Date(held!.getTime() + 2))).toBeNull();
  });

  it("hands the lease to a successor without a gap a second claim could win", async () => {
    const held = await claimWorkerLease("job1", T0);
    const taken = await takeOverWorkerLease("job1", held!, new Date(T0.getTime() + 240_000));
    expect(taken).not.toBeNull();
    expect(await claimWorkerLease("job1", new Date(T0.getTime() + 240_000))).toBeNull();
    expect(await takeOverWorkerLease("job1", held!, new Date(T0.getTime() + 241_000))).toBeNull();
    expect(await renewWorkerLease("job1", taken!, new Date(T0.getTime() + 241_000))).not.toBeNull();
  });

  it("does not hand a finished job to a successor", async () => {
    const held = await claimWorkerLease("job1", T0);
    db.jobs[0].status = "done";
    expect(await takeOverWorkerLease("job1", held!, new Date(T0.getTime() + 1_000))).toBeNull();
    expect(db.jobs[0].workerLeaseUntil).toEqual(held);
  });

  it("releases only the holder, after which a new claim wins", async () => {
    const held = await claimWorkerLease("job1", T0);
    expect(await releaseWorkerLease("job1", new Date(T0.getTime() + 1))).toBe(false);
    expect(await claimWorkerLease("job1", new Date(T0.getTime() + 2_000))).toBeNull();
    expect(await releaseWorkerLease("job1", held!)).toBe(true);
    expect(await claimWorkerLease("job1", new Date(T0.getTime() + 3_000))).not.toBeNull();
  });

  it("does not claim a job that is not running", async () => {
    db.jobs[0].status = "done";
    expect(await claimWorkerLease("job1", T0)).toBeNull();
  });
});
