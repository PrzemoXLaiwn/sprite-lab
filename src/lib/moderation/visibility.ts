// What may be shown publicly (gallery, featured, profiles, inspiration emails):
// shared by its owner, the owner not banned, and nothing in the prompt from
// the content filter's unambiguous list. One definition so no list forgets it.

import type { Prisma } from "@prisma/client";
import { GALLERY_HIDDEN_SUBSTRINGS } from "./content-filter";

export function publicGenerationWhere(): Prisma.GenerationWhereInput {
  return {
    isPublic: true,
    user: { is: { isActive: true } },
    NOT: { OR: GALLERY_HIDDEN_SUBSTRINGS.map((s) => ({ prompt: { contains: s, mode: "insensitive" as const } })) },
  };
}
