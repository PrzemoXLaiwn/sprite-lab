export default function DashboardHomeLoading() {
  return (
    <div className="min-h-screen bg-[#030305] p-6">
      {/* Welcome header skeleton */}
      <div className="mb-8">
        <div className="h-10 w-72 bg-white/5 rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-96 bg-white/5 rounded animate-pulse" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl bg-white/5 border border-white/10 p-6 animate-pulse"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 w-24 bg-white/10 rounded" />
              <div className="w-10 h-10 rounded-xl bg-white/10" />
            </div>
            <div className="h-8 w-16 bg-white/10 rounded mb-2" />
            <div className="h-3 w-32 bg-white/10 rounded" />
          </div>
        ))}
      </div>

      {/* Quick actions skeleton */}
      <div className="mb-8">
        <div className="h-6 w-32 bg-white/5 rounded animate-pulse mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-white/5 animate-pulse"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
      </div>

      {/* Recent generations skeleton */}
      <div>
        <div className="h-6 w-48 bg-white/5 rounded animate-pulse mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-xl bg-white/5 animate-pulse"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
