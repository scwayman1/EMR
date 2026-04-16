import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import {
  ADVERSE_EVENT_TYPES,
  type AdverseEvent,
} from "@/lib/domain/overnight-batch";
import { EventsView } from "./events-view";

export const metadata = { title: "Adverse Event Dashboard" };

const DEMO_EVENTS: AdverseEvent[] = [
  {
    id: "ae-1",
    patientId: "pt-142",
    event: "Dizziness",
    severity: "mild",
    reportedAt: "2026-04-12T14:22:00.000Z",
    causalityAssessment: "probable",
    productsInvolved: ["Balanced 1:1 Tincture"],
    action: "Dose reduced by 25%",
  },
  {
    id: "ae-2",
    patientId: "pt-087",
    event: "Rapid heart rate",
    severity: "moderate",
    reportedAt: "2026-04-10T08:10:00.000Z",
    causalityAssessment: "probable",
    productsInvolved: ["Sativa Vape 1g"],
    action: "Switched to balanced chemotype",
  },
  {
    id: "ae-3",
    patientId: "pt-204",
    event: "Drowsiness",
    severity: "mild",
    reportedAt: "2026-04-08T22:00:00.000Z",
    causalityAssessment: "probable",
    productsInvolved: ["Indica Gummy CBN 5mg"],
    action: "Timing moved 30 min earlier",
  },
  {
    id: "ae-4",
    patientId: "pt-061",
    event: "Anxiety",
    severity: "moderate",
    reportedAt: "2026-04-05T11:40:00.000Z",
    causalityAssessment: "possible",
    productsInvolved: ["Sativa Flower"],
    action: "Rotated to CBD-dominant product",
  },
  {
    id: "ae-5",
    patientId: "pt-118",
    event: "Nausea",
    severity: "mild",
    reportedAt: "2026-04-03T09:15:00.000Z",
    causalityAssessment: "unlikely",
    productsInvolved: ["CBD Capsule 25mg"],
    action: "Took with food; resolved",
  },
  {
    id: "ae-6",
    patientId: "pt-176",
    event: "Paranoia",
    severity: "severe",
    reportedAt: "2026-03-30T19:00:00.000Z",
    causalityAssessment: "probable",
    productsInvolved: ["High-THC Vape 90%"],
    action: "Discontinued; crisis support contacted",
  },
  {
    id: "ae-7",
    patientId: "pt-022",
    event: "Dry mouth",
    severity: "mild",
    reportedAt: "2026-03-28T16:45:00.000Z",
    causalityAssessment: "probable",
    productsInvolved: ["Balanced 1:1 Tincture"],
    action: "Advised hydration and sugar-free gum",
  },
  {
    id: "ae-8",
    patientId: "pt-255",
    event: "Orthostatic hypotension",
    severity: "moderate",
    reportedAt: "2026-03-25T07:30:00.000Z",
    causalityAssessment: "possible",
    productsInvolved: ["Indica Gummy 10mg"],
    action: "Dose split into AM/PM; monitored BP",
  },
];

export default async function AdverseEventsPage() {
  await requireUser();
  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Analytics Lab"
        title="Adverse Event Dashboard"
        description="Track adverse events with severity, causality, and mitigation actions. Useful for pharmacovigilance and regulatory reporting."
      />
      <EventsView
        events={DEMO_EVENTS}
        eventTypes={ADVERSE_EVENT_TYPES as readonly string[]}
      />
    </PageShell>
  );
}
