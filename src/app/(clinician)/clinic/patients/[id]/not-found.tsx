import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageShell } from "@/components/shell/PageHeader";
import { Eyebrow } from "@/components/ui/ornament";

/**
 * Segment-level not-found for /clinic/patients/[id] and every sub-route
 * underneath it (chart, prepare, prescribe, documents, etc).
 *
 * Triggered when the page can't resolve the patient — usually because
 * the patient has been removed, belongs to another practice, or the
 * link is stale. The app-wide "This path doesn't lead anywhere" screen
 * is misleading here, because the path itself is real; what's missing
 * is the patient at the end of it.
 */
export default function PatientNotFound() {
  return (
    <PageShell maxWidth="max-w-[720px]">
      <Card tone="raised">
        <CardContent className="py-10 text-center">
          <Eyebrow className="justify-center mb-3">Patient unavailable</Eyebrow>
          <h1 className="font-display text-2xl text-text tracking-tight">
            This patient isn&apos;t in your roster.
          </h1>
          <p className="text-sm text-text-muted mt-3 max-w-md mx-auto leading-relaxed">
            They may have been removed, belong to another practice, or
            the link may be stale. Head back to the roster to find the
            right chart.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/clinic/patients">
              <Button>Back to roster</Button>
            </Link>
            <Link href="/clinic">
              <Button variant="secondary">Today</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
