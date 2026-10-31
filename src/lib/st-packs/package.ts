// =============================================================================
// ST Packs — ZIP packaging for SillyTavern
// =============================================================================
// The main pack is a flat ZIP of <label>.webp. SillyTavern's "Upload sprite
// pack" keeps only entries whose extension maps to image/* and flattens
// folders, so README.txt rides along harmlessly; a neutral.png next to
// neutral.webp would register as a second sprite for that label, which is
// why stills and GIFs ship as separate archives.
// =============================================================================
import { expressionFileName, isExpressionLabel } from "@/config/st-expressions";

export interface PackEntry {
  label: string;
  data: Buffer;
}

export function packSlug(name: string | null | undefined): string {
  const slug = (name ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "character";
}

export function readmeText(): string {
  return [
    "SpriteLab — SillyTavern expression pack",
    "",
    "Install:",
    "1. SillyTavern → Extensions → Character Expressions.",
    "2. Open the character → \"Upload sprite pack (ZIP)\" → choose this zip.",
    "3. Set the fallback expression to \"neutral\".",
    "4. Classifier: local or LLM — both work with these labels.",
    "",
    "Waist-up packs look best in Visual Novel mode.",
    "Files are animated WebP with transparency, 16 fps, seamless loops.",
    "",
  ].join("\n");
}

async function newZip() {
  const JSZip = (await import("jszip")).default;
  return new JSZip();
}

/** Flat root, `<label>.webp` only (plus README.txt when asked). Unknown labels are rejected. */
export async function buildMainZip(entries: PackEntry[], opts: { readme?: boolean } = {}): Promise<Buffer> {
  const zip = await newZip();
  for (const e of entries) {
    if (!isExpressionLabel(e.label)) throw new Error(`Unknown expression label: ${e.label}`);
    zip.file(expressionFileName(e.label, "webp"), e.data);
  }
  if (opts.readme) zip.file("README.txt", readmeText());
  return zip.generateAsync({ type: "nodebuffer", compression: "STORE" });
}

/** Static PNGs or GIF fallbacks, each in its own archive. */
export async function buildExtraZip(entries: PackEntry[], ext: "png" | "gif"): Promise<Buffer> {
  const zip = await newZip();
  for (const e of entries) {
    if (!isExpressionLabel(e.label)) throw new Error(`Unknown expression label: ${e.label}`);
    zip.file(expressionFileName(e.label, ext), e.data);
  }
  return zip.generateAsync({ type: "nodebuffer", compression: ext === "png" ? "DEFLATE" : "STORE" });
}

export function packFileName(slug: string, kind: "zip" | "png" | "gif" | "grid" | "readme"): string {
  switch (kind) {
    case "zip": return `${slug}_st_pack.zip`;
    case "png": return `${slug}_static_png.zip`;
    case "gif": return `${slug}_gif.zip`;
    case "grid": return `${slug}_preview.gif`;
    case "readme": return `${slug}_README.txt`;
  }
}
