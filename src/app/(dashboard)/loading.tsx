export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#0B0D12] px-4 py-6 sm:px-6" role="status" aria-label="Loading">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="mb-2.5 h-7 w-48 animate-pulse rounded-lg bg-white/[0.05]" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded-md bg-white/[0.035]" />
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square animate-pulse rounded-xl border border-white/[0.06] bg-[#0E1016]"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
