// Client-safe (no Prisma import) so both the landing page and the
// generate workspace can use it.
import type { FeaturedGeneration } from "@/lib/featured-generations";

/**
 * Curated showcase made with the current sprite pipeline (FLUX.2 klein /
 * GPT Image Mini + deterministic post-processing). Static files in
 * /public/showcase — pixel sprites are stored at native resolution and
 * rendered with nearest-neighbour scaling. Used for the landing page so first
 * impressions reflect today's quality (older community generations predate
 * the pipeline) and the page doesn't depend on the database.
 */
export const SHOWCASE: FeaturedGeneration[] = [
  { id: "sc-knight", imageUrl: "/showcase/knight.png", prompt: "a knight with a sword and shield", categoryId: "CHARACTERS", styleId: "PIXEL_ART_16", likes: 0, style: "Pixel Art", category: "Characters" },
  { id: "sc-fire-sword", imageUrl: "/showcase/fire-sword.png", prompt: "a flaming fire sword", categoryId: "WEAPONS", styleId: "PIXEL_ART_16", likes: 0, style: "Pixel Art", category: "Weapons" },
  { id: "sc-fox-mage", imageUrl: "/showcase/fox-mage.png", prompt: "a cute fox mage", categoryId: "CHARACTERS", styleId: "CHIBI_CUTE", likes: 0, style: "Chibi Cute", category: "Characters" },
  { id: "sc-goblin", imageUrl: "/showcase/goblin-archer.png", prompt: "a goblin archer with a bow, side view", categoryId: "CHARACTERS", styleId: "PIXEL_ART_16", likes: 0, style: "Pixel Art", category: "Characters" },
  { id: "sc-potion", imageUrl: "/showcase/health-potion.png", prompt: "a red health potion bottle", categoryId: "CONSUMABLES", styleId: "PIXEL_ART_16", likes: 0, style: "Pixel Art", category: "Items" },
  { id: "sc-slime", imageUrl: "/showcase/slime.png", prompt: "a green slime monster", categoryId: "CREATURES", styleId: "PIXEL_ART_16", likes: 0, style: "Pixel Art", category: "Creatures" },
  { id: "sc-ice-staff", imageUrl: "/showcase/ice-staff.png", prompt: "an ice crystal staff", categoryId: "WEAPONS", styleId: "PIXEL_ART_32", likes: 0, style: "Pixel Art HD", category: "Weapons" },
  { id: "sc-armored-knight", imageUrl: "/showcase/armored-knight.png", prompt: "an armored knight with a longsword", categoryId: "CHARACTERS", styleId: "PIXEL_ART_16", likes: 0, style: "Pixel Art", category: "Characters" },
  { id: "sc-flame-blade", imageUrl: "/showcase/flame-blade.png", prompt: "a flame blade with a golden hilt", categoryId: "WEAPONS", styleId: "PIXEL_ART_16", likes: 0, style: "Pixel Art", category: "Weapons" },
];

export function isPixelShowcase(item: FeaturedGeneration): boolean {
  return item.styleId.includes("PIXEL");
}
