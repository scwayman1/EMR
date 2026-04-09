export default function Loading() {
  return (
    <div className="px-6 lg:px-12 py-10">
      <div className="mx-auto w-full max-w-[1400px]">
        <div className="animate-pulse">
          {/* Command strip */}
          <div className="h-20 rounded-xl bg-surface-muted mb-8" />

          {/* Patient queue rail */}
          <div className="flex gap-4 mb-8 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-56 h-36 rounded-xl bg-surface-muted shrink-0" />
            ))}
          </div>

          {/* Two column: activity feed + sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-xl bg-surface-muted overflow-hidden">
              <div className="px-6 pt-6 pb-3 space-y-2">
                <div className="h-5 w-32 rounded bg-border/50" />
                <div className="h-3.5 w-56 rounded bg-border/30" />
              </div>
              <div className="px-6 pb-6 pt-4 space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-lg bg-border/30" />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-24 rounded-xl bg-surface-muted" />
              <div className="h-24 rounded-xl bg-surface-muted" />
              <div className="h-24 rounded-xl bg-surface-muted" />
              <div className="h-48 rounded-xl bg-surface-muted" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
