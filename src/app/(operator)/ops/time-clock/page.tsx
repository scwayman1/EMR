import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { TimeclockView } from "./timeclock-view";

export const metadata = { title: "Time Clock" };

export default async function TimeClockPage() {
  const user = await requireUser();

  return (
    <PageShell maxWidth="max-w-[900px]">
      <PageHeader
        eyebrow="Team"
        title="Time clock"
        description="Clock in and out, view today's and weekly hours, and export your timesheet."
      />
      <TimeclockView userName={`${user.firstName} ${user.lastName}`} />
    </PageShell>
  );
}
