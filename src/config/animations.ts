// =============================================================================
// Animation presets — which motions make sense for which asset type.
// Shared by the /animate UI and /api/animate (client-safe).
// =============================================================================

/**
 * Frame-count options. Priced from the real cost (Oct 2026): the animation
 * model is billed per image — ~$0.07 for a 1024 grid, ~$0.10 for 2048 — plus
 * ~$0.02 for the Claude pose planner. The most expensive credit costs us
 * about $0.015. Studio at 1,500 credits is about $0.022 per credit at the
 * shelf price. These credit prices were not raised when monthly allowances
 * grew; the old "≥35% at the cheapest credit" note does not hold on the
 * provider-cost model (several Studio rows are under 20%, and the worst
 * modelled case is negative). `smoothExtra` pays for the second image pass
 * that draws the in-betweens.
 */
export const ANIMATION_FRAME_OPTIONS = [
  { frames: 4, cols: 2, rows: 2, size: 1024, credits: 7, smoothExtra: 5, label: "4 frames", hint: "Classic retro loop" },
  { frames: 6, cols: 3, rows: 2, size: 2048, credits: 11, smoothExtra: 7, label: "6 frames", hint: "Smoother" },
  { frames: 9, cols: 3, rows: 3, size: 2048, credits: 12, smoothExtra: 7, label: "9 frames", hint: "Most detail" },
] as const;
export type AnimationFrameOption = (typeof ANIMATION_FRAME_OPTIONS)[number];

export const DEFAULT_ANIMATION_FRAMES = 4;

export function animationFrameOption(frames: number | null | undefined): AnimationFrameOption {
  return ANIMATION_FRAME_OPTIONS.find((o) => o.frames === frames) ?? ANIMATION_FRAME_OPTIONS[0];
}

/**
 * Rigged idles: the original sprite is deformed (breathing / hovering)
 * instead of redrawn per frame, so nothing flickers. Flat price, no AI cost.
 */
export const RIG_CREDITS = 3;
export const RIG_FRAMES = 24;

/** Rigid-item motions (src/lib/image/item-motion.ts): the drawing is moved, never redrawn. */
export type ItemMotionKind = "swing" | "thrust" | "spin" | "shine" | "pulse";
export type RigMotionKind = "breathe" | "float" | ItemMotionKind;

/** Things that don't bend: a sword swings as one piece, a gem glows in place. */
const RIGID_CATEGORIES = ["WEAPONS", "ARMOR", "CONSUMABLES", "RESOURCES", "UI_ELEMENTS"];

export function isItemMotion(kind: string | null | undefined): kind is ItemMotionKind {
  return kind === "swing" || kind === "thrust" || kind === "spin" || kind === "shine" || kind === "pulse";
}

/** Motions that are better as a rig than as redrawn frames. */
export function rigMotionFor(id: string, label?: string, categoryId?: string | null): RigMotionKind | null {
  const text = `${id} ${label ?? ""}`.toLowerCase();
  if (RIGID_CATEGORIES.includes((categoryId ?? "").toUpperCase())) {
    // Image models redraw a "swinging" sword in place and add a white arc;
    // rotating the real drawing around its grip is what a game animator does
    if (/\b(swing|slash|strike|chop|cleave|hack|attack|smash)/.test(text)) return "swing";
    if (/\b(thrust|stab|lunge|poke|jab|pierce)/.test(text)) return "thrust";
    if (/\b(spin|rotat|twirl|whirl|turn)/.test(text)) return "spin";
    if (/\b(shine|gleam|glint|sparkle|shimmer|polish|glisten)/.test(text)) return "shine";
    if (/\b(glow|power|charge|pulse|enchant|empower|aura|ignite|light)/.test(text)) return "pulse";
    if (/\b(float|hover|bob|pickup|pick up|levitat|idle)/.test(text)) return "float";
  }
  if (/\b(walk|run|attack|jump|hit|hurt|cast|fly|swim|turn|death|die|dash)/.test(text)) return null;
  if (/\b(hover|float|levitat|bob)/.test(text)) return "float";
  if (/\b(idle|breath|breathing|rest|resting|stand|standing|wait|waiting|calm)\b/.test(text)) return "breathe";
  return null;
}

