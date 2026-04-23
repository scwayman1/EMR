import { PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ScrubLoading() {
  return (
    <PageShell maxWidth="max-w-[1320px]">
      <div className="mb-6">
        <Skeleton className="h-3 w-32 mb-3" />
        <Skeleton className="h-9 w-72 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[...Array(5)].map((_, i) => (
          <Card key={i} tone="raised">
            <CardContent className="pt-5 pb-5">
              <Skeleton className="h-9 w-16 mb-1" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Card key={i} tone="raised">
            <CardContent className="pt-5 pb-5">
              <Skeleton className="h-12 w-full mb-3" />
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
