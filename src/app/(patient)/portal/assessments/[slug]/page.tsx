import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { AssessmentForm } from "./assessment-form";
import { getTemplate } from "./templates";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const template = getTemplate(params.slug);
  return { title: template ? `${template.title} Assessment` : "Assessment" };
}

export default async function AssessmentTakePage({
  params,
}: {
  params: { slug: string };
}) {
  await requireRole("patient");

  const template = getTemplate(params.slug);
  if (!template) notFound();

  return (
    <PageShell maxWidth="max-w-[720px]">
      <PageHeader
        eyebrow="Assessment"
        title={template.title}
        description="Over the last two weeks, how often have you been bothered by the following? Answer each question honestly -- there are no wrong answers."
      />
      <AssessmentForm template={template} />
    </PageShell>
  );
}
