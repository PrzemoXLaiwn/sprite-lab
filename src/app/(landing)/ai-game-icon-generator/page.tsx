import type { Metadata } from "next";
import { SeoLanding } from "@/components/landing/SeoLanding";

const URL = "https://www.sprite-lab.com/ai-game-icon-generator";

export const metadata: Metadata = {
  title: { absolute: "AI Game Icon Generator — Item, Skill & Status Icons | SpriteLab" },
  description:
    "Generate game icons with AI: inventory items, skills, spells, status effects and UI buttons. Pixel art or painted, transparent PNG, matching frames.",
  keywords: ["AI game icon generator", "game icon generator", "skill icon generator", "item icon generator", "RPG icons", "pixel art icons", "inventory icons"],
  openGraph: {
    title: "AI Game Icon Generator — SpriteLab",
    description: "Item, skill and status icons for inventories, hotbars and HUDs.",
    url: URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Game Icon Generator — Item, Skill & Status Icons | SpriteLab",
    description: "Generate game icons with AI: inventory items, skills, spells, status effects and UI buttons. Pixel art or painted, transparent PNG, matching frames.",
  },
  alternates: { canonical: URL },
};

export default function GameIconGeneratorPage() {
  return (
    <SeoLanding
      slug="ai-game-icon-generator"
      appName="SpriteLab AI Game Icon Generator"
      appDescription="Generate game UI icons from a text prompt — inventory item icons, skill and spell icons, status effect icons, buttons and frames — as transparent PNGs."
      heroLine="ai game icon generator"
      h1={
        <>
          Game icons
          <br />
          <span className="text-[#FF8A3D]">for every slot in your UI</span>
        </>
      }
      subtitle="Inventory items, skills, spells and status effects — framed, readable at thumbnail size and in the same style as the rest of your game."
      trust={["item · skill · status icons", "pixel or painted", "transparent png", "commercial use"]}
      floating={[
        { src: "/showcase/icon-1.png", alt: "", pixel: true, cls: "left-[7%] top-[30%] w-20 animate-float" },
        { src: "/showcase/icon-3.png", alt: "", pixel: true, cls: "left-[14%] top-[62%] w-16 animate-float [animation-delay:1.2s]" },
        { src: "/showcase/icon-2.png", alt: "", pixel: true, cls: "right-[8%] top-[26%] w-20 animate-float [animation-delay:0.6s]" },
        { src: "/showcase/icon-4.png", alt: "", pixel: true, cls: "right-[15%] top-[60%] w-16 animate-float [animation-delay:1.8s]" },
      ]}
      sections={[
        {
          kind: "cards",
          id: "examples",
          eyebrow: "made with spritelab",
          title: (
            <>
              Icons that read at <span className="text-[#FF8A3D]">48 pixels</span>
            </>
          ),
          cols: 4,
          cards: [
            { title: "Skill: lightning", tag: "skill", image: { src: "/showcase/icon-1.png", alt: "Pixel art lightning skill icon with golden frame, made with SpriteLab", pixel: true } },
            { title: "Spell: fireball", tag: "skill", image: { src: "/showcase/icon-2.png", alt: "Pixel art fireball spell icon with golden frame, made with SpriteLab", pixel: true } },
            { title: "Item: health potion", tag: "item", image: { src: "/showcase/icon-3.png", alt: "Pixel art health potion item icon with stone frame, made with SpriteLab", pixel: true } },
            { title: "Status: poison", tag: "status", image: { src: "/showcase/icon-4.png", alt: "Pixel art poison status icon with silver frame, made with SpriteLab", pixel: true } },
          ],
        },
        {
          kind: "cards",
          eyebrow: "icon types",
          title: (
            <>
              Every <span className="text-[#FF8A3D]">icon set</span> a game needs
            </>
          ),
          cols: 3,
          cards: [
            { title: "Item icons", items: ["Weapons", "Potions", "Food", "Materials", "Keys"] },
            { title: "Skill & spell icons", items: ["Attacks", "Spells", "Buffs", "Passives", "Ultimates"] },
            { title: "Status & UI", items: ["Status effects", "Buttons", "Frames", "Bars", "Currency"] },
          ],
        },
        {
          kind: "features",
          eyebrow: "made for ui",
          title: (
            <>
              Built for <span className="text-[#FF8A3D]">inventories and HUDs</span>
            </>
          ),
          cards: [
            { title: "Framed and centred", body: "Icons come with a frame and a filled background inside it, centred so they line up in a grid." },
            { title: "Matching sets", body: "Describe the frame once (“ornate golden frame”) and reuse it across prompts for a consistent set." },
            { title: "Animated icons", body: "Make an icon pulse, shine or unlock with the Animate tool for cooldown-ready and loot-drop UI." },
            { title: "Clean edges", body: "Transparent outside the frame, crisp pixels inside — scales to 32, 48 or 64 px slots with nearest-neighbour." },
          ],
        },
        {
          kind: "prompts",
          eyebrow: "example prompts",
          title: (
            <>
              Icon <span className="text-[#FF8A3D]">prompts</span>
            </>
          ),
          prompts: [
            "skill icon of a lightning bolt, ornate golden frame",
            "item icon of a red health potion, stone frame",
            "status icon of a green poison skull, silver frame",
            "spell icon of a swirling ice shard, blue rune frame",
            "item icon of an iron key, wooden frame",
            "buff icon of a glowing shield, golden frame",
          ],
        },
      ]}
      faq={[
        { q: "Which asset type should I choose for icons?", a: "Pick Icons in the generator, then Item Icons, Skill Icons, Status Icons or UI Icons. The framing is tuned for square, readable icons." },
        { q: "Can I make a consistent icon set?", a: "Yes — keep the style and the frame description the same across prompts (for example “ornate golden frame”) and only change the subject." },
        { q: "What size are the icons?", a: "Icons are 1024×1024 PNGs. Pixel-art icons sit on a real pixel grid, so you can scale them down with nearest-neighbour for 32–64 px inventory slots." },
        { q: "Can I use them commercially?", a: "Yes, generated icons can be used in commercial games with no attribution required." },
      ]}
      cta={{
        title: (
          <>
            Fill your <span className="text-[#FF8A3D]">hotbar</span>
          </>
        ),
        body: "Generate a full icon set in minutes.",
        button: "Get 10 free credits",
      }}
    />
  );
}
