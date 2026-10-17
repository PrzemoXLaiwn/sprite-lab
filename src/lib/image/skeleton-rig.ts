// =============================================================================
// SpriteLab — skeletal idle (2D auto-rig)
// =============================================================================
// A game idle is the same drawing moving on its joints: weight shifting from
// leg to leg with the feet planted, arms swinging a little along the body,
// the head settling a beat later, a tail waving. Here:
//   1. Claude marks the joints (src/lib/rig-keypoints.ts)
//   2. every pixel is skinned to its nearest bones (smooth weights)
//   3. each frame poses the bones (forward kinematics, legs re-aimed so the
//      feet never slide) and the sprite is warped by blended bone transforms
// Colours and details never change — only the pose — so the loop is
// perfectly smooth. Pixel art is posed on its native grid.
// Returns null when the sprite can't be rigged (no clear biped joints); the
// caller then falls back to the simple breathing rig.
// =============================================================================

import sharp from "sharp";
import { keySpriteBackground } from "./sprite-postprocess";
import { encodeGif, type AnimationResult, type Raw } from "./animation";
import { findRigPoints, type JointName, type RigPoints } from "@/lib/rig-keypoints";

type V = { x: number; y: number };
/** 2×3 affine matrix [a, b, c, d, e, f]: x' = a x + b y + c, y' = d x + e y + f */
type M = [number, number, number, number, number, number];

const I: M = [1, 0, 0, 0, 1, 0];
const mul = (p: M, q: M): M => [
  p[0] * q[0] + p[1] * q[3], p[0] * q[1] + p[1] * q[4], p[0] * q[2] + p[1] * q[5] + p[2],
  p[3] * q[0] + p[4] * q[3], p[3] * q[1] + p[4] * q[4], p[3] * q[2] + p[4] * q[5] + p[5],
];
const apply = (m: M, v: V): V => ({ x: m[0] * v.x + m[1] * v.y + m[2], y: m[3] * v.x + m[4] * v.y + m[5] });
const translate = (x: number, y: number): M => [1, 0, x, 0, 1, y];
/** Rotation by `deg` around point c (screen coordinates: y down, positive = clockwise). */
const rotAbout = (c: V, deg: number): M => {
  const r = (deg * Math.PI) / 180, cs = Math.cos(r), sn = Math.sin(r);
  return [cs, -sn, c.x - cs * c.x + sn * c.y, sn, cs, c.y - sn * c.x - cs * c.y];
};
const invert = (m: M): M => {
  const det = m[0] * m[4] - m[1] * m[3];
  const a = m[4] / det, b = -m[1] / det, d = -m[3] / det, e = m[0] / det;
  return [a, b, -(a * m[2] + b * m[5]), d, e, -(d * m[2] + e * m[5])];
};

interface Bone {
  name: string;
  /** Segment used for skinning (rest pose). */
  from: V;
  to: V;
  /** Larger = claims pixels from further away (torso is wide, a forearm thin). */
  reach: number;
  /** Arms must not grab the legs hanging next to them. */
  arm?: boolean;
}

export type SkeletonMotion = "idle" | "walk";

export interface SkeletonOptions {
  pixel: boolean;
  /** idle (default) or an in-place walk cycle. */
  motion?: SkeletonMotion;
  frames?: number;
  frameSize?: number;
}

export const makeSkeletonIdle = (sprite: Buffer, opts: SkeletonOptions) => makeSkeletonAnimation(sprite, { ...opts, motion: "idle" });

