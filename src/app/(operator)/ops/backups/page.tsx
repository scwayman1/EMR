import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { BackupsView } from "./backups-view";

export const metadata = { title: "Backups" };

export default async function BackupsPage() {
  await requireUser();

  return (
    <PageShell maxWidth="max-w-[1100px]">
      <PageHeader
        eyebrow="Admin"
        title="Backups"
        description="Automated nightly snapshots of your database and file storage. Full point-in-time restore for the last 35 days."
      />
      <BackupsView />
    </PageShell>
  );
}
