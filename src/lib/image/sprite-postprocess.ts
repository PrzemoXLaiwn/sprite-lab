// =============================================================================
// SpriteLab — deterministic sprite post-processing
// =============================================================================
// Image models are good at drawing a subject but bad at following hard
// technical specs (real transparency, a fixed pixel grid, a limited palette,
// exact framing). Instead of begging the model via the prompt, we ask it for
// the subject on a flat solid background and enforce the spec here:
//
//   1. Background → alpha: flood-fill from the image border over pixels close
//      to the (flat) border colour. Hard alpha, no halo.
//   2. Crop to the subject and centre it on a square transparent canvas.
//   3. (pixel styles) Palette quantisation with k-means, then a true pixel
//      grid: every output pixel is the MAJORITY palette colour of its source
//      cell (not a single sampled pixel, which produced noisy sprites).
//   4. Despeckle isolated pixels, upscale with nearest-neighbour by an INTEGER
//      factor so the grid stays perfectly even.
//
// Every output therefore has a transparent background, is centred, and — for
// pixel styles — sits on an exact grid with at most `paletteSize` colours,
// regardless of what the model drew.
// =============================================================================

import sharp from "sharp";

export interface SpritePostprocessOptions {
  /** Pixel-art grid (longest side of the sprite in "art pixels"). Omit for non-pixel styles. */
  pixelGrid?: number;
  /** Max colours for pixel styles. Default 24. */
  paletteSize?: number;
  /** Target size of the (square) output image. Default 1024. Pixel styles round to an integer multiple of the grid. */
  outputSize?: number;
  /** Fraction of the canvas left as padding around the subject. Default 0.06. */
  padding?: number;
  /** Colour distance (0-441) treated as "background". Default 48. */
  bgTolerance?: number;
  /**
   * When the input already has a meaningful alpha channel (e.g. after an AI
   * background remover), skip flood-fill keying and threshold that alpha.
   */
  trustInputAlpha?: boolean;
}

export interface SpritePostprocessResult {
  /** Final PNG (upscaled for display). */
  png: Buffer;
  /** Native-resolution PNG (pixel styles only — the real sprite for game engines). */
  nativePng?: Buffer;
  width: number;
  height: number;
  /** True when the background could be keyed out. */
  backgroundRemoved: boolean;
  /** Colours used (pixel styles only). */
  colors?: number;
}