export async function makeSkeletonAnimation(sprite: Buffer, opts: SkeletonOptions): Promise<AnimationResult | null> {
  const motion = opts.motion ?? "idle";
  // Pixel art: whole-pixel cut-out animation (few frames, like hand-made sprites)
  const n = opts.pixel ? (motion === "walk" ? 4 : 6) : opts.frames ?? (motion === "walk" ? 16 : 24);
  const frameSize = opts.frameSize ?? 256;

  // ── Working image: trimmed sprite (pixel art at its native grid) ─────────
  let src = await loadSprite(sprite);
  if (opts.pixel) {
    const f = nativeFactor(src);
    if (f > 1) src = downsample(src, f);
  } else if (src.height > 520) {
    src = await resizeRaw(src, Math.round((src.width * 480) / src.height), 480);
  }
  const b = bounds(src);
  if (!b) return null;
  const bodyW = b.x1 - b.x0 + 1, bodyH = b.y1 - b.y0 + 1;
  const pad = Math.ceil(Math.max(bodyW, bodyH) * 0.1) + 2;
  const W = bodyW + pad * 2, H = bodyH + pad + 1;
  const rest: Raw = { data: Buffer.alloc(W * H * 4), width: W, height: H };
  blit(src, rest, pad - b.x0, pad - b.y0);

  // ── Joints from Claude (on a square, white, ≥512px copy) ─────────────────
  const S = Math.max(W, H);
  const scale = Math.max(1, Math.floor(512 / S)) || 1;
  const sq = await sharp(rest.data, { raw: { width: W, height: H, channels: 4 } })
    .extend({ right: S - W, bottom: S - H, background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .resize(S * scale, S * scale, { kernel: "nearest" })
    .flatten({ background: "#ffffff" })
    .png()
    .toBuffer();
  const rp = await findRigPoints(sq, S * scale, S * scale);
  if (!rp) return null;
  const P = (k: JointName): V | null => {
    const p = rp.points[k];
    return p ? { x: p.x / scale, y: p.y / scale } : null;
  };
  if (rp.body !== "biped" || !P("pelvis") || !P("chest")) return null;

  const rig = buildRig(rp, P, bodyW, H - 1, bodyH);
  if (!rig) return null;
  const weights = skin(rest, rig.bones, rig.hipY, rig.kneeY);

  // ── Pose every frame ─────────────────────────────────────────────────────
  const frames: Raw[] = opts.pixel ? cutoutFrames(rest, weights, rig.bones, motion, rig.kneeY, rp.items.map((b) => ({ x0: b.x0 / scale, y0: b.y0 / scale, x1: b.x1 / scale, y1: b.y1 / scale }))) : [];
  for (let f = 0; f < n && !opts.pixel; f++) {
    const ph = (2 * Math.PI * f) / n;
    const T = motion === "walk" ? rig.walk(ph) : rig.pose(ph);
    const inv = rig.bones.map((bn) => invert(T[bn.name] ?? I));
    const out: Raw = { data: Buffer.alloc(W * H * 4), width: W, height: H };
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const wi = weights[y * W + x];
        if (!wi) continue;
        // Inverse blend: rest position = Σ w · T⁻¹(p) (accurate for small poses)
        let sx = 0, sy = 0;
        for (const [k, w] of wi) {
          const m = inv[k];
          sx += w * (m[0] * (x + 0.5) + m[1] * (y + 0.5) + m[2]);
          sy += w * (m[3] * (x + 0.5) + m[4] * (y + 0.5) + m[5]);
        }
        const i = (y * W + x) * 4;
        if (opts.pixel) samplePixel(rest, sx, sy, out.data, i);
        else sampleBilinear(rest, sx, sy, out.data, i);
      }
    }
    frames.push(out);
  }

  // ── Sheet + GIF ──────────────────────────────────────────────────────────
  let outW: number, outH: number;
  if (opts.pixel) {
    const k = Math.max(1, Math.round(frameSize / H));
    outW = W * k; outH = H * k;
  } else {
    outH = frameSize;
    outW = Math.max(1, Math.round((W * frameSize) / H));
  }
  const pngs = await Promise.all(frames.map((fr) =>
    sharp(fr.data, { raw: { width: fr.width, height: fr.height, channels: 4 } })
      .resize(outW, outH, { kernel: opts.pixel ? "nearest" : "lanczos3", fit: "fill" })
      .png()
      .toBuffer()
  ));
  const sheetPng = await sharp({ create: { width: outW * n, height: outH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(pngs.map((input, i) => ({ input, left: i * outW, top: 0 })))
    .png({ compressionLevel: 9 })
    .toBuffer();
  const fps = opts.pixel ? (motion === "walk" ? 7 : 5) : 12;
  return { sheetPng, gif: await encodeGif(pngs, fps), frameCount: n, frameWidth: outW, frameHeight: outH, frames: pngs, fps };
}

// ---------------------------------------------------------------------------
// Pixel art: cut-out animation in whole art pixels
// ---------------------------------------------------------------------------

type Part = "head" | "torso" | "arm_a" | "arm_b" | "leg_a" | "leg_b" | "tail" | "item";

const PART_OF: Record<string, Part> = {
  head: "head", torso: "torso", upper_a: "arm_a", fore_a: "arm_a", upper_b: "arm_b", fore_b: "arm_b",
  leg_a: "leg_a", shin_a: "leg_a", foot_a: "leg_a", leg_b: "leg_b", shin_b: "leg_b", foot_b: "leg_b", tail1: "tail", tail2: "tail",
};

/** Back to front: whatever is drawn later covers the seams of what moved. */
const DRAW_ORDER: Part[] = ["tail", "leg_a", "leg_b", "torso", "arm_a", "arm_b", "head", "item"];

/** Per-frame [dx, dy] in art pixels (y down). Head never drops less than the torso. */
const CUTOUT: Record<SkeletonMotion, Partial<Record<Part, [number, number][]>>> = {
  // Breath: torso sinks 1px, head follows a beat later, arms settle last
  idle: {
    torso: [[0, 0], [0, 0], [0, 1], [0, 1], [0, 1], [0, 0]],
    head: [[0, 0], [0, 0], [0, 1], [0, 1], [0, 1], [0, 1]],
    arm_a: [[0, 0], [0, 0], [0, 0], [0, 1], [0, 1], [0, 1]],
    arm_b: [[0, 0], [0, 0], [0, 0], [0, 1], [0, 1], [0, 1]],
    tail: [[0, 0], [1, 0], [1, 0], [0, 0], [-1, 0], [-1, 0]],
  },
  // Step in place: one leg up 2px, body up 1px, arms swing against the legs
  walk: {
    leg_a: [[0, 0], [0, -2], [0, 0], [0, 0]],
    leg_b: [[0, 0], [0, 0], [0, 0], [0, -2]],
    torso: [[0, 0], [0, -1], [0, 0], [0, -1]],
    head: [[0, 0], [0, -1], [0, 0], [0, -1]],
    arm_a: [[0, 0], [0, 0], [0, 0], [0, -1]],
    arm_b: [[0, 0], [0, -1], [0, 0], [0, 0]],
    tail: [[0, 0], [1, -1], [0, 0], [-1, -1]],
  },
};

function cutoutFrames(rest: Raw, weights: ([number, number][] | null)[], bones: Bone[], motion: SkeletonMotion, kneeY: number, items: { x0: number; y0: number; x1: number; y1: number }[]): Raw[] {
  const { width: W, height: H } = rest;
  // Hard assignment: every opaque pixel belongs to its strongest bone's part
  const part = new Array<Part | null>(W * H).fill(null);
  for (let p = 0; p < W * H; p++) {
    if (rest.data[p * 4 + 3] < 128 || !weights[p]) continue;
    let best = weights[p]![0];
    for (const w of weights[p]!) if (w[1] > best[1]) best = w;
    const x = p % W, y = Math.floor(p / W);
    // Held props (bow, sword, shield) move as ONE rigid piece with the body —
    // split between arm, torso and leg they would tear apart
    if (items.some((b) => x >= b.x0 - 1 && x <= b.x1 + 1 && y >= b.y0 - 1 && y <= b.y1 + 1)) {
      const pt = PART_OF[bones[best[0]].name];
      // Head and lower legs inside the box keep their own motion (a lifted
      // foot must not leave its shin behind)
      part[p] = pt === "head" ? "head" : (pt === "leg_a" || pt === "leg_b") && y > kneeY ? pt : "item";
      continue;
    }
    let pt = PART_OF[bones[best[0]].name] ?? "torso";
    // Torso / head bits below the knees (a tunic hem between the legs) go with
    // the nearest leg, so nothing stays behind or pokes out when a leg lifts
    if ((pt === "torso" || pt === "head") && y > kneeY) {
      const leg = weights[p]!.map(([k, w]) => [PART_OF[bones[k].name], w] as const).filter(([q]) => q === "leg_a" || q === "leg_b").sort((u, v) => v[1] - u[1])[0];
      pt = leg ? leg[0] : nearestLeg(x, y, bones);
    }
    part[p] = pt;
  }
  const table = CUTOUT[motion];
  const n = Math.max(...Object.values(table).map((t) => t!.length));
  const frames: Raw[] = [];
  for (let f = 0; f < n; f++) {
    const out: Raw = { data: Buffer.alloc(W * H * 4), width: W, height: H };
    for (const pt of DRAW_ORDER) {
      // Props ride with the torso — and so do the arms holding them, or the
      // hand would slip off the grip
      const holds = items.length > 0 && (pt === "arm_a" || pt === "arm_b");
      const [dx, dy] = table[pt === "item" || holds ? "torso" : pt]?.[f] ?? [0, 0];
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const p = y * W + x;
          if (part[p] !== pt) continue;
          const tx = x + dx, ty = y + dy;
          if (tx < 0 || ty < 0 || tx >= W || ty >= H) continue;
          rest.data.copy(out.data, (ty * W + tx) * 4, p * 4, p * 4 + 4);
        }
      }
    }
    fillCracks(out, rest);
    frames.push(out);
  }
  return frames;
}

/** Closest leg (by its bone segments) for a pixel that has no leg weight. */
function nearestLeg(x: number, y: number, bones: Bone[]): Part {
  let best: Part = "leg_a", bd = Infinity;
  for (const b of bones) {
    const pt = PART_OF[b.name];
    if (pt !== "leg_a" && pt !== "leg_b") continue;
    const d = segDist({ x, y }, b.from, b.to);
    if (d < bd) { bd = d; best = pt; }
  }
  return best;
}

/**
 * Parts that moved apart leave 1–2px cracks inside the body. Fill any empty
 * pixel that is mostly surrounded by the sprite with the original colour
 * there, so the body stays solid (outlines of the silhouette are untouched).
 */
function fillCracks(out: Raw, rest: Raw): void {
  const { width: W, height: H } = out;
  for (let pass = 0; pass < 2; pass++) {
    const fill: number[] = [];
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const p = y * W + x;
        if (out.data[p * 4 + 3] >= 128 || rest.data[p * 4 + 3] < 128) continue;
        const n = [p - 1, p + 1, p - W, p + W].filter((q) => out.data[q * 4 + 3] >= 128).length;
        if (n >= 3) fill.push(p);
      }
    }
    if (!fill.length) break;
    for (const p of fill) rest.data.copy(out.data, p * 4, p * 4, p * 4 + 4);
  }
}

