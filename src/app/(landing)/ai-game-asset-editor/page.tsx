import type { Metadata } from "next";
import { SeoLanding } from "@/components/landing/SeoLanding";
import { EDIT_CREDITS, REMOVE_BG_CREDITS, STYLE_MATCH_CREDITS, upscaleCredits } from "@/config/tool-prices";
import { ANIMATION_FRAME_OPTIONS, RIG_CREDITS } from "@/config/animations";

const URL = "https://www.sprite-lab.com/ai-game-asset-editor";
const TITLE = "AI Game Asset Editor: Edit Sprites with Words | SpriteLab";
const DESCRIPTION =
  "Edit 2D game assets with AI: describe the change, paint the area to keep the rest untouched, or upload your own sprite to edit, clean up and animate.";

// Prices come from the same config the tool routes charge from
const animFrom = ANIMATION_FRAME_OPTIONS[0].credits;
const animTo = ANIMATION_FRAME_OPTIONS[ANIMATION_FRAME_OPTIONS.length - 1].credits;

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: ["AI game asset editor", "edit sprite with AI", "AI image editing for game assets", "recolor sprite", "edit pixel art with AI", "upload sprite and animate"],
  openGraph: { title: TITLE, description: DESCRIPTION, url: URL, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  alternates: { canonical: URL },
};

export default function AiGameAssetEditorPage() {
  return (
    <SeoLanding
      slug="ai-game-asset-editor"
      appName="SpriteLab AI Game Asset Editor"
      appDescription="Edit 2D game assets with AI by describing the change, optionally painting the area to change; upload your own sprite to edit, remove its background, upscale or animate it."
      breadcrumb="AI Game Asset Editor"
      h1={<>AI game asset editor</>}
      subtitle="Change a sprite by describing the change: recolour the armour, swap the hat, add a scar. Paint over the part you want changed and everything else stays exactly as it was. Works on sprites made here and on sprites you upload."
      trust={["edit with words", "brush mask", "upload your own sprite", "pixel art stays on its grid"]}
      floating={[
        { src: "/showcase/fox-mage.png", alt: "", pixel: false, cls: "" },
        { src: "/showcase/edit-fox-red.png", alt: "", pixel: false, cls: "" },
        { src: "/showcase/knight.png", alt: "", pixel: true, cls: "" },
        { src: "/showcase/goblin-archer.png", alt: "", pixel: true, cls: "" },
      ]}
      sections={[
        {
          kind: "cards",
          id: "example",
          eyebrow: "a real edit",
          title: <>One sentence, same character</>,
          intro: "Made with SpriteLab's Edit tool. The instruction was: “change the purple robe and hat to a deep red robe and hat with gold trim”. The fox, its pose, staff and proportions stay the same.",
          cols: 2,
          cards: [
            { title: "Before", body: "The original sprite, made in the Chibi style.", image: { src: "/showcase/fox-mage.png", alt: "Chibi fox mage sprite in a purple robe and hat, before editing, made with SpriteLab" } },
            { title: "After", body: "The same sprite after one edit: red robe and hat with gold trim.", image: { src: "/showcase/edit-fox-red.png", alt: "The same chibi fox mage sprite edited with SpriteLab to wear a red robe and hat with gold trim" } },
          ],
        },
        {
          kind: "specs",
          id: "tools",
          eyebrow: "what you can change",
          title: <>The editing tools and what they cost</>,
          intro: "Each tool works on a sprite in your assets, whether you generated it or uploaded it.",
          rows: [
            { label: "Edit with AI", value: `Describe the change; optionally paint the area that may change. ${EDIT_CREDITS} credits, every plan.` },
            { label: "Upload your sprite", value: "PNG, JPG or WebP up to 8 MB. A plain background is removed for you. Free, and only you can see it." },
            { label: "Match style", value: `New sprites drawn in the style of one you pick. ${STYLE_MATCH_CREDITS} credits each.` },
            { label: "Remove background", value: `Clean cut-out of a sprite with a busy background. ${REMOVE_BG_CREDITS} credit, Starter plan and up.` },
            { label: "Upscale", value: `Pixel-perfect upscaling is free. AI upscaling 2× or 4× costs ${upscaleCredits(2)}–${upscaleCredits(4)} credits, Pro and Studio.` },
            { label: "Animate", value: `Turn the edited sprite into a sprite sheet and GIF: ${RIG_CREDITS} credits for a breathing idle, ${animFrom}–${animTo} credits for other motions.` },
          ],
          notes: [
            "Edit with AI redraws the sprite from your sprite and your sentence, so it is best at changes of colour, material, clothing, accessories and small details. With a brush mask, everything outside the painted area is copied back from the original pixel for pixel, so the face or the outline you like can't drift.",
            "Pixel art goes back onto the sprite's own pixel grid and palette after the edit, so an edited sprite still matches the rest of your set. Painted styles keep their soft edges.",
            "Big changes of pose or camera are a different job: make a new sprite with the view you need, or animate the sprite. And an upload is only as usable as the art you bring, so upload art you made or have the rights to; uploads and anything made from them can't be shared to the community gallery.",
          ],
          links: [
            { label: "Animate a sprite into a sprite sheet", href: "/ai-sprite-animation-generator" },
            { label: "What a SpriteLab sprite sheet looks like", href: "/sprite-sheet-generator" },
            { label: "How to keep AI game art consistent", href: "/guides/how-to-keep-ai-game-art-consistent" },
          ],
        },
        {
          kind: "steps",
          eyebrow: "how to edit a sprite",
          title: <>Three steps</>,
          steps: [
            { title: "Pick or upload the sprite", body: "Open any sprite from your assets, or upload a PNG, JPG or WebP of your own." },
            { title: "Describe the change", body: "Say what should change in one sentence. To protect the rest, paint over only the part that may change." },
            { title: "Keep, edit again or animate", body: "Download the PNG, use the result as the start of the next edit, or send it to Animate for a sprite sheet." },
          ],
        },
      ]}
      faq={[
        { q: "Can I edit a sprite I made somewhere else?", a: "Yes. Upload a PNG, JPG or WebP up to 8 MB. A plain background is removed, and then you can edit, animate or turn the sprite like one made in SpriteLab. Uploading is free and private." },
        { q: "Will pixel art stay crisp after an edit?", a: "Yes. The edited sprite is put back onto its own pixel grid with a limited palette, so it keeps whole pixels and matches the rest of your set." },
        { q: "Can I change only one part of a sprite?", a: "Yes. Paint over the area that may change. Everything outside the painted area is copied back from the original pixel for pixel." },
        { q: "How much does editing cost?", a: `An edit costs ${EDIT_CREDITS} credits on every plan. Uploading is free, pixel-perfect upscaling is free, background removal is ${REMOVE_BG_CREDITS} credit on Starter and up, and AI upscaling is ${upscaleCredits(2)}–${upscaleCredits(4)} credits on Pro and Studio. You get 10 free credits when you sign up.` },
        { q: "How is this different from editing in Photoshop or Aseprite?", a: "You describe the change instead of drawing it, which is quick for recolours, outfits and details. For exact pixel-by-pixel control, download the PNG and finish it in your editor." },
      ]}
      cta={{
        title: <>Edit your first sprite</>,
        body: "Make a sprite or upload your own, then change it with one sentence.",
        button: "Get 10 free credits",
      }}
    />
  );
}
