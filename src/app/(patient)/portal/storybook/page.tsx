import { PatientSectionNav } from "@/components/shell/PatientSectionNav";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { Eyebrow } from "@/components/ui/ornament";
import { StorybookView } from "./storybook-view";

export const metadata = { title: "My Storybook" };

// ---------------------------------------------------------------------------
// Patient-facing Fairytale Chart Summary (EMR-069)
// ---------------------------------------------------------------------------
// Uses the fairytaleSummary agent to generate a warm, literary one-page
// summary of the patient's care journey. Auto-runs on mount.
// ---------------------------------------------------------------------------

export default async function StorybookPage() {
  const user = await requireRole("patient");

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: { id: true, firstName: true },
  });

  if (!patient) redirect("/portal/intake");

  return (
    <PageShell maxWidth="max-w-[860px]">
      <PatientSectionNav section="journey" />
      <div className="mb-10 text-center print:hidden">
        <Eyebrow className="justify-center mb-3">Your storybook</Eyebrow>
        <h1 className="font-display text-3xl md:text-4xl text-text tracking-tight">
          The story of {patient.firstName}
        </h1>
        <p className="text-sm text-text-muted mt-3 max-w-md mx-auto leading-relaxed">
          Your care journey, written like a chapter in a beloved book. Generated
          fresh each time you visit, so it always reflects where you are right
          now.
        </p>
      </div>

      <StorybookView />
    </PageShell>
  );
}
