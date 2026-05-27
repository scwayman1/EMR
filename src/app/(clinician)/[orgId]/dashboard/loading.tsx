import { PageShell, PageHeader } from "@/components/shell/PageHeader";

/**
 * Skeleton Loading State for Clinical Dashboard
 * Provides an immediate layout structural render while Next.js streams the server data.
 */
export default function DashboardLoading() {
  return (
    <PageShell maxWidth="max-w-[1200px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="space-y-3">
          <div className="h-4 w-24 bg-[var(--border)] rounded-md animate-pulse" />
          <div className="h-8 w-64 bg-[var(--surface-muted)] rounded-lg animate-pulse" />
          <div className="h-4 w-96 bg-[var(--border)] rounded-md animate-pulse" />
        </div>
        <div className="h-10 w-32 bg-[var(--surface-muted)] rounded-lg animate-pulse" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="h-[400px] bg-white border border-[var(--border)] rounded-3xl p-6 shadow-sm">
            <div className="h-6 w-48 bg-[var(--surface-muted)] rounded-md animate-pulse mb-6" />
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-[var(--surface-muted)] animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 bg-[var(--border)] rounded-md animate-pulse" />
                    <div className="h-3 w-1/4 bg-[var(--surface-muted)] rounded-md animate-pulse" />
                  </div>
                  <div className="h-8 w-24 bg-[var(--surface-muted)] rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          <div className="h-[250px] bg-[var(--surface-muted)]/30 border border-[var(--border)] rounded-3xl p-6">
            <div className="h-6 w-32 bg-[var(--surface-muted)] rounded-md animate-pulse mb-6" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 w-full bg-white rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
