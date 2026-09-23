export default function Loading() {
  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-8 animate-pulse">
      {/* Header Skeleton */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-56 bg-slate-200 rounded-xl" />
          <div className="h-4 w-80 bg-slate-200/80 rounded-lg" />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
        </div>
      </section>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200/80 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-28 bg-slate-200 rounded" />
              <div className="h-8 w-8 bg-slate-100 rounded-lg" />
            </div>
            <div className="h-7 w-16 bg-slate-200 rounded-lg" />
            <div className="h-2 w-36 bg-slate-100 rounded" />
          </div>
        ))}
      </div>

      {/* Main Table / Card Skeleton */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div className="h-5 w-44 bg-slate-200 rounded-lg" />
          <div className="h-9 w-64 bg-slate-100 rounded-xl" />
        </div>

        {/* List Skeletons */}
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-4"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-slate-200 rounded-xl shrink-0" />
                <div className="space-y-2">
                  <div className="h-4 w-48 sm:w-64 bg-slate-200 rounded" />
                  <div className="h-3 w-32 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-6 w-20 bg-slate-200 rounded-full" />
                <div className="h-8 w-24 bg-slate-200 rounded-lg hidden sm:block" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
