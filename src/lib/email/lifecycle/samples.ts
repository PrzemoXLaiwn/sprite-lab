// Realistic sample data for the admin preview and the template tests. The
// images are real SpriteLab outputs from /public/showcase.

import { buildLifecycleMessage, type InspirationPick, type LifecycleMessage } from "./content";
import { SEQUENCE_PRIORITY, type SequenceId, type WorkItem } from "./rules";

const SITE = "https://www.sprite-lab.com";
const NOW = new Date("2026-10-13T11:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const knight: WorkItem = {
  id: "cmsamplesprite01",
  kind: "sprite",
  imageUrl: `${SITE}/showcase/armored-knight.png`,
  prompt: "armored knight with a fire sword, side view",
  categoryId: "CHARACTERS",
  styleId: "PIXEL_ART_16",
  createdAt: daysAgo(1),
};

const walk: WorkItem = {
  id: "cmsampleanim01",
  kind: "animation",
  imageUrl: `${SITE}/showcase/rotate-knight.png`,
  prompt: "armored knight with a fire sword, side view",
  categoryId: "CHARACTERS",
  styleId: "PIXEL_ART_16",
  createdAt: daysAgo(3),
  motionLabel: "walk",
  sourceSpriteId: knight.id,
};

const potion: WorkItem = {
  id: "cmsamplesprite02",
  kind: "sprite",
  imageUrl: `${SITE}/showcase/health-potion.png`,
  prompt: "red health potion in a round glass bottle",
  categoryId: "CONSUMABLES",
  styleId: "PIXEL_ART_16",
  createdAt: daysAgo(9),
};

export const SAMPLE_INSPIRATION: InspirationPick = {
  items: [
    { id: "c1", imageUrl: `${SITE}/showcase/fox-mage.png`, caption: "fox mage", pixel: true },
    { id: "c2", imageUrl: `${SITE}/showcase/goblin-archer.png`, caption: "goblin archer", pixel: true },
    { id: "c3", imageUrl: `${SITE}/showcase/ice-staff.png`, caption: "ice staff", pixel: true },
    { id: "c4", imageUrl: `${SITE}/showcase/slime.png`, caption: "green slime", pixel: true },
    { id: "c5", imageUrl: `${SITE}/showcase/flame-blade.png`, caption: "flame blade", pixel: true },
    { id: "c6", imageUrl: `${SITE}/showcase/tile-stone-wall.png`, caption: "stone wall tile", pixel: true },
  ],
  tryPrompt: "fox mage in a blue cloak casting a frost spell",
  thisWeek: true,
};

export const SAMPLE_UNSUBSCRIBE_URL = `${SITE}/api/email/unsubscribe?u=sample-user&t=sample-token-not-valid-0000000000`;

const user = (credits: number, latestSprite: WorkItem | null) => ({ name: "Alex Rivera", credits, latestSprite });

/** One sample per sequence, as the cron would build it. */
export function sampleLifecycleMessages(): Record<SequenceId, LifecycleMessage> {
  const input: Record<SequenceId, Parameters<typeof buildLifecycleMessage>[0]> = {
    bring_to_life: { sequence: "bring_to_life", user: user(9, knight), item: knight, inspiration: null, unsubscribeUrl: SAMPLE_UNSUBSCRIBE_URL },
    unfinished: { sequence: "unfinished", user: user(3, knight), item: walk, inspiration: null, unsubscribeUrl: SAMPLE_UNSUBSCRIBE_URL },
    unused_credits: { sequence: "unused_credits", user: user(8, potion), item: potion, inspiration: null, unsubscribeUrl: SAMPLE_UNSUBSCRIBE_URL },
    winback: { sequence: "winback", user: user(10, knight), item: knight, inspiration: null, unsubscribeUrl: SAMPLE_UNSUBSCRIBE_URL },
    inspiration: { sequence: "inspiration", user: user(4, null), item: null, inspiration: SAMPLE_INSPIRATION, unsubscribeUrl: SAMPLE_UNSUBSCRIBE_URL },
  };
  return Object.fromEntries(SEQUENCE_PRIORITY.map((s) => [s, buildLifecycleMessage(input[s])])) as Record<SequenceId, LifecycleMessage>;
}
