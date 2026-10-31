// What the subscription checkout summary lists. Numbers come from the same
// credit costs the animate API charges. This does not change those costs.

import { animationCredits, ROTATIONS } from "@/config/animations";

export function subscriptionCheckoutIncludes(credits: number): string[] {
  const fourFrame = animationCredits(4, false);
  const walk = ROTATIONS.find((rotation) => rotation.id === "walk4dir")?.credits ?? null;
  const lines = [
    "Commercial licence — sell a game that uses sprites made on this plan",
    `${credits.toLocaleString("en-GB")} credits every month`,
    `About ${Math.floor(credits / fourFrame).toLocaleString("en-GB")} four-frame animations, or ${credits.toLocaleString("en-GB")} standard sprites`,
  ];
  if (walk && walk > 0) {
    lines.push(`About ${Math.floor(credits / walk).toLocaleString("en-GB")} four-direction walk cycles`);
  }
  lines.push("4- and 8-direction turnarounds, transparent PNG sprite sheets");
  lines.push("Cancel anytime");
  return lines;
}
