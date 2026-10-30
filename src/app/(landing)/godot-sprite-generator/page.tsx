import type { Metadata } from "next";
import { SeoLanding } from "@/components/landing/SeoLanding";
import { COMMERCIAL_LICENCE_ANSWER } from "@/config/licence";
import { SIGNUP_CTA } from "@/config/signup";
import { ENGINE_GUIDES } from "@/data/geo-content";
import { SHOWCASE } from "@/data/showcase";

const URL = "https://www.sprite-lab.com/godot-sprite-generator";

export const metadata: Metadata = {
  title: { absolute: "Godot Sprite Generator: AI Sprites for Godot 4 | SpriteLab" },
  description:
    "Generate 2D sprites and animations for Godot 4 with AI and download a ready SpriteFrames .tres for AnimatedSprite2D, plus per-frame hitboxes.",
  keywords: ["AI sprites for Godot", "Godot sprite generator", "Godot 4 sprite sheet", "AnimatedSprite2D sprite sheet", "Godot pixel art", "Godot 2D assets AI"],
  openGraph: {
    title: "AI Sprites for Godot 4 — SpriteLab",
    description: "Generate sprites and sprite sheets with AI and use them in Godot 4.",
    url: URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Sprites for Godot 4 — Sprite2D & AnimatedSprite2D | SpriteLab",
    description: "Generate 2D sprites and sprite-sheet animations for Godot 4 with AI. Use them in Sprite2D or load sheets into AnimatedSprite2D in a few clicks.",
  },
  alternates: { canonical: URL },
};

