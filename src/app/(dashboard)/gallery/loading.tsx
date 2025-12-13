export default function GalleryLoading() {
  return (
    <div className="min-h-screen bg-[#030305] p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="h-8 w-40 bg-white/5 rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-64 bg-white/5 rounded animate-pulse" />
      </div>

      {/* Filter bar skeleton */}
      <div className="flex gap-4 mb-8">
        <div className="h-10 w-32 bg-white/5 rounded-xl animate-pulse" />
        <div className="h-10 w-32 bg-white/5 rounded-xl animate-pulse" />
        <div className="h-10 w-48 bg-white/5 rounded-xl animate-pulse" />
      </div>

      {/* Gallery grid skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-xl bg-white/5 animate-pulse"
            style={{ animationDelay: `${i * 30}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
