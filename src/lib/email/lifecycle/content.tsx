// =============================================================================
// Lifecycle emails — subject, preview, template props and plain text
// =============================================================================
// Pure: everything comes from the user snapshot + the decision, so the admin
// preview and the tests render exactly what the cron would send. Copy rules:
// only features SpriteLab really has, real prices from the config, no fake
// urgency, no emoji, one CTA.
// =============================================================================

import * as React from "react";
import { render } from "@react-email/render";
import { ANIMATION_FRAME_OPTIONS, ROTATIONS, animationPresetsFor, supportsRotation } from "@/config/animations";
import { buildToolHref } from "@/lib/workspace/session";
import { BringToLifeEmail } from "../templates/lifecycle/BringToLifeEmail";
import { UnfinishedEmail } from "../templates/lifecycle/UnfinishedEmail";
import { UnusedCreditsEmail, type CreditIdea } from "../templates/lifecycle/UnusedCreditsEmail";
import { WinbackEmail } from "../templates/lifecycle/WinbackEmail";
import { InspirationEmail, type InspirationItem } from "../templates/lifecycle/InspirationEmail";
import { SITE, type HeroImage } from "../templates/lifecycle/LifecycleLayout";
import { postalAddress } from "../flags";
import type { SequenceId, UserSnapshot, WorkItem } from "./rules";

/** Standard-quality sprite (CREDIT_COSTS.normal in src/lib/services/generation.ts). */
export const SPRITE_CREDITS = 1;
export const ANIMATION_CREDITS = ANIMATION_FRAME_OPTIONS[0].credits;
export const ROTATE4_CREDITS = ROTATIONS.find((r) => r.id === "rotate4")?.credits ?? 6;

export interface InspirationPick {
  items: InspirationItem[];
  /** Full (cleaned) prompt of the top pick. */
  tryPrompt: string;
  /** All picks are from the last 7 days ("this week"); otherwise the copy says "recently". */
  thisWeek: boolean;
  /**
   * "community": public works by users. "showcase": our curated examples from
   * /public/showcase, used when there are too few public works — the copy then
   * says "examples", never "from the community".
   */
  source: "community" | "showcase";
}

export interface LifecycleMessage {
  sequence: SequenceId;
  subject: string;
  preview: string;
  ctaUrl: string;
  element: React.ReactElement;
  text: string;
}

export interface BuildInput {
  sequence: SequenceId;
  user: Pick<UserSnapshot, "name" | "credits" | "latestSprite">;
  item: WorkItem | null;
  inspiration: InspirationPick | null;
  unsubscribeUrl: string;
}

// -----------------------------------------------------------------------------
// Small text helpers
// -----------------------------------------------------------------------------

export function firstName(name: string | null | undefined): string | undefined {
  const first = name?.trim().split(/\s+/)[0];
  if (!first || first.length > 24 || /[@<>]|https?:|www\./i.test(first)) return undefined;
  return first;
}

/** Prompt → safe one-liner (no links, no markup), at most `max` chars. */
export function cleanPrompt(prompt: string | null | undefined, max = 70): string | undefined {
  const text = (prompt ?? "").replace(/^(\[[^\]]*\]\s*)+/, "").replace(/\s+/g, " ").trim();
  if (text.length < 3 || /https?:|www\.|<|>/i.test(text)) return undefined;
  return text.length > max ? `${text.slice(0, max - 1).replace(/\s+\S*$/, "")}…` : text;
}

