import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import {
  buildPrismaWhere,
  parseAuditFilters,
  serializeAuditFilters,
  AUDIT_PAGE_SIZE,
} from "@/lib/domain/audit-trail-filters";
import { AuditTrailView } from "./audit-view";

export const metadata = { title: "Audit Trail" };

/**
 * Server component — filter state lives entirely in the URL. The page reads
 * `searchParams`, parses them through the zod-validated helper, and hands the
 * result to Prisma. No React state, no useMemo, no client-side filtering.
 *
 * Pagination is cursor-based: we fetch `take + 1` rows so we can detect
 * whether there's a next page without a second COUNT query. The extra row,
 * if present, gives us the next cursor.
 */
export default async function AuditTrailPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const user = await requireUser();
  const orgId = user.organizationId;
  if (!orgId) throw new Error("FORBIDDEN");

  const filters = parseAuditFilters(searchParams);
  const where = buildPrismaWhere(filters, orgId);

  // Fetch take+1 to detect a next page without an extra count query.
  const take = filters.take;
  const rows = await prisma.auditLog.findMany({
    where,
    include: {
      actor: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(filters.cursor
      ? { cursor: { id: filters.cursor }, skip: 1 }
      : {}),
  });

  const hasMore = rows.length > take;
  const logs = hasMore ? rows.slice(0, take) : rows;
  const nextCursor = hasMore ? logs[logs.length - 1]?.id ?? null : null;

  // Totals are computed against the *filtered* where clause so the header
  // shows "57 matching entries" rather than the entire org's history.
  const totalCount = await prisma.auditLog.count({ where });

  // Distinct actors across the full org (not just the filtered page) so the
  // dropdown doesn't vanish when a filter excludes everyone.
  const actorRows = await prisma.auditLog.findMany({
    where: { organizationId: orgId, actorUserId: { not: null } },
    distinct: ["actorUserId"],
    select: {
      actorUserId: true,
      actor: { select: { firstName: true, lastName: true } },
    },
    orderBy: { actorUserId: "asc" },
    take: 200,
  });
  const actorOptions = actorRows
    .filter((r): r is typeof r & { actorUserId: string } => !!r.actorUserId)
    .map((r) => ({
      id: r.actorUserId,
      label: r.actor
        ? `Dr. ${r.actor.firstName} ${r.actor.lastName}`
        : r.actorUserId,
    }));

  // Distinct entity (subjectType) values for the dropdown.
  const entityRows = await prisma.auditLog.findMany({
    where: { organizationId: orgId, subjectType: { not: null } },
    distinct: ["subjectType"],
    select: { subjectType: true },
    orderBy: { subjectType: "asc" },
    take: 100,
  });
  const entityOptions = entityRows
    .map((r) => r.subjectType)
    .filter((s): s is string => !!s);

  // Serialize for the client view
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

  // Pre-build the "Load more" href so the view doesn't need to know how to
  // serialize filters. Keeping serialization logic in one place.
  const loadMoreHref = nextCursor
    ? `/clinic/audit-trail${serializeAuditFilters({ ...filters, cursor: nextCursor })}`
    : null;

  return (
    <PageShell maxWidth="max-w-[1400px]">
      <AuditTrailView
        logs={serializedLogs}
        totalCount={totalCount}
        pageSize={AUDIT_PAGE_SIZE}
        actorOptions={actorOptions}
        entityOptions={entityOptions}
        filters={{
          actor: filters.actor,
          action: filters.action,
          entity: filters.entity,
          from: filters.from ? filters.from.toISOString().slice(0, 10) : "",
          to: filters.to ? filters.to.toISOString().slice(0, 10) : "",
          q: filters.q ?? "",
        }}
        loadMoreHref={loadMoreHref}
        hasCursor={!!filters.cursor}
      />
    </PageShell>
  );
}
