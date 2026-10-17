// =============================================================================
// Sprite Dungeon — measuring attack animations (server only)
// =============================================================================
// Fetches the animation sheet and the hero sprite (allow-listed hosts only),
// decodes them with sharp at a small size (64 px tall per frame) and scores
// them with the pure scoreSkill(). Results are cached in dungeon_skill_scores,
// so each animation is analysed once. Failures store a neutral Common score
// and are retried after an hour.
// =============================================================================

import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { safeFetchImage } from "@/lib/safe-fetch";
import { animationSheetGeometry, parseAnimationPrompt } from "@/lib/workspace/history";
import { SKILL_ANALYSES_PER_LOAD, type Tier } from "./config";
import { NEUTRAL_SCORE, scoreSkill, type Raster, type SkillMetrics, type SkillScore } from "./skills";
import { SKILL_SCORES_SQL, SKILL_SCORE_SAVE_SQL } from "./sql";

const FRAME_H = 64;
const MAX_FRAMES = 12;
const RETRY_FAILED_MS = 60 * 60_000;

async function raster(buf: Buffer, region?: { left: number; top: number; width: number; height: number }): Promise<Raster> {
  let img = sharp(buf);
  if (region) img = img.extract(region);
  const { data, info } = await img.resize({ height: FRAME_H, kernel: "nearest" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, data };
}

/** Measures one attack animation. Throws on fetch / decode problems. */
export async function analyseAnimation(anim: { prompt: string; imageUrl: string }, sourceUrl: string | null): Promise<SkillScore> {
  const parsed = parseAnimationPrompt(anim.prompt);
  if (!parsed) throw new Error("not an animation prompt");
  const sheet = await safeFetchImage(anim.imageUrl, { timeoutMs: 8000, maxBytes: 15 * 1024 * 1024 });
  const meta = await sharp(sheet.buffer).metadata();
  const geo = animationSheetGeometry(parsed, meta.width ?? 0, meta.height ?? 0);
  if (!geo || geo.frameWidth < 4 || geo.frameHeight < 4) throw new Error("bad sheet geometry");
  const count = Math.min(MAX_FRAMES, geo.cols);
  const frames: Raster[] = [];
  for (let i = 0; i < count; i++) {
    frames.push(await raster(sheet.buffer, { left: i * geo.frameWidth, top: 0, width: geo.frameWidth, height: geo.frameHeight }));
  }
  let source: Raster | null = null;
  if (sourceUrl) {
    try { source = await raster((await safeFetchImage(sourceUrl, { timeoutMs: 6000 })).buffer); } catch { source = null; }
  }
  return scoreSkill({ frames, source, frameCount: parsed.frameCount });
}

export interface CachedScore extends SkillScore {
  /** Not analysed yet (or waiting for a retry): the neutral Common score stands in. */
  pending: boolean;
}

interface Row {
  generation_id: string;
  score: number;
  tier: Tier;
  metrics: SkillMetrics;
  failed: boolean;
  computed_at: Date;
}

/**
 * Scores for these animations: cached ones straight away, up to
 * SKILL_ANALYSES_PER_LOAD new ones analysed now, the rest marked pending.
 */
export async function skillScores(
  anims: { id: string; prompt: string; imageUrl: string; sourceUrl: string | null }[],
  now = new Date(),
): Promise<Map<string, CachedScore>> {
  const out = new Map<string, CachedScore>();
  if (!anims.length) return out;
  const rows = await prisma.$queryRawUnsafe<Row[]>(SKILL_SCORES_SQL, anims.map((a) => a.id)).catch(() => [] as Row[]);
  const byId = new Map(rows.map((r) => [r.generation_id, r]));
  const todo: typeof anims = [];
  for (const a of anims) {
    const r = byId.get(a.id);
    const stale = r?.failed && now.getTime() - new Date(r.computed_at).getTime() > RETRY_FAILED_MS;
    if (r && !stale) out.set(a.id, { score: Number(r.score), tier: r.tier, metrics: r.metrics, pending: false });
    else todo.push(a);
  }
  for (const [n, a] of todo.entries()) {
    if (n >= SKILL_ANALYSES_PER_LOAD) {
      out.set(a.id, { ...NEUTRAL_SCORE, pending: true });
      continue;
    }
    let result: SkillScore;
    let failed = false;
    try {
      result = await analyseAnimation(a, a.sourceUrl);
    } catch (err) {
      console.error("[Dungeon] skill analysis failed:", a.id, err instanceof Error ? err.message : err);
      result = NEUTRAL_SCORE;
      failed = true;
    }
    await prisma.$executeRawUnsafe(SKILL_SCORE_SAVE_SQL, a.id, result.score, result.tier, JSON.stringify(result.metrics), failed).catch(() => {});
    out.set(a.id, { ...result, pending: false });
  }
  return out;
}