/**
 * Directional views for top-down / isometric games ("rotations"): the same
 * sprite seen from 4 or 8 directions. One image-model pass on a 1024 (4) or
 * 2048 (8) grid — priced like the matching animation.
 */
export const ROTATIONS = [
  { id: "rotate4", kind: "views" as const, label: "4 directions", directions: 4 as const, frames: 4, cols: 2, rows: 2, size: 1024 as const, credits: 6, hint: "front · right · back · left" },
  { id: "rotate8", kind: "views" as const, label: "8 directions", directions: 8 as const, frames: 8, cols: 3, rows: 3, size: 2048 as const, credits: 10, hint: "every 45° — isometric & top-down" },
  { id: "walk4dir", kind: "walk" as const, label: "4-direction walk", directions: 4 as const, frames: 16, cols: 4, rows: 3, size: 2048 as const, credits: 12, hint: "RPG sheet: 4 rows × 4 steps" },
];
export type RotationOption = (typeof ROTATIONS)[number];

export function rotationFor(id: string | null | undefined): RotationOption | null {
  return ROTATIONS.find((r) => r.id === id) ?? null;
}

/** Things that face a direction: people and monsters. */
export function supportsRotation(categoryId: string | null | undefined): boolean {
  return ["CHARACTERS", "CREATURES"].includes((categoryId ?? "").toUpperCase());
}

export const DIRECTION_NAMES: Record<4 | 8, string[]> = {
  4: ["front (facing the viewer)", "right side (profile, facing the right edge of the image)", "back (facing away from the viewer)", "left side (profile, facing the left edge of the image)"],
  8: ["front (facing the viewer)", "front-right three-quarter view", "right side (profile, facing right)", "back-right three-quarter view (seen mostly from behind)", "back (facing away from the viewer)", "back-left three-quarter view (seen mostly from behind)", "left side (profile, facing left)", "front-left three-quarter view"],
};

/** Short labels for file names / UI, same order as DIRECTION_NAMES. */
export const DIRECTION_KEYS: Record<4 | 8, string[]> = {
  4: ["S", "E", "N", "W"],
  8: ["S", "SE", "E", "NE", "N", "NW", "W", "SW"],
};

/** 4-direction walk: one row per direction (front, right, back, left), 4 steps each. */
export function buildWalkSetPrompt(opts: { pixel: boolean; subject: string }): string {
  const style = opts.pixel ? "pixel art" : "2D game art";
  const steps = "4 frames of a walk cycle in place — 1: left foot forward, 2: feet passing, 3: right foot forward, 4: feet passing — arms swinging opposite to the legs";
  return [
    `Using the reference image, draw a top-down RPG character walking sprite sheet of EXACTLY this same ${style} sprite (${opts.subject.slice(0, 200)}).`,
    "Identical design, colors, proportions, outline, size and art style in every frame. Held items stay in the same hand.",
    "Layout: 3 rows of 4 figures on one blank white page, evenly spaced with wide empty white space so no two figures touch; every figure is the same height and all stand on the same invisible ground level within their row.",
    `Row 1: facing the viewer (front), ${steps}.`,
    `Row 2: facing right (side profile), ${steps}.`,
    `Row 3: facing away from the viewer (back), ${steps}.`,
    "Plain flat solid pure white background, like a blank sheet of paper. Do not draw any lines on the background: no grid, no guide lines, no boxes, no arrows, no labels or text of any kind, no ground, no shadows, no motion blur.",
  ].join("\n");
}

/**
 * Redraw of one walk row that came back frozen (same pose four times). Poses
 * are spelled out per frame so the legs visibly alternate.
 */
