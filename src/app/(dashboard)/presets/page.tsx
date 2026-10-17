import Link from "next/link";
import { Palette, Paintbrush } from "lucide-react";

export default function PresetsPage() {
  return (
    <div className="mx-auto max-w-[1100px] px-5 py-6 lg:px-8">
      <div className="mb-6">
        <h1 className="font-display text-[24px] font-semibold leading-tight tracking-tight text-white">Style presets</h1>
        <p className="mt-1 max-w-xl text-[13px] text-[#9AA1CC]">
          Save a style, quality and palette once, then reuse it for every asset in your game.
        </p>
      </div>

      <div className="pixel-grid flex flex-col items-center rounded-2xl border border-dashed border-white/[0.08] bg-[#19223F] px-6 py-14 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.06] bg-[#212B4E]">
          <Palette className="h-5 w-5 text-[#9AA1CC]" aria-hidden />
        </div>
        <span className="mb-3 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-[#C8CCE8]">
          coming soon
        </span>
        <h2 className="text-[15px] font-semibold text-white">Keep every sprite in one look — today</h2>
        <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-[#9AA1CC]">
          Until presets arrive: when you generate a sprite you like, press{" "}
          <span className="text-[#C8CCE8]">Match style</span> under it. Everything you create next is drawn in exactly that style
          and pixel size.
        </p>
        <Link
          href="/generate"
          className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-[13px] font-medium text-[#C8CCE8] transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <Paintbrush className="h-4 w-4 text-[#FFA300]" aria-hidden /> Open the generator
        </Link>
      </div>
    </div>
  );
}
