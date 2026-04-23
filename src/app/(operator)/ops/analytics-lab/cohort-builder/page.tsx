import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { BuilderView } from "./builder-view";

export const metadata = { title: "Research Cohort Builder" };

export default async function CohortBuilderPage() {
  await requireUser();
  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow="Analytics Lab"
        title="Research Cohort Builder"
        description="Compose a research cohort with ICD-10, demographic, treatment, outcome, and time-window filters. Live count updates as you narrow the criteria."
      />
      <BuilderView totalPatients={1845} />
    </PageShell>
  );
}
