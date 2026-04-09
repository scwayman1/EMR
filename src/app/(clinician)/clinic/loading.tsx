export default function Loading() {
  return (
    <div className="px-6 lg:px-12 py-10">
      <div className="mx-auto w-full max-w-[1320px]">
        <div className="animate-pulse">
          {/* Hero greeting card skeleton */}
          <div className="h-56 rounded-3xl bg-surface-muted mb-10" />

          {/* Metrics strip — 4 tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <div className="h-24 rounded-xl bg-surface-muted" />
            <div className="h-24 rounded-xl bg-surface-muted" />
            <div className="h-24 rounded-xl bg-surface-muted" />
            <div className="h-24 rounded-xl bg-surface-muted" />
          </div>

          {/* Schedule + recent patients */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-0 rounded-xl bg-surface-muted overflow-hidden">
              {/* Card header placeholder */}
              <div className="px-6 pt-6 pb-3 space-y-2">
                <div className="h-5 w-40 rounded bg-border/50" />
                <div className="h-3.5 w-64 rounded bg-border/30" />
              </div>
              {/* List rows */}
              <div className="px-6 pb-6 space-y-4 pt-4">
                <div className="h-14 rounded-lg bg-border/30" />
                <div className="h-14 rounded-lg bg-border/30" />
                <div className="h-14 rounded-lg bg-border/30" />
                <div className="h-14 rounded-lg bg-border/30" />
              </div>
            </div>
            <div className="h-80 rounded-xl bg-surface-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
