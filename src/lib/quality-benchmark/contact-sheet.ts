import sharp from "sharp";

export async function checkerCell(png: Buffer, size: number): Promise<Buffer> {
  const tile = 16;
  let rects = "";
  for (let y = 0; y < size / tile; y++) {
    for (let x = 0; x < size / tile; x++) {
      if ((x + y) % 2) rects += `<rect x="${x * tile}" y="${y * tile}" width="${tile}" height="${tile}" fill="#c8c8c8"/>`;
    }
  }
  const bg = await sharp(Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#ffffff"/>${rects}</svg>`,
  )).png().toBuffer();
  const fg = await sharp(png)
    .resize(size, size, { fit: "contain", kernel: "nearest", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return sharp(bg).composite([{ input: fg }]).png().toBuffer();
}

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function label(text: string, w: number): Promise<Buffer> {
  const svg = `<svg width="${w}" height="36" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#131A31"/><text x="8" y="24" font-family="Arial" font-size="16" fill="#FFF1E8">${escapeXml(text)}</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** Comparison sheet: one row per item, cells left to right. */
export async function contactSheet(
  rows: { title: string; cells: { title: string; png: Buffer }[] }[],
  cell = 160,
): Promise<Buffer> {
  const cols = Math.max(1, ...rows.map((r) => r.cells.length));
  const rowH = 28 + 36 + cell;
  const width = cols * cell;
  const height = rows.length * rowH;
  const overlays: sharp.OverlayOptions[] = [];
  for (let r = 0; r < rows.length; r++) {
    const rowLabel = await label(rows[r].title, width);
    overlays.push({ input: rowLabel, left: 0, top: r * rowH });
    for (let c = 0; c < rows[r].cells.length; c++) {
      const cellLabel = await label(rows[r].cells[c].title, cell);
      const img = await checkerCell(rows[r].cells[c].png, cell);
      const x = c * cell;
      const y = r * rowH + 28;
      overlays.push({ input: cellLabel, left: x, top: y });
      overlays.push({ input: img, left: x, top: y + 36 });
    }
  }
  return sharp({
    create: { width, height, channels: 4, background: { r: 19, g: 26, b: 49, alpha: 1 } },
  }).composite(overlays).png().toBuffer();
}
