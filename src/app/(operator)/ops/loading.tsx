export default function Loading() {
  return (
    <div className="px-6 lg:px-12 py-10">
      <div className="mx-auto w-full max-w-[1320px]">
        <div className="animate-pulse">
          {/* Hero card skeleton */}
          <div className="h-56 rounded-3xl bg-surface-muted mb-10" />

          {/* Metric strip — 4 tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <div className="h-24 rounded-xl bg-surface-muted" />
            <div className="h-24 rounded-xl bg-surface-muted" />
            <div className="h-24 rounded-xl bg-surface-muted" />
            <div className="h-24 rounded-xl bg-surface-muted" />
          </div>

          {/* Intake funnel card */}
          <div className="rounded-xl bg-surface-muted mb-10">
            <div className="px-6 pt-6 pb-3 space-y-2">
              <div className="h-5 w-32 rounded bg-border/50" />
              <div className="h-3.5 w-72 rounded bg-border/30" />
            </div>
            <div className="px-6 pb-6">
              <div className="flex items-stretch gap-2">
                <div className="flex-1 h-[100px] rounded-l-xl bg-border/30" />
                <div className="flex-1 h-[100px] bg-border/30" />
                <div className="flex-1 h-[100px] bg-border/30" />
                <div className="flex-1 h-[100px] bg-border/30" />
                <div className="flex-1 h-[100px] rounded-r-xl bg-border/30" />
              </div>
            </div>
          </div>

          {/* Agent activity + launch checklist */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-72 rounded-xl bg-surface-muted" />
            <div className="h-72 rounded-xl bg-surface-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
