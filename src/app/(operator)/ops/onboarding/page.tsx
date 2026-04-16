import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { OnboardingWizard } from "./onboarding-wizard";

export const metadata = { title: "Onboarding" };

export default async function OnboardingPage() {
  const user = await requireUser();

  return (
    <PageShell>
      <PageHeader
        eyebrow="Setup"
        title="Practice onboarding"
        description="Complete these steps to get your cannabis care practice live on Leafjourney."
      />
      <OnboardingWizard />
    </PageShell>
  );
}
