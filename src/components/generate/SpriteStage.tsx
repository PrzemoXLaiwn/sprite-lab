"use client";

/**
 * The stage: the sprite stands in a little game scene instead of floating in
 * a box. Its feet sit on the ground line (measured from the image itself),
 * pixel art is drawn at a whole-number zoom so every art pixel is the same
 * size, and "compare" puts the previous sprite next to it at the same scale —
 * how a game developer actually judges an asset.
 */

import { useEffect, useRef, useState } from "react";
import { fetchImage } from "@/lib/cors-image";

export const STAGE_SCENES = [
  { id: "checker", label: "Transparent" },
  { id: "grass", label: "Meadow" },
  { id: "dungeon", label: "Dungeon" },
  { id: "night", label: "Night" },
] as const;
export type StageSceneId = (typeof STAGE_SCENES)[number]["id"];

/** Where the ground line sits, as a share of the stage height. */
const GROUND = 0.78;

interface Metrics {
  /** Opaque content box as shares of the image (0..1). */
  top: number; bottom: number; left: number; right: number;
  /** Art pixels across the image (1024 / pixel factor), or the image width. */
  nativeW: number;
}

const metricsCache = new Map<string, Metrics>();

/** Reads the sprite's content box and pixel factor (falls back to sensible defaults). */
function useSpriteMetrics(url: string | null, pixel: boolean): Metrics | null {
  const [m, setM] = useState<Metrics | null>(() => (url ? metricsCache.get(url) ?? null : null));
  useEffect(() => {
    if (!url) { setM(null); return; }
    const hit = metricsCache.get(url);
    if (hit) { setM(hit); return; }
    let cancelled = false;
    (async () => {
      try {
        // Thumbnails cache this file without CORS headers: read it via fetchImage
        const blob = await (await fetchImage(url)).blob();
        const bmp = await createImageBitmap(blob);
        const c = document.createElement("canvas");
        c.width = bmp.width; c.height = bmp.height;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw new Error("no 2d");
        ctx.drawImage(bmp, 0, 0);
        const { data, width, height } = ctx.getImageData(0, 0, bmp.width, bmp.height);
        let x0 = width, y0 = height, x1 = -1, y1 = -1;
        for (let y = 0; y < height; y += 2) for (let x = 0; x < width; x += 2) {
          if (data[(y * width + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        }
        let factor = 1;
        if (pixel) {
          // Every sampled f×f block must be one colour (corner vs opposite corners)
          const same = (f: number) => {
            const blocks = width / f;
            const step = Math.max(1, Math.floor(blocks / 24));
            let checked = 0;
            for (let by = 0; by < blocks; by += step) for (let bx = 0; bx < blocks; bx += step) {
              const x = bx * f, y = by * f;
              const a = (y * width + x) * 4;
              for (const [dx, dy] of [[f - 1, 0], [0, f - 1], [f - 1, f - 1]]) {
                const b = ((y + dy) * width + x + dx) * 4;
                // A few levels of tolerance: PNG palette compression shifts colours slightly (same rule as pixelCanvasOf)
                if (Math.abs(data[a] - data[b]) + Math.abs(data[a + 1] - data[b + 1]) + Math.abs(data[a + 2] - data[b + 2]) + Math.abs(data[a + 3] - data[b + 3]) >= 8) return false;
              }
              checked++;
            }
            return checked > 0;
          };
          // At least 24 art pixels across: smaller "grids" are false positives
          for (let f = 16; f >= 2; f--) if (width % f === 0 && width / f >= 24 && same(f)) { factor = f; break; }
        }
        const res: Metrics = x1 < 0
          ? { top: 0.06, bottom: 0.94, left: 0.06, right: 0.94, nativeW: Math.round(width / factor) }
          : { top: y0 / height, bottom: (y1 + 2) / height, left: x0 / width, right: (x1 + 2) / width, nativeW: Math.round(width / factor) };
        metricsCache.set(url, res);
        if (!cancelled) setM(res);
      } catch {
        if (!cancelled) setM({ top: 0.06, bottom: 0.94, left: 0.06, right: 0.94, nativeW: 1024 });
      }
    })();
    return () => { cancelled = true; };
  }, [url, pixel]);
  return m;
}

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.floor(e.contentRect.width), h: Math.floor(e.contentRect.height) }));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

/** Scene layers: sky / wall above the ground line, a tiled floor below it. */
function SceneBackdrop({ scene }: { scene: StageSceneId }) {
  if (scene === "checker") return <div className="checker absolute inset-0" aria-hidden />;
  const sky =
    scene === "grass" ? "linear-gradient(180deg,#5FB8F5 0%,#A9DDF8 100%)"
    : scene === "night" ? "radial-gradient(1px 1px at 18% 22%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 63% 12%,#fff 50%,transparent 51%),radial-gradient(1.5px 1.5px at 82% 34%,#FFF1E8 50%,transparent 51%),radial-gradient(1px 1px at 38% 40%,#C8CCE8 50%,transparent 51%),linear-gradient(180deg,#0F1529 0%,#263260 100%)"
    : "linear-gradient(180deg,rgba(15,21,41,.55),rgba(15,21,41,.25)),url(/showcase/tile-stone-wall.png)";
  const floor = scene === "dungeon"
    ? "linear-gradient(180deg,rgba(15,21,41,.35),rgba(15,21,41,.75)),url(/showcase/tile-stone-wall.png)"
    : scene === "night"
    ? "linear-gradient(180deg,rgba(15,21,41,.55),rgba(15,21,41,.8)),url(/showcase/tile-grass.png)"
    : "url(/showcase/tile-grass.png)";
  return (
    <div className="absolute inset-0" aria-hidden>
      <div className="pixel-perfect absolute inset-x-0 top-0" style={{ height: `${GROUND * 100}%`, background: sky, backgroundSize: scene === "dungeon" ? "auto, 96px 96px" : undefined }} />
      <div className="pixel-perfect absolute inset-x-0 bottom-0" style={{ top: `${GROUND * 100}%`, background: floor, backgroundSize: scene === "grass" ? "128px 128px" : "auto, 128px 128px" }} />
      <div className="absolute inset-x-0 h-[3px] bg-black/30" style={{ top: `${GROUND * 100}%` }} />
    </div>
  );
}

