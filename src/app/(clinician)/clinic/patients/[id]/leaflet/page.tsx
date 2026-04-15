import { redirect, notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { Eyebrow } from "@/components/ui/ornament";
import { generateLeafletData, generateLeafletNarrative } from "./actions";
import { LeafletEditor } from "./leaflet-editor";
import { buildDeterministicNarrative } from "@/lib/domain/leaflet";

export const metadata = { title: "Leaflet — After Visit Summary" };

// ---------------------------------------------------------------------------
// EMR-148: Leaflet page — generate, preview, edit, print
// ---------------------------------------------------------------------------

export default async function LeafletPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { encounter?: string };
}) {
  const user = await requireUser();
  const encounterId = searchParams.encounter;

  if (!encounterId) {
    // No encounter specified — find the most recent finalized one
    const { prisma } = await import("@/lib/db/prisma");
    const latest = await prisma.encounter.findFirst({
      where: {
        patientId: params.id,
        organizationId: user.organizationId!,
        notes: { some: { status: "finalized" } },
      },
      orderBy: { scheduledFor: "desc" },
      select: { id: true },
    });
    if (latest) {
      redirect(`/clinic/patients/${params.id}/leaflet?encounter=${latest.id}`);
    }
    notFound();
  }

  const result = await generateLeafletData(encounterId);
  if (!result.ok) notFound();

  const data = result.data;

  // Generate initial narrative
  const narrativeResult = await generateLeafletNarrative(data, "warm");
  const initialNarrative = narrativeResult.ok
    ? narrativeResult.narrative
    : buildDeterministicNarrative(data);

  return (
    <PageShell maxWidth="max-w-[800px]">
      <div className="mb-6 print:hidden">
        <Eyebrow className="mb-2">Leaflet</Eyebrow>
        <h1 className="font-display text-2xl text-text tracking-tight">
          After Visit Summary
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Review, edit, then print or save to the patient&apos;s chart.
        </p>
      </div>

      <LeafletEditor
        data={data}
        encounterId={encounterId}
        initialNarrative={initialNarrative}
      />
    </PageShell>
  );
}
