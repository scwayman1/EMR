import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { ScheduleView, type StaffMember } from "./schedule-view";

export const metadata = { title: "Staff Schedule" };

const DEMO_STAFF: StaffMember[] = [
  { id: "s-1", firstName: "Avery",   lastName: "Chen",     role: "provider"  },
  { id: "s-2", firstName: "Morgan",  lastName: "Patel",    role: "provider"  },
  { id: "s-3", firstName: "Jordan",  lastName: "Rivera",   role: "nurse"     },
  { id: "s-4", firstName: "Taylor",  lastName: "Kim",      role: "reception" },
  { id: "s-5", firstName: "Riley",   lastName: "Okafor",   role: "billing"   },
];

export default async function StaffSchedulePage() {
  await requireUser();

  return (
    <PageShell maxWidth="max-w-[1400px]">
      <PageHeader
        eyebrow="Team"
        title="Staff schedule"
        description="Weekly shift grid. Click any cell to assign a shift, or use the filter to narrow by role."
      />
      <ScheduleView staff={DEMO_STAFF} />
    </PageShell>
  );
}
