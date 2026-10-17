import type { Metadata } from "next";
import { SeoLanding } from "@/components/landing/SeoLanding";
import { COMMERCIAL_LICENCE_ANSWER } from "@/config/licence";
import { ENGINE_GUIDES } from "@/data/geo-content";
import { SHOWCASE } from "@/data/showcase";

const URL = "https://www.sprite-lab.com/unity-sprite-generator";

export const metadata: Metadata = {
  title: { absolute: "Unity Sprite Generator: AI 2D Sprites for Unity | SpriteLab" },
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
          prompt → PNG → scene
        </>
      }
      subtitle="Generate characters, items and tiles, animate them into sprite sheets, and import them into Unity 2D with the usual Sprite Editor workflow — no plugins needed."
      trust={["transparent png", "equal-size frames", "point-filter ready", "commercial licence on paid plans"]}
      floating={[
        { src: "/showcase/anim-knight-idle.webp", alt: "", pixel: true, cls: "left-[6%] top-[28%] w-28 animate-float" },
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
              Import into Unity in five steps
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
              Assets shaped for the Sprite Editor
            </>
          ),
          cards: [
            { title: "Equal-size frames", body: "Sprite sheets are one row of identical cells, so Slice → Grid By Cell Size cuts them perfectly every time." },
            { title: "Stable pivots", body: "Frames are aligned on the body with feet on one baseline, so a bottom-centre pivot doesn't jitter between frames." },
            { title: "Crisp pixel art", body: "Pixel art is on a real grid — with Point filtering and no compression it stays sharp at any zoom." },
            { title: "Engine pack", body: "Animations download with a unity folder of numbered frames per animation — drag one folder onto the Scene and Unity builds the clip — plus per-frame hitboxes in hitboxes.json." },
          ],
        },
        {
          kind: "specs",
          id: "engine-pack",
          eyebrow: "what's in the download",
          title: <>Import settings and the Unity side of the engine pack</>,
          intro: "You can bring a SpriteLab animation into Unity two ways: slice the sprite sheet, or drop in the numbered frames from the engine pack.",
          rows: [
            { label: "Sprite sheet", value: "One horizontal row of equal-size frames: Sprite Mode Multiple, Slice → Grid By Cell Size" },
            { label: "Engine pack", value: "unity/<animation>/<animation>_00.png, _01.png… one folder of numbered frames per animation" },
            { label: "Texture Type", value: "Sprite (2D and UI)" },
            { label: "Pixel art", value: "Filter Mode Point (no filter), Compression None" },
            { label: "Pivot", value: "Bottom center: the feet share one baseline in every frame" },
            { label: "Hitboxes", value: "hitboxes.json — a hurtbox (body) and a hitbox (strike) for every frame, in frame pixels" },
          ],
          notes: [
            "Sheet route: drag the PNG into Assets, set Texture Type to Sprite (2D and UI) and Sprite Mode to Multiple, open the Sprite Editor and choose Slice → Grid By Cell Size with the frame width and height. Every SpriteLab frame is the same size, so the grid cuts cleanly with no padding or offset. Set the pivot to Bottom center before you press Slice, so each frame turns around the feet.",
            "Engine pack route: select every PNG in one unity/<animation> folder and drag them onto the Scene. Unity creates a GameObject, an Animator Controller and an animation clip from them. Set the clip's sample rate to about 8–12 FPS for a 4–6 frame loop, or higher for the 18-frame smooth versions.",
            "For pixel art, use the same Pixels Per Unit on every sprite (for example 32 if one tile is 32 art pixels) and add a Pixel Perfect Camera with Assets PPU set to the same number. SpriteLab pixel art sits on a real grid, so with Point filtering and integer scaling every art pixel stays the same size on screen.",
            "hitboxes.json measures boxes from the top-left corner of each frame, while Unity's y axis points up. To place a BoxCollider2D, flip the y (frame height − y − h) and divide by your Pixels Per Unit, measured from the pivot. The boxes are found automatically, so check them in the Scene view and adjust them where your game needs it.",
          ],
          links: [
            { label: "How to import sprite sheets into Unity", href: "/guides/how-to-import-sprite-sheets-into-unity" },
            { label: "Hitboxes and hurtboxes from sprite sheets", href: "/guides/hitboxes-and-hurtboxes-from-sprite-sheets" },
            { label: "Make sprite animations", href: "/ai-sprite-animation-generator" },
          ],
        },
        { kind: "gallery", items: SHOWCASE },
      ]}
      faq={[
        { q: "Do I need a Unity plugin?", a: "No. SpriteLab exports standard PNG files and sprite sheets that Unity imports natively." },
        { q: "How do I slice a SpriteLab sprite sheet in Unity?", a: "Set Sprite Mode to Multiple, open the Sprite Editor, choose Slice → Grid By Cell Size and enter the frame width and height — every frame in a SpriteLab sheet has the same size." },
        { q: "Why does my pixel art look blurry in Unity?", a: "Set the texture's Filter Mode to Point (no filter) and Compression to None. SpriteLab pixel art is on a real pixel grid, so it stays sharp with those settings." },
        { q: "What Pixels Per Unit should I use?", a: "Use one value for the whole game, usually your tile size in art pixels (16 or 32 for most pixel-art games). Match it in the Pixel Perfect Camera's Assets PPU so sprites line up with the tile grid and stay sharp." },
        { q: "Can I use the assets in a commercial Unity game?", a: COMMERCIAL_LICENCE_ANSWER },
      ]}
      cta={{
        title: (
          <>
            Fill your Assets folder
          </>
        ),
        body: "Generate sprites and animations for your Unity project.",
        button: "Get 10 free credits",
      }}
    />
  );
}
