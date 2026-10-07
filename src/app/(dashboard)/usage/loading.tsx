export default function DashboardHomeLoading() {
  return (
    <div className="mx-auto max-w-[1100px] space-y-6 px-5 py-6 lg:px-8">
      {/* Header */}
      <div>
        <div className="mb-2 h-6 w-28 animate-pulse rounded-lg bg-white/[0.05]" />
        <div className="h-4 w-72 animate-pulse rounded bg-white/[0.04]" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/[0.06] bg-[#0E1016] p-5"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="mb-3 h-3 w-20 animate-pulse rounded bg-white/[0.06]" />
            <div className="h-8 w-16 animate-pulse rounded bg-white/[0.06]" />
            <div className="mt-2 h-3 w-24 animate-pulse rounded bg-white/[0.04]" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent generations */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0E1016] p-6 lg:col-span-2">
          <div className="mb-5 h-4 w-40 animate-pulse rounded bg-white/[0.06]" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square animate-pulse rounded-xl bg-[#151922]"
                style={{ animationDelay: `${i * 50}ms` }}
              />
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="space-y-2 rounded-2xl border border-white/[0.06] bg-[#0E1016] p-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-white/[0.03]" />
          ))}
        </div>
      </div>
    </div>
  );
}
