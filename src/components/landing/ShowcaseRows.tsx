import Link from "next/link";
import { Download, Folder, FolderOpen } from "lucide-react";
import { CREDIT_COSTS } from "@/lib/services/generation";
import { SectionHeader } from "./SectionHeader";

const CHECKER = {
  backgroundColor: "#1B2446",
  backgroundImage:
    "linear-gradient(45deg, #212B4E 25%, transparent 25%, transparent 75%, #212B4E 75%), linear-gradient(45deg, #212B4E 25%, transparent 25%, transparent 75%, #212B4E 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 8px 8px",
};

function Row({ title, body, points, link, visual, flip = false }: {
  eyebrow?: string;
  title: React.ReactNode;
  body: string;
  points: string[];
  link?: { href: string; label: string };
  visual: React.ReactNode;
  flip?: boolean;
}) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className={flip ? "lg:order-2" : ""}>
        <h3 className="font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.01em] text-white sm:text-[34px]">{title}</h3>
        <p className="mt-4 max-w-[460px] text-pretty text-[15px] leading-relaxed text-[#C8CCE8]">{body}</p>
        <ul className="mt-6 space-y-2.5">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-2.5 text-[14px] text-[#C8CCE8]">
              <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 bg-[#00E436]" />{p}
            </li>
          ))}
        </ul>
        {link && (
          <Link href={link.href} className="mt-6 inline-flex min-h-10 items-center text-[14px] font-medium text-[#FFC857] underline decoration-[#FFC857]/40 underline-offset-4 transition-colors hover:decoration-[#FFC857]">
            {link.label}
          </Link>
        )}
      </div>
      <div className={flip ? "lg:order-1" : ""}>{visual}</div>
    </div>
  );
}

const Panel = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`relative overflow-hidden rounded-[10px] border border-white/[0.07] bg-[#19223F] p-4 shadow-[0_40px_100px_-40px_rgba(0,0,0,0.8)] sm:p-5 ${className}`}>
    {children}
  </div>
);

