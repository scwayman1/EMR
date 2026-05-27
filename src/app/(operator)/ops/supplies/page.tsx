import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { SuppliesInbox } from "./supplies-view";
import type { SupplyOrderRow } from "./_placeholder-types";

export const metadata = { title: "Supply orders" };

// TODO(EMR-794): Architect PR replaces this with a real prisma.supplyOrder
// findMany scoped to organizationId, projected into SupplyOrderRow.
async function loadOrderRows(): Promise<SupplyOrderRow[]> {
  return [];
}

export default async function SuppliesPage() {
  await requireUser();
  const rows = await loadOrderRows();
  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow="Practice Manager Agent"
        title="Supply orders"
        description="Review what the supply-reorder agent has drafted for your practice. Approve and submit in one tap, or edit and reject as needed."
      />
      <SuppliesInbox initialRows={rows} />
    </PageShell>
  );
}
