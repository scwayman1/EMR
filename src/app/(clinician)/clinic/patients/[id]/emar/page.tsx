import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { Eyebrow } from "@/components/ui/ornament";
import { Avatar } from "@/components/ui/avatar";
import {
  decodeAdministrationLog,
  EMAR_AUDIT_ACTION,
  type AdministrationRecord,
} from "@/lib/domain/emar";
import { EmarView } from "./emar-view";

interface PageProps {
  params: { id: string };
}

export const metadata = { title: "EMAR" };

/**
 * EMR-077 — Patient EMAR view. Lists active medications (cannabis +
 * conventional) plus today's administration timeline. Lets the MA log
 * a fresh administration event without leaving the page.
 */
export default async function EmarPage({ params }: PageProps) {
  const user = await requireUser();
  const orgId = user.organizationId!;

  const [patient, regimens, conventionalMeds, recentLogs] = await Promise.all([
    prisma.patient.findFirst({
      where: { id: params.id, organizationId: orgId, deletedAt: null },
    }),
    prisma.dosingRegimen.findMany({
      where: { patientId: params.id, active: true },
      include: { product: true },
      orderBy: { startDate: "desc" },
    }),
    prisma.patientMedication.findMany({
      where: { patientId: params.id, active: true },
      orderBy: { name: "asc" },
    }),
    prisma.auditLog.findMany({
      where: {
        organizationId: orgId,
        action: EMAR_AUDIT_ACTION,
        subjectType: "Patient",
        subjectId: params.id,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        actor: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  if (!patient) notFound();

  const records = recentLogs
    .map((row) =>
      decodeAdministrationLog({
        id: row.id,
        actorUserId: row.actorUserId ?? "",
        actor: row.actor,
        metadata: row.metadata,
        createdAt: row.createdAt,
      }),
    )
    .filter((r): r is AdministrationRecord => r !== null);

  return (
    <PageShell maxWidth="max-w-[1080px]">
      <div className="mb-8">
        <Eyebrow className="mb-2">EMAR</Eyebrow>
        <div className="flex items-center gap-4">
          <Avatar firstName={patient.firstName} lastName={patient.lastName} size="md" />
          <div>
            <h1 className="font-display text-2xl text-text tracking-tight">
              Administration record · {patient.firstName} {patient.lastName}
            </h1>
            <p className="text-[14px] text-text-muted">
              Log every dose given in clinic. Pulls from active cannabis
              prescriptions and conventional med list; falls back to the
              top-200 formulary for one-off doses.
            </p>
          </div>
        </div>
      </div>
      <EmarView
        patientId={params.id}
        cannabisRegimens={regimens.map((r) => ({
          id: r.id,
          productName: r.product.name,
          volumePerDose: r.volumePerDose,
          volumeUnit: r.volumeUnit,
          frequencyPerDay: r.frequencyPerDay,
        }))}
        conventionalMeds={conventionalMeds.map((m) => ({
          id: m.id,
          name: m.name,
          dosage: m.dosage,
        }))}
        history={records}
      />
    </PageShell>
  );
}
