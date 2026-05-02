import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { Eyebrow } from "@/components/ui/ornament";
import { QuickDoseLogger } from "./quick-dose-logger";

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

  // EMR-194: show all cannabis regimens — active and inactive — so the
  // patient can still log against a product they paused or rotated off.
  // Filtering is done client-side via filter chips.
  const regimens = await prisma.dosingRegimen.findMany({
    where: { patientId: patient.id },
    include: { product: true },
    orderBy: [{ active: "desc" }, { startDate: "desc" }],
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
    active: r.active,
  }));

  return (
    <PageShell maxWidth="max-w-[640px]">
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
    </PageShell>
  );
}
