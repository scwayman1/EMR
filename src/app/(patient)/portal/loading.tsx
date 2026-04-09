export default function Loading() {
  return (
    <div className="px-6 lg:px-12 py-10">
      <div className="mx-auto w-full max-w-[1040px]">
        <div className="animate-pulse">
          {/* Hero greeting card skeleton */}
          <div className="h-56 rounded-3xl bg-surface-muted mb-10" />

          {/* Two side-by-side cards (next visit + chart readiness) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
            <div className="h-44 rounded-xl bg-surface-muted" />
            <div className="h-44 rounded-xl bg-surface-muted" />
          </div>

          {/* Metric strip — 3 tiles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            <div className="h-24 rounded-xl bg-surface-muted" />
            <div className="h-24 rounded-xl bg-surface-muted" />
            <div className="h-24 rounded-xl bg-surface-muted" />
          </div>

          {/* Tasks + latest message */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2 h-64 rounded-xl bg-surface-muted" />
            <div className="h-64 rounded-xl bg-surface-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