interface Raw {
  data: Buffer; // RGBA
  width: number;
  height: number;
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export async function postprocessSprite(
  input: Buffer,
  options: SpritePostprocessOptions = {}
): Promise<SpritePostprocessResult> {
  const padding = options.padding ?? 0.06;
  const outputSize = options.outputSize ?? 1024;

  // Work at ≤1024px — model outputs can be larger and nothing below needs more.
  const raw = await toRaw(input, 1024);

  // 1. Background → alpha
  let backgroundRemoved: boolean;
  if (options.trustInputAlpha && hasMeaningfulAlpha(raw)) {
    thresholdAlpha(raw, 128);
    backgroundRemoved = true;
  } else {
    // 32: tight enough to keep pale glows/highlights touching the background
    backgroundRemoved = keyOutBackground(raw, options.bgTolerance ?? 32);
  }

  // 2. Crop to subject
  const bbox = opaqueBounds(raw);
  if (!bbox) {
    // Nothing left after keying — the subject probably matched the background.
    // Fall back to the untouched image rather than returning an empty sprite.
    const fallback = await toRaw(input, 1024);
    return finalizeNonPixel(fallback, outputSize, padding, false);
  }
  const cropped = crop(raw, bbox);

  if (!options.pixelGrid) {
    return finalizeNonPixel(cropped, outputSize, padding, backgroundRemoved);
  }

  // 3. Pixel grid + palette
  const grid = options.pixelGrid;
  const paletteSize = options.paletteSize ?? 24;
  const inner = Math.max(1, Math.round(grid * (1 - padding * 2)));

  // Models that draw pixel art already use a (roughly) regular pixel size.
  // Re-sampling onto a different grid creates uneven "staircase" pixels, so
  // when a clear source pixel size is detected and the sprite fits the
  // target canvas, keep the model's own grid. Otherwise fall back to fitting
  // the target grid.
  const sourcePixel = detectPixelSize(cropped);
  let cellsW: number;
  let cellsH: number;
  // Canvas side in art pixels. Equals `grid` unless the model's own (smaller)
  // grid is kept, in which case the canvas shrinks to fit it so the subject
  // still fills the frame after integer upscaling.
  let canvasSize = grid;
  const nativeW = sourcePixel ? Math.round(cropped.width / sourcePixel) : 0;
  const nativeH = sourcePixel ? Math.round(cropped.height / sourcePixel) : 0;
  // Below ~28 art pixels the detection most likely latched onto a multiple of
  // the real size — fall back to fitting the target grid instead.
  // Only keep it when it is close to the target density, though: a set of
  // sprites must share ONE pixel size on screen, so a chunky 40-pixel potion
  // next to a fine 120-pixel knight is resampled onto the common grid.
  const nativeSide = Math.max(nativeW, nativeH);
  if (sourcePixel && nativeSide <= inner && nativeSide >= Math.max(28, inner * 0.8)) {
    cellsW = Math.max(1, nativeW);
    cellsH = Math.max(1, nativeH);
    canvasSize = Math.max(Math.max(cellsW, cellsH) + 2, Math.round(Math.max(cellsW, cellsH) / (1 - padding * 2)));
  } else {
    const scale = inner / Math.max(cropped.width, cropped.height);
    cellsW = Math.max(1, Math.round(cropped.width * scale));
    cellsH = Math.max(1, Math.round(cropped.height * scale));
  }

  const palette = kmeansPalette(cropped, paletteSize);
  const sprite = majorityDownsample(cropped, cellsW, cellsH, palette);
  despeckle(sprite);
  fillPinholes(sprite);

  // Centre on a square transparent canvas
  const canvas = blank(canvasSize, canvasSize);
  const ox = Math.floor((canvasSize - cellsW) / 2);
  const oy = Math.floor((canvasSize - cellsH) / 2);
  blit(sprite, canvas, ox, oy);

  // Integer factor keeps every art pixel the same size on screen
  const factor = Math.max(1, Math.floor(outputSize / canvasSize));
  const nativePng = await fromRaw(canvas).png({ compressionLevel: 9 }).toBuffer();
  const png = await fromRaw(canvas)
    .resize(canvasSize * factor, canvasSize * factor, { kernel: "nearest" })
    .png({ compressionLevel: 9 })
    .toBuffer();

  return {
    png,
    nativePng,
    width: canvasSize * factor,
    height: canvasSize * factor,
    backgroundRemoved,
    colors: countColors(canvas),
  };
}

/**
 * Square tiles (floors, walls): no background keying — the tile fills its
 * square. Made seamless by blending each edge band with a copy shifted by
 * half the tile: the shifted copy is continuous across the original edges,
 * so the result wraps. Pixel styles then snap to one grid + palette (the 8×
 * reduction is exact, so the wrap survives).
 */
export async function postprocessTile(
  input: Buffer,
  options: { pixelGrid?: number; paletteSize?: number; outputSize?: number } = {}
): Promise<{ png: Buffer }> {
  const size = 1024;
  const outputSize = options.outputSize ?? 1024;
  const { data, info } = await sharp(input)
    .resize(size, size, { fit: "cover" })
    .removeAlpha()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const src: Raw = { data, width: info.width, height: info.height };
  // Already wraps (the model often draws a seamless tile)? Then leave it —
  // blending would only add faint ghost copies.
  if (seamRatio(src) <= 1.6) {
    const kept = { ...src, data: Buffer.from(src.data) };
    return finishTile(kept, options, outputSize);
  }
  const out = blank(size, size);
  const band = size * 0.14;
  const half = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.min(x, y, size - 1 - x, size - 1 - y);
      const t = Math.min(1, d / band);
      const m = t * t * (3 - 2 * t); // smoothstep: 0 at the edge → original in the middle
      const i = (y * size + x) * 4;
      const j = (((y + half) % size) * size + ((x + half) % size)) * 4;
      out.data[i] = Math.round(src.data[i] * m + src.data[j] * (1 - m));
      out.data[i + 1] = Math.round(src.data[i + 1] * m + src.data[j + 1] * (1 - m));
      out.data[i + 2] = Math.round(src.data[i + 2] * m + src.data[j + 2] * (1 - m));
      out.data[i + 3] = 255;
    }
  }

  return finishTile(out, options, outputSize);
}

