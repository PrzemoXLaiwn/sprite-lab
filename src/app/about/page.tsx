import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteNav } from "@/components/layout/SiteNav";
import { Footer } from "@/components/layout/Footer";
import { SUPPORT_EMAIL } from "@/config/contact";

const SITE = "https://www.sprite-lab.com";
const URL = `${SITE}/about`;
const DESCRIPTION =
  "Who makes SpriteLab, what it is for, how its sprites and animations are produced, what it does not do, and how to reach us.";

export const metadata: Metadata = {
  title: { absolute: "About SpriteLab — Who We Are and How It Works | SpriteLab" },
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: { title: "About SpriteLab", description: DESCRIPTION, url: URL, type: "website" },
};

const CHECKER = {
  backgroundImage: "repeating-conic-gradient(#ffffff06 0% 25%, transparent 0% 50%)",
  backgroundSize: "14px 14px",
};

/** The pipeline, in the order a request goes through it. */
const PIPELINE: { title: string; body: string }[] = [
  {
    title: "Your prompt is read",
    body: "The prompt picks the asset type, art style and view (or you set them yourself). Prompts in other languages are translated to English first.",
  },
  {
    title: "An image model draws it",
    body: "Generation runs on hosted image models through Runware, with Cloudflare Workers AI as a fallback when capacity is short. We pick the model per task and price; you never need an API key.",
  },
  {
    title: "We turn the image into a sprite",
    body: "Our own post-processing removes the background to real transparency, and for pixel styles snaps the image to one pixel grid with a limited palette and a consistent outline. Tiles are checked at the edges and blended so they repeat without seams.",
  },
  {
    title: "Animations are planned, then drawn",
    body: "For an animation, Claude (by Anthropic) plans the key poses for that specific sprite; the image model draws them from your sprite as a reference; we cut out the frames, align them on one ground line, match their colours and build the sheet, GIF and engine pack. Idle breathing is made by gently deforming your original sprite instead of redrawing it.",
  },
  {
    title: "If it fails, you get your credits back",
    body: "When a generation fails or comes back broken — for example a direction sheet with a sliced figure — it is rejected and the credits are returned automatically.",
  },
];

const NOT_DOING = [
  "No 3D models, no public API and no MCP server at the moment.",
  "No full autotile sets (edges and corners); single seamless tiles and animated tiles only.",
  "No Unity, Godot or GameMaker plugins — the exports are standard files those engines import with their own tools.",
  "No guarantee that a generated asset is perfect. For a hero character or a key boss, plan on a manual polish pass in a pixel editor.",
];

