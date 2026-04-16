import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { EmptyState } from "@/components/ui/empty-state";
import { TitrationView, type RegimenSummary, type PendingSuggestion } from "./titration-view";
import type { TitrationSuggestion } from "@/lib/agents/titration-agent";

interface PageProps {
  params: { id: string };
}

export const metadata = { title: "Titration suggestions" };

export default async function TitrationPage({ params }: PageProps) {
  const user = await requireUser();

  const patient = await prisma.patient.findFirst({
    where: {
      id: params.id,
      organizationId: user.organizationId!,
      deletedAt: null,
    },
    include: {
      dosingRegimens: {
        where: { active: true },
        include: { product: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!patient) notFound();

  const regimens: RegimenSummary[] = patient.dosingRegimens.map((r) => ({
    id: r.id,
    productName: r.product?.name ?? "Cannabis product",
    volumePerDose: r.volumePerDose,
    volumeUnit: r.volumeUnit,
    frequencyPerDay: r.frequencyPerDay,
    thcMgPerDose: r.calculatedThcMgPerDose ?? null,
    cbdMgPerDose: r.calculatedCbdMgPerDose ?? null,
    timingInstructions: r.timingInstructions ?? null,
  }));

  // Load any pending titration suggestions for these regimens.
  const pendingJobs = await prisma.agentJob.findMany({
    where: {
      organizationId: user.organizationId!,
      agentName: "titration",
      status: "needs_approval",
    },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  const pending: PendingSuggestion[] = pendingJobs
    .filter((j) => {
      const input = j.input as { patientId?: string; regimenId?: string };
      return input.patientId === patient.id;
    })
    .map((j) => {
      const input = j.input as { regimenId: string };
      return {
        jobId: j.id,
        regimenId: input.regimenId,
        suggestion: j.output as unknown as TitrationSuggestion,
        createdAt: j.createdAt.toISOString(),
      };
    });

  return (
    <PageShell maxWidth="max-w-[860px]">
      <Link
        href={`/clinic/patients/${patient.id}`}
        className="text-sm text-accent hover:underline mb-4 inline-block"
      >
        &larr; Back to chart
      </Link>

      <PageHeader
        eyebrow="Titration"
        title={`Titration for ${patient.firstName} ${patient.lastName}`}
        description="Generate evidence-based dose adjustment suggestions per regimen. Every suggestion routes to your approval queue before any change is recorded."
      />

      {regimens.length === 0 ? (
        <EmptyState
          title="No active regimens"
          description="Once this patient has an active dosing regimen, you can request titration suggestions here."
        />
      ) : (
        <TitrationView
          patientId={patient.id}
          regimens={regimens}
          pending={pending}
        />
      )}
    </PageShell>
  );
}