export function buildWalkRowPrompt(opts: { pixel: boolean; subject: string; view: "front" | "side" | "back" }): string {
  const style = opts.pixel ? "pixel art" : "2D game art";
  const facing = { front: "facing the viewer (front view)", side: "facing right (side profile)", back: "facing away from the viewer (back view)" }[opts.view];
  const poses = opts.view === "side"
    ? [
        "1: contact — left leg stretched far forward with the heel on the ground, right leg stretched far back, wide stride, right arm forward",
        "2: passing — legs together under the body, right knee lifted and bent, body slightly higher",
        "3: contact — right leg stretched far forward with the heel on the ground, left leg stretched far back, wide stride, left arm forward",
        "4: passing — legs together under the body, left knee lifted and bent, body slightly higher",
      ]
    : [
        "1: left foot stepping forward and slightly lower, right foot back, right arm forward",
        "2: feet together, body slightly higher",
        "3: right foot stepping forward and slightly lower, left foot back, left arm forward",
        "4: feet together, body slightly higher",
      ];
  return [
    `Using the reference image, draw 4 frames of EXACTLY this same ${style} character (${opts.subject.slice(0, 200)}) walking in place, ${facing}.`,
    "Identical design, colors, proportions, outline, size and art style in every frame. Held items stay in the same hand.",
    "The four poses must be clearly different from each other — the legs must visibly move:",
    ...poses,
    "Layout: 2 rows of 2 figures on one blank white page, in reading order, evenly spaced with wide empty white space so no two figures touch; every figure is the same height and stands on the same invisible ground level.",
    "Plain flat solid pure white background, like a blank sheet of paper. Do not draw any lines on the background: no grid, no guide lines, no boxes, no arrows, no labels or text of any kind, no ground, no shadows, no motion blur.",
  ].join("\n");
}

export function buildRotationPrompt(opts: { directions: 4 | 8; cols: number; rows: number; pixel: boolean; subject: string }): string {
  const style = opts.pixel ? "pixel art" : "2D game art";
  const names = DIRECTION_NAMES[opts.directions];
  const empty = opts.cols * opts.rows - names.length;
  return [
    `Using the reference image, draw a ${opts.directions}-direction rotation sheet of EXACTLY this same ${style} sprite (${opts.subject.slice(0, 200)}) for a top-down / isometric game.`,
    "Identical design, colors, proportions, outline, size and art style in every view. Standing in the same neutral pose — only the viewing direction changes. Held items stay in the same hand.",
    `Layout: ${opts.rows} rows of ${opts.cols} views on one blank white page, in reading order (left to right, then top to bottom), evenly spaced with wide empty white space so no two views touch. Every view is the same height and stands on the same invisible ground level.`,
    ...names.map((n, i) => `View ${i + 1}: ${n}.`),
    empty > 0 ? `Leave the last ${empty === 1 ? "place" : empty + " places"} empty.` : "",
    "Plain flat solid pure white background, like a blank sheet of paper. Do not draw any lines on the background: no grid, no guide lines, no boxes, no arrows, no labels or text of any kind, no ground, no shadows.",
  ].filter(Boolean).join("\n");
}

/** Credits for an AI animation; smooth adds the in-between pass. */
export function animationCredits(frames: number, smooth: boolean): number {
  const o = animationFrameOption(frames);
  return o.credits + (smooth ? o.smoothExtra : 0);
}

/** Lowest price, shown in places that don't know the frame count yet. */
export const ANIMATION_CREDITS = ANIMATION_FRAME_OPTIONS[0].credits;

/**
 * How frames are lined up on the shared canvas:
 *   ground — feet on one baseline, body kept still (idle, walk, attack…)
 *   air    — body kept still sideways, height kept from the drawing (jump, fly, float, hop)
 *   cell   — position kept from the drawing in both axes (thrust, dash, knockback, shake)
 *   center — centred each frame (rotations: spin, swing, pulse)
 */
export type MotionAnchor = "ground" | "air" | "cell" | "center";
export const MOTION_ANCHORS: readonly MotionAnchor[] = ["ground", "air", "cell", "center"];

