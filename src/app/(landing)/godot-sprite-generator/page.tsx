import type { Metadata } from "next";
import { SeoLanding } from "@/components/landing/SeoLanding";
import { ENGINE_GUIDES } from "@/data/geo-content";
import { SHOWCASE } from "@/data/showcase";

const URL = "https://www.sprite-lab.com/godot-sprite-generator";

export const metadata: Metadata = {
  title: { absolute: "AI Sprites for Godot 4 — Sprite2D & AnimatedSprite2D | SpriteLab" },
  description:
    "Generate 2D sprites and sprite-sheet animations for Godot 4 with AI. Use them in Sprite2D or load sheets into AnimatedSprite2D in a few clicks.",
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
          AI sprites for Godot
          <br />
          <span className="text-[#FF8A3D]">straight into SpriteFrames</span>
        </>
      }
      subtitle="Generate characters, creatures, items and tiles, animate them into sprite sheets, and load them into Sprite2D or AnimatedSprite2D in a minute."
      trust={["transparent png", "one-row sprite sheets", "nearest-filter ready", "commercial use"]}
      floating={[
        { src: "/showcase/anim-witch-walk.gif", alt: "", pixel: true, cls: "left-[6%] top-[28%] w-24 animate-float" },
        { src: "/showcase/slime.png", alt: "", pixel: true, cls: "left-[14%] top-[62%] w-16 animate-float [animation-delay:1.2s]" },
        { src: "/showcase/anim-dragon-breath.gif", alt: "", pixel: true, cls: "right-[5%] top-[24%] w-32 animate-float [animation-delay:0.6s]" },
        { src: "/showcase/tile-grass.png", alt: "", pixel: true, cls: "right-[15%] top-[62%] w-16 animate-float [animation-delay:1.8s]" },
      ]}
      sections={[
        {
          kind: "steps",
          id: "import",
          eyebrow: "import guide",
          title: (
            <>
              Use it in <span className="text-[#FF8A3D]">Godot 4</span> in five steps
            </>
          ),
          steps: ENGINE_GUIDES.godot.map((body, i) => ({ title: `Step ${i + 1}`, body })),
        },
        {
          kind: "features",
          eyebrow: "why it fits godot",
          title: (
            <>
              Made for <span className="text-[#FF8A3D]">AnimatedSprite2D</span>
            </>
          ),
          cards: [
            { title: "One-row sheets", body: "Set Horizontal to the frame count and Vertical to 1 in 'Add frames from sprite sheet' — that's the whole setup." },
            { title: "Feet on one baseline", body: "Frames are aligned on the body, so the sprite doesn't slide or bob unintentionally while it plays." },
            { title: "Seamless tiles", body: "Floor and wall tiles repeat without seams — use them as a TileSet atlas source or a repeating texture." },
            { title: "Crisp at any scale", body: "Pixel art is on a real grid; with the Nearest texture filter it stays sharp in a pixel-perfect viewport." },
          ],
        },
        { kind: "gallery", items: SHOWCASE },
      ]}
      faq={[
        { q: "How do I load a SpriteLab sprite sheet in Godot 4?", a: "Add an AnimatedSprite2D, create new SpriteFrames, click 'Add frames from sprite sheet', set Horizontal to the number of frames and Vertical to 1, then select all frames." },
        { q: "Why is my pixel art blurry in Godot?", a: "Set Project Settings → Rendering → Textures → Default Texture Filter to Nearest (or set the node's Texture Filter to Nearest)." },
        { q: "Does SpriteLab export Godot TileSet resources?", a: "No — it exports PNG tiles and sprite sheets. Add a tile PNG as an atlas source in a TileSet to paint with it." },
        { q: "Can I use the assets in a commercial Godot game?", a: "Yes, assets you generate can be used in commercial projects." },
      ]}
      cta={{
        title: (
          <>
            Ship your <span className="text-[#FF8A3D]">Godot</span> game faster
          </>
        ),
        body: "Generate sprites, animations and tiles for your project.",
        button: "Get 10 free credits",
      }}
    />
  );
}
