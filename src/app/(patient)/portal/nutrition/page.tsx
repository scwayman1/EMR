import { requireRole } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { PatientSectionNav } from "@/components/shell/PatientSectionNav";
import { NutritionLogger } from "./nutrition-logger";

export const metadata = { title: "Nutrition" };

export default async function NutritionPage() {
  await requireRole("patient");

  return (
    <PageShell maxWidth="max-w-[960px]">
      <PatientSectionNav section="journey" />
      <PageHeader
        eyebrow="Nutrition"
        title="Log a meal in seconds"
        description="Snap a photo, scan a barcode, or type a few words. We will estimate the macros so your care team sees what is fueling you."
      />
      <NutritionLogger />
    </PageShell>
  );
}
