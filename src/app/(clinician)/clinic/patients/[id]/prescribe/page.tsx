import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { Eyebrow } from "@/components/ui/ornament";
import { Avatar } from "@/components/ui/avatar";
import { PrescribeForm } from "./prescribe-form";
import { checkContraindications } from "@/lib/domain/contraindications";

interface PageProps {
  params: { id: string };
}

export const metadata = { title: "New Prescription" };

export default async function PrescribePage({ params }: PageProps) {
  const user = await requireUser();

  const [patient, products, medications, chartSummary] = await Promise.all([
    prisma.patient.findFirst({
      where: {
        id: params.id,
        organizationId: user.organizationId!,
        deletedAt: null,
      },
    }),
    prisma.cannabisProduct.findMany({
      where: { organizationId: user.organizationId!, active: true },
      orderBy: { name: "asc" },
    }),
    prisma.patientMedication.findMany({
      where: { patientId: params.id, active: true },
      orderBy: { name: "asc" },
    }),
    prisma.chartSummary.findUnique({
      where: { patientId: params.id },
    }),
  ]);

  if (!patient) notFound();

  // EMR-088: run cannabis contraindication check
  const contraindicationMatches = checkContraindications({
    dateOfBirth: patient.dateOfBirth,
    presentingConcerns: patient.presentingConcerns,
    intakeAnswers: patient.intakeAnswers,
    medicationNames: medications.map((m) => m.name),
    historyText: chartSummary?.summaryMd ?? null,
    icd10Codes: [], // Could pull from problem list when we have one
  });

  return (
    <PageShell maxWidth="max-w-[800px]">
      <div className="mb-8">
        <Eyebrow className="mb-3">New prescription</Eyebrow>
        <div className="flex items-center gap-4">
          <Avatar firstName={patient.firstName} lastName={patient.lastName} size="lg" />
          <div>
            <h1 className="font-display text-3xl text-text tracking-tight">
              Prescribe for {patient.firstName} {patient.lastName}
            </h1>
            <p className="text-sm text-text-muted mt-1">
              Complete all sections below to create a new prescription.
            </p>
          </div>
        </div>
      </div>

      <PrescribeForm
        patientId={params.id}
        patientName={`${patient.firstName} ${patient.lastName}`}
        contraindicationMatches={contraindicationMatches.map((m) => ({
          id: m.contraindication.id,
          label: m.contraindication.label,
          severity: m.contraindication.severity,
          rationale: m.contraindication.rationale,
          requiresOverride: m.contraindication.requiresOverride,
          matchedOn: m.matchedOn,
        }))}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          brand: p.brand,
          productType: p.productType,
          route: p.route,
          thcConcentration: p.thcConcentration,
          cbdConcentration: p.cbdConcentration,
          cbnConcentration: p.cbnConcentration,
          cbgConcentration: p.cbgConcentration,
          thcCbdRatio: p.thcCbdRatio,
          concentrationUnit: p.concentrationUnit,
        }))}
        medications={medications.map((m) => ({
          id: m.id,
          name: m.name,
          genericName: m.genericName,
          dosage: m.dosage,
          active: m.active,
        }))}
      />
    </PageShell>
  );
}
