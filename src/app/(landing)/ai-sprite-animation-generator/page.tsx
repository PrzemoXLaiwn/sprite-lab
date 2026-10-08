import type { Metadata } from "next";
import { SeoLanding } from "@/components/landing/SeoLanding";

const URL = "https://www.sprite-lab.com/ai-sprite-animation-generator";

export const metadata: Metadata = {
  title: { absolute: "AI Sprite Animation & Sprite Sheet Generator | SpriteLab" },
  description:
    "Animate any game sprite with AI: idle, walk, run, attack, jump, fly or a custom move. Get a sprite sheet, frames and a GIF — 4 to 18 frames.",
  keywords: ["AI sprite animation", "sprite sheet generator", "AI sprite sheet", "walk cycle generator", "pixel art animation AI", "animate sprite", "idle animation generator"],
  openGraph: {
    title: "AI Sprite Animation & Sprite Sheet Generator — SpriteLab",
    description: "Idle, walk, attack, jump, fly or your own move. Sprite sheet + GIF, ready for your engine.",
    url: URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Sprite Animation & Sprite Sheet Generator | SpriteLab",
    description: "Animate any game sprite with AI: idle, walk, run, attack, jump, fly or a custom move. Get a sprite sheet, frames and a GIF — 4 to 18 frames.",
  },
  alternates: { canonical: URL },
};

