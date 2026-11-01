import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("st_packs migration", () => {
  const sql = readFileSync(join(process.cwd(), "prisma/migrations/20261031020000_st_packs/migration.sql"), "utf8");

  it("enables row level security on both new tables and does not force it or add policies", () => {
    expect(sql).toMatch(/ALTER TABLE "st_pack_jobs" ENABLE ROW LEVEL SECURITY;/);
    expect(sql).toMatch(/ALTER TABLE "st_pack_expressions" ENABLE ROW LEVEL SECURITY;/);
    expect(sql).not.toMatch(/ALTER TABLE[^;]*FORCE ROW LEVEL SECURITY/i);
    expect(sql).not.toMatch(/CREATE POLICY/i);
  });

  it("is additive: creates only the two tables, touches nothing else", () => {
    expect(sql.match(/CREATE TABLE/g)).toHaveLength(2);
    expect(sql).not.toMatch(/ALTER TABLE "(users|generations|operations|provider_calls)"/);
    expect(sql).not.toMatch(/DROP /i);
    expect(sql).toContain('UNIQUE INDEX "st_pack_expressions_job_id_label_key"');
    expect(sql).toContain('ON DELETE CASCADE');
    expect(sql).toContain('"locked_until" TIMESTAMP(3)');
  });
});

describe("st_pack worker lease migration", () => {
  const sql = readFileSync(join(process.cwd(), "prisma/migrations/20261031180000_st_pack_worker_lease/migration.sql"), "utf8");

  it("adds one nullable column and does not rewrite or drop anything", () => {
    expect(sql).toContain('ALTER TABLE "st_pack_jobs" ADD COLUMN IF NOT EXISTS "worker_lease_until" TIMESTAMP(3)');
    expect(sql).not.toMatch(/DROP /i);
    expect(sql).not.toMatch(/UPDATE /i);
    expect(sql).not.toMatch(/CREATE TABLE/i);
    expect(sql).not.toMatch(/ALTER TABLE "(users|generations|operations|provider_calls|st_pack_expressions)"/);
    expect(sql.match(/ALTER TABLE/g)).toHaveLength(1);
  });
});
