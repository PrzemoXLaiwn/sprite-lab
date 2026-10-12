// =============================================================================
// Which motion card to select when an animation is reopened from history
// =============================================================================
// The saved prompt only keeps the motion label ("[Animation: walk, 8f] …"),
// so the card is recovered from it: direction sets map to their rotation
// option, preset labels to the preset. Tailored ("ai-…") and custom motions
// can't be rebuilt from the label alone and keep the current selection.
// =============================================================================

import { animationPresetsFor, ROTATIONS } from "@/config/animations";
import type { ParsedAnimationPrompt } from "./history";

export function actionForAnimation(
  parsed: Pick<ParsedAnimationPrompt, "label" | "walkSet" | "directions">,
  categoryId: string | null | undefined
): string | null {
  if (parsed.walkSet) return ROTATIONS.find((r) => r.kind === "walk")?.id ?? null;
  if (parsed.directions) return ROTATIONS.find((r) => r.kind === "views" && r.directions === parsed.directions)?.id ?? null;
  const label = parsed.label.trim().toLowerCase();
  if (label === "custom") return "custom";
  const preset = animationPresetsFor(categoryId).find((p) => p.id === label || p.label.toLowerCase() === label);
  return preset?.id ?? null;
}
