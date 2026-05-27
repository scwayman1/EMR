import { requireRole } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { QAView } from "./qa-view";

export const metadata = { title: "Questions & Answers" };

export default async function QAPage() {
  await requireRole("patient");

  return (
    <PageShell maxWidth="max-w-[960px]">
      <PageHeader
        eyebrow="Knowledge Base"
        title="Questions & answers"
        description="Find answers to common questions about your care, cannabis medicine, billing, and more."
      />
      <QAView />
    </PageShell>
  );
}
