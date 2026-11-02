// =============================================================================
// Walk-cycle amplitude
// =============================================================================
// Front-view rig walks were measured on production sheets: 28 of 31 moved
// less than 8% of the silhouette between frames (median 4.8%). A readable
// in-place step changes at least ~12% — the lifted leg leaves the silhouette
// and the arms swing clear of the body. Numbers below are that budget.
// Pixel art scales the same step with the sprite, so a 110px figure does not
// keep the 2px shuffle that was drawn for a 32px one.
// =============================================================================

export const WALK_LIFT_BODY = 0.18;
export const WALK_ARM_DEG = 28;
export const WALK_OUTWARD_BODY = 0.22;
export const WALK_HIP_BODY = 0.08;
export const WALK_TORSO_DEG = 6;

export interface WalkAmplitudes {
  /** How far the lifted foot rises, in source pixels. */
  lift: number;
  armDeg: number;
  /** How far the lifted foot steps out to the side, in source pixels. */
  outward: number;
  hip: number;
  torsoDeg: number;
}

export function walkAmplitudes(bodyH: number, bodyW: number): WalkAmplitudes {
  return {
    lift: Math.max(3, bodyH * WALK_LIFT_BODY),
    armDeg: WALK_ARM_DEG,
    outward: Math.max(2, bodyW * WALK_OUTWARD_BODY),
    hip: Math.max(1.2, bodyW * WALK_HIP_BODY),
    torsoDeg: WALK_TORSO_DEG,
  };
}

/** Cut-out steps for a ~28px-tall pixel sprite. Multiplied by pixelWalkUnit. */
export const PIXEL_WALK_BASE: Record<"leg_a" | "leg_b" | "torso" | "head" | "arm_a" | "arm_b" | "tail" | "item", [number, number][]> = {
  leg_a: [[0, 0], [4, -5], [1, 0], [0, -1]],
  leg_b: [[0, 0], [0, -1], [-1, 0], [-4, -5]],
  torso: [[0, 0], [1, -1], [0, 0], [-1, -1]],
  head: [[0, 0], [1, -1], [0, 0], [-1, -1]],
  arm_a: [[1, 0], [-3, -1], [0, 0], [2, 0]],
  arm_b: [[-1, 0], [2, 0], [0, 0], [-3, -1]],
  tail: [[0, 0], [2, -1], [0, 0], [-2, -1]],
  item: [[0, 0], [1, -1], [0, 0], [-1, -1]],
};

export const PIXEL_WALK_FRAMES = 4;

/** 1 at ~28px, 2 at ~56px, 4 at ~112px. */
export function pixelWalkUnit(bodyH: number): number {
  return Math.max(1, Math.round(bodyH / 28));
}

export function pixelWalkShift(part: string, frame: number, bodyH: number): [number, number] {
  const row = PIXEL_WALK_BASE[part as keyof typeof PIXEL_WALK_BASE];
  const base = row?.[frame % PIXEL_WALK_FRAMES] ?? [0, 0];
  const unit = pixelWalkUnit(bodyH);
  return [base[0] * unit, base[1] * unit];
}

export function pixelWalkPeak(bodyH: number): { x: number; y: number } {
  const unit = pixelWalkUnit(bodyH);
  let x = 0, y = 0;
  for (const row of Object.values(PIXEL_WALK_BASE)) {
    for (const [dx, dy] of row) {
      x = Math.max(x, Math.abs(dx) * unit);
      y = Math.max(y, Math.abs(dy) * unit);
    }
  }
  return { x, y };
}

/** Extra canvas so a step does not clip the head or the foot. Idle passes none of this. */
export function walkCanvasExtra(bodyH: number, bodyW: number): { x: number; top: number } {
  const amp = walkAmplitudes(bodyH, bodyW);
  const px = pixelWalkPeak(bodyH);
  return {
    x: Math.ceil(Math.max(amp.outward, px.x) + 2),
    top: Math.ceil(Math.max(amp.lift, px.y) + 2),
  };
}
