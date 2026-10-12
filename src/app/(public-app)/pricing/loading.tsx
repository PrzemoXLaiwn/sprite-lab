export default function PricingLoading() {
  return (
    <div className="min-h-screen bg-[#0B0D12]">
      <div className="border-b border-white/[0.06]">
        <div className="mx-auto max-w-[1200px] px-5 pb-6 pt-8 lg:px-8">
          <div className="h-3 w-16 animate-pulse rounded bg-white/[0.06]" />
          <div className="mt-3 h-7 w-56 animate-pulse rounded-lg bg-white/[0.06]" />
          <div className="mt-2 h-4 w-80 max-w-full animate-pulse rounded bg-white/[0.04]" />
          <div className="mt-6 h-9 w-[340px] max-w-full animate-pulse rounded-xl bg-white/[0.04]" />
        </div>
      </div>

      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-4 px-5 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-2xl border border-white/[0.08] bg-[#151922] p-5"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="h-5 w-20 rounded bg-white/[0.06]" />
            <div className="mt-2 h-3 w-32 rounded bg-white/[0.04]" />
            <div className="mt-6 h-8 w-24 rounded bg-white/[0.06]" />
            <div className="mt-6 space-y-3">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="flex items-center gap-2.5">
                  <div className="h-3.5 w-3.5 rounded bg-white/[0.06]" />
                  <div className="h-3 flex-1 rounded bg-white/[0.04]" />
                </div>
              ))}
            </div>
            <div className="mt-8 h-11 w-full rounded-xl bg-white/[0.06]" />
          </div>
        ))}
      </div>
    </div>
  );
}
