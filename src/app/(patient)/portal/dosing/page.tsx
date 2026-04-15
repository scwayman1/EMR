import { PatientSectionNav } from "@/components/shell/PatientSectionNav";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { Eyebrow } from "@/components/ui/ornament";
import { DosingView } from "./dosing-view";

export const metadata = { title: "Dosing Recommendations" };

// ---------------------------------------------------------------------------
// Dosing Recommendation Engine (EMR-52 / EMR-004)
// ---------------------------------------------------------------------------
// AI-powered cannabis dosing recommendations based on condition, weight,
// tolerance, and prior response. Start low, go slow. Evidence-backed.
// ---------------------------------------------------------------------------

export default async function DosingPage() {
  const user = await requireRole("patient");

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: { id: true, firstName: true },
  });

  if (!patient) redirect("/portal/intake");

  return (
    <PageShell maxWidth="max-w-[860px]">
      <PatientSectionNav section="health" />
      <div className="mb-10 text-center print:hidden">
        <Eyebrow className="justify-center mb-3">Dosing recommendations</Eyebrow>
        <h1 className="font-display text-3xl md:text-4xl text-text tracking-tight">
          Your dosing plan
        </h1>
        <p className="text-sm text-text-muted mt-3 max-w-md mx-auto leading-relaxed">
          A personalized dosing recommendation built from your health profile,
          current medications, and outcome trends. Your care team will review
          and finalize.
        </p>
      </div>

      <DosingView />
    </PageShell>
  );
}
