// EMR-017 — Dispensary Locator standalone page.
//
// Lives under the clinician shell so it picks up the same auth + nav.
// Clinicians can drop in here when prescribing to surface SKU
// availability for a patient inside a 30-mile radius.

import { requireUser } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { Eyebrow } from "@/components/ui/ornament";
import { DispensaryLocator } from "@/components/marketplace/dispensary-locator";

export const metadata = { title: "Dispensary locator" };

export default async function DispensaryLocatorPage() {
  await requireUser();

  return (
    <PageShell maxWidth="max-w-[1180px]">
      <div className="mb-6">
        <Eyebrow className="mb-2">Marketplace</Eyebrow>
        <h1 className="font-display text-2xl text-text tracking-tight">
          Dispensary locator
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Find licensed dispensaries within 30 miles. Click a result to see
          where it sits on the map and review the SKUs they have on hand.
        </p>
      </div>

      <DispensaryLocator />
    </PageShell>
  );
}
