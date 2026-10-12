// =============================================================================
// Rig keypoints — Claude finds the joints of a sprite (2D auto-rigging)
// =============================================================================
// The skeleton rig (src/lib/image/skeleton-rig.ts) animates the original
// sprite by rotating body parts around their joints. Here a vision model
// marks where those joints are. Points are in 0–1000 image coordinates;
// limbs are named by the side of the IMAGE they're on (a = left of the image,
// b = right), which avoids mirrored "character's left" mistakes.
// =============================================================================

import Anthropic from "@anthropic-ai/sdk";
import { trackClaude } from "@/lib/claude-usage";

const MODEL = "claude-opus-5-5";

export const JOINTS = [
  "head_top", "head", "neck", "chest", "pelvis",
  "shoulder_a", "elbow_a", "hand_a", "shoulder_b", "elbow_b", "hand_b",
  "hip_a", "knee_a", "foot_a", "hip_b", "knee_b", "foot_b",
  "tail_base", "tail_mid", "tail_tip",
] as const;
export type JointName = (typeof JOINTS)[number];

export interface RigPoints {
  body: "biped" | "quadruped" | "other";
  /** Joint → position in source-image pixels. Missing joints are absent. */
  points: Partial<Record<JointName, { x: number; y: number }>>;
  /** Held / worn rigid props (weapon, bow, shield, staff) — boxes in source-image pixels. */
  items: { x0: number; y0: number; x1: number; y1: number }[];
}

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["body", "points", "items"],
  properties: {
    body: { type: "string", enum: ["biped", "quadruped", "other"] },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["x0", "y0", "x1", "y1"],
        properties: { x0: { type: "integer" }, y0: { type: "integer" }, x1: { type: "integer" }, y1: { type: "integer" } },
      },
    },
    points: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "x", "y"],
        properties: {
          name: { type: "string", enum: [...JOINTS] },
          x: { type: "integer" },
          y: { type: "integer" },
        },
      },
    },
  },
};

const SYSTEM = `You rig 2D game sprites for skeletal animation. Look at the sprite and mark its joints precisely.
Coordinates: x and y from 0 to 1000 across the image (0,0 = top-left, 1000,1000 = bottom-right). Put each point exactly on the body part, at the joint's centre.
Limbs are named by which side of the IMAGE they are on: "_a" = the limb on the left side of the image, "_b" = the one on the right side.
- body: "biped" (stands on two legs: humans, orcs, lizardfolk, robots, skeletons), "quadruped" (four legs), "other" (slimes, ghosts, objects, robed figures without visible legs, snakes…).
- head_top: top of the head (not a hat tip). head: centre of the face/head. neck: base of the neck. chest: centre of the chest. pelvis: centre of the hips/belt.
- shoulder: where the arm joins the body. elbow: the bend. hand: centre of the hand/fist (where a held weapon is gripped).
- hip: top of each thigh. knee: the knee. foot: the ankle/top of the foot, just above where it touches the ground.
- tail_base / tail_mid / tail_tip only if there is a tail.
Only list joints you can actually see. For "other" bodies list what applies (head, chest, pelvis…).
- items: a tight bounding box (x0,y0 top-left, x1,y1 bottom-right, same 0–1000 scale) around each rigid prop the character holds or wears on an arm: sword, bow (including its string), staff, shield, axe, gun. Empty list if none.`;

/** Joints for one sprite image (PNG on white). Returns null if unavailable. */
export async function findRigPoints(image: Buffer, width: number, height: number): Promise<RigPoints | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  try {
    const anthropic = new Anthropic({ apiKey, timeout: 45_000, maxRetries: 1 });
    const params = {
      model: MODEL,
      max_tokens: 2000,
      system: SYSTEM,
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
      messages: [{
        role: "user" as const,
        content: [
          { type: "image" as const, source: { type: "base64" as const, media_type: "image/png" as const, data: image.toString("base64") } },
          { type: "text" as const, text: "Mark the joints of this sprite." },
        ],
      }],
    };
    const res = await anthropic.messages.create(params as unknown as Anthropic.MessageCreateParamsNonStreaming);
    trackClaude("rig", res);
    const text = res.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") return null;
    const parsed = JSON.parse(text.text) as { body?: string; points?: { name: string; x: number; y: number }[]; items?: { x0: number; y0: number; x1: number; y1: number }[] };
    const points: RigPoints["points"] = {};
    for (const p of parsed.points ?? []) {
      if (!(JOINTS as readonly string[]).includes(p.name)) continue;
      points[p.name as JointName] = { x: (Math.min(1000, Math.max(0, p.x)) / 1000) * width, y: (Math.min(1000, Math.max(0, p.y)) / 1000) * height };
    }
    const body = parsed.body === "biped" || parsed.body === "quadruped" ? parsed.body : "other";
    const sx = (v: number) => (Math.min(1000, Math.max(0, v)) / 1000) * width, sy = (v: number) => (Math.min(1000, Math.max(0, v)) / 1000) * height;
    const items = (parsed.items ?? []).map((b) => ({ x0: sx(Math.min(b.x0, b.x1)), y0: sy(Math.min(b.y0, b.y1)), x1: sx(Math.max(b.x0, b.x1)), y1: sy(Math.max(b.y0, b.y1)) }));
    return { body, points, items };
  } catch (err) {
    console.warn("[RigPoints] failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
