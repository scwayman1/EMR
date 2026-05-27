import { requireRole } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { PatientSectionNav } from "@/components/shell/PatientSectionNav";
import {
  DEMO_PATIENT_ID,
  type ImagingStudy,
  type RadiologyReport,
} from "@/lib/domain/medical-imaging";
import {
  getReportForStudy,
  listStudies,
} from "@/lib/domain/medical-imaging-store";
import {
  generateDemoLabPanels,
  type LabPanel,
} from "@/lib/domain/lab-results";
import { ResultsView } from "./results-view";

export const metadata = { title: "My Results" };

// EMR-163 — Unified My Results
//
// Pre-EMR-163 patients had to bounce: /portal/labs for chemistry/CBC,
// /portal/imaging for radiology, neither knew about the other. The
// "results" mental model didn't have a home. This page consolidates:
//
//   - lab panels (CMP, lipids, CBC) with abnormal-value flagging
//   - radiology studies + their plain-language patient summary
//   - a unified date-sorted feed that lets a patient see "what came
//     back this week" across both modalities
//   - sparkline trends for the labs that have repeated values
//   - sign-off badges so the patient knows whether a result is a
//     preliminary read or a final report from the doctor
//
// Why generate demo lab panels server-side rather than letting the
// client component own them: the trend sparkline math benefits from
// running once on the server (deterministic, no flash of "loading"),
// and the same data shape is what the eventual Prisma model will
// hand back, so we keep the boundary stable.

export default async function ResultsPage() {
  await requireRole("patient");

  const labPanels: LabPanel[] = generateDemoLabPanels();
  const studies: ImagingStudy[] = listStudies(DEMO_PATIENT_ID);
  // Imaging reports keyed by study; null when nothing has been released
  // to the patient yet (preliminary reads stay provider-side).
  const reports: Record<string, RadiologyReport | null> = Object.fromEntries(
    studies.map((s) => [
      s.id,
      getReportForStudy(s.id, { patientVisibleOnly: true }),
    ]),
  );

  return (
    <PageShell maxWidth="max-w-[1080px]">
      <PatientSectionNav section="health" />
      <PageHeader
        eyebrow="My Health"
        title="My Results"
        description="Labs and imaging in one place, sorted by date. Trends and doctor sign-offs at a glance."
      />
      <ResultsView labPanels={labPanels} studies={studies} reports={reports} />
    </PageShell>
  );
}
