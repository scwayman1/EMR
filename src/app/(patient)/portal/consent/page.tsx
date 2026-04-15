import { requireRole } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { PatientSectionNav } from "@/components/shell/PatientSectionNav";
import { ConsentView } from "./consent-view";

export const metadata = { title: "Consent Forms" };

export default async function ConsentPage() {
  await requireRole("patient");

  return (
    <PageShell maxWidth="max-w-[960px]">
      <PageHeader
        eyebrow="Consent"
        title="Consent forms"
        description="Review and sign required consent forms for your care. Your signatures are stored securely."
      />
      <PatientSectionNav section="account" />
      <ConsentView />
    </PageShell>
  );
}
