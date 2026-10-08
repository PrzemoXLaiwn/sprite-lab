import type { Metadata } from "next";
import { SeoLanding } from "@/components/landing/SeoLanding";

const URL = "https://www.sprite-lab.com/ai-tileset-generator";

export const metadata: Metadata = {
  title: { absolute: "AI Tile Generator — Seamless Floor & Wall Tiles | SpriteLab" },
  description:
    "Generate seamless floor and wall tiles for 2D games with AI: stone, grass, water, lava, wood. Pixel-art tiles that repeat without visible seams.",
  keywords: ["AI tile generator", "seamless tile generator", "tileable texture AI", "pixel art tiles", "game floor tiles", "wall tiles generator", "animated water tile"],
  openGraph: {
    title: "AI Seamless Tile Generator for Games — SpriteLab",
    description: "Floor and wall tiles that repeat without seams, plus animated water and lava.",
    url: URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Tile Generator — Seamless Floor & Wall Tiles | SpriteLab",
    description: "Generate seamless floor and wall tiles for 2D games with AI: stone, grass, water, lava, wood. Pixel-art tiles that repeat without visible seams.",
  },
  alternates: { canonical: URL },
};

export default function TileGeneratorPage() {
  return (
    <SeoLanding
      slug="ai-tileset-generator"
      appName="SpriteLab AI Tile Generator"
      appDescription="Generate seamless square floor and wall tiles for 2D games from a text prompt, and animate water, lava and other surfaces into looping tiles."
      heroLine="ai seamless tile generator"
      h1={
        <>
          Seamless game tiles
          <br />
          <span className="text-[#FF8A3D]">from a sentence</span>
        </>
      }
      subtitle="Floors, walls, water and lava as square tiles that repeat without visible seams — on a pixel grid for pixel-art games. Animate surfaces into looping frames."
      trust={["repeats without seams", "pixel-art grid", "animated water & lava", "commercial use"]}
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
              Tiles that <span className="text-[#FF8A3D]">repeat cleanly</span>
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
              Made to <span className="text-[#FF8A3D]">tile</span>, not to be framed
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
              Make a tile in <span className="text-[#FF8A3D]">three steps</span>
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
              Tile <span className="text-[#FF8A3D]">ideas</span>
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
            Build your <span className="text-[#FF8A3D]">levels</span> faster
          </>
        ),
        body: "Generate seamless floors and walls that match your sprites.",
        button: "Get 10 free credits",
      }}
    />
  );
}
