import type { Metadata } from "next";
import { HomePage } from "@/components/landing/HomePage";
import { SIGNUP_CREDITS } from "@/config/signup";

// Static for every visitor and search engine (rebuilt every 5 minutes for the
// community wall). Signed-in users are rewritten to /member/home by the
// session proxy, so nothing here reads cookies, the session or searchParams.
export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: "Free AI Sprite Generator & Sprite Sheet Maker | SpriteLab" },
  description: `AI game asset platform for indie developers: sprites, realistic and pixel art, sprite sheets, walk cycles and tilesets. Transparent PNGs for Unity, Godot and GameMaker. ${SIGNUP_CREDITS} free credits.`,
  keywords: ["AI game asset generator", "game asset generator", "AI sprite generator", "AI pixel art generator", "sprite sheet generator", "walk cycle generator", "AI character sprite", "AI tileset generator", "indie game development", "Unity sprites", "Godot sprites"],
  openGraph: {
    title: "SpriteLab — AI Game Asset Generator",
    description: "Game-ready 2D assets from a text prompt: pixel, painted and realistic sprites, sprite sheets and tiles. Transparent PNG. Commercial licence on paid plans.",
    url: "https://www.sprite-lab.com",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SpriteLab — AI Game Asset Generator",
    description: "Game-ready sprites and sprite-sheet animations for your indie game, from a text prompt.",
  },
  alternates: { canonical: "https://www.sprite-lab.com" },
};

export default function Home() {
  return <HomePage signedIn={false} />;
}