// ---------------------------------------------------------------------------
// Skeleton + idle choreography
// ---------------------------------------------------------------------------

function buildRig(rp: RigPoints, P: (k: JointName) => V | null, bodyW: number, groundY: number, bodyH: number) {
  const pelvis = P("pelvis")!, chest = P("chest")!;
  const neck = P("neck") ?? { x: chest.x, y: chest.y - (pelvis.y - chest.y) * 0.6 };
  const head = P("head") ?? P("head_top");
  const headTop = P("head_top") ?? head;
  const bones: Bone[] = [];
  const torsoLen = Math.hypot(neck.x - pelvis.x, neck.y - pelvis.y);
  bones.push({ name: "torso", from: pelvis, to: neck, reach: 1.9 });
  if (head && headTop) bones.push({ name: "head", from: neck, to: headTop, reach: 1.5 });

  const arms: { side: "a" | "b"; shoulder: V; elbow: V | null; hand: V | null }[] = [];
  for (const side of ["a", "b"] as const) {
    const shoulder = P(`shoulder_${side}`), elbow = P(`elbow_${side}`), hand = P(`hand_${side}`);
    if (!shoulder || (!elbow && !hand)) continue;
    arms.push({ side, shoulder, elbow, hand });
    const mid = elbow ?? hand!;
    bones.push({ name: `upper_${side}`, from: shoulder, to: mid, reach: 0.9, arm: true });
    if (elbow && hand) {
      // Reach past the hand so a held sword / shield / staff follows the hand
      const ext = { x: hand.x + (hand.x - elbow.x) * 0.3, y: hand.y + (hand.y - elbow.y) * 0.3 };
      bones.push({ name: `fore_${side}`, from: elbow, to: ext, reach: 1.1, arm: true });
    }
  }

  const legs: { side: "a" | "b"; hip: V; foot: V; knee: V | null }[] = [];
  for (const side of ["a", "b"] as const) {
    const hip = P(`hip_${side}`), knee = P(`knee_${side}`), foot = P(`foot_${side}`);
    if (!hip || !foot) continue;
    legs.push({ side, hip, foot, knee });
    if (knee) {
      bones.push({ name: `leg_${side}`, from: hip, to: knee, reach: 0.95 });
      bones.push({ name: `shin_${side}`, from: knee, to: foot, reach: 0.95 });
    } else {
      bones.push({ name: `leg_${side}`, from: hip, to: foot, reach: 0.95 });
    }
    // Ankle to ground never moves, so toes and soles stay planted
    bones.push({ name: `foot_${side}`, from: foot, to: { x: foot.x, y: Math.max(foot.y + 1, groundY) }, reach: 1.1 });
  }

  const tb = P("tail_base"), tm = P("tail_mid"), tt = P("tail_tip");
  if (tb && (tm || tt)) {
    bones.push({ name: "tail1", from: tb, to: tm ?? tt!, reach: 0.8 });
    if (tm && tt) bones.push({ name: "tail2", from: tm, to: tt, reach: 0.8 });
  }

  // Amplitudes relative to the sprite: visible at game size, never wobbly
  const shiftX = Math.max(0.6, bodyW * 0.025);
  const dip = Math.max(0.3, torsoLen * 0.02);

  const pose = (ph: number): Record<string, M> => {
    const s = Math.sin(ph), c2 = (1 - Math.cos(2 * ph)) / 2;
    // Root: hips sway side to side and dip slightly at each extreme
    const root = translate(shiftX * s, dip * c2);
    // Torso leans a touch against the sway (counter-balance) and breathes
    const torso = mul(root, rotAbout(pelvis, -1.2 * Math.sin(ph + 0.35)));
    const T: Record<string, M> = { torso };
    T.head = mul(torso, rotAbout(neck, 2.2 * Math.sin(ph - 0.8)));
    for (const arm of arms) {
      // Arms hang and swing like pendulums, lagging the body; elbows lag more
      const sign = arm.side === "a" ? 1 : -1;
      const swing = 3.5 * Math.sin(ph - 0.9) + sign * 0.9 * Math.sin(2 * ph);
      const upper = mul(torso, rotAbout(arm.shoulder, swing));
      T[`upper_${arm.side}`] = upper;
      if (arm.elbow) T[`fore_${arm.side}`] = mul(upper, rotAbout(arm.elbow, 3 * Math.sin(ph - 1.6)));
    }
    for (const leg of legs) plantLeg(T, leg, root);
    if (tb) {
      const t1 = mul(root, rotAbout(tb, 6 * Math.sin(ph - 0.6)));
      T.tail1 = t1;
      if (tm) T.tail2 = mul(t1, rotAbout(tm, 7 * Math.sin(ph - 1.4)));
    }
    return T;
  };

  /** Feet stay planted: aim the leg from its foot to where the hip went. */
  const plantLeg = (T: Record<string, M>, leg: (typeof legs)[number], root: M) => {
    {
      const newHip = apply(root, leg.hip);
      const a0 = Math.atan2(leg.hip.y - leg.foot.y, leg.hip.x - leg.foot.x);
      const a1 = Math.atan2(newHip.y - leg.foot.y, newHip.x - leg.foot.x);
      const len0 = Math.hypot(leg.hip.x - leg.foot.x, leg.hip.y - leg.foot.y);
      const len1 = Math.hypot(newHip.x - leg.foot.x, newHip.y - leg.foot.y);
      // Rotate about the foot, then squash along the leg (the knee bends a little)
      const rot = rotAbout(leg.foot, ((a1 - a0) * 180) / Math.PI);
      const k = len1 / Math.max(1, len0);
      const dirx = Math.cos(a1), diry = Math.sin(a1);
      // Scale by k along the leg direction, around the foot
      const sc: M = [
        1 + (k - 1) * dirx * dirx, (k - 1) * dirx * diry, 0,
        (k - 1) * dirx * diry, 1 + (k - 1) * diry * diry, 0,
      ];
      sc[2] = leg.foot.x - (sc[0] * leg.foot.x + sc[1] * leg.foot.y);
      sc[5] = leg.foot.y - (sc[3] * leg.foot.x + sc[4] * leg.foot.y);
      const legM = mul(sc, rot);
      T[`leg_${leg.side}`] = legM;
      T[`shin_${leg.side}`] = legM;
      T[`foot_${leg.side}`] = I;
    }
  };

  /**
   * Walk in place (front / 3⁄4 view, like a top-down RPG): legs lift in turn —
   * the knee rises, the shin and foot come up — while the other foot stays
   * planted; the body rises over the planted leg and shifts onto it; arms
   * swing against the legs; head and tail follow.
   */
  const lift = Math.max(1.5, bodyH * 0.055);
  const walk = (ph: number): Record<string, M> => {
    const s = Math.sin(ph);
    const liftA = Math.max(0, s), liftB = Math.max(0, -s);
    // Body: up over the planted leg (twice per cycle), shifted onto it
    const root = translate(-shiftX * 0.8 * s, -lift * 0.35 * Math.abs(s));
    const torso = mul(root, rotAbout(pelvis, 1.6 * s));
    const T: Record<string, M> = { torso };
    T.head = mul(torso, rotAbout(neck, -1.4 * Math.sin(ph - 0.4)));
    for (const arm of arms) {
      // Each arm swings with the opposite leg
      const sign = arm.side === "a" ? 1 : -1;
      const upper = mul(torso, rotAbout(arm.shoulder, 4 * s * sign));
      T[`upper_${arm.side}`] = upper;
      if (arm.elbow) T[`fore_${arm.side}`] = mul(upper, rotAbout(arm.elbow, 2.5 * s * sign));
    }
    for (const leg of legs) {
      const l = leg.side === "a" ? liftA : liftB;
      if (l < 0.02) { plantLeg(T, leg, root); continue; }
      const up = lift * Math.sin((l * Math.PI) / 2);
      // Thigh: follows the hip and shortens (knee coming up toward the viewer)

      const knee = leg.knee ?? { x: (leg.hip.x + leg.foot.x) / 2, y: (leg.hip.y + leg.foot.y) / 2 };
      const thighLen = Math.max(1, knee.y - leg.hip.y);
      // The knee rises by exactly `up`, so thigh and shin meet without a tear
      const k = Math.max(0.35, 1 - up / thighLen);
      const squash: M = [1, 0, 0, 0, k, leg.hip.y * (1 - k)];
      T[`leg_${leg.side}`] = mul(root, squash);
      // Shin and foot: lifted straight up with the knee
      const shin = mul(root, translate(0, -up));
      T[`shin_${leg.side}`] = shin;
      T[`foot_${leg.side}`] = shin;

    }
    if (tb) {
      const t1 = mul(root, rotAbout(tb, 9 * Math.sin(ph - 0.8)));
      T.tail1 = t1;
      if (tm) T.tail2 = mul(t1, rotAbout(tm, 10 * Math.sin(ph - 1.6)));
    }
    return T;
  };

  const avg = (vs: (V | null)[]) => { const ok = vs.filter((v): v is V => v !== null); return ok.length ? ok.reduce((a, v) => a + v.y, 0) / ok.length : null; };
  const hipY = avg([P("hip_a"), P("hip_b")]) ?? pelvis.y;
  const kneeY = avg([P("knee_a"), P("knee_b")]) ?? (hipY + groundY) / 2;
  return { bones, pose, walk, hipY, kneeY };
}

