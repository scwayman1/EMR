import { requireRole } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { PatientSectionNav } from "@/components/shell/PatientSectionNav";
import { LabResultsView } from "./lab-results-view";

export const metadata = { title: "Lab Results" };

export default async function LabsPage() {
  await requireRole("patient");

  return (
    <PageShell maxWidth="max-w-[960px]">
      <PageHeader
        eyebrow="My Health"
        title="Lab Results"
        description="View your laboratory results, reference ranges, and cannabis-relevant interpretations."
      />
      <PatientSectionNav section="health" />
      <LabResultsView />
    </PageShell>
  );
}
