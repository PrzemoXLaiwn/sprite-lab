import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("subscription cancellation migration", () => {
  const sql = readFileSync(
    join(process.cwd(), "prisma/migrations/20261030143000_subscription_cancellations/migration.sql"),
    "utf8"
  );

  it("enables row level security on the new table and does not force it", () => {
    expect(sql).toMatch(/ALTER TABLE "subscription_cancellations" ENABLE ROW LEVEL SECURITY;/);
    expect(sql).not.toMatch(/ALTER TABLE[^;]*FORCE ROW LEVEL SECURITY/i);
    expect(sql).not.toMatch(/CREATE POLICY/i);
  });

  it("stores the attempt and the subscription flags the webhook syncs", () => {
    expect(sql).toContain('"subscription_cancellations"');
    expect(sql).toContain('"reason"');
    expect(sql).toContain('"offer_shown"');
    expect(sql).toContain('"offer_accepted"');
    expect(sql).toContain('"outcome"');
    expect(sql).toContain("cancel_at_period_end");
    expect(sql).toContain("billing_paused");
    expect(sql).toContain("retention_discount_used_at");
  });
});