function StandingSprite({ url, pixel, metrics, stage, k, height, x, dim, alt, boost = 1 }: {
  url: string; pixel: boolean; metrics: Metrics; stage: { w: number; h: number };
  /** Whole-number zoom per art pixel (pixel art). */ k: number;
  /** Content height in CSS px (non-pixel). */ height: number;
  /** Horizontal centre as a share of the stage width. */ x: number;
  dim?: boolean; alt: string;
  /** Zoom factor: lets a zoomed-in painted sprite grow past the stage width. */
  boost?: number;
}) {
  const contentH = metrics.bottom - metrics.top;
  // No art-pixel grid found (or a huge one): fit it like a painted sprite
  const onGrid = pixel && metrics.nativeW <= 400;
  const fitW = ((stage.w * 0.85) / Math.max(metrics.right - metrics.left, 0.05)) * boost;
  const imgW = onGrid ? metrics.nativeW * k : Math.min(height / Math.max(contentH, 0.05), fitW);
  const imgH = imgW; // sprites are square canvases
  const groundY = stage.h * GROUND;
  const cx = (metrics.left + metrics.right) / 2;
  const footW = (metrics.right - metrics.left) * imgW;
  return (
    <>
      <span aria-hidden className="absolute rounded-[50%] bg-black/30"
        style={{ left: stage.w * x - footW * 0.36, top: groundY - 5, width: footW * 0.72, height: 10 }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={alt} draggable={false}
        className={`absolute max-w-none select-none transition-opacity duration-300 ${pixel ? "pixel-perfect" : ""} ${dim ? "opacity-15" : "opacity-100"}`}
        style={{ width: imgW, height: imgH, left: Math.round(stage.w * x - cx * imgW), top: Math.round(groundY - metrics.bottom * imgH) }} />
    </>
  );
}

/** What the zoom control shows for a step: whole-number scale for pixel art, a percentage otherwise. */
export function zoomLabel(steps: number, pixel: boolean, fitK: number | null): string {
  if (pixel && fitK) return `${Math.max(1, fitK + steps)}×`;
  return `${Math.round(100 * Math.pow(1.25, steps))}%`;
}

export function SpriteStage({ imageUrl, pixel, compareUrl, comparePixel, scene, dim, alt, children, zoom = 0, onFit }: {
  imageUrl: string | null;
  pixel: boolean;
  /** Previous sprite shown beside it at the same scale. */
  compareUrl?: string | null;
  comparePixel?: boolean;
  scene: StageSceneId;
  dim?: boolean;
  alt: string;
  /** Overlays: progress, empty state. */
  children?: React.ReactNode;
  /** Zoom steps away from "fit": whole pixels per step for pixel art, ×1.25 per step otherwise. */
  zoom?: number;
  /** Reports the fitted whole-number scale (pixel art) so the zoom label can show it. */
  onFit?: (k: number | null) => void;
}) {
  const [ref, stage] = useSize<HTMLDivElement>();
  const main = useSpriteMetrics(imageUrl, pixel);
  const other = useSpriteMetrics(compareUrl ?? null, !!comparePixel);
  const comparing = !!(compareUrl && other && main);

  // Tallest sprite fills ~62% of the space above the ground (less when two stand side by side)
  const room = stage.h * GROUND * (comparing ? 0.66 : 0.82);
  const artH = (m: Metrics | null) => (m ? (m.bottom - m.top) * m.nativeW : 1);
  const tallest = Math.max(artH(main), comparing ? artH(other) : 0, 1);
  const k = Math.max(1, Math.floor(room / tallest));
  const widthCap = (m: Metrics | null) => (m ? stage.w * (comparing ? 0.42 : 0.8) / Math.max((m.right - m.left) * m.nativeW, 1) : k);
  const kFit = Math.max(1, Math.min(k, Math.floor(widthCap(main)), comparing ? Math.floor(widthCap(other)) : k));
  // Zoom stays on whole pixels for pixel art; painted art scales smoothly
  const kZoom = Math.max(1, kFit + zoom);
  const hZoom = Math.pow(1.25, zoom);
  const onGridMain = !!main && pixel && main.nativeW <= 400;
  useEffect(() => { onFit?.(onGridMain && stage.w > 0 ? kFit : null); }, [onFit, onGridMain, kFit, stage.w]);

  return (
    <div ref={ref} className="relative h-full w-full overflow-hidden rounded-[14px] border border-[rgba(124,140,214,0.22)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_0_1px_rgba(4,7,20,0.45),0_28px_60px_-34px_rgba(4,7,20,1)]">
      <SceneBackdrop scene={scene} />
      {imageUrl && main && stage.w > 0 && (
        <StandingSprite url={imageUrl} pixel={pixel} metrics={main} stage={stage} k={kZoom} height={room * (artH(main) / tallest) * hZoom} x={comparing ? 0.66 : 0.5} dim={dim} alt={alt} boost={hZoom} />
      )}
      {comparing && compareUrl && other && (
        <StandingSprite url={compareUrl} pixel={!!comparePixel} metrics={other} stage={stage} k={kZoom} height={room * (artH(other) / tallest) * hZoom} x={0.3} dim={dim} alt="Previous sprite, for scale" boost={hZoom} />
      )}
      {children}
    </div>
  );
}
