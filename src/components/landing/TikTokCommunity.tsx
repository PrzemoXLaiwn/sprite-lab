import { Play, Heart, Eye, ArrowUpRight } from "lucide-react";
import { getTopTikToks } from "@/lib/tiktok";
import { TIKTOK_HANDLE, TIKTOK_PROFILE_URL, COMMUNITY_HASHTAG, LOCAL_CLIPS } from "@/data/tiktok";
import { InViewVideo } from "./InViewVideo";
import { TikTokIcon } from "@/components/icons/TikTokIcon";

export { TikTokIcon };


const compact = (n: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
const CARD = "group relative aspect-[9/16] overflow-hidden rounded-2xl border border-white/[0.07] bg-[#161E39] transition-colors hover:border-white/25";

/**
 * Homepage community section. Shows the most-viewed TikTok videos when the
 * TikTok API (or a featured list) is configured, otherwise our own clips.
 */
export async function TikTokCommunity() {
  const videos = await getTopTikToks(3);

  return (
    <section id="community" className="relative border-y border-white/[0.05] bg-[#19223F]">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:px-5 sm:py-20 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div>
          <h2 className="font-display text-[32px] font-semibold leading-[1.08] tracking-[-0.01em] text-white sm:text-[44px]">
            Follow along on TikTok
          </h2>
          <p className="mt-4 text-pretty text-[15px] leading-relaxed text-[#C8CCE8] sm:text-[16px]">
            We post new sprites, animations and game-dev tricks on TikTok. Made something cool? Tag it with{" "}
            <span className="font-semibold text-[#FFF1E8]">#{COMMUNITY_HASHTAG}</span> — we feature our favourites.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a href={TIKTOK_PROFILE_URL} target="_blank" rel="noopener noreferrer"
              className="flex h-11 items-center gap-2 rounded-[8px] border border-white/[0.14] px-5 text-[14px] font-semibold text-[#FFF1E8] transition hover:bg-white/[0.08]">
              <TikTokIcon className="h-4 w-4" /> Follow @{TIKTOK_HANDLE}<span className="sr-only"> on TikTok (opens in a new tab)</span>
            </a>
            <a href={`https://www.tiktok.com/tag/${COMMUNITY_HASHTAG}`} target="_blank" rel="noopener noreferrer"
              className="flex h-11 items-center gap-1 px-2 text-[13px] text-[#A7ADD4] underline-offset-4 transition hover:text-white hover:underline">
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
                    <span className="absolute left-2 top-2 rounded-md bg-[#FFA300] px-1.5 py-0.5 font-mono text-[12px] font-semibold text-black">most viewed</span>
                  )}
                  <Play className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 fill-white/90 text-white/90 opacity-0 transition group-hover:opacity-100" />
                  <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3">
                    {v.views !== null && (
                      <div className="flex items-center gap-2.5 font-mono text-[12px] text-white">
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
                    <p className="line-clamp-2 text-[13px] font-medium leading-snug text-white sm:text-[14px]">{c.title}</p>
                    <p className="mt-1 flex items-center gap-1 font-mono text-[12px] text-white/70"><TikTokIcon className="h-3 w-3" />@{TIKTOK_HANDLE}</p>
                  </div>
                </a>
              ))}
        </div>
      </div>
    </section>
  );
}
