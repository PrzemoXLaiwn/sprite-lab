"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The sprite with a paint layer on top: drag to mark the area an edit may
 * change. The mask covers the whole (square) sprite image, matching how the
 * server frames it. Painted pixels are opaque in the exported PNG.
 */
export function MaskPainter({ src, pixel, brush, canvasRef, onPaintedChange, disabled }: {
  src: string;
  pixel: boolean;
  /** Brush diameter as a fraction of the image side. */
  brush: number;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onPaintedChange: (painted: boolean) => void;
  disabled?: boolean;
}) {
  const RES = 512;
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (c) { c.width = RES; c.height = RES; }
  }, [canvasRef]);

  const pos = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * RES, y: ((e.clientY - r.top) / r.height) * RES, px: e.clientX - r.left, py: e.clientY - r.top };
  };

  const stroke = (x: number, y: number) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "rgba(255,163,0,1)";
    ctx.strokeStyle = "rgba(255,163,0,1)";
    ctx.lineCap = "round";
    ctx.lineWidth = brush * RES;
    ctx.beginPath();
    if (last.current) { ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(x, y); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(x, y, (brush * RES) / 2, 0, Math.PI * 2); ctx.fill();
    last.current = { x, y };
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center p-[6%]">
      <div className="relative aspect-square h-full max-h-full max-w-full touch-none select-none"
        role="img" aria-label="Sprite. Drag over it to paint the area the edit may change."
        style={{ cursor: disabled ? "default" : "none" }}
        onPointerDown={(e) => { if (disabled) return; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); drawing.current = true; last.current = null; const p = pos(e); stroke(p.x, p.y); onPaintedChange(true); }}
        onPointerMove={(e) => { const p = pos(e); setCursor({ x: p.px, y: p.py }); if (drawing.current) stroke(p.x, p.y); }}
        onPointerUp={() => { drawing.current = false; last.current = null; }}
        onPointerCancel={() => { drawing.current = false; last.current = null; setCursor(null); }}
        onPointerLeave={() => { drawing.current = false; last.current = null; setCursor(null); }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" draggable={false} className={`absolute inset-0 h-full w-full object-contain ${pixel ? "pixel-perfect" : ""}`} />
        <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full opacity-45 mix-blend-normal" />
        {cursor && !disabled && (
          <span className="pointer-events-none absolute rounded-full border-2 border-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.6)]"
            style={{ left: cursor.x, top: cursor.y, width: `${brush * 100}%`, aspectRatio: "1", transform: "translate(-50%, -50%)" }} />
        )}
      </div>
    </div>
  );
}

/** Exported mask (PNG data URL) or undefined when nothing was painted. */
export function maskDataUrl(canvas: HTMLCanvasElement | null, painted: boolean): string | undefined {
  if (!canvas || !painted) return undefined;
  return canvas.toDataURL("image/png");
}

export function clearMask(canvas: HTMLCanvasElement | null) {
  canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
}
