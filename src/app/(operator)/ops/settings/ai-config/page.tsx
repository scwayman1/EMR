import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { ModelConfigPanel } from "./model-config";

export const metadata = { title: "AI Model Configuration" };

export default async function AiConfigPage() {
  await requireUser();

  return (
    <PageShell maxWidth="max-w-[960px]">
      <PageHeader
        eyebrow="Settings"
        title="AI model configuration"
        description="Choose the AI model that powers clinical documentation, patient Q&A, and agent workflows. Bring your own API key or use Demo Mode for testing."
      />

      <ModelConfigPanel />
    </PageShell>
  );
}
