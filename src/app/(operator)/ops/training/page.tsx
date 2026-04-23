import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { DEFAULT_TRAINING } from "@/lib/domain/overnight-batch";
import { TrainingView } from "./training-view";

export const metadata = { title: "Staff Training" };

export default async function TrainingPage() {
  await requireUser();

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow="Team"
        title="Training & certification"
        description="Complete required modules to stay in compliance. Track progress and assign training to staff."
      />
      <TrainingView initialModules={DEFAULT_TRAINING} />
    </PageShell>
  );
}
