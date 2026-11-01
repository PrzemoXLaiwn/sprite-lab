// =============================================================================
// ST Packs — prompt templates for the three model passes
// =============================================================================
import { ST_EXPRESSIVE_ACTING, ST_EXPRESSION_FRAGMENTS, motionNoteFor, type StExpressionLabel } from "@/config/st-expressions";
import type { StFraming, StMotionMode } from "@/config/st-packs";
import { SFW_PREFIX } from "./sfw";

/** Required on every expressive clip. Exact wording, so a test can lock it. */
export const EXPRESSIVE_MOTION_RULE = "natural, motivated, acting performance, no repetitive loops";

const FRAMING_TEXT: Record<StFraming, string> = {
  waist: "waist-up portrait, head top about one tenth below the top edge, hands visible if natural",
  bust: "bust portrait from the chest up, the face large and clearly visible",
};

function notes(styleNotes?: string | null): string {
  const s = styleNotes?.trim();
  return s ? `, ${s.slice(0, 200)}` : "";
}

/** Base candidate from a text description (no reference image). */
export function basePrompt(description: string, framing: StFraming, styleNotes?: string | null): string {
  return `${SFW_PREFIX}. Single character: ${description.trim().slice(0, 600)}. ${FRAMING_TEXT[framing]}, centred, facing the viewer, neutral relaxed pose, arms relaxed, perfectly flat solid light-grey background, no gradient, no vignette, no cast shadow, no studio wall, no props, no text, full face clearly visible, consistent soft lighting${notes(styleNotes)}. SFW, adult character.`;
}

/** Identity-locked expression edit of the base still. Expressive waist-up leaves the hands in frame. */
export function editPrompt(label: StExpressionLabel, styleNotes?: string | null, opts?: { motion?: StMotionMode; framing?: StFraming; keyColour?: string | null }): string {
  const expressive = opts?.motion === "expressive";
  const key = opts?.keyColour
    ? ` Replace the whole background, including every gap around the arms and torso, with one perfectly flat colour ${opts.keyColour}. No grey, no white, no gradient, no shadow.`
    : "";
  const hands = expressive && opts?.framing !== "bust"
    ? " Waist-up framing with room for the hands: both hands and forearms are inside the frame, elbows are not cropped, and there is empty space on both sides of the torso so a later gesture is not cut off. Arms rest at the sides. You may shift the crop slightly so the hands fit."
    : "";
  const lock = expressive
    ? "Keep the same character identity, face shape, eye colour, hair style and colour, outfit, lighting, art style and plain background."
    : "Keep everything else pixel-identical: same character identity, face shape, eye colour, hair style and colour, outfit, body pose, hands, camera framing, crop, canvas size, lighting, art style and plain background.";
  const still = expressive ? "" : " Do not move or resize the character.";
  return `${SFW_PREFIX}. Edit this exact image. Change ONLY the facial expression to: ${ST_EXPRESSION_FRAGMENTS[label]}. ${lock}${key || " Keep the background one flat colour: do not add a gradient, vignette, studio wall or cast shadow."}${still}${hands} Do not add objects, text, tears effects beyond what is described. ${expressive ? "The rest pose must leave the hands free to move later." : "Subtle, natural,"} SFW${notes(styleNotes)}.`;
}

/**
 * Idle loop for the video model (LTX has no negative prompt; the avoid list is
 * folded into the text). The head stays put: a sway that never returns is the
 * seam/pop we measured on joy (head_x_range 85 px). Breathing and a little
 * hair only. One blink at most — a repeated blink reads as a machine.
 */
export function videoPrompt(label: StExpressionLabel, motion: StMotionMode = "subtle", keyColour?: string | null): string {
  const ground = keyColour
    ? `The background is exactly flat ${keyColour} in every frame, including any gap that opens between an arm and the torso. Never turn that gap white, grey, or the colour of the clothes.`
    : "The background stays one flat colour.";
  if (motion === "expressive") {
    return `${SFW_PREFIX}. ${EXPRESSIVE_MOTION_RULE}. No robotic blinking, no blink on a beat, no mechanical repetition. One slow gesture: ease in, hold it for about one and a half seconds, ease out, then the body is back on the opening pose so the last frame matches the first. Hands stay simple and readable. Do not touch the face, mouth, or hair. Keep the gesture away from the face; a hand may rest on the chest but must not melt into the shirt. Static locked-off camera: no zoom, no pan, no tilt, no cuts. The character stays the same size. ${ground} Performance: ${ST_EXPRESSIVE_ACTING[label]}. No talking, no new objects, no text. Avoid: camera movement, robotic blink loop, repeated gesture, melted fingers, extra fingers, hands fused with the face or clothes, morphing, extra limbs, outfit change, white background, grey background, watermark.`;
  }
  const subtleGround = keyColour
    ? `The background is exactly flat ${keyColour} in every frame. Never turn it white or grey.`
    : "Background stays plain and unchanged.";
  return `${SFW_PREFIX}. Subtle natural idle that starts and ends on the same pose, a seamless loop that does not look mechanical. Static locked-off camera: no zoom, no pan, no tilt, no camera movement, no cuts. The character stays centred at the same size the whole clip. The head stays still and centred: no head sway, no nod, no tilt, no lean, no bob. Only this motion: gentle breathing in the chest and shoulders, and hair shifting as if in a light breeze. At most one slow blink in the entire clip; no blink is better than a blink. Never a rhythmic or robotic blink. No torso sway, no eye darts, no jaw cycle, no gesture that repeats on a beat. Keep the ${label} expression readable and held: ${motionNoteFor(label)}. The last frame is the same pose as the first. ${subtleGround} No talking, no big gestures, no new objects, no text. Avoid: camera movement, zoom, dolly, pan, shake, head sway, morphing, face change, outfit change, extra limbs, blinking loop, robotic motion, repeated laughing, mouth flapping, text, watermark.`;
}

/** Moderation retry: the same request framed explicitly as harmless character art. */
export const FAMILY_FRIENDLY_PREFIX = "Harmless, family-friendly character portrait for a story app, fully clothed, no violence, no gore.\n";
