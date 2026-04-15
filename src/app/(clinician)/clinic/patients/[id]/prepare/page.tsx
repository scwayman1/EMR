import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { Avatar } from "@/components/ui/avatar";
import { Eyebrow } from "@/components/ui/ornament";
import { BriefingConsole } from "./briefing-console";

interface PageProps {
  params: { id: string };
}

export const metadata = { title: "Prepare for Visit" };

export default async function PreparePage({ params }: PageProps) {
  const user = await requireUser();

  const patient = await prisma.patient.findFirst({
    where: {
      id: params.id,
      organizationId: user.organizationId!,
      deletedAt: null,
    },
  });

  if (!patient) notFound();

  return (
    <PageShell maxWidth="max-w-[860px]">
      <div className="mb-8">
        <Eyebrow className="mb-3">AI Agent Console</Eyebrow>
        <div className="flex items-center gap-4">
          <Avatar
            firstName={patient.firstName}
            lastName={patient.lastName}
            size="lg"
          />
          <div>
            <h1 className="font-display text-3xl text-text tracking-tight">
              Prepare for {patient.firstName}&apos;s visit
            </h1>
            <p className="text-sm text-text-muted mt-1">
              The Pre-Visit Intelligence Agent synthesizes chart data, outcome
              trends, and research into a concise briefing — so you walk in
              already knowing everything.
            </p>
          </div>
        </div>
      </div>

      <BriefingConsole
        patientId={params.id}
        patientName={`${patient.firstName} ${patient.lastName}`}
      />
    </PageShell>
  );
}
