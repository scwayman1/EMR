import { PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ScheduleLoading() {
  return (
    <PageShell maxWidth="max-w-[1320px]">
      <div className="mb-6">
        <Skeleton className="h-3 w-32 mb-3" />
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[...Array(5)].map((_, i) => (
          <Card key={i} tone="raised">
            <CardContent className="pt-5 pb-5">
              <Skeleton className="h-9 w-12 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-3">
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            className="bg-surface-raised rounded-xl border border-border p-3"
          >
            <Skeleton className="h-4 w-full mb-3" />
            <Skeleton className="h-20 w-full mb-2" />
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
    </PageShell>
  );
}
