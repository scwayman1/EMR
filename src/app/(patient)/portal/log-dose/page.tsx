import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { PatientSectionNav } from "@/components/shell/PatientSectionNav";
import { Eyebrow } from "@/components/ui/ornament";
import { QuickDoseLogger } from "./quick-dose-logger";
import { EmojiCheckin } from "@/components/patient/emoji-checkin";

export const metadata = { title: "Log Dose" };

export default async function LogDosePage() {
  const user = await requireRole("patient");

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
  });

  if (!patient) {
    return (
      <PageShell>
        <p className="text-text-muted">Patient profile not found.</p>
      </PageShell>
    );
  }

  // Load active dosing regimens with product info
  const regimens = await prisma.dosingRegimen.findMany({
    where: { patientId: patient.id, active: true },
    include: { product: true },
    orderBy: { startDate: "desc" },
  });

  const products = regimens.map((r) => ({
    id: r.product.id,
    regimenId: r.id,
    name: r.product.name,
    brand: r.product.brand,
    productType: r.product.productType,
    route: r.product.route,
    doseAmount: r.volumePerDose,
    doseUnit: r.volumeUnit,
    thcMg: r.calculatedThcMgPerDose,
    cbdMg: r.calculatedCbdMgPerDose,
  }));

  return (
    <PageShell maxWidth="max-w-[640px]">
      <PatientSectionNav section="health" />
      <div className="text-center mb-10">
        <Eyebrow className="justify-center mb-3">Quick log</Eyebrow>
        <h1 className="font-display text-3xl md:text-4xl text-text tracking-tight">
          Log your dose
        </h1>
        <p className="text-[15px] text-text-muted mt-3 max-w-md mx-auto leading-relaxed">
          Tap, rate, done. Takes 15 seconds. Your data helps us find what
          works best for you.
        </p>
      </div>

      <QuickDoseLogger patientId={patient.id} products={products} />

      <div className="mt-10">
        <EmojiCheckin />
      </div>
    </PageShell>
  );
}
