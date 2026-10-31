// =============================================================================
// ST Packs — frames in and out: MP4 decoding (ffmpeg-static), resizing,
// PNG round trips and the base still normalisation
// =============================================================================
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import type { Frame } from "./types";

/** Resolved lazily: the binary is ~80 MB and only the worker needs it. */
async function ffmpegPath(): Promise<string> {
  const mod = (await import("ffmpeg-static")) as unknown as { default?: string | null } | string | null;
  const p = typeof mod === "string" ? mod : mod?.default;
  if (!p) throw new Error("ffmpeg binary not found (ffmpeg-static)");
  return p;
}

/**
 * Decode a short MP4 into RGBA frames at `width`×`height` (lanczos). The
 * clip's fps is read from ffmpeg's stream line; 24 when it cannot be read.
 */
/** A region of the clip as fractions of its size (0–1). */
export interface CropFraction { x: number; y: number; w: number; h: number }

export async function decodeVideo(mp4: Buffer, opts: { width: number; height: number; maxFrames?: number; crop?: CropFraction }): Promise<{ frames: Frame[]; fps: number }> {
  const bin = await ffmpegPath();
  const dir = await mkdtemp(join(tmpdir(), "stpack-"));
  const file = join(dir, "clip.mp4");
  await writeFile(file, mp4);
  const { width, height } = opts;
  const frameBytes = width * height * 4;
  const maxFrames = opts.maxFrames ?? 400;
  try {
    const args = [
      "-hide_banner", "-loglevel", "info", "-nostdin",
      "-i", file,
      "-frames:v", String(maxFrames),
      "-vf", `${opts.crop ? `crop=iw*${opts.crop.w.toFixed(4)}:ih*${opts.crop.h.toFixed(4)}:iw*${opts.crop.x.toFixed(4)}:ih*${opts.crop.y.toFixed(4)},` : ""}scale=${width}:${height}:flags=lanczos`,
      "-f", "rawvideo", "-pix_fmt", "rgba", "pipe:1",
    ];
    const { stdout, stderr } = await run(bin, args, frameBytes * maxFrames + 1024);
    const m = /(\d+(?:\.\d+)?) fps/.exec(stderr);
    const fps = m ? Math.max(1, Math.min(60, Math.round(Number(m[1])))) : 24;
    const count = Math.floor(stdout.length / frameBytes);
    if (count === 0) throw new Error(`ffmpeg produced no frames: ${stderr.split("\n").filter(Boolean).slice(-3).join(" | ").slice(0, 300)}`);
    const frames: Frame[] = [];
    for (let i = 0; i < count; i++) {
      frames.push({ data: Buffer.from(stdout.subarray(i * frameBytes, (i + 1) * frameBytes)), width, height });
    }
    return { frames, fps };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

function run(bin: string, args: string[], maxOut: number): Promise<{ stdout: Buffer; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    const out: Buffer[] = [];
    let outLen = 0;
    let err = "";
    const timer = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("ffmpeg timed out")); }, 120_000);
    child.stdout.on("data", (b: Buffer) => {
      outLen += b.length;
      if (outLen > maxOut) { child.kill("SIGKILL"); reject(new Error("ffmpeg output too large")); return; }
      out.push(b);
    });
    child.stderr.on("data", (b: Buffer) => { if (err.length < 20_000) err += b.toString("utf8"); });
    child.on("error", (e) => { clearTimeout(timer); reject(e); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0 && outLen === 0) reject(new Error(`ffmpeg exited with ${code}: ${err.slice(-300)}`));
      else resolve({ stdout: Buffer.concat(out), stderr: err });
    });
  });
}

/** Resize every frame (libvips premultiplies alpha for the filter, so edges don't darken). */
export async function resizeFrames(frames: Frame[], width: number, height: number): Promise<Frame[]> {
  const out: Frame[] = [];
  for (const f of frames) {
    if (f.width === width && f.height === height) { out.push(f); continue; }
    const data = await sharp(f.data, { raw: { width: f.width, height: f.height, channels: 4 } })
      .resize(width, height, { kernel: "lanczos3", fit: "cover" })
      .raw().toBuffer();
    out.push({ data, width, height });
  }
  return out;
}

export async function framePng(frame: Frame): Promise<Buffer> {
  return sharp(frame.data, { raw: { width: frame.width, height: frame.height, channels: 4 } }).png().toBuffer();
}

export async function pngFrame(png: Buffer): Promise<Frame> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** Resize a PNG still to an exact canvas (cover crop), keeping it a PNG. */
export async function fitPng(png: Buffer, width: number, height: number): Promise<Buffer> {
  return sharp(png).resize(width, height, { kernel: "lanczos3", fit: "cover" }).png().toBuffer();
}

const BASE_BACKGROUND = { r: 236, g: 236, b: 236, alpha: 1 };

/**
 * Fit a 3:4 still into a model canvas: resized to cover the width (or height)
 * and centred on the still's own background colour (its top-left pixel), so
 * the clip looks like a wider plain background. Returns the content region to
 * crop the decoded frames back to.
 */
export async function padToCanvas(png: Buffer, width: number, height: number): Promise<{ png: Buffer; crop: CropFraction }> {
  const src = sharp(png);
  const meta = await src.metadata();
  const sw = meta.width ?? width, sh = meta.height ?? height;
  const scale = Math.min(width / sw, height / sh);
  const cw = Math.round(sw * scale), ch = Math.round(sh * scale);
  // Within a few pixels of the canvas (896×1200 → 768×1024 is 765 wide): cover-crop instead of a 1 px border
  if (Math.abs(cw - width) <= 4 && Math.abs(ch - height) <= 4) {
    return { png: await src.resize(width, height, { kernel: "lanczos3", fit: "cover" }).png().toBuffer(), crop: { x: 0, y: 0, w: 1, h: 1 } };
  }
  const { data } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bg = { r: data[0], g: data[1], b: data[2], alpha: 1 };
  const content = await src.resize(cw, ch, { kernel: "lanczos3", fit: "fill" }).png().toBuffer();
  const left = Math.floor((width - cw) / 2), top = Math.floor((height - ch) / 2);
  const out = await sharp({ create: { width, height, channels: 4, background: bg } }).composite([{ input: content, left, top }]).png().toBuffer();
  return { png: out, crop: { x: left / width, y: top / height, w: cw / width, h: ch / height } };
}

/**
 * An uploaded character picture → the job's base: auto-oriented, sRGB, plain
 * border trimmed, then fitted into the 3:4 working canvas with margins on a
 * flat light-grey background (what the edit and video models expect).
 */
export async function normaliseBase(input: Buffer, width: number, height: number, framing: "waist" | "bust"): Promise<Buffer> {
  const trimmed = await sharp(input).rotate().toColourspace("srgb").trim({ threshold: 12 }).flatten({ background: BASE_BACKGROUND }).png().toBuffer();
  const topMargin = framing === "bust" ? 0.06 : 0.08;
  const innerW = Math.round(width * 0.84);
  const innerH = Math.round(height * (1 - topMargin - 0.02));
  const inner = await sharp(trimmed).resize(innerW, innerH, { fit: "inside", kernel: "lanczos3" }).png().toBuffer();
  const meta = await sharp(inner).metadata();
  const left = Math.round((width - (meta.width ?? innerW)) / 2);
  const top = Math.round(height * topMargin);
  return sharp({ create: { width, height, channels: 4, background: BASE_BACKGROUND } })
    .composite([{ input: inner, left, top }])
    .png().toBuffer();
}
