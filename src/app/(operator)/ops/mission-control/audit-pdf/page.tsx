import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { AuditPdfClient } from "./audit-pdf-client";

export const metadata = { title: "Audit Log — Print" };

/**
 * EMR-064 — Audit Log PDF Export.
 * Print-optimized server-rendered view of the audit log. Mission
 * Control links here in a new tab; the client component triggers
 * window.print() after mount so the browser's "Save as PDF" dialog
 * opens immediately. No new dependencies — relies on the browser's
 * built-in PDF engine and a print-only stylesheet.
 */

interface SearchParams {
  from?: string;
  to?: string;
  action?: string;
  subjectType?: string;
}

export default async function AuditPdfPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();

  const where: Record<string, unknown> = {
    organizationId: user.organizationId,
  };

  if (searchParams.from || searchParams.to) {
    const range: Record<string, Date> = {};
    if (searchParams.from) range.gte = new Date(searchParams.from);
    if (searchParams.to) {
      const t = new Date(searchParams.to);
      t.setHours(23, 59, 59, 999);
      range.lte = t;
    }
    where.createdAt = range;
  }
  if (searchParams.action) {
    where.action = { contains: searchParams.action, mode: "insensitive" };
  }
  if (searchParams.subjectType) {
    where.subjectType = {
      contains: searchParams.subjectType,
      mode: "insensitive",
    };
  }

  const logs = await prisma.auditLog.findMany({
    where: where as never,
    include: {
      actor: { select: { firstName: true, lastName: true } },
      organization: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  const orgName = logs[0]?.organization?.name ?? "Organization";

  const rows = logs.map((log) => ({
    id: log.id,
    timestamp: log.createdAt.toISOString(),
    actorName: log.actor
      ? `Dr. ${log.actor.firstName} ${log.actor.lastName}`
      : log.actorAgent ?? "System",
    isAgent: !!log.actorAgent,
    action: log.action,
    subjectType: log.subjectType ?? "—",
    subjectId: log.subjectId ?? "—",
    metadata: log.metadata
      ? JSON.stringify(log.metadata, null, 2)
      : null,
  }));

  return (
    <AuditPdfClient
      rows={rows}
      orgName={orgName}
      filters={{
        from: searchParams.from,
        to: searchParams.to,
        action: searchParams.action,
        subjectType: searchParams.subjectType,
      }}
    />
  );
}
