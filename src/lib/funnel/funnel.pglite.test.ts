// One visitor, one Postgres (PGlite): landing with utm → signup → first
// generation → checkout → purchase, then the trace comes back in that order.
import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";
import { handleFunnelPost } from "@/lib/funnel/handle";
import { notePurchase } from "@/lib/funnel/purchase";
import { FUNNEL_SCHEMA_SQL, STAMP_FIRST_TOUCH_SQL } from "@/lib/funnel/sql";
import { stampFirstTouch, traceVisitor, type QueryDb } from "@/lib/funnel/store";

let pg: PGlite;
const db: QueryDb = {
  async query<T>(sql: string, params: unknown[]): Promise<T[]> {
    const result = await pg.query<T>(sql, params);
    return result.rows;
  },
};

beforeEach(async () => {
  pg = new PGlite();
  await pg.exec(FUNNEL_SCHEMA_SQL);
  await pg.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      credits INT NOT NULL DEFAULT 20,
      email_preferences JSONB,
      updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
    );
    INSERT INTO users (id, credits, email_preferences)
    VALUES ('user_1', 20, '{"signupCredits":20,"relaunchBonusAt":"2026-10-31T00:00:00.000Z"}'::jsonb);
  `);
});

function post(body: unknown, cookie?: string) {
  return new Request("http://localhost/api/analytics/funnel", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("funnel trace", () => {
  it("follows one visitor from a tagged landing through payment and stamps first-touch once", async () => {
    const wait = () => new Promise((resolve) => setTimeout(resolve, 15));

    const landing = await handleFunnelPost(
      post({
        name: "landing_view",
        path: "/",
        referrer: "https://www.tiktok.com/video/1?token=secret",
        search: "?utm_source=tiktok&utm_medium=social&utm_campaign=oct",
      }),
      { db, userId: null, stampUser: async () => undefined },
    );
    expect(landing.status).toBe(200);
    const setCookie = landing.headers.getSetCookie?.() ?? [];
    const visitorCookie = setCookie.find((c) => c.startsWith("sl_vid="));
    const touchCookie = setCookie.find((c) => c.startsWith("sl_ft="));
    expect(visitorCookie).toBeTruthy();
    expect(touchCookie).toBeTruthy();
    const cookieHeader = [visitorCookie!.split(";")[0], touchCookie!.split(";")[0]].join("; ");
    const visitorId = decodeURIComponent(visitorCookie!.split(";")[0].slice("sl_vid=".length));

    await wait();
    const signup = await handleFunnelPost(
      post({ name: "signup_complete", path: "/signup" }, cookieHeader),
      {
        db,
        userId: "user_1",
        stampUser: (userId, touch) => stampFirstTouch(db, userId, touch),
      },
    );
    expect(signup.status).toBe(200);

    for (const name of ["first_generation_success", "checkout_start", "checkout_complete"]) {
      await wait();
      const res = await handleFunnelPost(post({ name, path: name === "checkout_start" ? "/checkout/starter" : "/generate", props: { plan: "STARTER" } }, cookieHeader), {
        db,
        userId: "user_1",
        stampUser: async () => undefined,
      });
      expect(res.status, name).toBe(200);
    }

    await wait();
    await notePurchase({
      dedupeKey: "invoice:in_1",
      userId: "user_1",
      kind: "subscription",
      amountMinor: 500,
      currency: "gbp",
      plan: "STARTER",
    }, db);
    await notePurchase({
      dedupeKey: "invoice:in_1",
      userId: "user_1",
      kind: "subscription",
      amountMinor: 500,
      currency: "gbp",
      plan: "STARTER",
    }, db);

    const rows = await traceVisitor(db, visitorId);
    expect(rows.map((row) => row.name)).toEqual([
      "landing_view",
      "signup_complete",
      "first_generation_success",
      "checkout_start",
      "checkout_complete",
      "purchase",
    ]);
    expect(new Set(rows.map((row) => row.user_id))).toEqual(new Set(["user_1"]));
    expect(new Set(rows.filter((row) => row.name !== "purchase").map((row) => row.visitor_id))).toEqual(new Set([visitorId]));
    const landingRow = rows[0];
    expect(landingRow.utm_source).toBe("tiktok");
    expect(landingRow.utm_medium).toBe("social");
    expect(landingRow.utm_campaign).toBe("oct");
    expect(landingRow.referrer).toBe("https://www.tiktok.com/video/1");
    expect(landingRow.referrer).not.toContain("token");

    const prefs = (await pg.query<{ email_preferences: { signupCredits: number; firstTouch: { source: string; referrer: string } } }>(
      `SELECT email_preferences FROM users WHERE id = 'user_1'`,
    )).rows[0].email_preferences;
    expect(prefs.signupCredits).toBe(20);
    expect(prefs.firstTouch.source).toBe("tiktok");
    expect(prefs.firstTouch.referrer).toBe("https://www.tiktok.com/video/1");

    await db.query(STAMP_FIRST_TOUCH_SQL, [JSON.stringify({ firstTouch: { source: "later", medium: null, campaign: null, content: null, term: null, referrer: null, at: "2026-11-01T00:00:00.000Z" } }), "user_1"]);
    const again = (await pg.query<{ email_preferences: { firstTouch: { source: string } } }>(`SELECT email_preferences FROM users WHERE id = 'user_1'`)).rows[0].email_preferences;
    expect(again.firstTouch.source).toBe("tiktok");

    const refused = await handleFunnelPost(post({ name: "purchase", path: "/" }), { db, userId: "user_1", stampUser: async () => undefined });
    expect(refused.status).toBe(400);
  });
});
