"use client";

/**
 * "Upload your sprite": bring your own character or item into SpriteLab and
 * use it in Animate, Edit and Directions like a generated sprite. Free and
 * private. The server keys out a plain background and trims the image.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, X } from "lucide-react";

const KINDS = [
  { id: "character", label: "Character" },
  { id: "creature", label: "Creature" },
  { id: "object", label: "Item or object" },
] as const;

const nameFromFile = (f: File) =>
  f.name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);

/** Button that opens the upload dialog. `then` decides where to go with the new sprite. */
export function UploadSpriteButton({ then = "create", className = "", label = "Upload sprite" }: { then?: "create" | "animate" | "edit"; className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog"
        className={`btn btn-secondary shrink-0 ${className}`}>
        <Upload className="h-4 w-4" aria-hidden /> {label}
      </button>
      {open && <UploadSpriteDialog then={then} onClose={() => setOpen(false)} />}
    </>
  );
}

/**
 * The prominent entry on the Create page's left panel: click to choose a file
 * or drop one straight onto it. Opens the same dialog as the toolbar button.
 */
export function UploadSpriteCard() {
  const [open, setOpen] = useState(false);
  const [dropped, setDropped] = useState<File | null>(null);
  const [over, setOver] = useState(false);
  return (
    <>
      <button type="button" onClick={() => { setDropped(null); setOpen(true); }} aria-haspopup="dialog"
        onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) { setDropped(f); setOpen(true); } }}
        className={`group flex w-full items-center gap-3 rounded-[14px] border border-dashed p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_14px_30px_-22px_rgba(4,7,20,0.9)] transition-[border-color,background-color,transform,box-shadow] duration-150 hover:-translate-y-px ${over ? "border-[#FFA300] bg-[#FFA300]/[0.12] shadow-[0_0_0_1px_rgba(255,163,0,0.35),0_8px_24px_-10px_rgba(255,163,0,0.55)]" : "border-[#FFA300]/50 bg-[linear-gradient(180deg,#1E2849,#192241)] hover:border-[#FFA300] hover:shadow-[0_0_0_1px_rgba(255,163,0,0.25),0_10px_26px_-12px_rgba(255,163,0,0.45)]"}`}>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[11px] border border-[#FFA300]/35 bg-[linear-gradient(180deg,rgba(255,163,0,0.22),rgba(255,163,0,0.08))] text-[#FFB733] shadow-[inset_0_1px_0_rgba(255,220,160,0.25)] transition-colors group-hover:bg-[linear-gradient(180deg,#FFBE45,#F28E00)] group-hover:text-[#131A31]">
          <Upload className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-[14.5px] font-semibold text-[#FFF1E8]">Upload your sprite</span>
          <span className="block text-[12.5px] leading-snug text-[#A7ADD4]">Drop or choose a PNG, JPG or WebP, then animate or edit it</span>
        </span>
      </button>
      {open && <UploadSpriteDialog then="create" initialFile={dropped} onClose={() => setOpen(false)} />}
    </>
  );
}

function UploadSpriteDialog({ then, onClose, initialFile = null }: { then: "create" | "animate" | "edit"; onClose: () => void; initialFile?: File | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<(typeof KINDS)[number]["id"]>("character");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  // A file dropped on the card opens the dialog with it already chosen
  const takenInitial = useRef(false);
  useEffect(() => {
    if (initialFile && !takenInitial.current) { takenInitial.current = true; pick(initialFile); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile]);

  const pick = (f: File | undefined) => {
    if (!f) return;
    setError("");
    if (!/^image\/(png|jpeg|webp)$/.test(f.type)) { setError("Use a PNG, JPG or WebP image."); return; }
    if (f.size > 8 * 1024 * 1024) { setError("That file is over 8 MB."); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    if (!name) setName(nameFromFile(f));
  };

  const submit = async () => {
    if (!file || busy) return;
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("name", name);
      body.set("kind", kind);
      const res = await fetch("/api/import-sprite", { method: "POST", body });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.generationId) throw new Error(data?.error ?? "Upload failed. Please try again.");
      const id = encodeURIComponent(data.generationId);
      router.push(then === "animate" ? `/animate?id=${id}` : then === "edit" ? `/edit?id=${id}` : `/generate?result=${id}`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-[#0B1022]/75 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="upload-h"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="sl-panel w-full max-w-[460px] rounded-b-none p-4 sm:rounded-[14px] sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="upload-h" className="font-display text-[19px] font-semibold text-[#FFF1E8]">Upload your sprite</h2>
            <p className="mt-1 text-[13px] leading-snug text-[#A7ADD4]">Animate, edit or turn your own character. Free, and only you can see it.</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="-mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#9AA1CC] hover:bg-white/[0.06] hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <button type="button" onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); }}
          className="checker mt-4 flex h-48 w-full items-center justify-center overflow-hidden rounded-[10px] border border-dashed border-white/[0.2] transition hover:border-[#FFA300]/60">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="pixel-perfect max-h-full max-w-full object-contain p-3" />
          ) : (
            <span className="flex flex-col items-center gap-1.5 text-[13.5px] text-[#C8CCE8]">
              <Upload className="h-5 w-5 text-[#FFA300]" aria-hidden />
              Choose or drop a PNG, JPG or WebP
              <span className="text-[12px] text-[#A7ADD4]">Up to 8 MB. A plain background is removed for you.</span>
            </span>
          )}
        </button>
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />

        <label className="mt-4 block text-[12.5px] font-semibold text-[#C8CCE8]" htmlFor="upload-name">What is it?</label>
        <input id="upload-name" value={name} onChange={(e) => setName(e.target.value.slice(0, 200))} placeholder="e.g. a knight in silver armour"
          className="sl-inset mt-1.5 h-11 w-full px-3 text-[14px] text-[#FFF1E8] placeholder:text-[#8F96C4] focus:border-[#FFA300] focus:outline-none" />
        <p className="mt-1 text-[12px] text-[#A7ADD4]">A few words help Animate pick the right moves.</p>

        <div role="radiogroup" aria-label="Type" className="mt-3 grid grid-cols-3 gap-1.5">
          {KINDS.map((k) => (
            <button key={k.id} type="button" role="radio" aria-checked={kind === k.id} onClick={() => setKind(k.id)}
              className={`btn btn-secondary px-2 text-[12.5px] ${kind === k.id ? "is-active" : ""}`}>
              {k.label}
            </button>
          ))}
        </div>

        {error && <p role="alert" className="mt-3 text-[13px] text-[#FF8A8A]">{error}</p>}

        <button type="button" onClick={submit} disabled={!file || busy}
          className="btn btn-primary mt-4 h-12 w-full text-[15px]">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
          {busy ? "Uploading…" : then === "animate" ? "Upload and animate" : then === "edit" ? "Upload and edit" : "Upload"}
        </button>
        <p className="mt-2 text-center text-[11.5px] text-[#7F86B5]">Upload only art you made or have the rights to use.</p>
      </div>
    </div>
  );
}
