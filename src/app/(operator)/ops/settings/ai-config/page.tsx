import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { AiConfigTabs } from "./tabs";

export const metadata = { title: "AI Model Configuration" };

export default async function AiConfigPage() {
  await requireUser();

  return (
    <PageShell maxWidth="max-w-[1080px]">
      <PageHeader
        eyebrow="Settings"
        title="AI model configuration"
        description="Pick a practice-wide default, then tune any agent in the fleet."
      />

      <AiConfigTabs />
    </PageShell>
  );
}