/* ── Visual 1: prompt → sprites ─────────────────────────────────────────── */
function CreateVisual() {
  const outs = [
    { src: "/showcase/fire-sword.png", alt: "Pixel art flaming sword" },
    { src: "/showcase/knight.png", alt: "Pixel art knight with sword and shield" },
    { src: "/showcase/health-potion.png", alt: "Pixel art red health potion" },
  ];
  return (
    <Panel>
      <div className="rounded-[8px] border border-white/[0.08] bg-[#131A31] px-4 py-3.5">
        <p className="font-mono text-[11px] text-[#8A92BF]">prompt</p>
        <p className="mt-1 text-[15px] text-white">a flaming sword with a glowing orange blade<span className="caret" /></p>
        <div className="mt-3 flex flex-wrap gap-1.5 font-mono text-[11px]">
          <span className="rounded-md border border-[#FFA300]/50 bg-[#FFA300]/10 px-2 py-1 text-white">Pixel 16-bit</span>
          <span className="rounded-md border border-white/[0.08] px-2 py-1 text-[#9AA1CC]">Weapons</span>
          <span className="rounded-md border border-white/[0.08] px-2 py-1 text-[#9AA1CC]">Standard · {CREDIT_COSTS.normal} credit</span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {outs.map((o, i) => (
          <div key={o.src} className={`relative aspect-square rounded-[8px] border ${i === 0 ? "border-[#FFA300]/50" : "border-white/[0.06]"}`} style={CHECKER}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={o.src} alt={o.alt} loading="lazy" className="pixel-perfect absolute inset-0 h-full w-full object-contain p-[14%]" />
            {i === 0 && <span className="absolute bottom-2 left-2 whitespace-nowrap rounded-md bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-white">PNG<span className="hidden sm:inline"> · transparent</span></span>}
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ── Visual 2: animations ───────────────────────────────────────────────── */
function AnimateVisual() {
  const anims = [
    { src: "/showcase/anim-dragon-breath.webp", label: "dragon", motion: "breathes fire", wide: true },
    { src: "/showcase/anim-dog-jump.gif", label: "dog", motion: "jumps" },
    { src: "/showcase/anim-car-drive.gif", label: "car", motion: "drives", wide: true },
    { src: "/showcase/anim-witch-walk.webp", label: "witch", motion: "walks" },
    { src: "/showcase/anim-knight-idle.webp", label: "knight", motion: "idle" },
    { src: "/showcase/anim-water.gif", label: "water tile", motion: "loops" },
  ];
  return (
    <Panel>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {anims.map((a) => (
          <figure key={a.src} className="overflow-hidden rounded-[8px] border border-white/[0.06] bg-[#131A31]">
            <div className="relative aspect-[4/3]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.src} alt={`Animated pixel art ${a.label} that ${a.motion}`} loading="lazy"
                className={`pixel-perfect absolute inset-0 h-full w-full object-contain ${"wide" in a ? "p-1" : "scale-[1.35]"}`} />
            </div>
            <figcaption className="flex items-center justify-between border-t border-white/[0.05] px-2.5 py-1.5 font-mono text-[10.5px]">
              <span className="text-[#9AA1CC]">{a.label}</span>
              <span className="text-[#FFC857]">{a.motion}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </Panel>
  );
}

/* ── Visual: 8 directions ───────────────────────────────────────────────── */
function DirectionsVisual() {
  const dirs = ["S", "SE", "E", "NE", "N", "NW", "W", "SW"];
  return (
    <Panel>
      <div className="grid grid-cols-4 gap-2.5">
        {dirs.map((d, i) => (
          <figure key={d} className="overflow-hidden rounded-[8px] border border-white/[0.06] bg-[#131A31]">
            <div role="img" aria-label={`Lizard warrior facing ${d}`} className="aspect-square"
              style={{ backgroundImage: "url(/showcase/rotate-lizard.png)", backgroundSize: "800% 100%", backgroundPosition: `${(i / 7) * 100}% 0`, backgroundRepeat: "no-repeat" }} />
            <figcaption className="border-t border-white/[0.05] py-1 text-center font-mono text-[10.5px] text-[#FFC857]">{d}</figcaption>
          </figure>
        ))}
      </div>
    </Panel>
  );
}

/* ── Visual 3: seamless tiles ───────────────────────────────────────────── */
function TilesVisual() {
  const tiles = [
    { src: "/showcase/tile-grass.png", label: "grass" },
    { src: "/showcase/tile-stone-wall.png", label: "stone wall" },
    { src: "/showcase/tile-water.png", label: "water" },
  ];
  return (
    <Panel>
      <div className="grid grid-cols-3 gap-3">
        {tiles.map((t) => (
          <figure key={t.src}>
            <div role="img" aria-label={`Seamless ${t.label} tile repeated 2 by 2`}
              className="aspect-square rounded-[8px] border border-white/[0.06]"
              style={{ backgroundImage: `url(${t.src})`, backgroundSize: "50% 50%", backgroundRepeat: "repeat", imageRendering: "pixelated" }} />
            <figcaption className="mt-2 text-center font-mono text-[11px] text-[#9AA1CC]">{t.label}</figcaption>
          </figure>
        ))}
      </div>
      <p className="mt-3 text-center font-mono text-[11px] text-[#8A92BF]">one tile, repeated 2 × 2 — no visible seams</p>
    </Panel>
  );
}

/* ── Visual 4: project with auto-sorted folders ─────────────────────────── */
function ProjectsVisual() {
  const folders = [
    { name: "All", n: 7, open: true },
    { name: "Characters", n: 2 },
    { name: "Enemies", n: 2 },
    { name: "Weapons", n: 2 },
    { name: "Items", n: 1 },
  ];
  const sprites = ["/showcase/knight.png", "/showcase/armored-knight.png", "/showcase/goblin-archer.png", "/showcase/slime.png", "/showcase/flame-blade.png", "/showcase/ice-staff.png", "/showcase/health-potion.png"];
  return (
    <Panel>
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
        <div>
          <p className="text-[14px] font-semibold text-white">Dungeon crawler</p>
          <p className="font-mono text-[11px] text-[#8A92BF]">7 assets · 4 folders</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[12px] font-semibold text-black">
          <Download className="h-3.5 w-3.5" /> Download ZIP
        </span>
      </div>
      <div className="mt-3 grid grid-cols-[130px_1fr] gap-3 sm:grid-cols-[150px_1fr]">
        <ul className="space-y-1 font-mono text-[12px]">
          {folders.map((f) => (
            <li key={f.name} className={`flex items-center justify-between rounded-lg px-2 py-1.5 ${f.open ? "bg-white/[0.06] text-white" : "text-[#9AA1CC]"}`}>
              <span className="flex items-center gap-1.5">{f.open ? <FolderOpen className="h-3.5 w-3.5 text-[#FFA300]" /> : <Folder className="h-3.5 w-3.5" />}{f.name}</span>
              <span className="text-[#8A92BF]">{f.n}</span>
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {sprites.map((s) => (
            <div key={s} className="relative aspect-square rounded-xl border border-white/[0.06]" style={CHECKER}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s} alt="" loading="lazy" className="pixel-perfect absolute inset-0 h-full w-full object-contain p-[16%]" />
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

/** "What you get" — real output instead of icon cards. */
export function ShowcaseRows() {
  return (
    <section id="features" className="relative mx-auto w-full max-w-[1200px] scroll-mt-16 space-y-20 px-5 py-16 sm:space-y-28 sm:py-20 lg:px-8">
      <SectionHeader
        title="Assets you can drop straight into your game"
        intro="Not pretty pictures — cleaned-up, game-ready files. Everything below was made with SpriteLab."
      />

      <Row
        title={<>Type a sentence.<br />Get a game-ready sprite.</>}
        body="Pick what you need — a hero, an enemy, a weapon, a potion — describe it, and get a clean sprite in seconds."
        points={[
          "Transparent background, no clean-up needed",
          "Pixel art snapped to a real pixel grid",
          "12 styles, from 16-bit pixel art to hand-painted",
        ]}
        link={{ href: "/how-it-works#generate", label: "How creating works" }}
        visual={<CreateVisual />}
      />

      <Row
        flip
        title={<>Animate anything —<br />not just people.</>}
        body="SpriteLab looks at your sprite before it animates it. Dragons breathe fire, dogs jump, cars drive, water flows."
        points={[
          "Motions suggested for each sprite, or describe your own",
          "4, 6 or 9 frames — or smooth motion with in-betweens",
          "Sprite sheet PNG, single frames and a GIF",
        ]}
        link={{ href: "/how-it-works#animate", label: "How animation works" }}
        visual={<AnimateVisual />}
      />

      <Row
        title={<>Every side of your<br />character, in one click.</>}
        body="Top-down or isometric game? Turn any character or creature into a 4- or 8-direction sheet — same size, same ground line, ready to slice."
        points={["4 directions (front, right, back, left) or all 8", "The same sprite from every angle — nothing redrawn off-model", "One view per frame, named S · E · N · W"]}
        link={{ href: "/how-it-works#animate", label: "How directions work" }}
        visual={<DirectionsVisual />}
      />

      <Row
        flip
        title={<>Tiles that repeat<br />without seams.</>}
        body="Floors, walls, grass and water that line up edge to edge — paint whole levels from one tile."
        points={["Square, seamless tiles for top-down and side-view levels", "Water and lava animate into perfect loops"]}
        link={{ href: "/ai-tileset-generator", label: "More about tiles" }}
        visual={<TilesVisual />}
      />

      <Row
        title={<>Your game&apos;s assets,<br />sorted for you.</>}
        body="Make a project for your game. Keep the sprites you like — they file themselves into folders — and download the whole pack at once."
        points={["Accept or decline every result", "Auto-sorted into characters, enemies, weapons, items…", "One ZIP for the whole project, free"]}
        link={{ href: "/how-it-works#projects", label: "How projects work" }}
        visual={<ProjectsVisual />}
      />
    </section>
  );
}