async function finishTile(
  tile: Raw,
  options: { pixelGrid?: number; paletteSize?: number },
  outputSize: number
): Promise<{ png: Buffer }> {
  if (!options.pixelGrid) {
    return { png: await fromRaw(tile).resize(outputSize, outputSize).png({ compressionLevel: 9 }).toBuffer() };
  }
  const grid = options.pixelGrid;
  const palette = kmeansPalette(tile, options.paletteSize ?? 32);
  const small = majorityDownsample(tile, grid, grid, palette);
  const factor = Math.max(1, Math.floor(outputSize / grid));
  const png = await fromRaw(small)
    .resize(grid * factor, grid * factor, { kernel: "nearest" })
    .png({ compressionLevel: 9 })
    .toBuffer();
  return { png };
}

/**
 * How much bigger the colour jump across the wrap-around edges is than a
 * typical jump between neighbouring lines inside the tile (~1 = seamless).
 */
function seamRatio(raw: Raw): number {
  const { width: w, height: h, data } = raw;
  const diff = (a: number, b: number) =>
    Math.abs(data[a] - data[b]) + Math.abs(data[a + 1] - data[b + 1]) + Math.abs(data[a + 2] - data[b + 2]);
  let seam = 0, inner = 0, n = 0;
  for (let y = 0; y < h; y++) {
    seam += diff((y * w + w - 1) * 4, (y * w) * 4);
    const mx = Math.floor(w / 3) + (y % 7) * 37;
    inner += diff((y * w + mx) * 4, (y * w + mx + 1) * 4);
    n++;
  }
  for (let x = 0; x < w; x++) {
    seam += diff(((h - 1) * w + x) * 4, x * 4);
    const my = Math.floor(h / 3) + (x % 7) * 37;
    inner += diff((my * w + x) * 4, ((my + 1) * w + x) * 4);
    n++;
  }
  return seam / n / Math.max(1, inner / n);
}

// -----------------------------------------------------------------------------
// Raw helpers
// -----------------------------------------------------------------------------

