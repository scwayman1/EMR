import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { CalendarSyncView } from "./calendar-sync-view";

export const metadata = { title: "Google Calendar Sync" };

export default async function GoogleCalendarPage() {
  await requireUser();

  return (
    <PageShell maxWidth="max-w-[960px]">
      <PageHeader
        eyebrow="Integrations"
        title="Google Calendar sync"
        description="Two-way calendar sync with your clinic schedule. Block time during clinic hours and keep appointments in both places."
      />
      <CalendarSyncView />
    </PageShell>
  );
}