export interface AnimationPreset {
  id: string;
  label: string;
  /** What should happen across the frames (the planner turns it into poses). */
  motion: string;
  anchor?: MotionAnchor;
  /** Cycles (idle, walk…) vs one-shots (attack, hurt…). */
  loop?: boolean;
  /** Suggested number of key poses. */
  frames?: 4 | 6 | 9;
}

const CHARACTER: AnimationPreset[] = [
  { id: "idle", label: "Idle", anchor: "ground", loop: true, frames: 4, motion: "Idle loop that is clearly visible at game size: deep breathing (chest and shoulders rise and sink), weight shift from leg to leg, head tilt, held weapon or staff swaying, cape/hair/robe/tail swinging behind the body, a blink — every frame noticeably different" },
  { id: "walk", label: "Walk", anchor: "ground", loop: true, frames: 6, motion: "Walk cycle in place: alternating steps, arms swing opposite to the legs, torso and head dip and rise, cloth and hair follow; if legs are hidden by a robe or dress the hem swings instead" },
  { id: "run", label: "Run", anchor: "ground", loop: true, frames: 6, motion: "Run cycle in place: body leans forward, long strides, strong arm pumping, one airborne frame, hair and cape stream behind" },
  { id: "attack", label: "Attack", anchor: "ground", loop: false, frames: 6, motion: "Attack using its own weapon or natural attack (sword slash, bow shot, staff blast, claws, bite, fire breath for dragons): anticipation, strike, impact, recovery" },
  { id: "cast", label: "Cast", anchor: "ground", loop: false, frames: 6, motion: "Spell cast: raise staff, wand or hands, gather glowing energy, release a burst forward, recover" },
  { id: "jump", label: "Jump", anchor: "air", loop: false, frames: 6, motion: "Jump: crouch, take-off with arms up, rising, peak high in the air with legs tucked, falling, landing with knees bent — the body really leaves the ground" },
  { id: "hurt", label: "Hurt", anchor: "ground", loop: false, frames: 4, motion: "Hit reaction: flinch backwards, recoil with a pained face, stagger, recover to the stance" },
  { id: "death", label: "Defeat", anchor: "ground", loop: false, frames: 6, motion: "Defeat: stagger, knees buckle, collapse, lying down (or fading for ghosts)" },
];

const CREATURE: AnimationPreset[] = [
  { id: "idle", label: "Idle", anchor: "ground", loop: true, frames: 4, motion: "Idle loop: breathing, head and neck sway, tail flick, wings settle, jaws or eyes move slightly" },
  { id: "walk", label: "Move", anchor: "ground", loop: true, frames: 6, motion: "Movement cycle in place using its own anatomy: walk on its legs, slither, hop with squash and stretch, or float — whatever this creature does" },
  { id: "attack", label: "Attack", anchor: "ground", loop: false, frames: 6, motion: "Its natural attack — breath attack for dragons (fire/ice/poison stream from the jaws), otherwise bite, claw swipe, tail whip, horn charge or slam; never a human punch: anticipation, strike, impact, recovery" },
  { id: "special", label: "Roar / Special", anchor: "ground", loop: false, frames: 6, motion: "Its signature move: a mighty roar with the head thrown back, a spit or magic burst, a ground-slam shockwave, or its breath at full power" },
  { id: "bite", label: "Bite / Claw", anchor: "ground", loop: false, frames: 4, motion: "Close-range melee: lunge forward with a snapping bite or a claw swipe, impact, pull back" },
  { id: "fly", label: "Fly", anchor: "air", loop: true, frames: 6, motion: "Flying or hovering in place: full wing beats (up-stroke, down-stroke), body rises on the down-stroke and dips on the up-stroke; if it has no wings it levitates and sways" },
  { id: "hurt", label: "Hurt", anchor: "ground", loop: false, frames: 4, motion: "Hit reaction: recoil, flinch with a pained face, stagger, recover" },
  { id: "death", label: "Defeat", anchor: "ground", loop: false, frames: 6, motion: "Defeat: stagger, collapse, lying down (or dissolve / fade for slimes and spirits)" },
];