async function toRaw(input: Buffer, maxSide: number): Promise<Raw> {
  const { data, info } = await sharp(input)
    .resize(maxSide, maxSide, { fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function fromRaw(raw: Raw) {
  return sharp(raw.data, { raw: { width: raw.width, height: raw.height, channels: 4 } });
}

function blank(width: number, height: number): Raw {
  return { data: Buffer.alloc(width * height * 4), width, height };
}

function blit(src: Raw, dst: Raw, ox: number, oy: number): void {
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const dx = x + ox;
      const dy = y + oy;
      if (dx < 0 || dy < 0 || dx >= dst.width || dy >= dst.height) continue;
      src.data.copy(dst.data, (dy * dst.width + dx) * 4, (y * src.width + x) * 4, (y * src.width + x) * 4 + 4);
    }
  }
}

function crop(raw: Raw, b: { x0: number; y0: number; x1: number; y1: number }): Raw {
  const width = b.x1 - b.x0 + 1;
  const height = b.y1 - b.y0 + 1;
  const out = blank(width, height);
  for (let y = 0; y < height; y++) {
    const start = ((b.y0 + y) * raw.width + b.x0) * 4;
    raw.data.copy(out.data, y * width * 4, start, start + width * 4);
  }
  return out;
}

function opaqueBounds(raw: Raw): { x0: number; y0: number; x1: number; y1: number } | null {
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
  // Ignore specks: require a subject at least 2% of the image in some dimension
  if (x1 < 0 || (x1 - x0 < raw.width * 0.02 && y1 - y0 < raw.height * 0.02)) return null;
  return { x0, y0, x1, y1 };
}

function hasMeaningfulAlpha(raw: Raw): boolean {
  let transparent = 0;
  const total = raw.width * raw.height;
  for (let i = 3; i < raw.data.length; i += 4) if (raw.data[i] < 128) transparent++;
  return transparent > total * 0.05 && transparent < total * 0.98;
}

function thresholdAlpha(raw: Raw, cutoff: number): void {
  for (let i = 3; i < raw.data.length; i += 4) raw.data[i] = raw.data[i] >= cutoff ? 255 : 0;
}

// -----------------------------------------------------------------------------
// 1. Background keying
// -----------------------------------------------------------------------------

/**
 * Same keying as single sprites, for callers working on raw RGBA buffers
 * (animation frames). `fringePasses` > 1 erodes thicker anti-aliased halos —
 * frames redrawn by an edit model often carry a 2–3px light edge.
 */
export function keySpriteBackground(
  raw: Raw,
  opts: { tolerance?: number; fringePasses?: number; /** Image area one sprite occupies (1/frames for a sheet). */ areaScale?: number } = {}
): boolean {
  return keyOutBackground(raw, opts.tolerance ?? 32, opts.fringePasses ?? 1, opts.areaScale ?? 1);
}

/**
 * Flood-fills from every border pixel over pixels within `tolerance` of the
 * dominant border colour and makes them transparent. Returns false (and leaves
 * the image untouched) when the border is not a flat colour — e.g. the model
 * ignored the instruction and drew a scene.
 */
function keyOutBackground(raw: Raw, tolerance: number, fringePasses = 1, areaScale = 1): boolean {
  const { width, height, data } = raw;
  const border: number[] = [];
  for (let x = 0; x < width; x++) border.push(x, (height - 1) * width + x);
  for (let y = 0; y < height; y++) border.push(y * width, y * width + width - 1);

  // Dominant border colour (bucketed mode — robust to a stray subject pixel)
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (const p of border) {
    const i = p * 4;
    if (data[i + 3] < 128) continue;
    const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
    const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += data[i]; e.g += data[i + 1]; e.b += data[i + 2];
    buckets.set(key, e);
  }
  let best: { n: number; r: number; g: number; b: number } | undefined;
  for (const e of buckets.values()) if (!best || e.n > best.n) best = e;
  if (!best) return true; // border already transparent
  if (best.n < border.length * 0.5) return false; // no flat background
  const br = best.r / best.n, bg = best.g / best.n, bb = best.b / best.n;

  const tol2 = tolerance * tolerance;
  const isBg = (p: number) => {
    const i = p * 4;
    if (data[i + 3] < 128) return true;
    const dr = data[i] - br, dg = data[i + 1] - bg, db = data[i + 2] - bb;
    return dr * dr + dg * dg + db * db <= tol2;
  };

  const visited = new Uint8Array(width * height);
  const stack: number[] = [];
  for (const p of border) if (!visited[p] && isBg(p)) { visited[p] = 1; stack.push(p); }
  while (stack.length) {
    const p = stack.pop()!;
    data[p * 4 + 3] = 0;
    const x = p % width, y = (p - x) / width;
    if (x > 0 && !visited[p - 1] && isBg(p - 1)) { visited[p - 1] = 1; stack.push(p - 1); }
    if (x < width - 1 && !visited[p + 1] && isBg(p + 1)) { visited[p + 1] = 1; stack.push(p + 1); }
    if (y > 0 && !visited[p - width] && isBg(p - width)) { visited[p - width] = 1; stack.push(p - width); }
    if (y < height - 1 && !visited[p + width] && isBg(p + width)) { visited[p + width] = 1; stack.push(p + width); }
  }

  // Erode a fringe of background-tinted, anti-aliased edge pixels (1px per pass)
  const fringeTol2 = (tolerance * 2) * (tolerance * 2);
  for (let pass = 0; pass < fringePasses; pass++) {
    const clear: number[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const p = y * width + x;
        if (data[p * 4 + 3] === 0) continue;
        const touchesBg =
          (x > 0 && data[(p - 1) * 4 + 3] === 0) || (x < width - 1 && data[(p + 1) * 4 + 3] === 0) ||
          (y > 0 && data[(p - width) * 4 + 3] === 0) || (y < height - 1 && data[(p + width) * 4 + 3] === 0);
        if (!touchesBg) continue;
        const i = p * 4;
        const dr = data[i] - br, dg = data[i + 1] - bg, db = data[i + 2] - bb;
        if (dr * dr + dg * dg + db * db <= fringeTol2) clear.push(p);
      }
    }
    if (clear.length === 0) break;
    for (const p of clear) data[p * 4 + 3] = 0;
  }

  removeEnclosedBackground(raw, br, bg, bb, areaScale);
  removeGroundShadow(raw);
  return true;
}