/** "armored knight with a fire sword, pixel art" → "armored knight". */
export function shortName(prompt: string | null | undefined, fallback = "sprite"): string {
  const text = cleanPrompt(prompt, 200);
  if (!text) return fallback;
  const head = text.split(/,|\.|;|:|\(| with | holding | wearing | in a | in the | on a | for a /i)[0].trim();
  const words = head.replace(/^(a|an|the)\s+/i, "").split(/\s+/).slice(0, 4).join(" ");
  if (words.length < 2 || words.length > 28) return fallback;
  return words.toLowerCase();
}

export function isPixelStyle(styleId: string | null | undefined): boolean {
  return (styleId ?? "").toUpperCase().includes("PIXEL");
}

export function withUtm(path: string, sequence: SequenceId): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${SITE}${path}${sep}utm_source=email&utm_medium=email&utm_campaign=lifecycle&utm_content=${sequence}`;
}

const credits = (n: number) => `${n} credit${n === 1 ? "" : "s"}`;

function hero(item: WorkItem, caption?: string): HeroImage {
  return {
    imageUrl: item.imageUrl ?? `${SITE}/showcase/knight.png`,
    alt: cleanPrompt(item.prompt, 80) ?? "Your sprite",
    pixel: isPixelStyle(item.styleId),
    wide: item.kind === "animation",
    caption,
  };
}

function footerText(reason: string, unsubscribeUrl: string): string {
  const address = postalAddress();
  return ["--", reason, `Unsubscribe: ${unsubscribeUrl}`, `Email settings: ${SITE}/settings`, ...(address ? [address] : [])].join("\n");
}

// -----------------------------------------------------------------------------
// Ideas for the unused-credits email, tied to what they make
// -----------------------------------------------------------------------------

export function creditIdeas(categoryId: string | null | undefined, spriteName: string | null, balance: number): CreditIdea[] {
  const cat = (categoryId ?? "").toUpperCase();
  const anim = { cost: `from ${credits(ANIMATION_CREDITS)}`, min: ANIMATION_CREDITS };
  const one = { cost: `${credits(SPRITE_CREDITS)} each`, min: SPRITE_CREDITS };
  type Idea = CreditIdea & { min: number };
  let ideas: Idea[];
  if (!spriteName) {
    ideas = [
      { title: "Your first character", detail: "Describe a hero or a monster; it comes out on a transparent background, ready for your engine.", ...one },
      { title: "Then make it move", detail: "Idle, walk or attack, as a sprite sheet and a GIF.", ...anim },
      { title: "A matching item set", detail: "A sword, a potion and a key in the same style.", ...one },
    ];
  } else if (cat === "CHARACTERS" || cat === "CREATURES") {
    ideas = [
      { title: `Animate your ${spriteName}`, detail: "Walk, attack, cast or a move you describe. You get a sheet, a GIF and an engine pack.", ...anim },
      { title: "4 directions", detail: "Front, right, back and left views of the same character for a top-down game.", cost: credits(ROTATE4_CREDITS), min: ROTATE4_CREDITS },
      { title: "Someone to fight", detail: "A rival or an enemy in the same style, to fill out your cast.", ...one },
    ];
  } else if (["WEAPONS", "ARMOR", "CONSUMABLES", "RESOURCES", "QUEST_ITEMS"].includes(cat)) {
    ideas = [
      { title: "Finish the set", detail: `Two or three more items next to your ${spriteName}, so the inventory looks like one game.`, ...one },
      { title: "Make it a pickup", detail: "Float, spin or glow loops for loot drops.", ...anim },
      { title: "A hero to carry it", detail: "A character sprite in the same style.", ...one },
    ];
  } else if (["ENVIRONMENT", "ISOMETRIC", "TILESETS"].includes(cat)) {
    ideas = [
      { title: "Props in the same style", detail: "Barrels, crates, a torch: small pieces that make a level feel lived in.", ...one },
      { title: "Bring the scene to life", detail: "Ambient loops where flames flicker, water ripples and leaves sway.", ...anim },
      { title: "A seamless tile", detail: "A floor or wall tile that repeats without seams.", ...one },
    ];
  } else {
    ideas = [
      { title: "Animate it", detail: "A looping or one-shot effect as a sprite sheet and GIF.", ...anim },
      { title: "A matching set", detail: `A few more pieces next to your ${spriteName}, in the same style.`, ...one },
      { title: "A character to use it", detail: "A hero or a monster in the same style.", ...one },
    ];
  }
  // Only what their balance actually pays for; top up with 1-credit ideas
  const affordable = ideas.filter((i) => i.min <= balance);
  const extras: Idea[] = [
    { title: "Try another style", detail: "The same idea in a different art style, side by side.", ...one },
    { title: "A matching item set", detail: "A sword, a potion and a key in the same style.", ...one },
    { title: "Your next character", detail: "A hero, a villain or a pet for your game.", ...one },
  ];
  for (const e of extras) {
    if (affordable.length >= 3) break;
    if (!affordable.some((i) => i.title === e.title)) affordable.push(e);
  }
  return affordable.slice(0, 3).map(({ title, detail, cost }) => ({ title, detail, cost }));
}

const WINBACK_NEWS = [
  { title: "Animate any sprite", text: "Idle, walk, attack or a move you describe. You get a sprite sheet, a GIF and an engine pack for Godot, Unity and GameMaker." },
  { title: "4 and 8 directions", text: "Front, side and back views of a character, or a 4-direction walk sheet for top-down games." },
  { title: "Projects that build your asset pack", text: "Sprites sort themselves into folders per game; download the whole pack as a .zip." },
];

// -----------------------------------------------------------------------------
// Builders
// -----------------------------------------------------------------------------

export function buildLifecycleMessage(input: BuildInput): LifecycleMessage {
  const { sequence, user, item, unsubscribeUrl } = input;
  const name = firstName(user.name);
  const hi = name ? `Hi ${name},` : "Hi,";

  switch (sequence) {
    case "bring_to_life": {
      if (!item?.imageUrl) throw new Error("bring_to_life needs a sprite with an image");
      const spriteName = shortName(item.prompt);
      const ctaUrl = withUtm(buildToolHref("animate", { id: item.id }), sequence);
      const motions = animationPresetsFor(item.categoryId).slice(0, 4).map((p) => p.label);
      const subject = `Your ${spriteName} is ready to move`;
      const preview = "Pick a motion and get a sprite sheet, a GIF and an engine pack for your game.";
      const reason = "You're getting this because you made a sprite on SpriteLab this week.";
      const text = [
        hi,
        "",
        `Your ${spriteName} can move. Open it in Animate, pick a motion (${motions.join(", ")}) and you get a sprite sheet, a GIF and an engine pack for Godot, Unity or GameMaker.`,
        `A 4-frame animation costs ${ANIMATION_CREDITS} credits. You have ${user.credits}.`,
        "",
        `Animate my sprite: ${ctaUrl}`,
        "",
        footerText(reason, unsubscribeUrl),
      ].join("\n");
      return {
        sequence, subject, preview, ctaUrl, text,
        element: (
          <BringToLifeEmail
            preview={preview} reason={reason} unsubscribeUrl={unsubscribeUrl}
            userName={name} spriteName={spriteName} sprite={hero(item, cleanPrompt(item.prompt, 60))}
            motions={motions} credits={user.credits} animationCredits={ANIMATION_CREDITS} animateUrl={ctaUrl}
          />
        ),
      };
    }

    case "unfinished": {
      if (!item?.imageUrl) throw new Error("unfinished needs an item with an image");
      const itemName = shortName(item.prompt);
      const madeOn = item.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
      let subject: string, headline: string, nextStep: string, ctaLabel: string, path: string;
      if (item.kind === "animation") {
        const motion = (item.motionLabel ?? "animation").toLowerCase();
        subject = `Your ${motion} animation is where you left it`;
        headline = `Your ${itemName}'s ${motion} animation is still here.`;
        nextStep = "Download the engine pack (Godot SpriteFrames, Unity frames, a GameMaker strip) or give it another move.";
        ctaLabel = "Open my animation";
        path = buildToolHref("animate", { id: item.sourceSpriteId ?? null, result: item.id });
      } else if (item.kind === "edit") {
        subject = "Your edit is where you left it";
        headline = `Your edited ${itemName} is still here.`;
        nextStep = "Keep editing it, or take it to Animate and make it move.";
        ctaLabel = "Open my edit";
        path = buildToolHref("edit", { result: item.id });
      } else {
        subject = `Your ${itemName} is where you left it`;
        headline = `Your ${itemName} is still here.`;
        nextStep = supportsRotation(item.categoryId)
          ? "Next step: animate it, or turn it into 4 directions for a top-down game."
          : "Next step: animate it, or make a few more in the same style.";
        ctaLabel = "Open my sprite";
        path = buildToolHref("create", { result: item.id });
      }
      const ctaUrl = withUtm(path, sequence);
      const preview = "Saved in your history. One click opens it again.";
      const reason = "You're getting this because you were working on this in SpriteLab a few days ago.";
      const text = [hi, "", headline, `Made on ${madeOn}. ${nextStep}`, "", `${ctaLabel}: ${ctaUrl}`, "", footerText(reason, unsubscribeUrl)].join("\n");
      return {
        sequence, subject, preview, ctaUrl, text,
        element: (
          <UnfinishedEmail
            preview={preview} reason={reason} unsubscribeUrl={unsubscribeUrl} userName={name}
            headline={headline} item={hero(item, `${cleanPrompt(item.prompt, 50) ?? "Your sprite"} · ${madeOn}`)}
            nextStep={nextStep} ctaLabel={ctaLabel} ctaUrl={ctaUrl}
          />
        ),
      };
    }

    case "unused_credits": {
      const sprite = item?.imageUrl ? item : null;
      const ideas = creditIdeas(sprite?.categoryId, sprite ? shortName(sprite.prompt) : null, user.credits);
      // Figures: the first idea is animating it; everything else starts in Create
      const animateFirst = sprite && supportsRotation(sprite.categoryId);
      const ctaUrl = withUtm(animateFirst ? buildToolHref("animate", { id: sprite.id }) : "/generate", sequence);
      const subject = `You still have ${credits(user.credits)}`;
      const preview = "Three things you could make with them, based on what you've been working on.";
      const reason = "You're getting this because your SpriteLab account still has credits.";
      const text = [
        hi, "",
        `You still have ${credits(user.credits)} on SpriteLab. Three ideas:`,
        ...ideas.map((i, n) => `${n + 1}. ${i.title} (${i.cost}): ${i.detail}`),
        "", `Use my credits: ${ctaUrl}`, "", footerText(reason, unsubscribeUrl),
      ].join("\n");
      return {
        sequence, subject, preview, ctaUrl, text,
        element: (
          <UnusedCreditsEmail
            preview={preview} reason={reason} unsubscribeUrl={unsubscribeUrl} userName={name}
            credits={user.credits} sprite={sprite ? hero(sprite, cleanPrompt(sprite.prompt, 60)) : undefined}
            ideas={ideas} ctaUrl={ctaUrl}
          />
        ),
      };
    }

    case "winback": {
      const sprite = item?.imageUrl ? item : null;
      const heroImg: HeroImage = sprite
        ? hero(sprite, cleanPrompt(sprite.prompt, 60))
        : { imageUrl: `${SITE}/showcase/anim-knight-idle.gif`, alt: "Animated pixel-art knight made with SpriteLab", pixel: true, caption: "Made with SpriteLab · Animate → Idle" };
      const headline = sprite
        ? `${name ? `Hi ${name}, your` : "Your"} ${shortName(sprite.prompt)} is still here.`
        : `${name ? `Hi ${name}, a` : "A"} few things changed on SpriteLab.`;
      const ctaUrl = withUtm(sprite ? buildToolHref("animate", { id: sprite.id }) : "/generate", sequence);
      const subject = "A few things changed on SpriteLab";
      const preview = "No offer, no rush: what SpriteLab can do now, in case you want another go.";
      const reason = "You're getting this because you have a SpriteLab account. We send this note once per absence, not every week.";
      const text = [
        hi, "", headline, "Here's what SpriteLab can do now:",
        ...WINBACK_NEWS.map((n) => `- ${n.title}: ${n.text}`),
        ...(user.credits > 0 ? ["", `You still have ${credits(user.credits)} on your account.`] : []),
        "", `Open SpriteLab: ${ctaUrl}`, "", footerText(reason, unsubscribeUrl),
      ].join("\n");
      return {
        sequence, subject, preview, ctaUrl, text,
        element: (
          <WinbackEmail
            preview={preview} reason={reason} unsubscribeUrl={unsubscribeUrl}
            headline={headline} hero={heroImg} credits={user.credits} news={WINBACK_NEWS} ctaUrl={ctaUrl}
          />
        ),
      };
    }

    case "inspiration": {
      const pick = input.inspiration;
      if (!pick || pick.items.length < 3) throw new Error("inspiration needs at least 3 items");
      const count = pick.items.length >= 6 ? 6 : 3;
      const ctaUrl = withUtm(`/generate?prompt=${encodeURIComponent(pick.tryPrompt)}`, sequence);
      const communityUrl = withUtm("/community", sequence);
      const when = pick.thisWeek ? "this week" : "recently";
      const examples = pick.source === "showcase";
      // Curated examples are never presented as community work
      const subject = examples ? `${count} example sprites made with SpriteLab` : `${count} sprites from the community ${when}`;
      const preview = examples
        ? "Example sprites made with SpriteLab, plus a prompt to try yourself."
        : "Made and shared by other SpriteLab users, plus a prompt to try yourself.";
      const title = examples ? "Examples made with SpriteLab" : `Made on SpriteLab ${when}`;
      const eyebrow = examples ? "Examples" : "From the community";
      const intro = examples
        ? `${count} example sprites made with SpriteLab, and one prompt worth trying yourself.`
        : `${count} sprites other people shared to the community gallery, and one prompt worth trying yourself.`;
      const reason = "You're getting this because you've used SpriteLab recently. At most one of these a week, and only when we haven't emailed you otherwise.";
      const text = [
        hi, "", examples ? `${count} example sprites made with SpriteLab:` : `${count} sprites other people shared to the SpriteLab community ${when}:`,
        ...pick.items.slice(0, count).map((i) => `- ${i.caption}`),
        "", `Try this prompt: "${pick.tryPrompt}"`, ctaUrl, "", `See more on Community: ${communityUrl}`, "", footerText(reason, unsubscribeUrl),
      ].join("\n");
      return {
        sequence, subject, preview, ctaUrl, text,
        element: (
          <InspirationEmail
            preview={preview} reason={reason} unsubscribeUrl={unsubscribeUrl}
            title={title} eyebrow={eyebrow} intro={intro} items={pick.items} tryPrompt={pick.tryPrompt} tryUrl={ctaUrl} communityUrl={communityUrl}
          />
        ),
      };
    }
  }
}

export async function renderLifecycleHtml(msg: LifecycleMessage): Promise<string> {
  return render(msg.element);
}
