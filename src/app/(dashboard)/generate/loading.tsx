export default function GenerateLoading() {
  return (
    <div className="min-h-screen bg-[#030305] p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="h-8 w-56 bg-white/5 rounded-lg animate-pulse mb-2" />
          <div className="h-4 w-80 bg-white/5 rounded animate-pulse" />
        </div>
        <div className="h-10 w-32 bg-white/5 rounded-xl animate-pulse" />
      </div>

      {/* Main content grid */}
      <div className="grid lg:grid-cols-[1fr,400px] gap-8">
        {/* Left - Generator form */}
        <div className="space-y-6">
          {/* Prompt input skeleton */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            <div className="h-4 w-24 bg-white/10 rounded animate-pulse mb-4" />
            <div className="h-12 w-full bg-white/10 rounded-xl animate-pulse mb-4" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-8 w-24 bg-white/10 rounded-lg animate-pulse"
                  style={{ animationDelay: `${i * 50}ms` }}
                />
              ))}
            </div>
          </div>

          {/* Categories skeleton */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            <div className="h-4 w-32 bg-white/10 rounded animate-pulse mb-4" />
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 rounded-xl bg-white/10 animate-pulse"
                  style={{ animationDelay: `${i * 50}ms` }}
                />
              ))}
            </div>
          </div>

          {/* Style selector skeleton */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            <div className="h-4 w-28 bg-white/10 rounded animate-pulse mb-4" />
            <div className="grid grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl bg-white/10 animate-pulse"
                  style={{ animationDelay: `${i * 30}ms` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right - Preview */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            <div className="h-4 w-24 bg-white/10 rounded animate-pulse mb-4" />
            <div className="aspect-square rounded-xl bg-white/10 animate-pulse" />
          </div>

          {/* Generate button skeleton */}
          <div className="h-14 w-full bg-gradient-to-r from-[#00ff88]/20 to-[#00d4ff]/20 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
