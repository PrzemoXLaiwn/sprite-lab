import Image from "next/image";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B0D12]">
      <div className="flex flex-col items-center gap-4" role="status" aria-label="Loading">
        <div className="relative flex h-14 w-14 items-center justify-center">
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-white/[0.06] border-t-[#FF8A3D]" />
          <Image src="/logo.png" alt="" width={24} height={24} />
        </div>
        <p className="font-mono text-[11px] text-[#7A8294]">loading<span className="caret" /></p>
      </div>
    </div>
  );
}