/**
 * Smooth skin weights: every pixel near the sprite gets up to two bones,
 * weighted by distance to each bone segment (scaled by the bone's reach).
 */
function skin(rest: Raw, bones: Bone[], hipY: number, kneeY: number): ([number, number][] | null)[] {
  const { width: W, height: H } = rest;
  const scaleLen = Math.max(W, H) * 0.06;
  const out: ([number, number][] | null)[] = new Array(W * H).fill(null);
  // Only pixels within a margin of the sprite can be reached by the warp
  const near = dilate(rest, Math.ceil(Math.max(W, H) * 0.06));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!near[y * W + x]) continue;
      const p = { x: x + 0.5, y: y + 0.5 };
      // Arms reach down beside the legs: below the hips they lose out to the legs
      const armPenalty = p.y > kneeY ? 3 : p.y > hipY ? 1.8 : 1;
      const ds = bones.map((bn, k) => [k, (segDist(p, bn.from, bn.to) * (bn.arm ? armPenalty : 1)) / (bn.reach * scaleLen)] as [number, number]);
      ds.sort((u, v) => u[1] - v[1]);
      const top = ds.slice(0, 2);
      // Sharp falloff so each part moves mostly with its own bone
      const ws = top.map(([k, d]) => [k, 1 / Math.pow(d + 0.15, 4)] as [number, number]);
      const sum = ws.reduce((a, [, w]) => a + w, 0);
      out[y * W + x] = ws.map(([k, w]) => [k, w / sum]);
    }
  }
  return out;
}

