// =============================================================================
// Quests, achievements and creator levels — definitions (client-safe, no I/O)
// =============================================================================
// Every goal is measured from real, paid account activity (sprites,
// animations, shares, projects) recomputed on the server, never from clicks,
// so progress can't be farmed with a bot or a second tab.
//
// Credit budget (see quests.test.ts — the test fails if these grow):
//   - onboarding: one time per account, 8 credits total
//   - weekly: at most 5 credits per user per ISO week, and every weekly goal
//     needs credits to be SPENT first (≥ 10 credits for the sprite goal,
//     ≥ 14 for the animation goal), so a reward is a rebate of at most ~8%
//     on a Starter plan's monthly credits — inside its margin.
//   - milestones: one time each; they take hundreds of paid generations.
// Free accounts can only progress by spending free credits, and free spend is
// capped globally by the daily free-tier breaker (src/lib/billing).
// =============================================================================

export type QuestKind = "onboarding" | "weekly" | "milestone";

/** Counters measured from the database for one user. */
export interface QuestStats {
  sprites: number;
  animations: number;
  shared: number;
  inProjects: number;
  likesReceived: number;
  hasUsername: boolean;
  /** This ISO week (Monday 00:00 UTC onwards). */
  weekSprites: number;
  weekAnimations: number;
  weekActiveDays: number;
}

export type Metric = keyof Omit<QuestStats, "hasUsername"> | "hasUsername";

export interface QuestDef {
  id: string;
  kind: QuestKind;
  title: string;
  description: string;
  metric: Metric;
  goal: number;
  reward: number;
  /** Where to go to make progress. */
  href: string;
  /** Milestone badge colour (PICO-8-like palette used across the UI). */
  color?: string;
}

export const QUESTS: readonly QuestDef[] = [
  // ── Onboarding (one time) ────────────────────────────────────────────────
  { id: "first_sprite", kind: "onboarding", title: "Make your first sprite", description: "Describe anything and generate it.", metric: "sprites", goal: 1, reward: 2, href: "/generate" },
  { id: "first_animation", kind: "onboarding", title: "Bring a sprite to life", description: "Animate one of your sprites: idle, walk, attack or your own move.", metric: "animations", goal: 1, reward: 3, href: "/animate" },
  { id: "first_project", kind: "onboarding", title: "Start a game project", description: "Save a sprite to a project so your game's assets stay together.", metric: "inProjects", goal: 1, reward: 1, href: "/projects" },
  { id: "first_share", kind: "onboarding", title: "Share a sprite", description: "Post one of your sprites to the community gallery.", metric: "shared", goal: 1, reward: 1, href: "/assets" },
  { id: "username", kind: "onboarding", title: "Pick a username", description: "Your name on the community gallery and your profile.", metric: "hasUsername", goal: 1, reward: 1, href: "/settings" },

  // ── Weekly (reset every Monday 00:00 UTC) ────────────────────────────────
  { id: "week_sprites", kind: "weekly", title: "Fill the sprite sheet", description: "Make 10 sprites this week.", metric: "weekSprites", goal: 10, reward: 2, href: "/generate" },
  { id: "week_animations", kind: "weekly", title: "Lights, camera, frames", description: "Make 2 animations this week.", metric: "weekAnimations", goal: 2, reward: 2, href: "/animate" },
  { id: "week_days", kind: "weekly", title: "Three-day streak", description: "Create something on 3 different days this week.", metric: "weekActiveDays", goal: 3, reward: 1, href: "/generate" },

  // ── Milestones (one time, badges) ────────────────────────────────────────
  { id: "sprites_10", kind: "milestone", title: "Sprite Starter", description: "Make 10 sprites.", metric: "sprites", goal: 10, reward: 1, href: "/generate", color: "#29ADFF" },
  { id: "sprites_50", kind: "milestone", title: "Sheet Filler", description: "Make 50 sprites.", metric: "sprites", goal: 50, reward: 3, href: "/generate", color: "#29ADFF" },
  { id: "sprites_250", kind: "milestone", title: "Asset Factory", description: "Make 250 sprites.", metric: "sprites", goal: 250, reward: 5, href: "/generate", color: "#29ADFF" },
  { id: "sprites_1000", kind: "milestone", title: "Pixel Legend", description: "Make 1,000 sprites.", metric: "sprites", goal: 1000, reward: 10, href: "/generate", color: "#FFEC27" },
  { id: "anims_10", kind: "milestone", title: "Animator", description: "Make 10 animations.", metric: "animations", goal: 10, reward: 3, href: "/animate", color: "#FF004D" },
  { id: "anims_50", kind: "milestone", title: "Frame Master", description: "Make 50 animations.", metric: "animations", goal: 50, reward: 5, href: "/animate", color: "#FF004D" },
  { id: "likes_10", kind: "milestone", title: "Crowd Pleaser", description: "Get 10 likes on your shared sprites.", metric: "likesReceived", goal: 10, reward: 2, href: "/community", color: "#00E436" },
  { id: "likes_100", kind: "milestone", title: "Fan Favourite", description: "Get 100 likes on your shared sprites.", metric: "likesReceived", goal: 100, reward: 5, href: "/community", color: "#00E436" },
];

export const QUEST_BY_ID: Readonly<Record<string, QuestDef>> = Object.fromEntries(QUESTS.map((q) => [q.id, q]));

// ── Creator level (cosmetic) ──────────────────────────────────────────────
// XP comes from the same paid activity. Level n needs 25·n·(n+1) XP:
// 50, 150, 300, 500, 750 … — early levels come fast, later ones take weeks.

export const XP = { sprite: 10, animation: 40, shared: 5, inProject: 2 } as const;

export const LEVEL_TITLES = ["Newcomer", "Apprentice", "Pixel Pusher", "Sprite Smith", "Animator", "Artisan", "Art Director", "Master", "Legend"] as const;

export function xpFor(s: Pick<QuestStats, "sprites" | "animations" | "shared" | "inProjects">): number {
  return s.sprites * XP.sprite + s.animations * XP.animation + s.shared * XP.shared + s.inProjects * XP.inProject;
}

export function xpForLevel(level: number): number {
  return 25 * level * (level + 1);
}

export function levelFor(xp: number): { level: number; title: string; levelXp: number; nextXp: number } {
  let level = 0;
  while (xp >= xpForLevel(level + 1)) level++;
  const title = LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length - 1)];
  return { level, title, levelXp: xpForLevel(level), nextXp: xpForLevel(level + 1) };
}
