import type { Metadata } from "next";
import { SeoLanding } from "@/components/landing/SeoLanding";
import { SIGNUP_CTA } from "@/config/signup";
import { LANDING_SPECS } from "@/data/landing-specs";

const URL = "https://www.sprite-lab.com/ai-tileset-generator";

export const metadata: Metadata = {
  title: { absolute: "AI Tileset Generator — Seamless Game Tiles | SpriteLab" },
  description:
    "Generate seamless floor and wall tiles for 2D games with AI: stone, grass, water, lava, wood. Pixel-art tiles that repeat without visible seams.",
  keywords: ["tileset generator", "AI tileset generator", "AI tile generator", "seamless tile generator", "tileable texture AI", "pixel art tiles", "game floor tiles", "animated water tile"],
  openGraph: {
    title: "AI Tileset Generator — Seamless Game Tiles | SpriteLab",
    description: "Floor and wall tiles that repeat without seams, plus animated water and lava.",
    url: URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Tileset Generator — Seamless Game Tiles | SpriteLab",
    description: "Generate seamless floor and wall tiles for 2D games with AI: stone, grass, water, lava, wood. Pixel-art tiles that repeat without visible seams.",
  },
  alternates: { canonical: URL },
};

export default function TileGeneratorPage() {
  return (
    <SeoLanding
      slug="ai-tileset-generator"
      appName="SpriteLab AI Tileset Generator"
      breadcrumb="AI tileset generator"
      appDescription="Generate seamless square floor and wall tiles for 2D games from a text prompt, and animate water, lava and other surfaces into looping tiles."
      heroLine="ai seamless tile generator"
      h1={
        <>
          AI tileset generator
          <span className="sr-only"> for </span>
          <br />
          seamless floors and walls
        </>
      }
      subtitle="Floors, walls, water and lava as square tiles that repeat without visible seams — on a pixel grid for pixel-art games. Animate surfaces into looping frames."
      trust={["repeats without seams", "pixel-art grid", "animated water & lava", "commercial licence on paid plans"]}
      floating={[
        { src: "/showcase/tile-stone-wall.png", alt: "", pixel: true, cls: "left-[6%] top-[30%] w-24 animate-float" },
        { src: "/showcase/tile-grass.png", alt: "", pixel: true, cls: "left-[14%] top-[60%] w-20 animate-float [animation-delay:1.2s]" },
        { src: "/showcase/anim-water.gif", alt: "", pixel: true, cls: "right-[7%] top-[26%] w-24 animate-float [animation-delay:0.6s]" },
        { src: "/showcase/tile-water.png", alt: "", pixel: true, cls: "right-[15%] top-[60%] w-20 animate-float [animation-delay:1.8s]" },
      ]}
      sections={[
        {
          kind: "cards",
          id: "examples",
          eyebrow: "made with spritelab",
          title: (
            <>
              Tiles that repeat cleanly
            </>
          ),
          intro: "Each tile wraps on all four edges, so a grid of copies shows no seam lines.",
          cols: 4,
          cards: [
            { title: "Dungeon stone wall", tag: "wall", image: { src: "/showcase/tile-stone-wall.png", alt: "Seamless pixel art stone brick wall tile made with SpriteLab", pixel: true } },
            { title: "Grass with flowers", tag: "floor", image: { src: "/showcase/tile-grass.png", alt: "Seamless pixel art grass floor tile made with SpriteLab", pixel: true } },
            { title: "Shallow water", tag: "floor", image: { src: "/showcase/tile-water.png", alt: "Seamless pixel art water tile made with SpriteLab", pixel: true } },
            { title: "Animated water", tag: "animated", image: { src: "/showcase/anim-water.gif", alt: "Animated seamless pixel art water tile made with SpriteLab", pixel: true } },
          ],
        },
        {
          kind: "features",
          eyebrow: "how tiles differ",
          title: (
            <>
              Made to tile, not to be framed
            </>
          ),
          cards: [
            { title: "Fills the whole square", body: "No background removal, no outline around the tile, no single object in the middle — the texture runs edge to edge." },
            { title: "Seam check", body: "If the model's tile doesn't wrap, the edges are blended with an offset copy so left meets right and top meets bottom." },
            { title: "Same pixel grid as your sprites", body: "Pixel-art tiles use the same pixel density as SpriteLab sprites, so characters and floors match on screen." },
            { title: "Animated surfaces", body: "Water ripples, lava churns, grass sways — export a looping sprite sheet of full tiles." },
          ],
        },
        {
          kind: "steps",
          eyebrow: "how it works",
          title: (
            <>
              Make a tile in three steps
            </>
          ),
          steps: [
            { title: "Choose Environment → Floor or Wall Tiles", body: "In the generator, pick the tile type and a style such as Pixel HD or Hand Painted." },
            { title: "Describe the surface", body: "“Mossy dungeon stone bricks”, “sandy beach with shells”, “bubbling lava with dark crust”." },
            { title: "Use or animate", body: "Download the tile and set it as a repeating texture or tilemap tile — or animate it into a looping strip." },
          ],
        },
        {
          kind: "prompts",
          eyebrow: "example prompts",
          title: (
            <>
              Tile ideas
            </>
          ),
          prompts: [
            "mossy dungeon stone bricks",
            "wooden plank floor of a tavern",
            "grass with small flowers",
            "bubbling lava with a dark crust",
            "shallow blue water with foam",
            "desert sand with small pebbles",
          ],
        },
        LANDING_SPECS["ai-tileset-generator"],
      ]}
      faq={[
        { q: "Are the tiles really seamless?", a: "Yes. Every tile is checked at its edges; if it doesn't wrap, the edges are blended with a half-offset copy so copies line up without a visible seam." },
        { q: "Can I make a full autotile tileset?", a: "Not yet. SpriteLab makes single seamless tiles (floor, wall, water, lava…) and animated tiles. Autotile sets with corners and edges (e.g. 47-tile blobs) are not available." },
        { q: "What size are the tiles?", a: "Tiles are delivered as 1024×1024 PNGs. Pixel-art tiles sit on a 128-pixel grid (8 screen pixels per art pixel), so a nearest-neighbour downscale to 128×128 gives you the native-resolution tile with no blur." },
        { q: "Can tiles be animated?", a: "Yes. Open the tile in Animate and choose Flow or Shimmer to get a looping sprite sheet of full tiles." },
      ]}
      cta={{
        title: (
          <>
            Build your levels faster
          </>
        ),
        body: "Generate seamless floors and walls that match your sprites.",
        button: SIGNUP_CTA,
      }}
    />
  );
}