function segDist(p: V, a: V, b: V): number {
  const vx = b.x - a.x, vy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / Math.max(1e-6, vx * vx + vy * vy)));
  return Math.hypot(p.x - (a.x + vx * t), p.y - (a.y + vy * t));
}

function dilate(raw: Raw, r: number): Uint8Array {
  const { width: W, height: H } = raw;
  const m = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) if (raw.data[i * 4 + 3] >= 16) m[i] = 1;
  // Separable max filter (square)
  const tmp = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    let last = -1e9;
    for (let x = 0; x < W; x++) { if (m[y * W + x]) last = x; if (x - last <= r) tmp[y * W + x] = 1; }
    last = 1e9;
    for (let x = W - 1; x >= 0; x--) { if (m[y * W + x]) last = x; if (last - x <= r) tmp[y * W + x] = 1; }
  }
  const out = new Uint8Array(W * H);
  for (let x = 0; x < W; x++) {
    let last = -1e9;
    for (let y = 0; y < H; y++) { if (tmp[y * W + x]) last = y; if (y - last <= r) out[y * W + x] = 1; }
    last = 1e9;
    for (let y = H - 1; y >= 0; y--) { if (tmp[y * W + x]) last = y; if (last - y <= r) out[y * W + x] = 1; }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Raw helpers
// ---------------------------------------------------------------------------

const MAX_SIDE = 1024;

async function loadSprite(buf: Buffer): Promise<Raw> {
  // Generated sprites are 1024px; cap anything bigger so a large upload can't
  // blow up memory (every frame below is a full-size RGBA copy)
  const { data, info } = await sharp(buf)
    .resize(MAX_SIDE, MAX_SIDE, { fit: "inside", withoutEnlargement: true, kernel: "nearest" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const raw: Raw = { data, width: info.width, height: info.height };
  let opaque = 0, border = 0;
  for (let x = 0; x < raw.width; x++) for (const y of [0, raw.height - 1]) { border++; if (data[(y * raw.width + x) * 4 + 3] > 200) opaque++; }
  if (opaque > border * 0.5) keySpriteBackground(raw, { tolerance: 32, fringePasses: 1 });
  return raw;
}

async function resizeRaw(raw: Raw, w: number, h: number): Promise<Raw> {
  const { data, info } = await sharp(raw.data, { raw: { width: raw.width, height: raw.height, channels: 4 } })
    .resize(w, h, { kernel: "lanczos3", fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function nativeFactor(raw: Raw): number {
  for (const f of [16, 12, 10, 8, 6, 5, 4, 3, 2]) {
    if (raw.width % f || raw.height % f) continue;
    let same = 0, total = 0;
    for (let y = 0; y < raw.height; y += 3) {
      for (let x = 0; x < raw.width; x += 3) {
        const bx = x - (x % f) + Math.floor(f / 2), by = y - (y % f) + Math.floor(f / 2);
        const a = (y * raw.width + x) * 4, c = (by * raw.width + bx) * 4;
        total++;
        if (Math.abs(raw.data[a] - raw.data[c]) + Math.abs(raw.data[a + 1] - raw.data[c + 1]) + Math.abs(raw.data[a + 2] - raw.data[c + 2]) + Math.abs(raw.data[a + 3] - raw.data[c + 3]) < 12) same++;
      }
    }
    if (same / total > 0.985) return f;
  }
  return 1;
}

function downsample(raw: Raw, f: number): Raw {
  const w = raw.width / f, h = raw.height / f;
  const out: Raw = { data: Buffer.alloc(w * h * 4), width: w, height: h };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = ((y * f + Math.floor(f / 2)) * raw.width + x * f + Math.floor(f / 2)) * 4;
      raw.data.copy(out.data, (y * w + x) * 4, s, s + 4);
    }
  }
  return out;
}

function bounds(raw: Raw) {
  let x0 = raw.width, y0 = raw.height, x1 = -1, y1 = -1;
  for (let y = 0; y < raw.height; y++) {
    for (let x = 0; x < raw.width; x++) {
      if (raw.data[(y * raw.width + x) * 4 + 3] >= 128) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

function blit(src: Raw, dst: Raw, ox: number, oy: number) {
  for (let y = 0; y < src.height; y++) {
    const dy = y + oy;
    if (dy < 0 || dy >= dst.height) continue;
    for (let x = 0; x < src.width; x++) {
      const dx = x + ox;
      if (dx < 0 || dx >= dst.width) continue;
      src.data.copy(dst.data, (dy * dst.width + dx) * 4, (y * src.width + x) * 4, (y * src.width + x) * 4 + 4);
    }
  }
}

function samplePixel(src: Raw, x: number, y: number, out: Buffer, i: number) {
  const sx = Math.floor(x), sy = Math.floor(y);
  if (sx < 0 || sy < 0 || sx >= src.width || sy >= src.height) return;
  src.data.copy(out, i, (sy * src.width + sx) * 4, (sy * src.width + sx) * 4 + 4);
}

function sampleBilinear(src: Raw, x: number, y: number, out: Buffer, i: number) {
  const fx = x - 0.5, fy = y - 0.5;
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const tx = fx - x0, ty = fy - y0;
  let r = 0, g = 0, b = 0, a = 0;
  for (let k = 0; k < 4; k++) {
    const px = x0 + (k & 1), py = y0 + (k >> 1);
    if (px < 0 || py < 0 || px >= src.width || py >= src.height) continue;
    const w = (k & 1 ? tx : 1 - tx) * (k >> 1 ? ty : 1 - ty);
    const j = (py * src.width + px) * 4;
    const al = src.data[j + 3] / 255;
    r += src.data[j] * al * w; g += src.data[j + 1] * al * w; b += src.data[j + 2] * al * w; a += al * w;
  }
  if (a <= 0.004) return;
  out[i] = Math.round(r / a); out[i + 1] = Math.round(g / a); out[i + 2] = Math.round(b / a);
  out[i + 3] = Math.round(a * 255);
}
