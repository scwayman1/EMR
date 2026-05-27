/**
 * My Imaging — Patient View (EMR-141)
 *
 * Read-only imaging gallery + radiologist report toggle. Only annotations
 * the provider explicitly released (`patientVisible` and not `critical`)
 * and reports flagged `releasedToPatient` are exposed. Critical findings
 * stay provider-side until the care team has reached the patient by phone.
 *
 * Adds a study date / modality filter and a "Download original" action
 * that produces a portable manifest the patient can share with another
 * provider.
 */

import { requireRole } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import {
  getReportForStudy,
  listAnnotations,
  listStudies,
} from "@/lib/domain/medical-imaging-store";
import {
  DEMO_PATIENT_ID,
  type ImagingAnnotation,
  type RadiologyReport,
} from "@/lib/domain/medical-imaging";
import { PatientImagingGallery } from "@/components/imaging/patient-imaging-gallery";

export const metadata = { title: "My Imaging" };

export default async function PatientImagingPage() {
  await requireRole("patient");

  // The demo store is keyed off DEMO_PATIENT_ID so every authenticated
  // patient sees the same seeded studies. When this rolls into production
  // the store swap-in will scope by `user.patientId`.
  const studies = listStudies(DEMO_PATIENT_ID);

  const annotationsByStudy: Record<string, ImagingAnnotation[]> =
    Object.fromEntries(
      studies.map((s) => [
        s.id,
        listAnnotations(s.id, { patientVisibleOnly: true }),
      ]),
    );

  const reportsByStudy: Record<string, RadiologyReport> = Object.fromEntries(
    studies
      .map(
        (s) =>
          [
            s.id,
            getReportForStudy(s.id, { patientVisibleOnly: true }),
          ] as const,
      )
      .filter(
        (entry): entry is [string, RadiologyReport] => entry[1] !== null,
      ),
  );

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow="My Records"
        title="My Imaging"
        description="Your CT, MRI, X-ray and ultrasound results — toggle between the picture and the plain-language report."
      />
      <PatientImagingGallery
        studies={studies}
        annotations={annotationsByStudy}
        reports={reportsByStudy}
      />
    </PageShell>
  );
}
