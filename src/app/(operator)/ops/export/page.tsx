import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { ExportWizard } from "./export-wizard";

export const metadata = { title: "Outcome data export" };

export default async function ExportPage() {
  const user = await requireUser();

  return (
    <PageShell>
      <PageHeader
        eyebrow="Data"
        title="Outcome data export"
        description="Export de-identified patient outcome data for research, insurance reimbursement, and product development."
      />
      <ExportWizard />
    </PageShell>
  );
}
