import { PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AgingLoading() {
  return (
    <PageShell maxWidth="max-w-[1320px]">
      <div className="mb-6">
        <Skeleton className="h-3 w-32 mb-3" />
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} tone="raised">
            <CardContent className="pt-5 pb-5">
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card tone="raised" className="mb-8">
        <CardContent className="pt-6 pb-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-6 flex-1" />
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-2">
        {[...Array(8)].map((_, i) => (
          <Card key={i} tone="raised">
            <CardContent className="py-4">
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
