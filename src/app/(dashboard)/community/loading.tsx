export default function CommunityLoading() {
  return (
    <div className="min-h-screen bg-[#030305] p-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="h-10 w-64 bg-white/5 rounded-lg animate-pulse mx-auto mb-3" />
        <div className="h-4 w-96 bg-white/5 rounded animate-pulse mx-auto" />
      </div>

      {/* Stats bar skeleton */}
      <div className="flex justify-center gap-8 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="h-8 w-16 bg-white/5 rounded animate-pulse" />
            <div className="h-3 w-20 bg-white/5 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Community grid skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl bg-white/5 overflow-hidden animate-pulse"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="aspect-square bg-white/10" />
            <div className="p-3 space-y-2">
              <div className="h-4 w-3/4 bg-white/10 rounded" />
              <div className="flex justify-between">
                <div className="h-3 w-20 bg-white/10 rounded" />
                <div className="h-3 w-12 bg-white/10 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
