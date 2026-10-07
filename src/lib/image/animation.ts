// =============================================================================
// SpriteLab — animation frames from a model-drawn grid
// =============================================================================
// The animation model draws N frames of the same sprite in a grid on a white
// background. Here we turn that into game-ready assets:
//   1. key out the white background with the same keying as single sprites
//      (fringe erosion, enclosed gaps) and drop any grid lines the model drew
//   2. split along the real white gutters between frames (models don't place
//      frames exactly on the cell grid), discarding bits of neighbouring frames
//   3. crop all frames with ONE shared bounding box size and align them on a
//      common baseline (bottom-centre) so the sprite doesn't jitter
//   4. pixel styles: snap all frames onto ONE pixel grid and ONE palette so
//      pixels and colours don't flicker between frames
//   5. emit a horizontal sprite sheet PNG + an animated GIF preview
// =============================================================================

import sharp from "sharp";
import { keySpriteBackground } from "./sprite-postprocess";

export interface AnimationResult {
  /** Horizontal strip: frameCount × frameWidth, frameHeight tall. */
  sheetPng: Buffer;
  /** Looping preview. */
  gif: Buffer;
  frameCount: number;
  /** ≥ frameHeight — wider when an effect reaches out to the side. */
  frameWidth: number;
  frameHeight: number;
  /** Individual frame PNGs (transparent), in order. */
  frames: Buffer[];
}

export interface Raw { data: Buffer; width: number; height: number }

/** Art pixels across a pixel-art frame (matches single sprites' 128 grid). */
const PIXEL_GRID = 128;

/**
 * ground — feet on one baseline, body kept still (idle, walk, attack…)
 * air    — body kept still sideways, height kept from the drawing (jump, fly, float)
 * cell   — position kept from the drawing in both axes (thrust, dash, shake)
 * center — centred every frame (rotations)
 */
export type FrameAnchor = "ground" | "air" | "cell" | "center";

export interface AssembleOptions {
  pixel: boolean;
  frameSize?: number;
  fps?: number;
  anchor?: FrameAnchor;
}

/**
 * A cut-out sprite. `cell` is the bottom-centre of the grid cell it was drawn
 * in, in the sprite's own pixel coordinates — it records where the model put
 * the sprite (high in the cell = in the air) when the layout matched the grid.
 */
export interface Frame extends Raw {
  cell?: { x: number; y: number };
}

interface Piece { raw: Raw; x: number; y: number }

/** Grid image → finished animation (extract + assemble). */
export async function buildAnimation(
  gridImage: Buffer,
  opts: AssembleOptions & { cols: number; rows: number }
): Promise<AnimationResult> {
  return assembleAnimation(await extractFrames(gridImage, opts.cols, opts.rows), opts);
}

/**
 * Sprites cut out of a model-drawn grid, background removed, cropped to
 * their content, in reading order. Empty cells are dropped.
 */
export async function extractFrames(gridImage: Buffer, cols: number, rows: number): Promise<Frame[]> {
  const { data, info } = await sharp(gridImage).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const full: Raw = { data, width: info.width, height: info.height };

  // 1. Key the whole sheet at once — the white gutters connect every cell to
  // the border, so one flood fill reaches all of them
  removeGridLines(full);
  keySpriteBackground(full, { tolerance: 32, fringePasses: 2, areaScale: 1 / (cols * rows) });
  removeSpecks(full, 24);

  // 2. Find the frames. Models don't always keep the requested layout (a 3×2
  // request can come back as 3/2/3), so detect sprites by the white gaps
  // between them; fall back to the nominal grid if that finds too few.
  let pieces = detectFrames(full, cols, rows);
  if (pieces.length < Math.ceil((cols * rows) / 2)) {
    const xs = splitPoints(columnInk(full), cols);
    const ys = splitPoints(rowInk(full), rows);
    pieces = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        pieces.push({ raw: crop(full, xs[c], ys[r], xs[c + 1] - xs[c], ys[r + 1] - ys[r]), x: xs[c], y: ys[r] });
      }
    }
  }
  const out: (Frame & { absX: number; absY: number })[] = [];
  for (const piece of pieces) {
    dropIntruders(piece.raw);
    const b = bounds(piece.raw);
    if (!b) continue; // the model left a cell empty — skip it rather than flash a blank frame
    const sprite = crop(piece.raw, b.x0, b.y0, b.x1 - b.x0 + 1, b.y1 - b.y0 + 1);
    out.push({ ...sprite, absX: piece.x + b.x0, absY: piece.y + b.y0 });
  }

  // Record where each sprite sits in its nominal grid cell — only trustworthy
  // when the model kept the layout (every sprite's centre inside its own cell)
  const cw = full.width / cols, ch = full.height / rows;
  const matches = out.length === cols * rows && out.every((f, i) => {
    const cx = f.absX + f.width / 2, cy = f.absY + f.height / 2;
    return Math.floor(cx / cw) === i % cols && Math.floor(cy / ch) === Math.floor(i / cols);
  });
  return out.map((f, i) => {
    const frame: Frame = { data: f.data, width: f.width, height: f.height };
    if (matches) {
      frame.cell = { x: ((i % cols) + 0.5) * cw - f.absX, y: (Math.floor(i / cols) + 1) * ch - f.absY };
    }
    return frame;
  });
}

