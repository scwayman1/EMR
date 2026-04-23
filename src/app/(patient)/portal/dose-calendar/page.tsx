import { PatientSectionNav } from "@/components/shell/PatientSectionNav";
import { requireRole } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { Eyebrow } from "@/components/ui/ornament";
import { CalendarView } from "./calendar-view";

export const metadata = { title: "Dose Calendar" };

export default async function DoseCalendarPage() {
  await requireRole("patient");

  return (
    <PageShell maxWidth="max-w-[960px]">
      <PatientSectionNav section="health" />
      <div className="mb-10 text-center">
        <Eyebrow className="justify-center mb-3">Dose tracking</Eyebrow>
        <h1 className="font-display text-3xl md:text-4xl text-text tracking-tight">
          Dose calendar
        </h1>
        <p className="text-sm text-text-muted mt-3 max-w-md mx-auto leading-relaxed">
          Track your daily medication adherence. Each day shows whether you took
          your scheduled doses on time.
        </p>
      </div>

      <CalendarView />
    </PageShell>
  );
}
