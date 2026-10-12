export default function CommunityLoading() {
  return (
    <div className="min-h-screen bg-[#0B0D12]">
      <div className="mx-auto max-w-[1400px] px-5 py-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="h-7 w-32 animate-pulse rounded-lg bg-white/[0.04]" />
            <div className="h-4 w-72 animate-pulse rounded bg-white/[0.04]" />
            <div className="h-3 w-48 animate-pulse rounded bg-white/[0.04]" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-10 animate-pulse rounded-xl bg-white/[0.04]" />
            <div className="h-10 w-28 animate-pulse rounded-xl bg-white/[0.04]" />
            <div className="h-10 w-24 animate-pulse rounded-xl bg-white/[0.04]" />
          </div>
        </div>

        {/* Toolbar */}
        <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="h-10 flex-1 animate-pulse rounded-xl bg-white/[0.04] lg:max-w-md" />
          <div className="flex gap-2 lg:ml-auto">
            <div className="h-10 w-44 animate-pulse rounded-xl bg-white/[0.04]" />
            <div className="h-10 w-48 animate-pulse rounded-xl bg-white/[0.04]" />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-8 w-24 animate-pulse rounded-full bg-white/[0.04]" />
          ))}
        </div>

        {/* Grid */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {Array.from({ length: 18 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square animate-pulse rounded-2xl bg-white/[0.04]"
              style={{ animationDelay: `${i * 40}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