export default function AboutPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: "About SpriteLab",
      description: DESCRIPTION,
      url: URL,
      mainEntity: {
        "@type": "Organization",
        name: "SpriteLab",
        url: SITE,
        logo: `${SITE}/logo.png`,
        email: SUPPORT_EMAIL,
        contactPoint: { "@type": "ContactPoint", contactType: "customer support", email: SUPPORT_EMAIL, url: `${SITE}/contact` },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "SpriteLab", item: SITE },
        { "@type": "ListItem", position: 2, name: "About", item: URL },
      ],
    },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0B0D12] text-[#ECEEF3]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteNav />

      <article className="relative pb-24 pt-28 sm:pt-36">
        <div className="relative mx-auto max-w-3xl px-5">
          <p className="font-mono text-[12px] text-[#FFB27A]">&gt; about</p>
          <h1 className="mt-4 font-display text-[38px] font-semibold leading-[1.06] text-white sm:text-[52px]">
            About SpriteLab
          </h1>
          <p className="mt-5 text-[17px] leading-relaxed text-[#A6ADBB]">
            SpriteLab is a web app that makes 2D game assets for indie developers: sprites, animations, direction
            sheets, seamless tiles and icons, exported as files that Godot, Unity and GameMaker import directly. It is
            an independent product, built and run by the SpriteLab team — not a feature of an engine or of an AI
            company.
          </p>

          <section className="mt-14">
            <h2 className="font-display text-[26px] font-semibold leading-tight text-white">Why it exists</h2>
            <p className="mt-4 text-[16px] leading-[1.75] text-[#A6ADBB]">
              Small teams and solo developers usually hit the same wall: the game works with placeholder squares, but
              there is no budget or time to draw every character, enemy, item and animation. General AI image tools
              produce nice pictures, but a picture on a white background, with blurry fake pixels and a character that
              changes between frames, is not something you can drop into a game.
            </p>
            <p className="mt-4 text-[16px] leading-[1.75] text-[#A6ADBB]">
              SpriteLab is built around the parts that make an image usable as a game asset: transparency, a real
              pixel grid, a consistent outline, frames of equal size on one ground line, and files named and laid out
              the way each engine expects. The guides on this site cover the other half of that work: what you set
              up in your engine once the files are on disk.
            </p>
          </section>

          <section className="mt-14">
            <h2 className="font-display text-[26px] font-semibold leading-tight text-white">How the output is made</h2>
            <p className="mt-4 text-[16px] leading-[1.75] text-[#A6ADBB]">
              Every asset is generated by AI models and then processed by our own code. Here is what happens to a
              request, in order:
            </p>
            <ol className="mt-6 space-y-3">
              {PIPELINE.map((step, i) => (
                <li key={step.title} className="flex gap-4 rounded-xl border border-white/[0.06] bg-[#151922] px-4 py-4">
                  <span className="mt-0.5 shrink-0 font-mono text-[12px] text-[#FFB27A]">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="text-[15.5px] font-semibold text-[#ECEEF3]">{step.title}</h3>
                    <p className="mt-1 text-[14.5px] leading-relaxed text-[#A6ADBB]">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-[15px] leading-relaxed text-[#8B93A5]">
              The full list of services that touch your data is in the{" "}
              <Link href="/privacy" className="text-[#FFB27A] underline underline-offset-2">privacy policy</Link>.
            </p>
          </section>

          <section className="mt-14">
            <h2 className="font-display text-[26px] font-semibold leading-tight text-white">Real output</h2>
            <p className="mt-4 text-[16px] leading-[1.75] text-[#A6ADBB]">
              Examples from our showcase, made with SpriteLab: a sprite, a 4-direction view sheet and an
              animation.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { src: "/showcase/goblin-archer.png", alt: "Pixel art goblin archer sprite" },
                { src: "/showcase/rotate-knight.png", alt: "Knight seen from four directions" },
                { src: "/showcase/anim-dragon-breath.gif", alt: "Dragon fire-breath animation" },
              ].map((img) => (
                <figure key={img.src}>
                  <div className="flex aspect-square items-center justify-center rounded-xl border border-white/[0.06] bg-[#12151C] p-3" style={CHECKER}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.src} alt={img.alt} loading="lazy" className="pixel-perfect h-full w-full object-contain" />
                  </div>
                  <figcaption className="mt-1.5 text-center font-mono text-[11px] leading-snug text-[#7A8294]">{img.alt}</figcaption>
                </figure>
              ))}
            </div>
          </section>

          <section className="mt-14">
            <h2 className="font-display text-[26px] font-semibold leading-tight text-white">What SpriteLab does not do</h2>
            <p className="mt-4 text-[16px] leading-[1.75] text-[#A6ADBB]">
              Being clear about limits saves you time:
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-[15.5px] leading-relaxed text-[#C9CFDB] marker:text-[#FF8A3D]">
              {NOT_DOING.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </section>

          <section className="mt-14">
            <h2 className="font-display text-[26px] font-semibold leading-tight text-white">Ownership, ads and money</h2>
            <p className="mt-4 text-[16px] leading-[1.75] text-[#A6ADBB]">
              Assets you generate can be used in commercial games without attribution; the details are in the{" "}
              <Link href="/terms" className="text-[#FFB27A] underline underline-offset-2">terms</Link>. SpriteLab is paid
              for by credit plans and packs (see <Link href="/pricing" className="text-[#FFB27A] underline underline-offset-2">pricing</Link>)
              and by ads shown on guide articles and comparisons to visitors who are not signed in. Members never see ads,
              and the app itself is ad-free.
            </p>
          </section>

          <section className="mt-14 rounded-2xl border border-white/[0.08] bg-[#0E1016] p-6 sm:p-8">
            <h2 className="font-display text-[24px] font-semibold leading-tight text-white">Get in touch</h2>
            <p className="mt-3 text-[15.5px] leading-relaxed text-[#A6ADBB]">
              Bug reports, billing questions, feature requests and press: write to{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#FFB27A] underline underline-offset-2">{SUPPORT_EMAIL}</a>.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/contact"
                className="px-corners inline-flex h-11 items-center justify-center gap-2 bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] px-5 text-[14.5px] font-semibold text-white transition hover:brightness-110"
              >
                Contact page <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/guides"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-5 text-[14.5px] text-[#ECEEF3] transition hover:bg-white/[0.08]"
              >
                Read the guides
              </Link>
            </div>
          </section>
        </div>
      </article>

      <Footer />
    </main>
  );
}
