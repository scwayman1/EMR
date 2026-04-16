import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { KeysView } from "./keys-view";

export const metadata = { title: "API Keys" };

export default async function ApiKeysPage() {
  await requireUser();

  return (
    <PageShell maxWidth="max-w-[1100px]">
      <PageHeader
        eyebrow="Admin"
        title="API keys"
        description="Manage programmatic access to your organization's Leafjourney data. Scope keys carefully — these can read PHI."
      />
      <KeysView />
    </PageShell>
  );
}
