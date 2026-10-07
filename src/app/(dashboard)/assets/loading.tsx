export default function GalleryLoading() {
  return (
    <div className="min-h-screen bg-[#0B0D12]">
      <div className="mx-auto max-w-[1400px] px-5 py-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="mb-2 h-7 w-40 animate-pulse rounded-xl bg-white/[0.04]" />
            <div className="h-4 w-56 animate-pulse rounded-lg bg-white/[0.04]" />
          </div>
          <div className="h-10 w-28 animate-pulse rounded-xl bg-white/[0.04]" />
        </div>

        {/* Toolbar */}
        <div className="mb-5 space-y-3">
          <div className="flex gap-2">
            <div className="h-10 flex-1 animate-pulse rounded-xl bg-white/[0.04]" />
            <div className="h-10 w-28 animate-pulse rounded-xl bg-white/[0.04]" />
            <div className="h-10 w-20 animate-pulse rounded-xl bg-white/[0.04]" />
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-white/[0.04]" />
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 2xl:grid-cols-5">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/5] animate-pulse rounded-2xl bg-white/[0.04]"
              style={{ animationDelay: `${i * 40}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
