"use client";

import { useEffect, useState } from "react";
import { Download, Loader2, Share2 } from "lucide-react";
import type { PartyMember } from "@/lib/dungeon/store";
import type { RunReport } from "@/lib/dungeon/summary";
import { FUNNEL, track } from "@/lib/analytics";
import { Sheet } from "./Sheet";
import { renderRunCard } from "./share-card";

/** Preview of the 9:16 run card with Share (where the browser can share files) and Download. */
export function ShareCardSheet({ report, members, onClose }: { report: RunReport; members: PartyMember[]; onClose: () => void }) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [canShareFile, setCanShareFile] = useState(false);

  useEffect(() => {
    let alive = true;
    let made: string | null = null;
    renderRunCard(report, members)
      .then((b) => {
        if (!alive) return;
        made = URL.createObjectURL(b);
        setBlob(b);
        setUrl(made);
        try {
          const file = new File([b], "sprite-dungeon.png", { type: "image/png" });
          setCanShareFile(typeof navigator.canShare === "function" && navigator.canShare({ files: [file] }));
        } catch { setCanShareFile(false); }
      })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; if (made) URL.revokeObjectURL(made); };
  }, [report, members]);

  const fileName = `sprite-dungeon-floor-${report.floor}.png`;
  const download = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    track(FUNNEL.dungeonShareCard, { method: "download", floor: report.floor });
  };
  const share = async () => {
    if (!blob) return;
    try {
      await navigator.share({
        files: [new File([blob], fileName, { type: "image/png" })],
        text: `Floor ${report.floor} in the Sprite Dungeon with heroes I made on sprite-lab.com`,
      });
      track(FUNNEL.dungeonShareCard, { method: "share", floor: report.floor });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) download();
    }
  };

  return (
    <Sheet title="Share your climb" onClose={onClose}>
      <div className="flex flex-col items-center gap-3">
        <div className="checker relative flex aspect-[9/16] w-full max-w-[260px] items-center justify-center overflow-hidden rounded-[8px] border border-white/[0.1]">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element -- a blob: URL made on this page
            <img src={url} alt={`Run card: floor ${report.floor}`} className="h-full w-full object-contain" />
          ) : error ? (
            <p className="px-4 text-center text-[13px] text-[#C8CCE8]">Couldn&apos;t draw the card. Close this and try again.</p>
          ) : (
            <Loader2 className="h-6 w-6 animate-spin text-[#A7ADD4]" aria-label="Drawing your card" />
          )}
        </div>
        <p className="text-center text-[12.5px] text-[#A7ADD4]">A 1080×1920 image for TikTok, Shorts or Reels, made from your run and your own sprites.</p>
        <div className="flex w-full flex-wrap justify-center gap-2">
          {canShareFile && (
            <button type="button" onClick={() => void share()} disabled={!blob} className="btn btn-primary h-11 px-4">
              <Share2 className="h-4 w-4" aria-hidden /> Share
            </button>
          )}
          <button type="button" onClick={download} disabled={!url} className={`btn ${canShareFile ? "btn-secondary" : "btn-primary"} h-11 px-4`}>
            <Download className="h-4 w-4" aria-hidden /> Download PNG
          </button>
        </div>
      </div>
    </Sheet>
  );
}