const WEAPON: AnimationPreset[] = [
  { id: "swing", label: "Swing", anchor: "center", loop: false, frames: 6, motion: "Swing: the weapon rotates through a wide slashing arc from raised, to mid-swing with a motion trail, to struck down, to follow-through" },
  { id: "stab", label: "Thrust", anchor: "cell", loop: false, frames: 4, motion: "Thrust: the weapon pulls back, lunges forward, extends fully with a short trail, then returns" },
  { id: "spin", label: "Spin", anchor: "center", loop: true, frames: 6, motion: "Spin: a full 360° rotation of the weapon in equal steps" },
  { id: "glow", label: "Power-up", anchor: "center", loop: true, frames: 6, motion: "Power-up: the weapon glows brighter each frame with a growing aura and particles, then pulses" },
  { id: "float", label: "Pickup float", anchor: "air", loop: true, frames: 4, motion: "Loot pickup loop: the weapon floats, bobbing up and down with a gentle tilt and a glint travelling along the blade" },
];

const ITEM: AnimationPreset[] = [
  { id: "float", label: "Float", anchor: "air", loop: true, frames: 4, motion: "Floating loop: the item bobs up and down with a slight tilt, a sparkle travels across it" },
  { id: "spin", label: "Spin", anchor: "center", loop: true, frames: 6, motion: "Coin-style spin around its vertical axis (front, three-quarter, edge, back, three-quarter)" },
  { id: "glow", label: "Glow", anchor: "center", loop: true, frames: 4, motion: "Pulsing glow loop: the glow and sparkles grow and fade" },
  { id: "shake", label: "Shake", anchor: "cell", loop: false, frames: 4, motion: "Excited shake: wobble left, right, left, settle" },
  { id: "use", label: "Use / Open", anchor: "ground", loop: false, frames: 6, motion: "Being used: a chest or container opens with loot glinting, a potion bubbles and uncorks, a scroll unrolls, a key turns — whatever this item does when used" },
];

const ENVIRONMENT: AnimationPreset[] = [
  { id: "ambient", label: "Ambient", anchor: "ground", loop: true, frames: 6, motion: "Living ambient loop: leaves and branches sway in the wind, flames flicker, water drips, smoke curls from a chimney, flags wave, lights glow — whatever moves on this object" },
  { id: "shake", label: "Hit / Shake", anchor: "cell", loop: false, frames: 4, motion: "Struck: the object shakes and wobbles, bits and leaves fly off, then settles" },
  { id: "destroy", label: "Destroy", anchor: "ground", loop: false, frames: 6, motion: "Destroyed: cracks spread, it breaks apart into pieces and debris falls, ending as rubble" },
  { id: "glow", label: "Activate", anchor: "ground", loop: true, frames: 4, motion: "Activated: glowing parts light up and pulse, runes shine, sparks rise" },
];

const TILE: AnimationPreset[] = [
  { id: "flow", label: "Flow", anchor: "cell", loop: true, frames: 4, motion: "Looping surface animation: water ripples and flows, lava bubbles and churns, grass sways, sand drifts — the texture moves while staying a seamless tile" },
  { id: "shimmer", label: "Shimmer", anchor: "cell", loop: true, frames: 4, motion: "Subtle shimmer loop: highlights glint and travel across the surface, crystals sparkle, magic runes pulse" },
];

const UI: AnimationPreset[] = [
  { id: "pulse", label: "Pulse", anchor: "center", loop: true, frames: 4, motion: "Attention pulse: the icon scales up slightly and glows, then settles" },
  { id: "shine", label: "Shine", anchor: "center", loop: true, frames: 6, motion: "A bright shine sweeps diagonally across the icon from corner to corner" },
  { id: "ready", label: "Ready / Unlock", anchor: "center", loop: false, frames: 6, motion: "Becomes available: the icon brightens from greyed-out to full colour with a burst of sparkles" },
];

