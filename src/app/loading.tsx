import Image from "next/image";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#131A31]">
      <div className="flex flex-col items-center gap-4" role="status" aria-label="Loading">
        <div className="relative flex h-14 w-14 items-center justify-center">
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-white/[0.06] border-t-[#FFA300]" />
          <Image src="/logo.png" alt="" width={24} height={24} />
        </div>
        <p className="text-[13px] text-[#A7ADD4]">Loading…</p>
      </div>
    </div>
  );
}