/**
 * Models often add a soft grey "contact shadow" ellipse under characters even
 * when told not to. It's light, desaturated and touches the background, and
 * sits in the bottom part of the subject. Grow the transparent region into
 * such pixels — only in the lower 30% of the subject, so light-coloured parts
 * higher up (silver armour, white cloth) are never touched.
 */
function removeGroundShadow(raw: Raw): void {
  const { width, height, data } = raw;
  const b = opaqueBounds(raw);
  if (!b) return;
  const yMin = Math.floor(b.y1 - (b.y1 - b.y0) * 0.3);
  const isShadow = (p: number) => {
    const i = p * 4;
    if (data[i + 3] === 0) return false;
    const y = Math.floor(p / width);
    if (y < yMin) return false;
    const r = data[i], g = data[i + 1], bl = data[i + 2];
    const max = Math.max(r, g, bl), min = Math.min(r, g, bl);
    const luma = 0.299 * r + 0.587 * g + 0.114 * bl;
    // Grey band only: near-white (≥233) is subject (ghost, cloth) not shadow
    return luma >= 150 && luma <= 232 && max - min <= 28;
  };
  const stack: number[] = [];
  const seen = new Uint8Array(width * height);
  for (let y = Math.max(1, yMin); y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const p = y * width + x;
      if (!isShadow(p)) continue;
      const touchesClear =
        data[(p - 1) * 4 + 3] === 0 || data[(p + 1) * 4 + 3] === 0 ||
        data[(p - width) * 4 + 3] === 0 || data[(p + width) * 4 + 3] === 0;
      if (touchesClear) { seen[p] = 1; stack.push(p); }
    }
  }
  while (stack.length) {
    const p = stack.pop()!;
    data[p * 4 + 3] = 0;
    const x = p % width;
    const next = [x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1, p - width, p + width];
    for (const q of next) {
      if (q < 0 || q >= width * height || seen[q] || !isShadow(q)) continue;
      seen[q] = 1;
      stack.push(q);
    }
  }
}

/**
 * Background visible through gaps inside the subject (between an arm and a
 * staff, inside a ring) is not reachable from the border. Clear connected
 * regions that are almost exactly the key colour and large enough not to be
 * a highlight or an eye.
 */
function removeEnclosedBackground(raw: Raw, br: number, bg: number, bb: number, areaScale = 1): void {
  const { width, height, data } = raw;
  const tight2 = 18 * 18;
  // 0.4% of the canvas: large gaps go, glints on glass/crystal/eyes stay
  const minArea = Math.round(width * height * areaScale * 0.004);
  const minOutlinedArea = Math.round(width * height * areaScale * 0.0002);
  const seen = new Uint8Array(width * height);
  const near = (p: number) => {
    const i = p * 4;
    if (data[i + 3] === 0) return false;
    const dr = data[i] - br, dg = data[i + 1] - bg, db = data[i + 2] - bb;
    return dr * dr + dg * dg + db * db <= tight2;
  };
  for (let start = 0; start < width * height; start++) {
    if (seen[start] || !near(start)) continue;
    const region: number[] = [];
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const p = stack.pop()!;
      region.push(p);
      const x = p % width, y = (p - x) / width;
      const next = [x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1, y > 0 ? p - width : -1, y < height - 1 ? p + width : -1];
      for (const q of next) if (q >= 0 && !seen[q] && near(q)) { seen[q] = 1; stack.push(q); }
    }
    // Large regions are background gaps. Small ones are background only when
    // they are fenced by the subject's dark outline (a gap between arm and
    // staff); highlights on glass/metal border on mid-tones instead.
    const isGap =
      region.length >= minArea ||
      (region.length >= minOutlinedArea && darkBorderRatio(raw, region) >= 0.6);
    if (isGap) for (const p of region) data[p * 4 + 3] = 0;
  }
}

