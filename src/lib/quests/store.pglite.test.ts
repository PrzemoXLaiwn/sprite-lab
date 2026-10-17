// Quest SQL against a real Postgres (PGlite, in memory): the reward is paid
// exactly once per key, weekly keys are separate, and progress counts only
// delivered, paid work.
import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";
import { ANIMATION_FEATURES, CLAIM_SQL, SPRITE_FEATURES, STATS_ALL_SQL, STATS_WEEK_SQL } from "./store";

let db: PGlite;
const credits = async () => (await db.query<{ credits: number; bonus: number }>(`SELECT credits, total_bonus_credits AS bonus FROM users WHERE id = 'u1'`)).rows[0];

beforeEach(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, credits INT NOT NULL DEFAULT 10, total_bonus_credits INT NOT NULL DEFAULT 0, email_preferences JSONB, updated_at TIMESTAMP(3));
    CREATE TABLE generations (id TEXT PRIMARY KEY, user_id TEXT, prompt TEXT, subcategory_id TEXT, is_public BOOLEAN DEFAULT false, project_id TEXT);
    CREATE TABLE operations (id TEXT PRIMARY KEY, user_id TEXT, feature TEXT, status TEXT, created_at TIMESTAMP(3));
    INSERT INTO users (id, email_preferences) VALUES ('u1', '{"marketing": true}');
  `);
});

describe("CLAIM_SQL", () => {
  it("pays once, then refuses the same key (also in parallel)", async () => {
    const results = await Promise.all([1, 2, 3].map(() => db.query(CLAIM_SQL, ["u1", 2, "first_sprite"])));
    expect(results.filter((r) => r.rows.length === 1)).toHaveLength(1);
    expect(await credits()).toEqual({ credits: 12, bonus: 2 });
    const prefs = (await db.query<{ p: Record<string, unknown> }>(`SELECT email_preferences AS p FROM users`)).rows[0].p;
    expect(prefs.marketing).toBe(true); // other preferences survive
    expect((prefs.quests as Record<string, unknown>).first_sprite).toBeTruthy();
  });

  it("works when email_preferences is NULL and keeps weekly keys apart", async () => {
    await db.exec(`UPDATE users SET email_preferences = NULL`);
    expect((await db.query(CLAIM_SQL, ["u1", 2, "week_sprites@2026-W41"])).rows).toHaveLength(1);
    expect((await db.query(CLAIM_SQL, ["u1", 2, "week_sprites@2026-W42"])).rows).toHaveLength(1);
    expect((await db.query(CLAIM_SQL, ["u1", 2, "week_sprites@2026-W42"])).rows).toHaveLength(0);
    expect((await credits()).credits).toBe(14);
  });
});

describe("stats SQL", () => {
  it("counts sprites, animations, shares and projects; ignores tool outputs", async () => {
    await db.exec(`
      INSERT INTO generations VALUES
        ('g1','u1','a knight','HEROES',true,'p1'),
        ('g2','u1','[No BG] a sword','SWORDS',false,null),
        ('g3','u1','[Upscaled 2x] a knight','HEROES',false,null),
        ('g4','u1','[Animation: walk] a knight','ANIMATION',false,null),
        ('g5','u2','someone else','HEROES',true,null);
    `);
    const r = (await db.query(STATS_ALL_SQL, ["u1"])).rows[0];
    expect(r).toEqual({ sprites: 2, animations: 1, shared: 1, in_projects: 1 });
  });

  it("this week counts only delivered paid work since Monday", async () => {
    await db.exec(`
      INSERT INTO operations VALUES
        ('o1','u1','sprite','SUCCEEDED','2026-10-12 10:00'),
        ('o2','u1','sprite','FAILED','2026-10-12 11:00'),
        ('o3','u1','anim_6','PARTIAL','2026-10-13 09:00'),
        ('o4','u1','sprite','SUCCEEDED','2026-10-11 23:00'),
        ('o5','u1','remove_bg','SUCCEEDED','2026-10-14 08:00');
    `);
    const r = (await db.query(STATS_WEEK_SQL, ["u1", new Date("2026-10-12T00:00:00Z"), SPRITE_FEATURES, ANIMATION_FEATURES])).rows[0];
    expect(r).toEqual({ sprites: 1, animations: 1, days: 3 });
  });
});
