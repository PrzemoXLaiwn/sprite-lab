export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-[#030305] p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="h-8 w-40 bg-white/5 rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-64 bg-white/5 rounded animate-pulse" />
      </div>

      {/* Settings sections skeleton */}
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl bg-white/5 border border-white/10 p-6 animate-pulse"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="h-6 w-32 bg-white/10 rounded mb-6" />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-4 w-48 bg-white/10 rounded" />
                <div className="h-8 w-24 bg-white/10 rounded-lg" />
              </div>
              <div className="flex items-center justify-between">
                <div className="h-4 w-56 bg-white/10 rounded" />
                <div className="h-8 w-24 bg-white/10 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