/** Share of the region's outer boundary pixels that are dark (outline-like). */
function darkBorderRatio(raw: Raw, region: number[]): number {
  const { width, height, data } = raw;
  const member = new Set(region);
  let dark = 0, total = 0;
  for (const p of region) {
    const x = p % width, y = (p - x) / width;
    const next = [x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1, y > 0 ? p - width : -1, y < height - 1 ? p + width : -1];
    for (const q of next) {
      if (q < 0 || member.has(q)) continue;
      const i = q * 4;
      if (data[i + 3] === 0) continue; // touches already-cleared background
      total++;
      const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (luma < 70) dark++;
    }
  }
  return total === 0 ? 0 : dark / total;
}

// -----------------------------------------------------------------------------
// 3. Palette + grid
// -----------------------------------------------------------------------------

type RGB = [number, number, number];

/** k-means (k-means++ init) over a sample of opaque pixels. Deterministic. */
function kmeansPalette(raw: Raw, k: number): RGB[] {
  const samples: RGB[] = [];
  const total = raw.width * raw.height;
  const step = Math.max(1, Math.floor(total / 20000));
  for (let p = 0; p < total; p += step) {
    const i = p * 4;
    if (raw.data[i + 3] >= 128) samples.push([raw.data[i], raw.data[i + 1], raw.data[i + 2]]);
  }
  if (samples.length === 0) return [[0, 0, 0]];
  k = Math.min(k, samples.length);

  // Deterministic k-means++: pseudo-random from a fixed seed
  let seed = 1234567;
  const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const centers: RGB[] = [samples[Math.floor(rand() * samples.length)]];
  const d2 = new Float64Array(samples.length).fill(Infinity);
  while (centers.length < k) {
    const c = centers[centers.length - 1];
    let sum = 0;
    for (let s = 0; s < samples.length; s++) {
      const d = dist2(samples[s], c);
      if (d < d2[s]) d2[s] = d;
      sum += d2[s];
    }
    if (sum === 0) break;
    let r = rand() * sum;
    let idx = 0;
    for (; idx < samples.length - 1; idx++) { r -= d2[idx]; if (r <= 0) break; }
    centers.push([...samples[idx]] as RGB);
  }

  const assign = new Int32Array(samples.length);
  for (let iter = 0; iter < 12; iter++) {
    for (let s = 0; s < samples.length; s++) assign[s] = nearest(samples[s], centers);
    const acc = centers.map(() => [0, 0, 0, 0]);
    for (let s = 0; s < samples.length; s++) {
      const a = acc[assign[s]];
      a[0] += samples[s][0]; a[1] += samples[s][1]; a[2] += samples[s][2]; a[3]++;
    }
    let moved = false;
    for (let c = 0; c < centers.length; c++) {
      if (!acc[c][3]) continue;
      const n: RGB = [acc[c][0] / acc[c][3], acc[c][1] / acc[c][3], acc[c][2] / acc[c][3]];
      if (dist2(n, centers[c]) > 1) moved = true;
      centers[c] = n;
    }
    if (!moved) break;
  }
  return centers.map((c) => c.map(Math.round) as RGB);
}

function dist2(a: RGB, b: RGB): number {
  // Weighted RGB distance — closer to perceived difference than plain RGB
  const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
  return 2 * dr * dr + 4 * dg * dg + 3 * db * db;
}