export default function SpriteAnimationPage() {
  return (
    <SeoLanding
      slug="ai-sprite-animation-generator"
      appName="SpriteLab AI Sprite Animation Generator"
      appDescription="Animate a game sprite with AI — idle, walk, run, attack, jump, fly, turnaround or a custom motion — and export a horizontal sprite sheet, individual frames and a GIF."
      heroLine="ai sprite animation + sprite sheets"
      h1={
        <>
          Animate any sprite
          <br />
          <span className="text-[#FF8A3D]">into a sprite sheet</span>
        </>
      }
      subtitle="Pick a sprite, choose how it moves and get a frame-aligned sprite sheet and GIF. A dragon breathes fire, a dog wags its tail, a car drifts — the motions are planned for each sprite."
      trust={["4, 6 or 9 key poses", "smooth mode up to 18 frames", "sprite sheet + gif + frames", "commercial use"]}
      floating={[
        { src: "/showcase/anim-knight-idle.gif", alt: "", pixel: true, cls: "left-[5%] top-[28%] w-28 animate-float" },
        { src: "/showcase/anim-witch-walk.gif", alt: "", pixel: true, cls: "left-[13%] top-[58%] w-24 animate-float [animation-delay:1.2s]" },
        { src: "/showcase/anim-dog-jump.gif", alt: "", pixel: true, cls: "right-[6%] top-[24%] w-28 animate-float [animation-delay:0.6s]" },
        { src: "/showcase/anim-car-drive.gif", alt: "", pixel: true, cls: "right-[12%] top-[60%] w-32 animate-float [animation-delay:1.8s]" },
      ]}
      sections={[
        {
          kind: "cards",
          id: "examples",
          eyebrow: "made with spritelab",
          title: (
            <>
              Real animations, <span className="text-[#FF8A3D]">real sprites</span>
            </>
          ),
          intro: "Every example below was animated from a single generated sprite.",
          cols: 3,
          cards: [
            { title: "Dragon — fire breath", tag: "attack", body: "Rears back, inhales, a stream of fire shoots forward. The dragon stays planted while the flames reach out.", image: { src: "/showcase/anim-dragon-breath.gif", alt: "Animated pixel art dragon breathing fire, made with SpriteLab", pixel: true } },
            { title: "Knight — idle", tag: "idle · smooth", body: "Breathing, weight shift and a swinging cape with feet planted — 8 frames with AI in-betweens.", image: { src: "/showcase/anim-knight-idle.gif", alt: "Animated pixel art knight idle loop, made with SpriteLab", pixel: true } },
            { title: "Witch — walk", tag: "walk", body: "A long dress: no legs are invented — the hem sways with each step.", image: { src: "/showcase/anim-witch-walk.gif", alt: "Animated pixel art witch walking, made with SpriteLab", pixel: true } },
            { title: "Dog — jump", tag: "jump", body: "Crouch, take-off, peak and landing — the height of the jump is kept in the sheet.", image: { src: "/showcase/anim-dog-jump.gif", alt: "Animated pixel art dog jumping, made with SpriteLab", pixel: true } },
            { title: "Car — drive", tag: "vehicle", body: "Wheels turn, the body bounces on its suspension, exhaust puffs out the back.", image: { src: "/showcase/anim-car-drive.gif", alt: "Animated pixel art red car driving, made with SpriteLab", pixel: true } },
            { title: "Water — flow", tag: "tile", body: "Seamless tiles animate too: ripples flow while the tile still repeats.", image: { src: "/showcase/anim-water.gif", alt: "Animated seamless pixel art water tile, made with SpriteLab", pixel: true } },
          ],
        },
        {
          kind: "features",
          eyebrow: "built for game dev",
          title: (
            <>
              Frames you can <span className="text-[#FF8A3D]">drop into an engine</span>
            </>
          ),
          cards: [
            { title: "Motions picked for the sprite", body: "AI looks at the sprite and suggests what it can do — Bark and Sit for a dog, Drift and Crash for a car, Ignite for a flaming sword — or describe your own move." },
            { title: "One baseline, one palette", body: "Frames are aligned on the body (not the feet), share one pixel grid and one palette, so nothing jitters or flickers." },
            { title: "Smooth mode", body: "AI draws an in-between pose between every pair of key poses, so 9 key poses become an 18-frame animation that flows instead of stepping." },
            { title: "Engine-friendly export", body: "A horizontal sprite sheet of equal-size frames, the frames as separate PNGs in a ZIP, and a GIF preview." },
          ],
        },
        {
          kind: "checklist",
          eyebrow: "motions",
          title: (
            <>
              What it can <span className="text-[#FF8A3D]">animate</span>
            </>
          ),
          items: [
            "Idle loops that breathe and shift weight",
            "Walk and run cycles in place, including quadruped gaits",
            "Attacks with the sprite's own weapon — or breath, bite and claws for monsters",
            "Jumps, hops and flight that keep their height",
            "Spell casts, hurt reactions and defeats",
            "Turnarounds: front, side and back views",
            "Vehicles driving, items spinning or floating, effects looping",
            "Any custom motion described in words",
          ],
        },
        {
          kind: "steps",
          eyebrow: "how it works",
          title: (
            <>
              Three steps to a <span className="text-[#FF8A3D]">sprite sheet</span>
            </>
          ),
          steps: [
            { title: "Generate or pick a sprite", body: "Any sprite from your assets — a character, creature, weapon, item, vehicle or tile." },
            { title: "Choose the motion", body: "Use a suggested motion, set 4, 6 or 9 key poses and turn on smooth mode for in-betweens." },
            { title: "Download", body: "Sprite sheet PNG, frames ZIP and GIF — slice the sheet by cell size in Unity or load it into Godot's SpriteFrames." },
          ],
        },
      ]}
      faq={[
        { q: "What does the animation export look like?", a: "A horizontal sprite sheet: one row of equal-size frames with a transparent background, plus the frames as separate PNGs in a ZIP and an animated GIF preview." },
        { q: "How many frames do I get?", a: "4, 6 or 9 key poses. Smooth mode adds an AI-drawn in-between for every pair, giving 8, 12 or 18 frames." },
        { q: "How much does an animation cost?", a: "1 credit per frame: 4 credits for 4 frames, and twice that with smooth mode." },
        { q: "Can it animate things that aren't characters?", a: "Yes — creatures, weapons, items, vehicles, effects, icons and seamless tiles. The motions are suggested for the specific sprite." },
      ]}
      cta={{
        title: (
          <>
            Bring your sprites <span className="text-[#FF8A3D]">to life</span>
          </>
        ),
        body: "Generate a sprite and animate it in under two minutes.",
        button: "Get 10 free credits",
      }}
    />
  );
}
