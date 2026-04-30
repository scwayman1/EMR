/**
 * Imaging Lab — Clinician View (EMR-014, EMR-140, EMR-164, EMR-166)
 *
 * Isolated provider-facing page. Lives outside the patient chart shell so
 * the Track 7 Clinician Shell rework can land without merge conflicts here.
 * Every interaction goes through the workbench client component, which
 * talks to /api/imaging/* directly.
 */

import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import {
  listAnnotations,
  getReportForStudy,
  listStudies,
} from "@/lib/domain/medical-imaging-store";
import { DEMO_PATIENT_ID } from "@/lib/domain/medical-imaging";
import { ImagingLabWorkbench } from "@/components/imaging/imaging-lab-workbench";

export const metadata = { title: "Imaging Lab" };

export default async function ImagingLabPage() {
  const user = await requireUser();

  const studies = listStudies();
  const annotationsByStudy = Object.fromEntries(
    studies.map((s) => [s.id, listAnnotations(s.id)]),
  );
  const reportsByStudy = Object.fromEntries(
    studies
      .map((s) => [s.id, getReportForStudy(s.id)] as const)
      .filter(([, r]) => r !== null) as [string, NonNullable<ReturnType<typeof getReportForStudy>>][],
  );

  return (
    <PageShell maxWidth="max-w-[1400px]">
      <PageHeader
        eyebrow="Imaging Lab"
        title="Read, annotate, and release imaging"
        description={`Provider workbench for ${user.firstName ?? "you"}. Mark findings, decide what reaches the patient portal, and release the radiologist report.`}
      />
      <ImagingLabWorkbench
        initialStudies={studies}
        initialAnnotations={annotationsByStudy}
        initialReports={reportsByStudy}
        defaultPatientId={DEMO_PATIENT_ID}
        authorName={`Dr. ${user.lastName ?? "Provider"}`}
      />
    </PageShell>
  );
}
