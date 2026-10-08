import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const SITE = "https://www.sprite-lab.com";
export const CONTAINER = "mx-auto max-w-[1200px] px-5 lg:px-8";

export const PRIMARY_BTN =
  "px-corners inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] px-6 py-3 text-[15px] font-semibold text-white transition hover:brightness-110";

export function Eyebrow({ children }: { children: string }) {
  return <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#8B93A5]">{`// ${children}`}</p>;
}

export function SectionHead({ eyebrow, title, intro }: { eyebrow: string; title: ReactNode; intro?: string }) {
  return (
    <div className="mb-8 max-w-2xl">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-2 font-display text-[28px] font-semibold leading-tight text-white sm:text-[36px]">{title}</h2>
      {intro && <p className="mt-3 text-[15px] leading-relaxed text-[#8B93A5]">{intro}</p>}
    </div>
  );
}

export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export function Disclaimer({ checked }: { checked: string }) {
  return (
    <p className="font-mono text-[11.5px] leading-relaxed text-[#7A8294]">
      {`// Competitor details were checked on ${checked} using their own websites and documentation. Features and prices change — always confirm on the official site before deciding. Product names belong to their respective owners; SpriteLab is not affiliated with them.`}
    </p>
  );
}

export function CompareCta() {
  return (
    <section className="relative pb-24 pt-4">
      <div className={CONTAINER}>
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0E1016] px-6 py-14 text-center sm:px-12">
          <div className="pixel-grid pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_70%)]" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[320px] w-[640px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(255,138,61,0.10)_0%,transparent_70%)]" />
          <div className="relative">
            <Eyebrow>try it yourself</Eyebrow>
            <h2 className="mt-3 font-display text-[30px] font-semibold leading-tight text-white sm:text-[44px]">
              See if SpriteLab fits <span className="text-[#FF8A3D]">your game</span>
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-[#8B93A5]">
              The fastest way to compare is to generate a few sprites. 3 free tries without an account, 10 credits when you sign up.
            </p>
            <div className="mt-8 flex justify-center">
              <Link href="/register" className={PRIMARY_BTN}>
                Start free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <p className="mt-5 font-mono text-[11.5px] text-[#7A8294]">10 free credits on signup · no credit card required</p>
          </div>
        </div>
      </div>
    </section>
  );
}