const EFFECT: AnimationPreset[] = [
  { id: "loop", label: "Loop", anchor: "center", loop: true, frames: 6, motion: "Seamless effect loop: flames, energy or particles swirl, flicker and pulse continuously" },
  { id: "burst", label: "Burst", anchor: "center", loop: false, frames: 6, motion: "One-shot: a small spark grows into the full effect, peaks, then dissipates into fading particles" },
  { id: "travel", label: "Projectile", anchor: "center", loop: true, frames: 4, motion: "Projectile in flight: the effect streaks forward with a flickering tail and trailing particles" },
];

export function animationPresetsFor(categoryId: string | null | undefined): AnimationPreset[] {
  const cat = (categoryId ?? "").toUpperCase();
  if (cat === "CHARACTERS") return CHARACTER;
  if (cat === "CREATURES") return CREATURE;
  if (cat === "WEAPONS") return WEAPON;
  if (cat === "ENVIRONMENT" || cat === "ISOMETRIC") return ENVIRONMENT;
  if (cat === "TILESETS") return TILE;
  if (cat === "UI_ELEMENTS") return UI;
  if (cat === "EFFECTS" || cat === "PROJECTILES") return EFFECT;
  return ITEM;
}

/** Default anchor when a motion doesn't say: figures stand, objects centre. */
export function animationAnchor(categoryId: string | null | undefined): MotionAnchor {
  const cat = (categoryId ?? "").toUpperCase();
  if (cat === "CHARACTERS" || cat === "CREATURES" || cat === "ENVIRONMENT" || cat === "ISOMETRIC") return "ground";
  if (cat === "TILESETS") return "cell";
  return "center";
}

const POSITION_NAMES: Record<number, string[]> = {
  2: ["left", "right"],
  3: ["left", "middle", "right"],
};
const ROW_NAMES: Record<number, string[]> = {
  2: ["top", "bottom"],
  3: ["top", "middle", "bottom"],
};

export function buildAnimationPrompt(opts: {
  motion: string;
  pixel: boolean;
  subject: string;
  cols: number;
  rows: number;
  frames: string[];
  consistency?: string;
}): string {
  const style = opts.pixel ? "pixel art" : "2D game art";
  const n = opts.cols * opts.rows;
  const head = [
    `Using the reference image, draw a ${n}-frame animation sprite sheet of EXACTLY this same ${style} sprite (${opts.subject.slice(0, 200)}).`,
    "Identical character design, colors, proportions, outline, size, facing direction and art style in every frame — only the pose changes, and it changes clearly between frames.",
    `Animation: ${opts.motion.slice(0, 300)}.`,
    opts.consistency ? `Keep in every frame: ${opts.consistency.slice(0, 400)}` : "",
    // No "grid"/"cells" wording: it makes the model draw graph paper and divider lines
    `Layout: ${opts.rows} rows of ${opts.cols} poses on one blank white page, in reading order (left to right, then top to bottom), evenly spaced with wide empty white space between neighbours so no two poses touch. Every pose is the same scale and camera angle as the reference, and all poses in a row stand on the same invisible ground level; when the motion leaves the ground (jump, hop, fly, float) the pose is drawn higher by that amount.`,
    "Weapons, staffs and props are rigid: they stay straight, unbroken and full length in every frame.",
  ];
  const tail = "Plain flat solid pure white background everywhere, like a blank sheet of paper. Do not draw any lines on the background: no graph paper, no grid, no guide or divider lines, no boxes or borders, no frame numbers, no labels or captions, no text of any kind, no ground, no shadows, no motion blur.";
  // The image API takes ~2900 chars: share what's left between the frames
  const fixed = head.join("\n").length + tail.length + 2;
  const perFrame = Math.max(80, Math.floor((PROMPT_LIMIT - fixed) / n) - 30);
  const cells = opts.frames.slice(0, n).map((pose, i) => {
    const r = Math.floor(i / opts.cols), c = i % opts.cols;
    return `Frame ${i + 1} (${ROW_NAMES[opts.rows]?.[r] ?? `row ${r + 1}`} ${POSITION_NAMES[opts.cols]?.[c] ?? `column ${c + 1}`}): ${clip(pose, perFrame)}`;
  });
  return [...head, ...cells, tail].filter(Boolean).join("\n");
}

