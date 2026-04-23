import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { PopulationDashboard } from "./population-dashboard";

export const metadata = { title: "Population Health" };

export default async function PopulationPage() {
  const user = await requireUser();
  const orgId = user.organizationId!;

  const totalPatients = await prisma.patient.count({
    where: { organizationId: orgId, deletedAt: null },
  });

  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Operations"
        title="Population Health"
        description="Aggregate cohort views, condition prevalence, and outcome metrics across your entire patient population."
      />
      <PopulationDashboard totalPatients={totalPatients} />
    </PageShell>
  );
}