/**
 * Animated tiles (water, lava): no background to remove — each grid cell is
 * one full frame. Cells are inset slightly to drop any gutter the model drew.
 */
export async function extractTileFrames(gridImage: Buffer, cols: number, rows: number): Promise<Buffer[]> {
  const meta = await sharp(gridImage).metadata();
  const cw = Math.floor(meta.width! / cols), ch = Math.floor(meta.height! / rows);
  const inset = Math.round(Math.min(cw, ch) * 0.04);
  const frames: Buffer[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      frames.push(await sharp(gridImage)
        .extract({ left: c * cw + inset, top: r * ch + inset, width: cw - inset * 2, height: ch - inset * 2 })
        .png()
        .toBuffer());
    }
  }
  return frames;
}

/** Full-square tile frames → sheet + GIF on one pixel grid and palette. */
export async function assembleTileAnimation(frames: Buffer[], opts: { pixel: boolean; frameSize?: number; fps?: number }): Promise<AnimationResult> {
  const size = opts.frameSize ?? 256;
  const grid = opts.pixel ? PIXEL_GRID / 2 : size;
  const small: Raw[] = [];
  for (const f of frames) {
    const { data, info } = await sharp(f).resize(grid, grid, { fit: "cover", kernel: opts.pixel ? "mitchell" : "lanczos3" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    small.push({ data, width: info.width, height: info.height });
  }
  if (opts.pixel) {
    const palette = sharedPalette(small, 32);
    for (const f of small) quantize(f, palette);
  }
  const out = await Promise.all(small.map((f) => fromRaw(f).resize(size, size, { kernel: "nearest" }).png().toBuffer()));
  const sheetPng = await sharp({ create: { width: size * out.length, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(out.map((input, i) => ({ input, left: i * size, top: 0 })))
    .png({ compressionLevel: 9 })
    .toBuffer();
  return { sheetPng, gif: await encodeGif(out, opts.fps ?? 8), frameCount: out.length, frameWidth: size, frameHeight: size, frames: out };
}

/**
 * Cropped frames → sprite sheet + GIF, all on one anchor, one canvas and
 * (pixel styles) one pixel grid and palette.
 */
export async function assembleAnimation(sprites: Frame[], opts: AssembleOptions): Promise<AnimationResult> {
  const { pixel } = opts;
  const frameSize = opts.frameSize ?? 256;
  const fps = opts.fps ?? 8;

  // 3. Shared canvas, every frame aligned on one anchor point (see FrameAnchor).
  // Modes that keep the drawn position need every frame's cell position; when
  // the model broke the layout they fall back to the nearest safe mode.
  const haveCells = sprites.every((s) => s.cell);
  let anchor: FrameAnchor = opts.anchor ?? "ground";
  if (anchor === "air" && !haveCells) anchor = "ground";
  if (anchor === "cell" && !haveCells) anchor = "center";
  const placed = sprites.map((raw) => {
    switch (anchor) {
      case "center": return { raw, ax: raw.width / 2, ay: raw.height / 2 };
      case "cell": return { raw, ax: raw.cell!.x, ay: raw.cell!.y };
      case "air": return { raw, ax: footCenter(raw), ay: raw.cell!.y };
      default: return { raw, ax: footCenter(raw), ay: raw.height };
    }
  });
  if (placed.length < 2) throw new Error("Too few frames found in the animation sheet");
  if (anchor === "ground" || anchor === "air") alignBodies(placed);
  if (anchor === "air") {
    // Lowest frame sits on the baseline; the rest keep their height above it
    const lowest = Math.min(...placed.map((p) => p.ay - p.raw.height));
    for (const p of placed) p.ay -= lowest;
  }
  // Extents around the anchor across all frames. The canvas is at least square
  // and grows sideways when an effect (fire breath, sword arc) reaches out, so
  // the body keeps its size instead of shrinking into a square frame.
  const left = Math.max(...placed.map((p) => p.ax));
  const right = Math.max(...placed.map((p) => p.raw.width - p.ax));
  const top = Math.max(...placed.map((p) => p.ay));
  const bottom = Math.max(...placed.map((p) => p.raw.height - p.ay));
  const pad = Math.round(Math.max(top + bottom, left + right) * 0.05);
  const canvasH = Math.ceil(top + bottom) + pad * 2;
  const extraW = Math.max(0, canvasH - (Math.ceil(left + right) + pad * 2));
  const canvasW = Math.ceil(left + right) + pad * 2 + extraW;
  const anchorX = pad + extraW / 2 + left;
  const anchorY = pad + top;

  const aligned: Raw[] = placed.map((p) => {
    const out = blank(canvasW, canvasH);
    blit(p.raw, out, Math.round(anchorX - p.ax), Math.round(anchorY - p.ay));
    return out;
  });

  // 4. Scale: frame height = frameSize, width follows the canvas
  const frames: Buffer[] = [];
  let frameW: number;
  let frameH: number;
  if (pixel) {
    // Average down onto one shared pixel grid, then snap to one palette. The
    // averaging also swallows the model's soft anti-aliased edges.
    const gridH = Math.min(PIXEL_GRID, canvasH);
    const gridW = Math.max(1, Math.round((canvasW * gridH) / canvasH));
    const factor = Math.max(1, Math.round(frameSize / gridH));
    frameW = gridW * factor;
    frameH = gridH * factor;
    const small: Raw[] = [];
    for (const f of aligned) {
      const { data: d, info: inf } = await fromRaw(f)
        .resize(gridW, gridH, { kernel: "mitchell", fit: "fill" })
        .raw()
        .toBuffer({ resolveWithObject: true });
      small.push({ data: d, width: inf.width, height: inf.height });
    }
    const palette = sharedPalette(small, 32);
    for (const f of small) {
      quantize(f, palette);
      frames.push(await fromRaw(f).resize(frameW, frameH, { kernel: "nearest", fit: "fill" }).png().toBuffer());
    }
  } else {
    frameH = frameSize;
    frameW = Math.round((canvasW * frameSize) / canvasH);
    for (const f of aligned) {
      hardenAlpha(f);
      frames.push(await fromRaw(f).resize(frameW, frameH, { kernel: "lanczos3", fit: "fill" }).png().toBuffer());
    }
  }

  // 5. Sheet + GIF
  const sheetPng = await sharp({
    create: { width: frameW * frames.length, height: frameH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(frames.map((input, i) => ({ input, left: i * frameW, top: 0 })))
    .png({ compressionLevel: 9 })
    .toBuffer();

  const gif = await encodeGif(frames, fps);

  return { sheetPng, gif, frameCount: frames.length, frameWidth: frameW, frameHeight: frameH, frames };
}

/**
 * Animated GIF without the encoder's lossy shortcuts: by default libvips
 * reuses the first frame's palette and skips "unchanged" pixels between
 * frames, which on transparent sprites makes texture flicker away.
 * `background` flattens onto a solid colour (e.g. for emails).
 */
export async function encodeGif(frames: Buffer[], fps: number, background?: string): Promise<Buffer> {
  const input = background
    ? await Promise.all(frames.map((f) => sharp(f).flatten({ background }).png().toBuffer()))
    : frames;
  return sharp(input, { join: { animated: true } })
    .gif({
      delay: Array(input.length).fill(Math.round(1000 / fps)),
      loop: 0,
      reuse: false,
      dither: 0,
      effort: 10,
      interFrameMaxError: 0,
      interPaletteMaxError: 0,
    })
    .toBuffer();
}

/**
 * Key frames with the model's in-betweens slotted between them. The second
 * pass is drawn at a different cell size, so in-betweens are first scaled to
 * the key frames' typical height.
 */
export async function interleave(keys: Frame[], betweens: Frame[]): Promise<Frame[]> {
  const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  const scale = median(keys.map((k) => k.height)) / Math.max(1, median(betweens.map((b) => b.height)));
  const scaled: Frame[] = Math.abs(scale - 1) < 0.03 ? betweens : await Promise.all(betweens.map(async (b) => {
    const w = Math.max(1, Math.round(b.width * scale)), h = Math.max(1, Math.round(b.height * scale));
    const { data, info } = await fromRaw(b).resize(w, h, { kernel: "mitchell", fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
    hardenAlpha({ data, width: info.width, height: info.height });
    return { data, width: info.width, height: info.height, cell: b.cell && { x: b.cell.x * scale, y: b.cell.y * scale } };
  }));
  // Cell positions of the two passes come from different grids — only keep
  // them when both passes have them, otherwise assembly falls back cleanly
  if (!keys.every((k) => k.cell) || !scaled.every((b) => b.cell)) {
    keys = keys.map((k) => ({ data: k.data, width: k.width, height: k.height }));
    for (const b of scaled) delete b.cell;
  }
  const out: Frame[] = [];
  keys.forEach((k, i) => { out.push(k); if (scaled[i]) out.push(scaled[i]); });
  return out;
}

/**
 * Key poses laid out on white in a grid — the reference the model uses to
 * draw in-between poses. Every frame is placed at the same scale.
 */
export async function referenceGrid(frames: Buffer[], cols: number, rows: number, size: number): Promise<Buffer> {
  const cellW = Math.floor(size / cols), cellH = Math.floor(size / rows);
  const inset = Math.round(Math.min(cellW, cellH) * 0.06);
  const tiles = await Promise.all(frames.map((f) =>
    sharp(f)
      .resize(cellW - inset * 2, cellH - inset * 2, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 }, kernel: "nearest" })
      .png()
      .toBuffer()
  ));
  return sharp({ create: { width: size, height: size, channels: 4, background: "#ffffff" } })
    .composite(tiles.map((input, i) => ({ input, left: (i % cols) * cellW + inset, top: Math.floor(i / cols) * cellH + inset })))
    .flatten({ background: "#ffffff" })
    .png()
    .toBuffer();
}

// ---------------------------------------------------------------------------
// Splitting
// ---------------------------------------------------------------------------

/**
 * Sprites in reading order, found from the content: rows of sprites are
 * separated by empty horizontal bands, sprites within a row by empty columns.
 * Tiny pieces (sparks, smoke puffs) join their nearest neighbour; a piece much
 * wider than the others (two sprites touching) is split at its thinnest point.
 */
function detectFrames(full: Raw, cols: number, rows: number): Piece[] {
  const { width, height } = full;
  const rowProfile = rowInk(full);
  // Rows can sit only a few pixels apart (a sword tip reaching up), so any
  // empty band of ≥3px separates them; then cut over-tall bands when the
  // model clearly drew more rows than we found.
  let bands = runs(rowProfile, Math.max(3, Math.round(height * 0.004)), height * 0.08);
  if (bands.length < rows) bands = splitOversized(bands, rowProfile, height / rows, rows);
  const frames: Piece[] = [];
  for (const [y0, y1] of bands) {
    const ink = new Array(width).fill(0);
    for (let y = y0; y < y1; y++) {
      for (let x = 0; x < width; x++) if (full.data[(y * width + x) * 4 + 3] >= 128) ink[x]++;
    }
    let segs = runs(ink, Math.max(3, Math.round(width * 0.004)), 0);
    if (segs.length < cols) {
      // Two touching sprites are both full height; a sprite plus its breath
      // of fire is not — leave those together
      segs = splitOversized(segs, ink, width / cols, cols, (a, cut, b) => {
        const ls = pieceStats(full, a, cut, y0, y1), rs = pieceStats(full, cut, b, y0, y1);
        const left = ls.h, right = rs.h;
        // Two sprites weigh about the same; a fire stream next to a dragon doesn't
        if (Math.min(ls.mass, rs.mass) < Math.max(ls.mass, rs.mass) * 0.45) return false;
        // A crouch next to a take-off is still ~60% of the height; a breath of fire is ~35%.
        // And sprites that merely touch meet in a thin column — a cut through
        // the middle of a body (a dragon's neck) crosses lots of ink.
        let peak = 0;
        for (let x = a; x < b; x++) peak = Math.max(peak, ink[x]);
        return Math.min(left, right) >= Math.max(left, right) * 0.5 && ink[cut] <= peak * 0.25;
      });
    }
    if (segs.length === 0) continue;
    // Merge pieces that are effects rather than sprites (a detached breath of
    // fire, sparks): much narrower, much shorter or much lighter than the rest
    const median = () => [...segs.map(([a, b]) => b - a)].sort((a, b) => a - b)[Math.floor(segs.length / 2)];
    const isEffect = (i: number) => {
      const stats = segs.map(([a, b]) => pieceStats(full, a, b, y0, y1));
      const maxH = Math.max(...stats.map((s) => s.h));
      const masses = stats.map((s) => s.mass).sort((p, q) => p - q);
      const medMass = masses[Math.floor(masses.length / 2)];
      const w = segs[i][1] - segs[i][0];
      return w < median() * 0.3 || stats[i].h < maxH * 0.55 || stats[i].mass < medMass * 0.3;
    };
    for (let i = 0; segs.length > 1 && i < segs.length; ) {
      if (!isEffect(i)) { i++; continue; }
      const gapL = i > 0 ? segs[i][0] - segs[i - 1][1] : Infinity;
      const gapR = i < segs.length - 1 ? segs[i + 1][0] - segs[i][1] : Infinity;
      const j = gapL <= gapR ? i - 1 : i + 1;
      const merged: [number, number] = [Math.min(segs[i][0], segs[j][0]), Math.max(segs[i][1], segs[j][1])];
      segs = segs.filter((_, k) => k !== i && k !== j);
      segs.splice(Math.min(i, j), 0, merged);
      i = 0;
    }
    // Split pieces holding two sprites that touch
    const med = median();
    const out: [number, number][] = [];
    for (const [a, b] of segs) {
      const parts = segs.length > 1 ? Math.round((b - a) / med) : 1;
      if (parts < 2 || (b - a) < med * 1.7) { out.push([a, b]); continue; }
      let start = a;
      for (let k = 1; k < parts; k++) {
        const nominal = Math.round(a + ((b - a) * k) / parts);
        const r = Math.round((b - a) / parts * 0.2);
        let cut = nominal, min = Infinity;
        for (let x = nominal - r; x <= nominal + r; x++) if (ink[x] < min) { min = ink[x]; cut = x; }
        out.push([start, cut]);
        start = cut;
      }
      out.push([start, b]);
    }
    for (const [a, b] of out) frames.push({ raw: crop(full, a, y0, b - a, y1 - y0), x: a, y: y0 });
  }
  return frames;
}

/** Opaque pixel count and vertical extent of a piece of the sheet. */
function pieceStats(raw: Raw, x0: number, x1: number, y0: number, y1: number): { mass: number; h: number } {
  let mass = 0, top = -1, bottom = -1;
  for (let y = y0; y < y1; y++) {
    let any = false;
    for (let x = x0; x < x1; x++) {
      if (raw.data[(y * raw.width + x) * 4 + 3] >= 128) { mass++; any = true; }
    }
    if (any) { if (top < 0) top = y; bottom = y; }
  }
  return { mass, h: top < 0 ? 0 : bottom - top + 1 };
}

/**
 * Split runs that are much longer than one nominal cell (`cell`) into
 * round(length / cell) parts, each cut at the emptiest line near its nominal
 * position. Stops once `want` runs exist.
 */
function splitOversized(
  segs: [number, number][],
  ink: number[],
  cell: number,
  want: number,
  /** Accept a proposed cut — e.g. both halves must be whole sprites. */
  accept: (a: number, cut: number, b: number) => boolean = () => true
): [number, number][] {
  const out: [number, number][] = [];
  let extra = want - segs.length;
  for (const [a, b] of segs) {
    const parts = Math.min(1 + extra, Math.round((b - a) / cell));
    if (parts < 2 || b - a < cell * 1.5) { out.push([a, b]); continue; }
    const cuts: number[] = [];
    for (let k = 1; k < parts; k++) {
      const nominal = Math.round(a + ((b - a) * k) / parts);
      const r = Math.round(cell * 0.2);
      let cut = nominal, min = Infinity;
      for (let i = Math.max(a + 1, nominal - r); i <= Math.min(b - 1, nominal + r); i++) {
        if (ink[i] < min) { min = ink[i]; cut = i; }
      }
      cuts.push(cut);
    }
    const bounds = [a, ...cuts, b];
    if (!cuts.every((c, k) => accept(bounds[k], c, bounds[k + 2]))) { out.push([a, b]); continue; }
    extra -= cuts.length;
    for (let k = 0; k < bounds.length - 1; k++) out.push([bounds[k], bounds[k + 1]]);
  }
  return out;
}

/**
 * Runs of non-empty lines. Gaps narrower than `minGap` don't separate runs;
 * runs shorter than `minSize` are merged into their nearest neighbour.
 */
function runs(ink: number[], minGap: number, minSize: number): [number, number][] {
  const out: [number, number][] = [];
  let i = 0;
  while (i < ink.length) {
    if (ink[i] === 0) { i++; continue; }
    let j = i;
    while (j < ink.length && ink[j] > 0) j++;
    const last = out[out.length - 1];
    if (last && i - last[1] < minGap) last[1] = j;
    else out.push([i, j]);
    i = j;
  }
  for (let k = 0; out.length > 1 && k < out.length; ) {
    if (out[k][1] - out[k][0] >= minSize) { k++; continue; }
    const gapL = k > 0 ? out[k][0] - out[k - 1][1] : Infinity;
    const gapR = k < out.length - 1 ? out[k + 1][0] - out[k][1] : Infinity;
    if (gapL <= gapR) { out[k - 1][1] = out[k][1]; } else { out[k + 1][0] = out[k][0]; }
    out.splice(k, 1);
    k = 0;
  }
  return out;
}

/**
 * Feet move in a walk cycle or a weight shift, so lining frames up on the
 * feet makes the whole body slide sideways (a "limp"). Instead, shift each
 * frame horizontally so its upper body (everything above the lowest 30%)
 * overlaps the first frame's as much as possible. Only overlap counts, so a
 * breath of fire or a sword trail sticking out doesn't pull the body.
 */
function alignBodies(placed: { raw: Raw; ax: number; ay: number }[]): void {
  const maxH = Math.max(...placed.map((p) => p.raw.height));
  const s = Math.min(1, 96 / maxH);
  // Masks in common coordinates: x relative to the anchor, y up from the baseline
  const masks = placed.map((p) => {
    const w = Math.max(1, Math.round(p.raw.width * s)), h = Math.max(1, Math.round(p.raw.height * s));
    const pts: [number, number][] = [];
    for (let y = 0; y < h; y++) {
      const up = h - 1 - y;
      if (up < h * 0.3) continue; // skip legs / base
      for (let x = 0; x < w; x++) {
        const sx = Math.min(p.raw.width - 1, Math.floor(x / s)), sy = Math.min(p.raw.height - 1, Math.floor(y / s));
        if (p.raw.data[(sy * p.raw.width + sx) * 4 + 3] >= 128) pts.push([Math.round(x - p.ax * s), up]);
      }
    }
    return pts;
  });
  const key = (x: number, y: number) => (x + 4096) * 4096 + y;
  const ref = new Set(masks[0].map(([x, y]) => key(x, y)));
  const range = Math.round(Math.max(...placed.map((p) => p.raw.width)) * s * 0.3);
  for (let i = 1; i < placed.length; i++) {
    let best = 0, bestScore = -1;
    for (let dx = -range; dx <= range; dx++) {
      let score = 0;
      for (const [x, y] of masks[i]) if (ref.has(key(x + dx, y))) score++;
      // Prefer the smaller shift on ties so symmetric poses don't drift
      if (score > bestScore || (score === bestScore && Math.abs(dx) < Math.abs(best))) { bestScore = score; best = dx; }
    }
    placed[i].ax -= best / s;
  }
}

/** Horizontal centre of the lowest part of the sprite (feet, base of a slime). */
function footCenter(raw: Raw): number {
  const from = Math.floor(raw.height * 0.88);
  let sum = 0, n = 0;
  for (let y = from; y < raw.height; y++) {
    for (let x = 0; x < raw.width; x++) if (raw.data[(y * raw.width + x) * 4 + 3] >= 128) { sum += x; n++; }
  }
  return n ? sum / n : raw.width / 2;
}

function columnInk(raw: Raw): number[] {
  const ink = new Array(raw.width).fill(0);
  for (let y = 0; y < raw.height; y++) {
    for (let x = 0; x < raw.width; x++) if (raw.data[(y * raw.width + x) * 4 + 3] >= 128) ink[x]++;
  }
  return ink;
}

function rowInk(raw: Raw): number[] {
  const ink = new Array(raw.height).fill(0);
  for (let y = 0; y < raw.height; y++) {
    for (let x = 0; x < raw.width; x++) if (raw.data[(y * raw.width + x) * 4 + 3] >= 128) ink[y]++;
  }
  return ink;
}

/**
 * Cut positions (including 0 and length) for `parts` cells. Each inner cut is
 * moved from the nominal edge to the emptiest line within ±15% of a cell —
 * the middle of the widest empty run when there is one.
 */
function splitPoints(ink: number[], parts: number): number[] {
  const len = ink.length;
  const cell = len / parts;
  const cuts = [0];
  for (let k = 1; k < parts; k++) {
    const nominal = Math.round(k * cell);
    const lo = Math.max(1, Math.round(nominal - cell * 0.15));
    const hi = Math.min(len - 2, Math.round(nominal + cell * 0.15));
    let min = Infinity;
    for (let i = lo; i <= hi; i++) min = Math.min(min, ink[i]);
    // Among the lines with the least ink, take the centre of the run nearest the nominal edge
    let best = nominal, bestScore = Infinity;
    let i = lo;
    while (i <= hi) {
      if (ink[i] !== min) { i++; continue; }
      let j = i;
      while (j + 1 <= hi && ink[j + 1] === min) j++;
      const mid = Math.round((i + j) / 2);
      const score = Math.abs(mid - nominal) - (j - i) * 0.5; // prefer wide gutters near the edge
      if (score < bestScore) { bestScore = score; best = mid; }
      i = j + 1;
    }
    cuts.push(best);
  }
  cuts.push(len);
  return cuts;
}

/** Models sometimes draw divider lines despite being told not to. */
function removeGridLines(raw: Raw) {
  const { width, height, data } = raw;
  const isLine = (i: number) => {
    const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    return luma < 235;
  };
  for (let x = 0; x < width; x++) {
    let n = 0;
    for (let y = 0; y < height; y++) if (isLine((y * width + x) * 4)) n++;
    if (n > height * 0.92) for (let y = 0; y < height; y++) whiten(data, (y * width + x) * 4);
  }
  for (let y = 0; y < height; y++) {
    let n = 0;
    for (let x = 0; x < width; x++) if (isLine((y * width + x) * 4)) n++;
    if (n > width * 0.92) for (let x = 0; x < width; x++) whiten(data, (y * width + x) * 4);
  }
}

function whiten(data: Buffer, i: number) {
  data[i] = 255; data[i + 1] = 255; data[i + 2] = 255;
}

/** Clear connected specks smaller than `minSize` pixels (keying noise). */
function removeSpecks(raw: Raw, minSize: number) {
  for (const c of components(raw)) if (c.size < minSize) for (const p of c.pixels) raw.data[p * 4 + 3] = 0;
}

/**
 * Remove pieces of neighbouring frames that crossed the cut: connected parts
 * touching the cell edge that are much smaller than the main subject.
 * Detached effects (sparks, fire) in the middle of the cell stay.
 */
function dropIntruders(raw: Raw) {
  const comps = components(raw);
  if (comps.length === 0) return;
  const largest = Math.max(...comps.map((c) => c.size));
  const main = comps.find((c) => c.size === largest)!;
  const span = (c: { pixels: number[] }) => {
    let y0 = Infinity, y1 = -1;
    for (const p of c.pixels) { const y = Math.floor(p / raw.width); if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return { y0, y1 };
  };
  const body = span(main);
  const bodyH = body.y1 - body.y0 + 1;
  const gap = Math.max(4, raw.height * 0.02);
  for (const c of comps) {
    const intruder = c.edge && c.size < largest * 0.35;
    const speck = c.size < Math.max(6, largest * 0.002);
    // Frame labels the model sometimes writes under/over a sprite ("Peak"):
    // short, flat pieces clearly detached above or below the body
    let label = false;
    if (c !== main && c.size < largest * 0.05) {
      const s = span(c);
      const flat = s.y1 - s.y0 + 1 <= bodyH * 0.12;
      label = flat && (s.y0 > body.y1 + gap || s.y1 < body.y0 - gap);
    }
    if (intruder || speck || label) for (const p of c.pixels) raw.data[p * 4 + 3] = 0;
  }
}

/** 8-connected opaque components. */
function components(raw: Raw) {
  const { width, height, data } = raw;
  const label = new Int32Array(width * height).fill(-1);
  const comps: { size: number; edge: boolean; pixels: number[] }[] = [];
  for (let start = 0; start < width * height; start++) {
    if (label[start] !== -1 || data[start * 4 + 3] < 128) continue;
    const id = comps.length;
    const comp = { size: 0, edge: false, pixels: [] as number[] };
    const stack = [start];
    label[start] = id;
    while (stack.length) {
      const p = stack.pop()!;
      comp.size++;
      comp.pixels.push(p);
      const x = p % width, y = (p - x) / width;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) comp.edge = true;
      // 8-connected so thin diagonal details (sword tips) stay attached
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if ((dx || dy) && nx >= 0 && ny >= 0 && nx < width && ny < height) {
            const q = ny * width + nx;
            if (label[q] === -1 && data[q * 4 + 3] >= 128) { label[q] = id; stack.push(q); }
          }
        }
      }
    }
    comps.push(comp);
  }
  return comps;
}

// ---------------------------------------------------------------------------
// Raw helpers
// ---------------------------------------------------------------------------

function fromRaw(raw: Raw) {
  return sharp(raw.data, { raw: { width: raw.width, height: raw.height, channels: 4 } });
}

function blank(width: number, height: number): Raw {
  return { data: Buffer.alloc(width * height * 4), width, height };
}

function crop(src: Raw, x: number, y: number, w: number, h: number): Raw {
  const out = blank(w, h);
  for (let row = 0; row < h; row++) {
    const s = ((y + row) * src.width + x) * 4;
    src.data.copy(out.data, row * w * 4, s, s + w * 4);
  }
  return out;
}

function blit(src: Raw, dst: Raw, ox: number, oy: number) {
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const dx = x + ox, dy = y + oy;
      if (dx < 0 || dy < 0 || dx >= dst.width || dy >= dst.height) continue;
      src.data.copy(dst.data, (dy * dst.width + dx) * 4, (y * src.width + x) * 4, (y * src.width + x) * 4 + 4);
    }
  }
}

function hardenAlpha(raw: Raw) {
  for (let i = 3; i < raw.data.length; i += 4) raw.data[i] = raw.data[i] >= 128 ? 255 : 0;
}

function bounds(raw: Raw) {
  let x0 = raw.width, y0 = raw.height, x1 = -1, y1 = -1;
  for (let y = 0; y < raw.height; y++) {
    for (let x = 0; x < raw.width; x++) {
      if (raw.data[(y * raw.width + x) * 4 + 3] >= 128) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  // An almost-empty cell is a failed frame, not a tiny sprite
  if (x1 < 0 || (x1 - x0 < raw.width * 0.08 && y1 - y0 < raw.height * 0.08)) return null;
  return { x0, y0, x1, y1 };
}

function sharedPalette(frames: Raw[], k: number): [number, number, number][] {
  // k-means on samples from all frames (deterministic seeds)
  const samples: [number, number, number][] = [];
  for (const f of frames) {
    const total = f.width * f.height;
    const step = Math.max(1, Math.floor(total / 6000));
    for (let p = 0; p < total; p += step) {
      const i = p * 4;
      if (f.data[i + 3] >= 128) samples.push([f.data[i], f.data[i + 1], f.data[i + 2]]);
    }
  }
  if (samples.length === 0) return [[0, 0, 0]];
  const centers = Array.from({ length: Math.min(k, samples.length) }, (_, i) => [...samples[Math.floor((i * samples.length) / k)]] as [number, number, number]);
  const assign = new Int32Array(samples.length);
  for (let iter = 0; iter < 10; iter++) {
    for (let s = 0; s < samples.length; s++) assign[s] = nearest(samples[s], centers);
    const acc = centers.map(() => [0, 0, 0, 0]);
    for (let s = 0; s < samples.length; s++) {
      const a = acc[assign[s]];
      a[0] += samples[s][0]; a[1] += samples[s][1]; a[2] += samples[s][2]; a[3]++;
    }
    for (let c = 0; c < centers.length; c++) {
      if (acc[c][3]) centers[c] = [acc[c][0] / acc[c][3], acc[c][1] / acc[c][3], acc[c][2] / acc[c][3]];
    }
  }
  return centers.map((c) => c.map(Math.round) as [number, number, number]);
}

function nearest(c: [number, number, number], pal: [number, number, number][]) {
  let best = 0, bestD = Infinity;
  for (let i = 0; i < pal.length; i++) {
    const dr = c[0] - pal[i][0], dg = c[1] - pal[i][1], db = c[2] - pal[i][2];
    const d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

function quantize(raw: Raw, pal: [number, number, number][]) {
  for (let i = 0; i < raw.data.length; i += 4) {
    if (raw.data[i + 3] < 128) { raw.data[i + 3] = 0; continue; }
    const p = pal[nearest([raw.data[i], raw.data[i + 1], raw.data[i + 2]], pal)];
    raw.data[i] = p[0]; raw.data[i + 1] = p[1]; raw.data[i + 2] = p[2]; raw.data[i + 3] = 255;
  }
}
