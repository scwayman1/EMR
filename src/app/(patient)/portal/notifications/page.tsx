import { requireRole } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { PatientSectionNav } from "@/components/shell/PatientSectionNav";
import { NotificationCenter } from "./notification-center";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  await requireRole("patient");

  return (
    <PageShell maxWidth="max-w-[960px]">
      <PageHeader
        eyebrow="Notifications"
        title="Your notifications"
        description="Stay on top of messages, reminders, and updates from your care team."
      />
      <PatientSectionNav section="account" />
      <NotificationCenter />
    </PageShell>
  );
}
