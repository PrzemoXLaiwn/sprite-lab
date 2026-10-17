"use client";

import { useEffect, useRef } from "react";

export interface SpritePlayerProps {
  sheetUrl: string;
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
  fps: number;
  pixel: boolean;
  /** inspect = big and centred; game = on a ground at game scale, like in an engine */
  mode: "inspect" | "game";
  /** Game mode: scroll the ground for walk / run cycles. */
  moving?: boolean;
  /** Frames per row when the sheet is a grid (RPG walk sets); default: one row. */
  sheetCols?: number;
}

/**
 * Plays a horizontal sprite sheet the way a game engine does: each frame is
 * drawn whole and pixel-exact on a canvas, timed from the clock (not a
 * setInterval that drifts), pixel art at an integer scale with no smoothing.
 */
export function SpritePlayer({ sheetUrl, frameCount, frameWidth, frameHeight, fps, pixel, mode, moving = false, sheetCols }: SpritePlayerProps) {
  const cols = sheetCols && sheetCols > 0 ? sheetCols : frameCount;
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Latest props for the animation loop without restarting it
  const live = useRef({ fps, mode, moving });
  useEffect(() => { live.current = { fps, mode, moving }; }, [fps, mode, moving]);

  useEffect(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let disposed = false;
    const sheet = new Image();
    sheet.crossOrigin = "anonymous";
    const tile = new Image();
    tile.src = "/showcase/tile-grass.png";
    // Lowest opaque row across the sheet = where the feet stand
    let feet = frameHeight;
    const start = performance.now();
    let scroll = 0;
    let last = start;
    let lastKey = "";

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const r = wrap.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      canvas.style.width = `${r.width}px`;
      canvas.style.height = `${r.height}px`;
      lastKey = ""; // assigning width/height clears the canvas
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    const draw = (now: number) => {
      if (disposed) return;
      const { fps: f, mode: m, moving: mv } = live.current;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const index = Math.floor(((now - start) / 1000) * f) % frameCount;
      const W = canvas.width, H = canvas.height;
      // Repaint only when something visible changed: a still frame is not
      // redrawn 60× a second (the scrolling game ground always moves).
      const key = `${index}|${W}|${H}|${m}|${sheet.complete && sheet.naturalWidth}|${tile.complete}|${feet}`;
      if (key === lastKey && !(m === "game" && mv)) {
        raf = requestAnimationFrame(draw);
        return;
      }
      lastKey = key;
      ctx.clearRect(0, 0, W, H);
      ctx.imageSmoothingEnabled = !pixel;
      ctx.imageSmoothingQuality = "high";

      if (sheet.complete && sheet.naturalWidth) {
        if (m === "inspect") {
          let s = Math.min((W * 0.84) / frameWidth, (H * 0.84) / frameHeight);
          if (pixel && s >= 1) s = Math.floor(s);
          const w = Math.round(frameWidth * s), h = Math.round(frameHeight * s);
          ctx.drawImage(sheet, (index % cols) * frameWidth, Math.floor(index / cols) * frameHeight, frameWidth, frameHeight, Math.round((W - w) / 2), Math.round((H - h) / 2), w, h);
        } else {
          // Game scene: sky, a tiled ground strip, the sprite standing on it
          const groundY = Math.round(H * 0.7);
          const sky = ctx.createLinearGradient(0, 0, 0, groundY);
          sky.addColorStop(0, "#1b2433");
          sky.addColorStop(1, "#2c3a4f");
          ctx.fillStyle = sky;
          ctx.fillRect(0, 0, W, groundY);
          // Sprite at game scale: about a third of the view tall
          let s = (H * 0.36) / frameHeight;
          if (pixel && s >= 1) s = Math.max(1, Math.floor(s));
          const tileSize = Math.max(16, Math.round(frameHeight * s * 0.5));
          if (mv) scroll = (scroll + dt * frameHeight * s * 1.1) % tileSize;
          if (tile.complete && tile.naturalWidth) {
            ctx.imageSmoothingEnabled = false;
            for (let y = groundY; y < H; y += tileSize) {
              for (let x = -tileSize - Math.round(scroll); x < W; x += tileSize) ctx.drawImage(tile, x, y, tileSize, tileSize);
            }
            ctx.imageSmoothingEnabled = !pixel;
          } else {
            ctx.fillStyle = "#3d5a2a";
            ctx.fillRect(0, groundY, W, H - groundY);
          }
          // Darken the ground towards the bottom so the sprite stays the focus
          const shade = ctx.createLinearGradient(0, groundY, 0, H);
          shade.addColorStop(0, "rgba(0,0,0,0.15)");
          shade.addColorStop(1, "rgba(0,0,0,0.6)");
          ctx.fillStyle = shade;
          ctx.fillRect(0, groundY, W, H - groundY);
          ctx.fillStyle = "rgba(0,0,0,0.25)";
          ctx.fillRect(0, groundY, W, Math.max(2, Math.round(tileSize * 0.08)));
          const w = Math.round(frameWidth * s), h = Math.round(frameHeight * s);
          const x = Math.round(W / 2 - w / 2);
          const y = Math.round(groundY - feet * s + tileSize * 0.12);
          // Contact shadow
          ctx.fillStyle = "rgba(0,0,0,0.28)";
          ctx.beginPath();
          ctx.ellipse(W / 2, groundY + tileSize * 0.12, w * 0.22, Math.max(3, tileSize * 0.08), 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.drawImage(sheet, (index % cols) * frameWidth, Math.floor(index / cols) * frameHeight, frameWidth, frameHeight, x, y, w, h);
        }
      }
      raf = requestAnimationFrame(draw);
    };

    sheet.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = sheet.naturalWidth;
        c.height = sheet.naturalHeight;
        const cx = c.getContext("2d");
        if (cx) {
          cx.drawImage(sheet, 0, 0);
          const { data } = cx.getImageData(0, 0, c.width, c.height);
          outer: for (let y = c.height - 1; y >= 0; y--) {
            for (let x = 0; x < c.width; x++) if (data[(y * c.width + x) * 4 + 3] > 64) { feet = (y % frameHeight) + 1; break outer; }
          }
        }
      } catch { /* cross-origin canvas: keep the frame bottom */ }
    };
    sheet.src = sheetUrl;
    raf = requestAnimationFrame(draw);

    return () => { disposed = true; cancelAnimationFrame(raf); ro.disconnect(); };
  }, [sheetUrl, frameCount, frameWidth, frameHeight, pixel, cols]);

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas ref={canvasRef} role="img" aria-label="Animation preview" className="block h-full w-full" />
    </div>
  );
}
