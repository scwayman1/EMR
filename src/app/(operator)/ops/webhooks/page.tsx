import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { WebhookTesterView } from "./webhook-tester-view";

export const metadata = { title: "Webhook Tester" };

export default async function WebhooksPage() {
  await requireUser();

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow="Admin"
        title="Webhook harness"
        description="Inspect incoming webhook events, replay failed deliveries, and fire test payloads at our endpoints."
      />
      <WebhookTesterView />
    </PageShell>
  );
}
