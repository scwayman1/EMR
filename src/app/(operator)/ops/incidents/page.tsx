import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import type { IncidentReport } from "@/lib/domain/overnight-batch";
import { IncidentsView } from "./incidents-view";

export const metadata = { title: "Incident Reports" };

const DEMO_INCIDENTS: IncidentReport[] = [
  {
    id: "inc-1",
    severity: "high",
    category: "medication_error",
    title: "Double-dose dispensed to patient #4217",
    description: "Patient received two 10mg edibles in error due to mis-scan. Patient educated, no adverse outcome.",
    patientAffected: true,
    reportedBy: "Morgan Patel",
    reportedAt: "2026-04-10T15:22:00Z",
    resolvedAt: "2026-04-11T11:00:00Z",
    resolution: "Counseled patient. Updated scan-verify workflow.",
  },
  {
    id: "inc-2",
    severity: "medium",
    category: "privacy",
    title: "Chart left open on workstation",
    description: "Reception noticed an unlocked workstation with an open chart during lunch break.",
    patientAffected: false,
    reportedBy: "Taylor Kim",
    reportedAt: "2026-04-08T13:05:00Z",
  },
  {
    id: "inc-3",
    severity: "low",
    category: "equipment",
    title: "BP cuff sphygmomanometer slow to inflate",
    description: "Exam room 2 cuff requires manual pumping. Still accurate, just slow.",
    patientAffected: false,
    reportedBy: "Jordan Rivera",
    reportedAt: "2026-04-05T09:40:00Z",
    resolvedAt: "2026-04-05T16:00:00Z",
    resolution: "Replaced with new unit.",
  },
  {
    id: "inc-4",
    severity: "critical",
    category: "adverse_event",
    title: "Patient reported chest pain after vape cartridge",
    description: "Patient used new product then reported chest tightness. Referred to ED. Product placed on hold.",
    patientAffected: true,
    reportedBy: "Avery Chen",
    reportedAt: "2026-04-02T17:30:00Z",
  },
  {
    id: "inc-5",
    severity: "low",
    category: "safety",
    title: "Wet floor without signage",
    description: "Cleaning team mopped hallway without placing caution sign. No falls.",
    patientAffected: false,
    reportedBy: "Riley Okafor",
    reportedAt: "2026-03-29T08:15:00Z",
    resolvedAt: "2026-03-29T08:30:00Z",
    resolution: "Reminded cleaning vendor on signage protocol.",
  },
];

export default async function IncidentsPage() {
  await requireUser();

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow="Team"
        title="Incident reporting"
        description="File incident reports, track severity, and document resolutions for compliance."
      />
      <IncidentsView initialIncidents={DEMO_INCIDENTS} />
    </PageShell>
  );
}