function nearest(c: RGB, palette: RGB[]): number {
  let best = 0, bestD = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const d = dist2(c, palette[i]);
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

/**
 * Each output pixel = majority palette colour among the opaque source pixels
 * of its cell; transparent when most of the cell is transparent.
 */
function majorityDownsample(raw: Raw, outW: number, outH: number, palette: RGB[]): Raw {
  const out = blank(outW, outH);
  const counts = new Int32Array(palette.length);
  for (let cy = 0; cy < outH; cy++) {
    const sy0 = Math.floor((cy * raw.height) / outH);
    const sy1 = Math.max(sy0 + 1, Math.floor(((cy + 1) * raw.height) / outH));
    for (let cx = 0; cx < outW; cx++) {
      const sx0 = Math.floor((cx * raw.width) / outW);
      const sx1 = Math.max(sx0 + 1, Math.floor(((cx + 1) * raw.width) / outW));
      counts.fill(0);
      let opaque = 0, total = 0;
      for (let y = sy0; y < sy1; y++) {
        for (let x = sx0; x < sx1; x++) {
          const i = (y * raw.width + x) * 4;
          total++;
          if (raw.data[i + 3] < 128) continue;
          opaque++;
          counts[nearest([raw.data[i], raw.data[i + 1], raw.data[i + 2]], palette)]++;
        }
      }
      if (opaque * 2 < total) continue; // stays transparent
      let best = 0;
      for (let c = 1; c < counts.length; c++) if (counts[c] > counts[best]) best = c;
      const o = (cy * outW + cx) * 4;
      out.data[o] = palette[best][0];
      out.data[o + 1] = palette[best][1];
      out.data[o + 2] = palette[best][2];
      out.data[o + 3] = 255;
    }
  }
  return out;
}

/**
 * Estimate the size (in source pixels) of one "art pixel" in model-drawn
 * pixel art. Colour edges in real pixel art fall on a regular lattice; for a
 * candidate size s we measure how much edge energy lands on the best lattice
 * offset (±1px tolerance for model drift) relative to chance. The true size
 * maximises that ratio; multiples of it tie, so the smallest near-best wins.
 * Returns null when no clear lattice exists (painterly output).
 */
function detectPixelSize(raw: Raw): number | null {
  const sx = axisPixelSize(raw, "x");
  const sy = axisPixelSize(raw, "y");
  if (sx && sy) return Math.abs(sx - sy) <= Math.max(1, Math.min(sx, sy) * 0.15) ? (sx + sy) / 2 : Math.min(sx, sy);
  return sx ?? sy ?? null;
}

function axisPixelSize(raw: Raw, axis: "x" | "y"): number | null {
  const len = axis === "x" ? raw.width : raw.height;
  const other = axis === "x" ? raw.height : raw.width;
  if (len < 64) return null;

  // Edge energy at each boundary along the axis (opaque neighbours only)
  const energy = new Float64Array(len);
  for (let a = 1; a < len; a++) {
    let e = 0;
    for (let b = 0; b < other; b += 2) {
      const p = axis === "x" ? b * raw.width + a : a * raw.width + b;
      const q = axis === "x" ? p - 1 : p - raw.width;
      if (raw.data[p * 4 + 3] < 128 || raw.data[q * 4 + 3] < 128) continue;
      const d =
        Math.abs(raw.data[p * 4] - raw.data[q * 4]) +
        Math.abs(raw.data[p * 4 + 1] - raw.data[q * 4 + 1]) +
        Math.abs(raw.data[p * 4 + 2] - raw.data[q * 4 + 2]);
      if (d > 24) e += d;
    }
    energy[a] = e;
  }
  const total = energy.reduce((s, v) => s + v, 0);
  if (total === 0) return null;

  const ratios: { s: number; ratio: number }[] = [];
  for (let s = 4; s <= 40; s += 0.25) {
    let bestCaptured = 0;
    for (let o = 0; o < s; o += 0.5) {
      let captured = 0;
      for (let k = o; k < len; k += s) {
        const c = Math.round(k);
        captured += (energy[c] ?? 0) + 0.5 * ((energy[c - 1] ?? 0) + (energy[c + 1] ?? 0));
      }
      if (captured > bestCaptured) bestCaptured = captured;
    }
    // Chance level for a 3-wide window (weights 1 + 0.5 + 0.5) is 2/s
    ratios.push({ s, ratio: (bestCaptured / total) / (2 / s) });
  }
  const best = ratios.reduce((m, r) => (r.ratio > m.ratio ? r : m));
  if (best.ratio < 2.2) return null;
  let pick = ratios.find((r) => r.ratio >= best.ratio * 0.9)!;
  // A lattice at 2× the true size also scores well (every other edge is on
  // it). If half the size still explains the edges nearly as well, it's the
  // real pixel size — prefer it, so detail isn't merged into 2×2 blocks.
  for (;;) {
    const half = ratios.find((r) => Math.abs(r.s - pick.s / 2) < 0.2);
    if (!half || half.ratio < pick.ratio * 0.7) break;
    pick = half;
  }
  return pick.s;
}

/** Remove opaque pixels with no opaque 4-neighbour (single-pixel noise). */
/**
 * A lone pure-white art pixel boxed in by dark pixels on all four sides is a
 * pinhole of the white key background (too small for the enclosed-gap pass),
 * not a highlight — highlights sit next to lighter tones. Fill it with the
 * darkest neighbour so it reads as part of the outline.
 */
function fillPinholes(raw: Raw): void {
  const { width: w, height: h, data } = raw;
  const luma = (i: number) => 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] === 0 || Math.min(data[i], data[i + 1], data[i + 2]) < 235) continue;
      let darkest = -1, darkestL = Infinity, allDark = true;
      for (const j of [i - 4, i + 4, i - w * 4, i + w * 4]) {
        const l = luma(j);
        if (data[j + 3] === 0 || l >= 90) { allDark = false; break; }
        if (l < darkestL) { darkestL = l; darkest = j; }
      }
      if (!allDark || darkest < 0) continue;
      data[i] = data[darkest]; data[i + 1] = data[darkest + 1]; data[i + 2] = data[darkest + 2];
    }
  }
}

