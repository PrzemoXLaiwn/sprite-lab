import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog — New Features & Updates",
  description:
    "Release notes for SpriteLab, the AI game asset generator for indie developers: new features, improvements and fixes to sprite generation and animation.",
  alternates: { canonical: "https://www.sprite-lab.com/changelog" },
  openGraph: {
    title: "Changelog — New Features & Updates | SpriteLab",
    description: "Release notes for SpriteLab, the AI game asset generator for indie developers: new features, improvements and fixes to sprite generation and animation.",
    url: "https://www.sprite-lab.com/changelog",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Changelog — New Features & Updates | SpriteLab",
    description: "Release notes for SpriteLab, the AI game asset generator for indie developers: new features, improvements and fixes to sprite generation and animation.",
  },
};

const CHANGELOG = [
  {
    date: "October 2026",
    version: "2.0.0",
    title: "Relaunch: New Sprite Pipeline & Animation",
    type: "release" as const,
    changes: [
      "New generation pipeline: transparent PNG sprites, with pixel art snapped to a real pixel grid and a limited palette",
      "12 art styles, from Pixel 16-bit and Pixel HD to Dark Fantasy, Anime and Hand Painted",
      "Sprite animation: idle, walk, run, attack, jump, fly, turnaround or a custom move, exported as a horizontal sprite sheet, frames and a GIF",
      "4, 6 or 9 key poses, or smooth mode with up to 18 frames",
      "Seamless floor and wall tiles",
      "Projects with automatic folder sorting and ZIP export",
      "Free pixel-perfect upscale",
      "Try 3 generations without an account; 10 free credits on signup",
    ],
  },
  {
    date: "December 2024",
    version: "1.2.0",
    title: "Community Gallery & Social Features",
    type: "feature" as const,
    changes: [
      "New Community Gallery - share your creations with other developers",
      "Like and comment on community assets",
      "Bulk delete in personal gallery",
      "Share button to publish assets to community",
    ],
  },
  {
    date: "December 2024",
    version: "1.1.0",
    title: "3D Model Generation (since retired)",
    type: "feature" as const,
    changes: [
      "3D model generation with TRELLIS AI",
      "GLB/PLY format export for game engines",
      "Support for Unity, Unreal, Godot, and Blender",
      "Improved 3D preview in gallery",
      "Update: 3D generation has since been retired. SpriteLab now focuses on 2D game assets.",
    ],
  },
  {
    date: "November 2024",
    version: "1.0.0",
    title: "Public Launch",
    type: "release" as const,
    changes: [
      "10+ art styles for 2D sprite generation",
      "12 asset categories (weapons, armor, characters, etc.)",
      "Transparent PNG export with background removal",
      "Stripe payments integration",
      "User dashboard with personal gallery",
      "Credit-based pricing system",
      "Free tier with 10 credits",
    ],
  },
];

const TYPE_LABEL = { release: "release", feature: "feature" } as const;

export default function ChangelogPage() {
  return (
    <div className="relative">
      <div className="pixel-grid pointer-events-none absolute inset-x-0 top-0 h-[360px] [mask-image:radial-gradient(ellipse_at_top,black_15%,transparent_70%)]" />
      <div className="relative mx-auto max-w-3xl px-5 pb-24 pt-14 sm:pt-20">
        <h1 className="mt-3 font-display text-[36px] font-semibold leading-[1.06] tracking-[-0.015em] text-white sm:text-[48px]">
          What&apos;s new in SpriteLab
        </h1>
        <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-[#9AA1CC]">
          Every release, newest first.
        </p>

        <ol className="mt-14 space-y-12">
          {CHANGELOG.map((release, index) => (
            <li key={release.version} className="relative grid gap-3 sm:grid-cols-[150px_1fr] sm:gap-8">
              {/* Timeline */}
              {index < CHANGELOG.length - 1 && (
                <span aria-hidden="true" className="absolute bottom-[-48px] left-[5px] top-3 w-px bg-white/[0.07] sm:left-[165px]" />
              )}
              <div className="flex items-center gap-3 pl-6 sm:block sm:pl-0 sm:pt-0.5 sm:text-right">
                <span aria-hidden="true" className={`absolute left-0 top-1.5 h-[11px] w-[11px] rounded-[2px] border sm:left-[160px] ${
                  index === 0 ? "border-[#FFA300] bg-[#FFA300]" : "border-white/20 bg-[#131A31]"
                }`} />
                <p className="font-mono text-[12px] text-[#FFC857]">v{release.version}</p>
                <p className="font-mono text-[12px] text-[#8A92BF] sm:mt-1">{release.date}</p>
              </div>

              <div className="pl-6 sm:pl-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-[22px] font-semibold leading-snug text-white">{release.title}</h2>
                  <span className="rounded-full border border-white/[0.08] px-2 py-0.5 font-mono text-[10.5px] text-[#9AA1CC]">
                    {TYPE_LABEL[release.type]}
                  </span>
                </div>
                <ul className="mt-4 space-y-2.5">
                  {release.changes.map((change) => (
                    <li key={change} className="flex items-start gap-3 text-[15px] leading-relaxed text-[#A7ADD4]">
                      <span aria-hidden="true" className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-[1px] bg-[#FFA300]/70" />
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>

        {/* Feedback */}
        <div className="mt-20 rounded-3xl border border-white/[0.07] bg-[#19223F] p-8 text-center sm:p-10">
          <h2 className="font-display text-[24px] font-semibold leading-tight text-white sm:text-[28px]">Missing something?</h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-[#9AA1CC]">
            Feature requests and bug reports go straight to the developer.
          </p>
          <a
            href="mailto:support@sprite-lab.com"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] px-6 text-[14px] font-semibold text-[#FFF1E8] transition hover:bg-white/[0.08]"
          >
            Email support@sprite-lab.com
          </a>
        </div>
      </div>
    </div>
  );
}
