import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { PatientSectionNav } from "@/components/shell/PatientSectionNav";
import { Eyebrow } from "@/components/ui/ornament";
import { EfficacyDashboard, type ProductEfficacy } from "./efficacy-dashboard";

export const metadata = { title: "Product Efficacy" };

/**
 * Per-product efficacy dashboard.
 *
 * For each active dosing regimen we pull the patient's most recent OutcomeLog
 * entries and try to attribute them to the regimen via the structured
 * `[post_dose_feeling] regimenId=…` marker that `createFollowUpLog` writes.
 * Anything we can't attribute we treat as "general" mood data and merge into
 * the product's series so first-time users still see something useful.
 */
export default async function EfficacyPage() {
  const user = await requireRole("patient");
  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!patient) redirect("/portal/intake");

  const regimens = await prisma.dosingRegimen.findMany({
    where: { patientId: patient.id, active: true },
    include: { product: true },
    orderBy: { startDate: "desc" },
  });

  // Pull the last 90 days of mood logs so we can split per-regimen.
  const since = new Date(Date.now() - 90 * 86400000);
  const moodLogs = await prisma.outcomeLog.findMany({
    where: {
      patientId: patient.id,
      metric: "mood",
      loggedAt: { gte: since },
    },
    orderBy: { loggedAt: "asc" },
  });

  function isAttributedTo(note: string | null, regimenId: string): boolean {
    if (!note) return false;
    return note.includes(`regimenId=${regimenId}`);
  }

  const products: ProductEfficacy[] = regimens.map((r) => {
    const owned = moodLogs.filter((l) => isAttributedTo(l.note, r.id));
    // Fallback: any post_dose_feeling not attributed gets shared across all
    // products if the patient only has one active regimen.
    const orphaned =
      regimens.length === 1
        ? moodLogs.filter(
            (l) => l.note?.includes("[post_dose_feeling]") && !l.note.includes("regimenId=")
          )
        : [];
    const series = [...owned, ...orphaned]
      .sort((a, b) => a.loggedAt.getTime() - b.loggedAt.getTime())
      .map((l) => ({
        loggedAt: l.loggedAt.toISOString(),
        value: l.value,
      }));

    const startedAt = r.startDate;
    const daysOnTreatment = Math.max(
      0,
      Math.round((Date.now() - startedAt.getTime()) / 86400000)
    );

    const avg =
      series.length > 0
        ? series.reduce((sum, s) => sum + s.value, 0) / series.length
        : null;

    return {
      regimenId: r.id,
      productId: r.product.id,
      productName: r.product.name,
      brand: r.product.brand,
      route: r.product.route,
      doseAmount: r.volumePerDose,
      doseUnit: r.volumeUnit,
      startedAt: startedAt.toISOString(),
      daysOnTreatment,
      avgRating: avg,
      series,
    };
  });

  // Sort highest-rated first; products with no data slot in last.
  products.sort((a, b) => {
    const aRating = a.avgRating ?? -1;
    const bRating = b.avgRating ?? -1;
    return bRating - aRating;
  });

  return (
    <PageShell maxWidth="max-w-[960px]">
      <PatientSectionNav section="health" />
      <div className="mb-10 text-center">
        <Eyebrow className="justify-center mb-3">Product efficacy</Eyebrow>
        <h1 className="font-display text-3xl md:text-4xl text-text tracking-tight">
          Here's how your products are working for you
        </h1>
        <p className="text-[15px] text-text-muted mt-3 max-w-md mx-auto leading-relaxed">
          Every check-in becomes a data point. The more you log, the clearer
          your story gets.
        </p>
      </div>

      <EfficacyDashboard products={products} />
    </PageShell>
  );
}
