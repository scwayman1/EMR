import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { FormBuilder } from "./form-builder";

export const metadata = { title: "Intake Form Builder" };

export default async function IntakeBuilderPage() {
  await requireUser();

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow="Intake"
        title="Custom intake form builder"
        description="Add, remove, and reorder the fields patients see during intake. Changes apply to all new patients."
      />

      <FormBuilder />
    </PageShell>
  );
}
