// =============================================================================
// Animation presets — which motions make sense for which asset type.
// Shared by the /animate UI and /api/animate (client-safe).
// =============================================================================

/** Frame-count options: more frames = smoother motion, larger canvas, more credits. */
export const ANIMATION_FRAME_OPTIONS = [
  { frames: 4, cols: 2, rows: 2, size: 1024, credits: 4, label: "4 frames", hint: "Classic retro loop" },
  { frames: 6, cols: 3, rows: 2, size: 2048, credits: 6, label: "6 frames", hint: "Smoother" },
  { frames: 9, cols: 3, rows: 3, size: 2048, credits: 9, label: "9 frames", hint: "Most detail" },
] as const;
export type AnimationFrameOption = (typeof ANIMATION_FRAME_OPTIONS)[number];

export const DEFAULT_ANIMATION_FRAMES = 4;

export function animationFrameOption(frames: number | null | undefined): AnimationFrameOption {
  return ANIMATION_FRAME_OPTIONS.find((o) => o.frames === frames) ?? ANIMATION_FRAME_OPTIONS[0];
}

/** Credits for an animation: 1 per frame; smooth (AI in-betweens) doubles both. */
export function animationCredits(frames: number, smooth: boolean): number {
  return animationFrameOption(frames).credits * (smooth ? 2 : 1);
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
  { id: "turnaround", label: "Turnaround", anchor: "ground", loop: true, frames: 4, motion: "Turnaround sheet for a game: the same character standing in a neutral pose, rotated to face front (toward the viewer), right side, back (away from the viewer) and left side — one view per frame, same size and height" },
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
    `Layout: a ${opts.cols} by ${opts.rows} grid (${opts.cols} columns, ${opts.rows} rows) of equal cells in reading order, left to right then top to bottom. One full sprite per cell, horizontally centred, same scale and camera angle as the reference, never touching or crossing into another cell. Every cell shares the same ground line in its lower part; when the motion leaves the ground (jump, hop, fly, float) the sprite is drawn higher in its cell by that amount.`,
    "Weapons, staffs and props are rigid: they stay straight, unbroken and full length in every frame.",
  ];
  const tail = "Plain flat solid pure white background everywhere. No grid lines, no borders, no frame numbers, no labels or captions, no text of any kind, no ground, no shadows, no motion blur.";
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
    `The reference image is a sprite sheet with ${opts.count} key poses of one ${style} animation (${opts.subject.slice(0, 160)}), in a ${opts.cols} by ${opts.rows} grid in reading order: left to right, then top to bottom.`,
    `Draw a new sprite sheet with exactly the same grid layout, where cell k shows the in-between pose exactly halfway between key pose k and key pose k+1.`,
    opts.loop
      ? `Cell ${opts.count} is halfway between key pose ${opts.count} and key pose 1, closing the loop.`
      : `Cell ${opts.count} is halfway between key pose ${opts.count} and key pose 1, easing back to the start.`,
    "Every in-between is a genuinely new pose between its two neighbours — limbs, weapon, cloth and effects halfway along their path — never a copy of either key pose.",
    "The body keeps the same size, height and place in its cell as the key poses. A foot or paw that is planted in both neighbouring key poses stays planted in the same spot.",
    "Identical character design, colors, proportions, size, position inside the cell, facing direction and art style as the key poses. Weapons and props stay rigid, straight and full length.",
    empty > 0 ? `Leave the last ${empty} cell${empty === 1 ? "" : "s"} empty.` : "",
    "Plain flat solid pure white background. No grid lines, no borders, no numbers, no labels or captions, no text of any kind, no shadows, no motion blur.",
  ].filter(Boolean).join("\n");
}

function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(", "), cut.lastIndexOf("; "));
  return (stop > max * 0.6 ? cut.slice(0, stop) : cut.slice(0, cut.lastIndexOf(" "))).trim();
}
