import { PatientSectionNav } from "@/components/shell/PatientSectionNav";
import { requireRole } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { Eyebrow } from "@/components/ui/ornament";
import { SurveyForm } from "./survey-form";

export const metadata = { title: "Satisfaction Survey" };

export default async function SurveyPage() {
  await requireRole("patient");

  return (
    <PageShell maxWidth="max-w-[720px]">
      <PatientSectionNav section="health" />
      <div className="mb-10 text-center">
        <Eyebrow className="justify-center mb-3">Feedback</Eyebrow>
        <h1 className="font-display text-3xl md:text-4xl text-text tracking-tight">
          How was your visit?
        </h1>
        <p className="text-sm text-text-muted mt-3 max-w-md mx-auto leading-relaxed">
          Your feedback helps us improve the care experience for everyone.
          This takes about two minutes.
        </p>
      </div>

      <SurveyForm />
    </PageShell>
  );
}
