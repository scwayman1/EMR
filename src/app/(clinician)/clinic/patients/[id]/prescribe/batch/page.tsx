import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { Eyebrow } from "@/components/ui/ornament";
import { Avatar } from "@/components/ui/avatar";
import { BatchPrescribeForm } from "./batch-prescribe-form";

interface PageProps {
  params: { id: string };
}

export const metadata = { title: "Multi-Medication ℞" };

/**
 * EMR-148 — Multi-Medication Prescribing with cross-med safety check.
 * Sibling to the single-med flow at ../page.tsx. Lets the clinician
 * stage 2+ medications in a cart, see one combined interaction +
 * duplicate-therapy report across the whole stack, then sign-and-send
 * all of them in a single double-check modal.
 */
export default async function BatchPrescribePage({ params }: PageProps) {
  const user = await requireUser();
  const [patient, products, medications] = await Promise.all([
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
  ]);

  if (!patient) notFound();

  return (
    <PageShell maxWidth="max-w-[1080px]">
      <div className="mb-10">
        <Eyebrow className="mb-3">Multi-medication ℞</Eyebrow>
        <div className="flex items-center gap-5">
          <Avatar firstName={patient.firstName} lastName={patient.lastName} size="lg" />
          <div>
            <h1 className="font-display text-3xl text-text tracking-tight">
              Cart for {patient.firstName} {patient.lastName}
            </h1>
            <p className="text-[15px] text-text-muted mt-1.5 leading-relaxed max-w-2xl">
              Build a stack of cannabis prescriptions, then sign all of them
              after a cross-med interaction and duplicate-therapy double check.
            </p>
          </div>
        </div>
      </div>

      <BatchPrescribeForm
        patientId={params.id}
        patientName={`${patient.firstName} ${patient.lastName}`}
        existingMeds={medications.map((m) => ({
          id: m.id,
          name: m.name,
          dosage: m.dosage,
        }))}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          brand: p.brand,
          productType: p.productType,
          thcConcentration: p.thcConcentration,
          cbdConcentration: p.cbdConcentration,
          cbnConcentration: p.cbnConcentration,
          cbgConcentration: p.cbgConcentration,
          concentrationUnit: p.concentrationUnit,
        }))}
      />
    </PageShell>
  );
}
