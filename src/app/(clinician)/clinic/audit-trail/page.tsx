import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { AuditTrailView } from "./audit-view";

export const metadata = { title: "Audit Trail" };

export default async function AuditTrailPage() {
  const user = await requireUser();

  // Load the initial page of audit logs
  const logs = await prisma.auditLog.findMany({
    where: { organizationId: user.organizationId },
    include: {
      actor: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const totalCount = await prisma.auditLog.count({
    where: { organizationId: user.organizationId },
  });

  // Serialize for the client
  const serializedLogs = logs.map((log) => ({
    id: log.id,
    actorUserId: log.actorUserId,
    actorAgent: log.actorAgent,
    actorName: log.actor
      ? `Dr. ${log.actor.firstName} ${log.actor.lastName}`
      : log.actorAgent ?? "System",
    action: log.action,
    subjectType: log.subjectType,
    subjectId: log.subjectId,
    metadata: log.metadata as Record<string, unknown> | null,
    createdAt: log.createdAt.toISOString(),
  }));

  return (
    <PageShell maxWidth="max-w-[1400px]">
      <AuditTrailView
        initialLogs={serializedLogs}
        totalCount={totalCount}
      />
    </PageShell>
  );
}