function despeckle(raw: Raw): void {
  const { width, height, data } = raw;
  const kill: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      if (data[p * 4 + 3] === 0) continue;
      const n =
        (x > 0 && data[(p - 1) * 4 + 3] > 0 ? 1 : 0) + (x < width - 1 && data[(p + 1) * 4 + 3] > 0 ? 1 : 0) +
        (y > 0 && data[(p - width) * 4 + 3] > 0 ? 1 : 0) + (y < height - 1 && data[(p + width) * 4 + 3] > 0 ? 1 : 0);
      if (n === 0) kill.push(p);
    }
  }
  for (const p of kill) data[p * 4 + 3] = 0;
}

function countColors(raw: Raw): number {
  const set = new Set<number>();
  for (let i = 0; i < raw.data.length; i += 4) {
    if (raw.data[i + 3] > 0) set.add((raw.data[i] << 16) | (raw.data[i + 1] << 8) | raw.data[i + 2]);
  }
  return set.size;
}

// -----------------------------------------------------------------------------
// Non-pixel finalisation
// -----------------------------------------------------------------------------

async function finalizeNonPixel(
  raw: Raw,
  outputSize: number,
  padding: number,
  backgroundRemoved: boolean
): Promise<SpritePostprocessResult> {
  const inner = Math.round(outputSize * (1 - padding * 2));
  const subject = await fromRaw(raw)
    .resize(inner, inner, { fit: "inside", kernel: "lanczos3" })
    .png()
    .toBuffer({ resolveWithObject: true });
  const png = await sharp({
    create: { width: outputSize, height: outputSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      {
        input: subject.data,
        left: Math.floor((outputSize - subject.info.width) / 2),
        top: Math.floor((outputSize - subject.info.height) / 2),
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
  return { png, width: outputSize, height: outputSize, backgroundRemoved };
}
