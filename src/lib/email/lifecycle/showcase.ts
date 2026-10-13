// =============================================================================
// Lifecycle emails — curated fallback for the inspiration email
// =============================================================================
// When fewer than 3 public community works qualify, the inspiration email
// shows real SpriteLab outputs from /public/showcase instead, labelled as
// examples (source: "showcase"), never as community work. Two sets of 6
// alternate by week so the same person doesn't get the same grid twice in a
// row. Captions and prompts describe the image; the prompt is a suggestion
// to try, not a claim about how the example was made.
// =============================================================================

import type { InspirationPick } from "./content";
import { DAY } from "./rules";

const SITE = "https://www.sprite-lab.com";

interface ShowcaseEntry {
  file: string;
  caption: string;
  prompt: string;
  pixel: boolean;
}

/** Two sets of 6 (entries 0–5 and 6–11), no near-duplicates within a set. */
export const SHOWCASE_POOL: readonly ShowcaseEntry[] = [
  { file: "goblin-archer.png", caption: "goblin archer", prompt: "green goblin archer with a bow", pixel: true },
  { file: "ice-staff.png", caption: "ice staff", prompt: "magic ice staff with crystal shards", pixel: true },
  { file: "slime.png", caption: "green slime", prompt: "cute green slime monster", pixel: true },
  { file: "flame-blade.png", caption: "flame blade", prompt: "sword with a burning blade", pixel: true },
  { file: "tile-stone-wall.png", caption: "stone wall tile", prompt: "mossy stone brick wall tile", pixel: true },
  { file: "fox-mage.png", caption: "fox mage", prompt: "fox mage in a purple wizard hat with a staff", pixel: false },
  { file: "armored-knight.png", caption: "armored knight", prompt: "armored knight with a sword and shield", pixel: true },
  { file: "health-potion.png", caption: "health potion", prompt: "red health potion in a round glass bottle", pixel: true },
  { file: "tile-grass.png", caption: "grass tile", prompt: "grass ground tile with small flowers", pixel: true },
  { file: "icon-1.png", caption: "lightning skill icon", prompt: "lightning skill icon in a gold frame", pixel: true },
  { file: "tile-water.png", caption: "water tile", prompt: "water tile with swirling waves", pixel: true },
  { file: "icon-2.png", caption: "fire skill icon", prompt: "fire skill icon in a gold frame", pixel: true },
];

/** Six curated examples for the week `now` falls in (alternating sets). */
export function showcaseInspiration(now: Date): InspirationPick {
  const week = Math.floor(now.getTime() / (7 * DAY));
  const sets = Math.floor(SHOWCASE_POOL.length / 6);
  const start = (week % sets) * 6;
  const picked = SHOWCASE_POOL.slice(start, start + 6);
  return {
    items: picked.map((e) => ({ id: `showcase-${e.file}`, imageUrl: `${SITE}/showcase/${e.file}`, caption: e.caption, pixel: e.pixel })),
    tryPrompt: picked[0].prompt,
    thisWeek: false,
    source: "showcase",
  };
}
