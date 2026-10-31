// Prompt text variants for the offline benchmark. Not imported by the
// generation service. Production still calls buildSpritePrompt() directly.

import { buildSpritePrompt, type SpritePromptInput } from "@/config/prompts/sprite-prompt";

export interface PromptVariant {
  id: string;
  note: string;
  build(input: SpritePromptInput): string;
}

const PALETTE_LINE = "Use a small set of flat colours that could be reused on every frame of a sprite sheet: no extra near-duplicate shades and no smooth gradients.";
const SCALE_LINE = "Draw the figure at the same height every time: the body, not counting a weapon, fills about half the image.";

export const PROMPT_VARIANTS: PromptVariant[] = [
  {
    id: "production",
    note: "buildSpritePrompt as the live sprite route uses it",
    build: (input) => buildSpritePrompt(input),
  },
  {
    id: "palette-and-scale",
    note: "one extra sentence for shared colours and one for a stable body height. Post-processing still has to enforce both",
    build: (input) => `${buildSpritePrompt(input)} ${PALETTE_LINE} ${SCALE_LINE}`,
  },
];

export interface PromptDiff {
  id: string;
  chars: number;
  words: number;
  addsPaletteLine: boolean;
  addsScaleLine: boolean;
}

export function diffPrompts(input: SpritePromptInput): PromptDiff[] {
  return PROMPT_VARIANTS.map((v) => {
    const text = v.build(input);
    return {
      id: v.id,
      chars: text.length,
      words: text.split(/\s+/).filter(Boolean).length,
      addsPaletteLine: text.includes(PALETTE_LINE),
      addsScaleLine: text.includes(SCALE_LINE),
    };
  });
}
