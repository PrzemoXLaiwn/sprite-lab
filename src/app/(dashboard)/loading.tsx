export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#030305] p-6">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 w-48 bg-white/5 rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-72 bg-white/5 rounded animate-pulse" />
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-2xl bg-white/5 animate-pulse"
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
