import { PatientSectionNav } from "@/components/shell/PatientSectionNav";
import { requireRole } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { CaregiverManager } from "./caregiver-manager";

export const metadata = { title: "Caregiver Access" };

export default async function CaregiversPage() {
  await requireRole("patient");

  return (
    <PageShell maxWidth="max-w-[880px]">
      <PageHeader
        eyebrow="Caregivers"
        title="Caregiver access"
        description="Invite family members or caregivers to view or manage parts of your health record. You control who has access and can revoke it at any time."
      />

      <PatientSectionNav section="account" />

      <CaregiverManager />
    </PageShell>
  );
}