export default function GodotSpritesPage() {
  return (
    <SeoLanding
      slug="godot-sprite-generator"
      appName="SpriteLab — AI Sprites for Godot"
      appDescription="Generate 2D sprites and sprite-sheet animations with AI and use them in Godot 4 with Sprite2D and AnimatedSprite2D."
      heroLine="ai sprites for godot 4"
      h1={
        <>
          Godot sprite generator
          <span className="sr-only"> for </span>
          <br />
          Sprite2D and SpriteFrames
        </>
      }
      subtitle="Generate characters, creatures, items and tiles, animate them into sprite sheets, and load them into Sprite2D or AnimatedSprite2D in a minute."
      trust={["transparent png", "one-row sprite sheets", "nearest-filter ready", "commercial licence on paid plans"]}
      floating={[
        { src: "/showcase/anim-witch-walk.webp", alt: "", pixel: true, cls: "left-[6%] top-[28%] w-24 animate-float" },
        { src: "/showcase/slime.png", alt: "", pixel: true, cls: "left-[14%] top-[62%] w-16 animate-float [animation-delay:1.2s]" },
        { src: "/showcase/anim-dragon-breath.webp", alt: "", pixel: true, cls: "right-[5%] top-[24%] w-32 animate-float [animation-delay:0.6s]" },
        { src: "/showcase/tile-grass.png", alt: "", pixel: true, cls: "right-[15%] top-[62%] w-16 animate-float [animation-delay:1.8s]" },
      ]}
      sections={[
        {
          kind: "steps",
          id: "import",
          eyebrow: "import guide",
          title: (
            <>
              Use it in Godot 4 in five steps
            </>
          ),
          steps: ENGINE_GUIDES.godot.map((body, i) => ({ title: `Step ${i + 1}`, body })),
        },
        {
          kind: "features",
          eyebrow: "why it fits godot",
          title: (
            <>
              Made for AnimatedSprite2D
            </>
          ),
          cards: [
            { title: "One-row sheets", body: "Set Horizontal to the frame count and Vertical to 1 in 'Add frames from sprite sheet' — that's the whole setup." },
            { title: "Feet on one baseline", body: "Frames are aligned on the body, so the sprite doesn't slide or bob unintentionally while it plays." },
            { title: "Seamless tiles", body: "Floor and wall tiles repeat without seams — use them as a TileSet atlas source or a repeating texture." },
            { title: "Crisp at any scale", body: "Pixel art is on a real grid; with the Nearest texture filter it stays sharp in a pixel-perfect viewport." },
            { title: "Ready SpriteFrames", body: "The engine pack includes a SpriteFrames .tres with every animation, its fps and loop flag — load it into an AnimatedSprite2D and press play." },
          ],
        },
        {
          kind: "specs",
          id: "engine-pack",
          eyebrow: "what's in the download",
          title: <>The Godot side of the engine pack</>,
          intro: "Every animation can be downloaded as an engine pack: one ZIP per character with files Godot 4 opens as they are.",
          rows: [
            { label: "SpriteFrames", value: "godot/<name>.tres — every animation with its speed (FPS) and loop flag" },
            { label: "Sheets", value: "godot/sheets/<animation>.png — one horizontal strip per animation, equal-size frames" },
            { label: "Directions", value: "A 4-direction walk is split into one animation per facing: walk_down, walk_right, walk_up, walk_left" },
            { label: "Frames", value: "4, 6 or 9 key poses, or up to 18 frames with smooth in-betweens" },
            { label: "Hitboxes", value: "hitboxes.json — a hurtbox (body) and a hitbox (weapon, fist, breath) for every frame, in frame pixels" },
            { label: "Texture filter", value: "Nearest, for pixel art" },
          ],
          notes: [
            "The .tres points at res://spritelab_<name>/godot/sheets/, so copy the whole spritelab_<name> folder into the root of your project and the paths resolve without editing. Then add an AnimatedSprite2D, open Sprite Frames → Load, pick the .tres, choose an animation and press play. Each sheet becomes a list of AtlasTexture regions, so you can still reorder frames or change the speed in the SpriteFrames panel.",
            "For pixel art, set Project Settings → Rendering → Textures → Default Texture Filter to Nearest. To keep every art pixel the same size on screen, set the stretch mode to canvas_items or viewport and, in Godot 4.2 or newer, Scale Mode to integer. SpriteLab pixel art sits on a real grid, so it stays sharp at 2×, 3× or 4×.",
            "Frames are aligned on the body and the feet share one baseline in every animation, so a single Offset on the AnimatedSprite2D puts the feet on the node's origin for idle, walk and attack alike, and switching animations doesn't make the character jump.",
            "hitboxes.json gives x, y, w and h from the top-left corner of each frame. With the default Centered sprite, subtract half the frame width and height to get the position of a RectangleShape2D, and update it from the frame_changed signal. The boxes are detected automatically, so treat them as a starting point and tweak them in the editor.",
          ],
          links: [
            { label: "How to use sprite sheets in Godot 4", href: "/guides/how-to-use-sprite-sheets-in-godot-4" },
            { label: "Hitboxes and hurtboxes from sprite sheets", href: "/guides/hitboxes-and-hurtboxes-from-sprite-sheets" },
            { label: "Make sprite animations", href: "/ai-sprite-animation-generator" },
          ],
        },
        { kind: "gallery", items: SHOWCASE },
      ]}
      faq={[
        { q: "How do I load a SpriteLab sprite sheet in Godot 4?", a: "Add an AnimatedSprite2D, create new SpriteFrames, click 'Add frames from sprite sheet', set Horizontal to the number of frames and Vertical to 1, then select all frames." },
        { q: "Can I skip setting up SpriteFrames by hand?", a: "Yes. Download the engine pack, copy the spritelab_<name> folder into your project root and load godot/<name>.tres into the AnimatedSprite2D's Sprite Frames. Every animation is already there with its speed and loop setting." },
        { q: "Does Godot get the hitboxes too?", a: "The pack includes hitboxes.json with a body box and a strike box for every frame, in frame pixels. Godot doesn't read it on its own: load it with JSON.parse_string and apply the boxes to a CollisionShape2D or Area2D in your script." },
        { q: "Why is my pixel art blurry in Godot?", a: "Set Project Settings → Rendering → Textures → Default Texture Filter to Nearest (or set the node's Texture Filter to Nearest)." },
        { q: "Does SpriteLab export Godot TileSet resources?", a: "No — it exports PNG tiles and sprite sheets. Add a tile PNG as an atlas source in a TileSet to paint with it." },
        { q: "Can I use the assets in a commercial Godot game?", a: COMMERCIAL_LICENCE_ANSWER },
      ]}
      cta={{
        title: (
          <>
            Ship your Godot game faster
          </>
        ),
        body: "Generate sprites, animations and tiles for your project.",
        button: SIGNUP_CTA,
      }}
    />
  );
}