const PROMPT_LIMIT = 2900;

/** Animated seamless tile: every cell is the full square texture, a step of the loop. */
export function buildTileAnimationPrompt(opts: { motion: string; pixel: boolean; subject: string; cols: number; rows: number }): string {
  const n = opts.cols * opts.rows;
  const style = opts.pixel ? "pixel art" : "2D game art";
  return [
    `Using the reference image, draw a ${n}-frame looping animation of EXACTLY this ${style} seamless square texture tile (${opts.subject.slice(0, 160)}).`,
    `Animation: ${opts.motion.slice(0, 300)}.`,
    `Layout: a ${opts.cols} by ${opts.rows} grid of equal square cells in reading order. Every cell is completely filled edge to edge with the tile — the same texture, colours, scale and pattern, only the moving parts (waves, flow, bubbles, sway, glints) advance a little each frame so the last frame loops back into the first.`,
    "Each frame stays seamless: the pattern continues across all four edges. Separate the cells with a thin plain white gap. No text, no numbers, no borders inside the cells.",
  ].join("\n");
}

/** Grid used to show `n` key poses to the model (and to receive in-betweens). */
export function gridFor(n: number): { cols: number; rows: number; size: 1024 | 2048 } {
  if (n <= 4) return { cols: 2, rows: 2, size: 1024 };
  if (n <= 6) return { cols: 3, rows: 2, size: 2048 };
  return { cols: 3, rows: 3, size: 2048 };
}

/**
 * Second pass for smooth motion: the model sees the key poses and draws the
 * pose halfway between each neighbouring pair, in the same layout.
 */
export function buildInbetweenPrompt(opts: {
  count: number;
  cols: number;
  rows: number;
  pixel: boolean;
  subject: string;
  loop: boolean;
}): string {
  const style = opts.pixel ? "pixel art" : "2D game art";
  const empty = opts.cols * opts.rows - opts.count;
  return [
    `The reference image is a sprite sheet with ${opts.count} key poses of one ${style} animation (${opts.subject.slice(0, 160)}), in ${opts.rows} rows of ${opts.cols} in reading order: left to right, then top to bottom.`,
    `Draw a new sprite sheet with exactly the same layout, size and spacing, where pose k is the in-between pose exactly halfway between key pose k and key pose k+1. Every pose is drawn as large as the key poses, with wide empty white space between neighbours so no two poses touch.`,
    opts.loop
      ? `Pose ${opts.count} is halfway between key pose ${opts.count} and key pose 1, closing the loop.`
      : `Pose ${opts.count} is halfway between key pose ${opts.count} and key pose 1, easing back to the start.`,
    "Every in-between is a genuinely new pose between its two neighbours — limbs, weapon, cloth and effects halfway along their path — never a copy of either key pose.",
    "The body keeps the same size, height and place on the page as the key poses. A foot or paw that is planted in both neighbouring key poses stays planted in the same spot.",
    "Identical character design, colors, proportions, size, position, facing direction and art style as the key poses. Weapons and props stay rigid, straight and full length.",
    empty > 0 ? `Leave the last ${empty} place${empty === 1 ? "" : "s"} empty.` : "",
    "Plain flat solid pure white background, like a blank sheet of paper. Do not draw any lines on the background: no graph paper, no grid, no guide or divider lines, no boxes or borders, no numbers, no labels or captions, no text of any kind, no shadows, no motion blur.",
  ].filter(Boolean).join("\n");
}

function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(", "), cut.lastIndexOf("; "));
  return (stop > max * 0.6 ? cut.slice(0, stop) : cut.slice(0, cut.lastIndexOf(" "))).trim();
}
