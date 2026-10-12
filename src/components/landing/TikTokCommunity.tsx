import { Play, Heart, Eye, ArrowUpRight } from "lucide-react";
import { getTopTikToks } from "@/lib/tiktok";
import { TIKTOK_HANDLE, TIKTOK_PROFILE_URL, COMMUNITY_HASHTAG, LOCAL_CLIPS } from "@/data/tiktok";
import { InViewVideo } from "./InViewVideo";

export function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M19.6 6.7a4.8 4.8 0 0 1-3.8-4.2V2h-3.4v13.4a2.9 2.9 0 1 1-2-2.7V9.2a6.3 6.3 0 1 0 5.4 6.2V8.6a8.2 8.2 0 0 0 4.8 1.5V6.7h-1z" />
    </svg>
  );
}

const compact = (n: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
const CARD = "group relative aspect-[9/16] overflow-hidden rounded-2xl border border-white/[0.07] bg-[#12151C] transition-colors hover:border-white/25";

/**
 * Homepage community section. Shows the most-viewed TikTok videos when the
 * TikTok API (or a featured list) is configured, otherwise our own clips.
 */
export async function TikTokCommunity() {
  const videos = await getTopTikToks(3);

  return (
    <section id="community" className="relative border-y border-white/[0.05] bg-[#0E1016]">
      <div className="mx-auto grid w-full max-w-[1200px] items-center gap-12 px-5 py-16 sm:py-20 lg:grid-cols-[minmax(0,420px)_1fr] lg:px-8">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#8B93A5]">{"// community"}</p>
          <h2 className="mt-3 font-display text-[32px] font-semibold leading-[1.08] tracking-[-0.01em] text-white sm:text-[44px]">
            Made by devs like you.
            <br />
            <span className="text-[#FF8A3D]">Shared every day.</span>
          </h2>
          <p className="mt-4 text-pretty text-[15px] leading-relaxed text-[#8B93A5] sm:text-[16px]">
            We post new sprites, animations and game-dev tricks on TikTok. Made something cool? Tag it with{" "}
            <span className="font-mono text-[#C9CFDB]">#{COMMUNITY_HASHTAG}</span> — we feature our favourites.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a href={TIKTOK_PROFILE_URL} target="_blank" rel="noopener noreferrer"
              className="flex h-11 items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-5 text-[14px] font-semibold text-[#ECEEF3] transition hover:bg-white/[0.08]">
              <TikTokIcon className="h-4 w-4" /> Follow @{TIKTOK_HANDLE}<span className="sr-only"> on TikTok (opens in a new tab)</span>
            </a>
            <a href={`https://www.tiktok.com/tag/${COMMUNITY_HASHTAG}`} target="_blank" rel="noopener noreferrer"
              className="flex h-11 items-center gap-1 px-2 text-[13px] text-[#A6ADBB] underline-offset-4 transition hover:text-white hover:underline">
              Browse #{COMMUNITY_HASHTAG} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {videos.length > 0
            ? videos.map((v, i) => (
                <a key={v.id} href={v.url} target="_blank" rel="noopener noreferrer" className={CARD}>
                  {v.cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.cover} alt={v.title || "SpriteLab on TikTok"} loading="lazy" referrerPolicy="no-referrer"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
                  {i === 0 && v.views !== null && (
                    <span className="absolute left-2 top-2 rounded-md bg-[#FF8A3D] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-black">most viewed</span>
                  )}
                  <Play className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 fill-white/90 text-white/90 opacity-0 transition group-hover:opacity-100" />
                  <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3">
                    {v.views !== null && (
                      <div className="flex items-center gap-2.5 font-mono text-[11px] text-white">
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{compact(v.views)}</span>
                        {v.likes !== null && <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{compact(v.likes)}</span>}
                      </div>
                    )}
                  </div>
                </a>
              ))
            : LOCAL_CLIPS.map((c, i) => (
                <a key={c.src} href={TIKTOK_PROFILE_URL} target="_blank" rel="noopener noreferrer"
                  className={`${CARD} ${i === 1 ? "sm:-translate-y-6" : ""}`}>
                  <InViewVideo src={c.src} poster={c.poster} label={c.title}
                    className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2.5 pt-10 sm:p-3 sm:pt-12">
                    <p className="line-clamp-2 text-[11px] font-medium leading-snug text-white sm:text-[12px]">{c.title}</p>
                    <p className="mt-1 flex items-center gap-1 font-mono text-[10px] text-white/70"><TikTokIcon className="h-3 w-3" />@{TIKTOK_HANDLE}</p>
                  </div>
                </a>
              ))}
        </div>
      </div>
    </section>
  );
}
