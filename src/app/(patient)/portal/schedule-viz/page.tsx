import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { PatientSectionNav } from "@/components/shell/PatientSectionNav";
import { EmptyState } from "@/components/ui/empty-state";
import { ScheduleView, type ScheduledDose } from "./schedule-view";

export const metadata = { title: "Schedule" };

// Spread a regimen's doses evenly through the day between these anchor hours.
const WAKE_HOUR = 8;
const SLEEP_HOUR = 22;

function distributeTimes(frequency: number): number[] {
  if (frequency <= 0) return [];
  if (frequency === 1) return [9];
  const span = SLEEP_HOUR - WAKE_HOUR;
  const step = span / (frequency - 1);
  const times: number[] = [];
  for (let i = 0; i < frequency; i++) {
    const h = WAKE_HOUR + step * i;
    times.push(Math.max(0, Math.min(23.983, h)));
  }
  return times;
}

export default async function ScheduleVizPage() {
  const user = await requireRole("patient");

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    include: {
      dosingRegimens: {
        where: { active: true },
        include: { product: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!patient) redirect("/portal/intake");

  const doses: ScheduledDose[] = [];
  patient.dosingRegimens.forEach((regimen, regIdx) => {
    const times = distributeTimes(regimen.frequencyPerDay ?? 1);
    times.forEach((hour, i) => {
      doses.push({
        id: `${regimen.id}-${i}`,
        regimenId: regimen.id,
        productName: regimen.product?.name ?? "Cannabis product",
        productBrand: regimen.product?.brand ?? null,
        hour,
        volumeText: `${regimen.volumePerDose} ${regimen.volumeUnit}`,
        thcPerDose: regimen.calculatedThcMgPerDose ?? null,
        cbdPerDose: regimen.calculatedCbdMgPerDose ?? null,
        timingInstructions: regimen.timingInstructions ?? null,
        colorIndex: regIdx,
      });
    });
  });

  return (
    <PageShell maxWidth="max-w-[1040px]">
      <PageHeader
        eyebrow="Schedule"
        title="Daily dosing timeline"
        description="A visual 24-hour view of every active cannabis regimen. Hover a pill to see the product and dose."
      />
      <PatientSectionNav section="health" />

      {doses.length === 0 ? (
        <EmptyState
          title="No active regimens"
          description="Once your care team sets up a dosing plan it will appear here as a timeline."
        />
      ) : (
        <ScheduleView doses={doses} />
      )}
    </PageShell>
  );
}
