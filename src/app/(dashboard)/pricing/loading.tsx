export default function PricingLoading() {
  return (
    <div className="min-h-screen bg-[#030305] p-6">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="h-10 w-64 bg-white/5 rounded-lg animate-pulse mx-auto mb-4" />
        <div className="h-4 w-96 bg-white/5 rounded animate-pulse mx-auto" />
      </div>

      {/* Pricing cards skeleton */}
      <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl bg-white/5 border border-white/10 p-8 animate-pulse"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            {/* Plan name */}
            <div className="h-6 w-24 bg-white/10 rounded mb-2" />
            {/* Price */}
            <div className="h-12 w-32 bg-white/10 rounded mb-6" />
            {/* Features */}
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-white/10" />
                  <div className="h-4 flex-1 bg-white/10 rounded" />
                </div>
              ))}
            </div>
            {/* Button */}
            <div className="h-12 w-full bg-white/10 rounded-xl mt-8" />
          </div>
        ))}
      </div>
    </div>
  );
}
