// Builds the SpriteLab mark — a pixel-art potion flask on an orange tile —
// from the pixel map below, then renders every icon size from that one SVG.
//   npx tsx scripts/make-logo.ts
// Outputs: public/logo.svg, public/logo.png (512), public/icon-*.png,
//          public/favicon.ico, src/app/favicon.ico, public/email/logo.png
import { writeFileSync } from "fs";
import sharp from "sharp";

// 12 × 13 flask, placed at (2,2) on a 16 × 16 tile.
//   K outline · C cork · G glass · L liquid · B bubble · S sparkle
const FLASK = [
  "....KKKK....",
  "....KCCK..S.",
  "...KKKKKK...",
  "....KGGK...S",
  "....KGGK....",
  "...KGGGGK...",
  "..KGGGGGGK..",
  ".KGGGGGGGGK.",
  ".KBBLLBBBLK.",
  ".KLLBLLLLLK.",
  ".KLLLLLBLLK.",
  "..KLLLLLLK..",
  "...KKKKKK...",
];
const COLORS: Record<string, string> = {
  K: "#0B0D12",
  C: "#5A3420",
  G: "#FFF1E4",
  L: "#0B0D12",
  B: "#FFB27A",
  S: "#FFF1E4",
};

function svg(): string {
  const px: string[] = [];
  FLASK.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const fill = COLORS[ch];
      if (fill) px.push(`<rect x="${x + 2}" y="${y + 2}" width="1" height="1" fill="${fill}"/>`);
    });
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF7A1A"/><stop offset="1" stop-color="#FFA552"/></linearGradient></defs>
<rect width="16" height="16" rx="3.5" fill="url(#g)" shape-rendering="geometricPrecision"/>
${px.join("")}
</svg>`;
}

/** ICO container holding PNG images (supported by every current browser). */
function ico(pngs: { size: number; data: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const entries: Buffer[] = [];
  let offset = 6 + 16 * pngs.length;
  for (const p of pngs) {
    const e = Buffer.alloc(16);
    e.writeUInt8(p.size >= 256 ? 0 : p.size, 0);
    e.writeUInt8(p.size >= 256 ? 0 : p.size, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(p.data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += p.data.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

(async () => {
  const source = Buffer.from(svg());
  writeFileSync("public/logo.svg", source);
  // Render big once, then scale with nearest-neighbour so pixels stay square
  const master = await sharp(source, { density: 2048 }).resize(1024, 1024).png().toBuffer();
  const render = (size: number) =>
    sharp(master).resize(size, size, { kernel: size >= 64 ? "lanczos3" : "nearest" }).png({ compressionLevel: 9 }).toBuffer();

  writeFileSync("public/logo.png", await render(512));
  writeFileSync("public/email/logo.png", await render(96));
  const sizes = [16, 32, 48, 64, 128, 180, 192, 512];
  const out: Record<number, Buffer> = {};
  for (const s of sizes) {
    out[s] = await render(s);
    writeFileSync(`public/icon-${s}.png`, out[s]);
  }
  writeFileSync("public/favicon-32x32.png", out[32]);
  const favicon = ico([16, 32, 48].map((s) => ({ size: s, data: out[s] })));
  writeFileSync("public/favicon.ico", favicon);
  writeFileSync("src/app/favicon.ico", favicon);
  console.log("Logo + icons written.");
})();
