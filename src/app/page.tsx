import type { Metadata } from "next";
import { HomePage } from "@/components/landing/HomePage";
import { SIGNUP_CREDITS } from "@/config/signup";

// Static for every visitor and search engine (rebuilt every 5 minutes for the
// community wall). Signed-in users are rewritten to /member/home by the
// session proxy, so nothing here reads cookies, the session or searchParams.
export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: "Free AI Sprite Generator & Sprite Sheet Maker | SpriteLab" },
  description: `Generate game-ready sprites, pixel art, sprite sheets and seamless tiles with AI. Transparent PNGs for Unity, Godot and GameMaker. ${SIGNUP_CREDITS} free credits.`,
  keywords: ["AI game asset generator", "AI sprite generator", "AI pixel art generator", "sprite sheet generator", "sprite animation", "indie game development", "Unity sprites", "Godot sprites", "RPG sprites"],
  openGraph: {
    title: "SpriteLab — AI Game Asset Generator",
    description: "Game-ready sprites, pixel art and sprite-sheet animations from a text prompt. 12 art styles, transparent PNG. Commercial licence on paid plans.",
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
