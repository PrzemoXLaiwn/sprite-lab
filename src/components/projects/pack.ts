import { isPixelStyleId, toNativePixelBlob } from "@/lib/client/sprite-native";
import type { ProjectAsset, ProjectDetail } from "./types";

const CONCURRENCY = 4;

/** Filesystem-safe path segment (keeps spaces/case for folder names). */
export function sanitizeSegment(name: string, fallback: string): string {
  const cleaned = name
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[.\s]+|[.\s]+$/g, "")
    .slice(0, 80);
  return cleaned || fallback;
}

export function slugify(text: string, max = 48): string {
  const slug = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
  return slug || "sprite";
}

export function spriteFilename(asset: ProjectAsset): string {
  const seed = asset.seed !== null && asset.seed !== undefined && String(asset.seed) !== "" ? String(asset.seed) : asset.id.slice(0, 8);
  return `${slugify(asset.prompt)}-${seed}.png`;
}

function dedupe(name: string, used: Set<string>): string {
  const key = (n: string) => n.toLowerCase();
  if (!used.has(key(name))) {
    used.add(key(name));
    return name;
  }
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let i = 2;
  while (used.has(key(`${base}-${i}${ext}`))) i++;
  const out = `${base}-${i}${ext}`;
  used.add(key(out));
  return out;
}

export interface PackResult {
  blob: Blob;
  filename: string;
  packed: number;
  failed: number;
}

export async function buildProjectPack(
  project: ProjectDetail,
  assets: ProjectAsset[],
  onProgress?: (done: number, total: number) => void
): Promise<PackResult> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const rootName = sanitizeSegment(project.name, "SpriteLab Project");
  const root = zip.folder(rootName)!;

  // Unique directory name per folder id (null → Unsorted).
  const usedDirs = new Set<string>();
  const dirFor = new Map<string | null, string>();
  const sortedFolders = [...project.folders].sort((a, b) => a.sortOrder - b.sortOrder);
  for (const f of sortedFolders) dirFor.set(f.id, dedupe(sanitizeSegment(f.name, "Folder"), usedDirs));
  const unsortedDir = dedupe("Unsorted", usedDirs);
  const dirOf = (folderId: string | null) => (folderId && dirFor.get(folderId)) || unsortedDir;

  // Pre-assign unique filenames per directory so results are deterministic.
  const usedNames = new Map<string, Set<string>>();
  const jobs = assets.map((asset) => {
    const dir = dirOf(asset.folderId);
    if (!usedNames.has(dir)) usedNames.set(dir, new Set());
    return { asset, dir, name: dedupe(spriteFilename(asset), usedNames.get(dir)!) };
  });

  const total = jobs.length;
  let done = 0;
  let failed = 0;
  const packedPerDir = new Map<string, number>();
  onProgress?.(0, total);

  let cursor = 0;
  const worker = async () => {
    while (cursor < jobs.length) {
      const job = jobs[cursor++];
      try {
        const res = await fetch(job.asset.imageUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        root.file(`${job.dir}/${job.name}`, blob);
        packedPerDir.set(job.dir, (packedPerDir.get(job.dir) ?? 0) + 1);
        if (isPixelStyleId(job.asset.styleId)) {
          try {
            const native = await toNativePixelBlob(blob);
            if (native.factor > 1) root.file(`${job.dir}/native/${job.name}`, native.blob);
          } catch {
            // Native copy is a bonus — the full-size PNG is already packed.
          }
        }
      } catch {
        failed++;
      }
      done++;
      onProgress?.(done, total);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker));

  const date = new Date().toISOString().slice(0, 10);
  const folderLines = [
    ...sortedFolders.map((f) => `  - ${dirFor.get(f.id)}/  (${packedPerDir.get(dirFor.get(f.id)!) ?? 0})`),
    ...(packedPerDir.has(unsortedDir) ? [`  - ${unsortedDir}/  (${packedPerDir.get(unsortedDir)})`] : []),
  ];
  const readme = [
    project.name,
    "=".repeat(Math.max(3, project.name.length)),
    "",
    `Packed: ${date}`,
    `Sprites: ${total - failed}`,
    "",
    "Generated with SpriteLab — https://www.sprite-lab.com",
    "",
    "Folders:",
    ...folderLines,
    "",
    "Pixel-art sprites also include a native-resolution copy in each folder's",
    "native/ subfolder (the true art-pixel size game engines expect).",
    "",
  ].join("\r\n");
  root.file("README.txt", readme);

  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
  return { blob, filename: `${slugify(project.name, 60)}-sprite-pack.zip`, packed: total - failed, failed };
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
