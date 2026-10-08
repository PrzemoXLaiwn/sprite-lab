import type { Metadata } from "next";
import { SeoLanding } from "@/components/landing/SeoLanding";
import { ENGINE_GUIDES } from "@/data/geo-content";
import { SHOWCASE } from "@/data/showcase";

const URL = "https://www.sprite-lab.com/unity-sprite-generator";

export const metadata: Metadata = {
  title: { absolute: "AI Sprites for Unity — Import-Ready Sprite Sheets | SpriteLab" },
  description:
    "Generate 2D sprites and sprite-sheet animations for Unity with AI, then import them: Point filter for pixel art, Sprite Mode Multiple, slice by cell size.",
  keywords: ["AI sprites for Unity", "Unity sprite generator", "Unity 2D assets AI", "Unity sprite sheet", "pixel art Unity", "Unity 2D animation sprites"],
  openGraph: {
    title: "AI Sprites for Unity — SpriteLab",
    description: "Generate sprites and sprite sheets with AI and import them into Unity 2D.",
    url: URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Sprites for Unity — Import-Ready Sprite Sheets | SpriteLab",
    description: "Generate 2D sprites and sprite-sheet animations for Unity with AI, then import them: Point filter for pixel art, Sprite Mode Multiple, slice by cell size.",
  },
  alternates: { canonical: URL },
};

export default function UnitySpritesPage() {
  return (
    <SeoLanding
      slug="unity-sprite-generator"
      appName="SpriteLab — AI Sprites for Unity"
      appDescription="Generate 2D sprites and sprite-sheet animations with AI and import them into Unity: transparent PNGs and horizontal sprite sheets of equal-size frames."
      heroLine="ai sprites for unity 2d"
      h1={
        <>
          AI sprites for Unity
          <br />
          <span className="text-[#FF8A3D]">prompt → PNG → scene</span>
        </>
      }
      subtitle="Generate characters, items and tiles, animate them into sprite sheets, and import them into Unity 2D with the usual Sprite Editor workflow — no plugins needed."
      trust={["transparent png", "equal-size frames", "point-filter ready", "commercial use"]}
      floating={[
        { src: "/showcase/anim-knight-idle.gif", alt: "", pixel: true, cls: "left-[6%] top-[28%] w-28 animate-float" },
        { src: "/showcase/fire-sword.png", alt: "", pixel: true, cls: "left-[14%] top-[62%] w-16 animate-float [animation-delay:1.2s]" },
        { src: "/showcase/anim-dog-jump.gif", alt: "", pixel: true, cls: "right-[6%] top-[24%] w-28 animate-float [animation-delay:0.6s]" },
        { src: "/showcase/health-potion.png", alt: "", pixel: true, cls: "right-[15%] top-[60%] w-14 animate-float [animation-delay:1.8s]" },
      ]}
      sections={[
        {
          kind: "steps",
          id: "import",
          eyebrow: "import guide",
          title: (
            <>
              Import into <span className="text-[#FF8A3D]">Unity</span> in five steps
            </>
          ),
          intro: "Works in Unity 2021 LTS and newer with the 2D Sprite package.",
          steps: ENGINE_GUIDES.unity.map((body, i) => ({ title: `Step ${i + 1}`, body })),
        },
        {
          kind: "features",
          eyebrow: "why it fits unity",
          title: (
            <>
              Assets shaped for the <span className="text-[#FF8A3D]">Sprite Editor</span>
            </>
          ),
          cards: [
            { title: "Equal-size frames", body: "Sprite sheets are one row of identical cells, so Slice → Grid By Cell Size cuts them perfectly every time." },
            { title: "Stable pivots", body: "Frames are aligned on the body with feet on one baseline, so a bottom-centre pivot doesn't jitter between frames." },
            { title: "Crisp pixel art", body: "Pixel art is on a real grid — with Point filtering and no compression it stays sharp at any zoom." },
            { title: "Organised packs", body: "Generate a whole project, let it sort into folders, and download a ZIP that mirrors a tidy Assets folder." },
          ],
        },
        { kind: "gallery", items: SHOWCASE },
      ]}
      faq={[
        { q: "Do I need a Unity plugin?", a: "No. SpriteLab exports standard PNG files and sprite sheets that Unity imports natively." },
        { q: "How do I slice a SpriteLab sprite sheet in Unity?", a: "Set Sprite Mode to Multiple, open the Sprite Editor, choose Slice → Grid By Cell Size and enter the frame width and height — every frame in a SpriteLab sheet has the same size." },
        { q: "Why does my pixel art look blurry in Unity?", a: "Set the texture's Filter Mode to Point (no filter) and Compression to None. SpriteLab pixel art is on a real pixel grid, so it stays sharp with those settings." },
        { q: "Can I use the assets in a commercial Unity game?", a: "Yes, assets you generate can be used in commercial projects." },
      ]}
      cta={{
        title: (
          <>
            Fill your <span className="text-[#FF8A3D]">Assets</span> folder
          </>
        ),
        body: "Generate sprites and animations for your Unity project.",
        button: "Get 10 free credits",
      }}
    />
  );
}
