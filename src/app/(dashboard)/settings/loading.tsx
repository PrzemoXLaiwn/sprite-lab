export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-[1100px] px-5 py-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-2 h-6 w-32 animate-pulse rounded-lg bg-white/[0.05]" />
        <div className="h-4 w-64 animate-pulse rounded bg-white/[0.04]" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
        {/* Section nav */}
        <div className="hidden space-y-1.5 lg:block">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-xl bg-white/[0.03]" />
          ))}
        </div>

        {/* Section cards */}
        <div className="space-y-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/[0.06] bg-[#0E1016] p-6"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="mb-2 h-4 w-36 animate-pulse rounded bg-white/[0.06]" />
              <div className="mb-6 h-3 w-60 animate-pulse rounded bg-white/[0.04]" />
              <div className="space-y-3">
                <div className="h-10 animate-pulse rounded-xl bg-[#151922]" />
                <div className="h-10 animate-pulse rounded-xl bg-[#151922]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
