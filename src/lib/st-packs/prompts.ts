// =============================================================================
// ST Packs — prompt templates for the three model passes
// =============================================================================
import { ST_EXPRESSION_FRAGMENTS, motionNoteFor, type StExpressionLabel } from "@/config/st-expressions";
import type { StFraming } from "@/config/st-packs";
import { SFW_PREFIX } from "./sfw";

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

/** Identity-locked expression edit of the base still. */
export function editPrompt(label: StExpressionLabel, styleNotes?: string | null): string {
  return `${SFW_PREFIX}. Edit this exact image. Change ONLY the facial expression to: ${ST_EXPRESSION_FRAGMENTS[label]}. Keep everything else pixel-identical: same character identity, face shape, eye colour, hair style and colour, outfit, body pose, hands, camera framing, crop, canvas size, lighting, art style and plain background. Keep the background one flat colour: do not add a gradient, vignette, studio wall or cast shadow. Do not move or resize the character. Do not add objects, text, tears effects beyond what is described, or background changes. Subtle, natural, SFW${notes(styleNotes)}.`;
}

/** Idle loop for the video model (LTX has no negative prompt; the avoid list is folded into the text). */
export function videoPrompt(label: StExpressionLabel): string {
  return `${SFW_PREFIX}. Subtle natural idle, a seamless loop that does not look mechanical. Static locked-off camera: no zoom, no pan, no tilt, no camera movement, no cuts. The character stays centred at the same size the whole clip. Only this motion: gentle breathing in the chest and shoulders, a very small slow drift of the head, and hair shifting as if in a light breeze. At most one slow blink in the entire clip; no blink is better than a repeated blink. No nodding, no torso sway, no eye darts, no jaw cycle, no gesture that repeats on a beat. Keep the ${label} expression readable and held: ${motionNoteFor(label)}. Background stays plain and unchanged. No talking, no big gestures, no new objects, no text. Avoid: camera movement, zoom, dolly, pan, shake, morphing, face change, outfit change, extra limbs, blinking loop, robotic motion, repeated laughing, mouth flapping, text, watermark.`;
}

/** Moderation retry: the same request framed explicitly as harmless character art. */
export const FAMILY_FRIENDLY_PREFIX = "Harmless, family-friendly character portrait for a story app, fully clothed, no violence, no gore.\n";
