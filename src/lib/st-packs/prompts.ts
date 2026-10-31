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
  return `${SFW_PREFIX}. Single character: ${description.trim().slice(0, 600)}. ${FRAMING_TEXT[framing]}, centred, facing the viewer, neutral relaxed pose, arms relaxed, plain flat light-grey background, no props, no text, full face clearly visible, consistent soft lighting${notes(styleNotes)}. SFW, adult character.`;
}

/** Identity-locked expression edit of the base still. */
export function editPrompt(label: StExpressionLabel, styleNotes?: string | null): string {
  return `${SFW_PREFIX}. Edit this exact image. Change ONLY the facial expression to: ${ST_EXPRESSION_FRAGMENTS[label]}. Keep everything else pixel-identical: same character identity, face shape, eye colour, hair style and colour, outfit, body pose, hands, camera framing, crop, canvas size, lighting, art style and plain background. Do not move or resize the character. Do not add objects, text, tears effects beyond what is described, or background changes. Subtle, natural, SFW${notes(styleNotes)}.`;
}

/** Idle loop for the video model (LTX has no negative prompt; the avoid list is folded into the text). */
export function videoPrompt(label: StExpressionLabel): string {
  return `${SFW_PREFIX}. Subtle idle animation, seamless loop. Static locked-off camera: no zoom, no pan, no tilt, no camera movement, no cuts. The character stays centred in exactly the same position and size for the whole clip. Gentle breathing, natural blinking, slight hair sway, very small head motion. Keeps the ${label} expression the whole time: ${motionNoteFor(label)}. Background stays plain and unchanged. No talking, no big gestures, no new objects, no text. Avoid: camera movement, zoom, dolly, pan, shake, morphing, face change, outfit change, extra limbs, repeated laughing, mouth flapping, text, watermark.`;
}

/** Moderation retry: the same request framed explicitly as harmless character art. */
export const FAMILY_FRIENDLY_PREFIX = "Harmless, family-friendly character portrait for a story app, fully clothed, no violence, no gore.\n";
