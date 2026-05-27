/**
 * Master Access Log + Click Analytics (EMR-121)
 * ---------------------------------------------
 * Builds on the existing `AuditLog` Prisma model. AuditLog already
 * captures actor + action + subject; this module adds:
 *
 *   1. A higher-level `recordChartAccess()` API that the chart shell
 *      calls on every section view, edit, and time-on-task tick. The
 *      method writes to AuditLog with a stable metadata schema so
 *      downstream analytics and HIPAA exports can rely on the shape.
 *
 *   2. Aggregation helpers that turn raw rows into the click-analytics
 *      story per role (patient / provider / office_manager).
 *
 *   3. A HIPAA-export builder that produces a deterministic audit
 *      report — one row per chart access — formatted for the
 *      compliance team's PDF generator.
 *
 * Immutability: this module never updates or deletes existing rows.
 * AuditLog has no update path in the schema.
 */

export type AccessRole = "patient" | "provider" | "office_manager" | "researcher" | "system";

export type AccessAction =
  | "chart.viewed"
  | "section.viewed"
  | "field.edited"
  | "document.downloaded"
  | "message.sent"
  | "rx.signed"
  | "claim.submitted"
  | "session.heartbeat";

export interface ChartAccessEvent {
  organizationId: string;
  actorUserId: string | null;
  actorRole: AccessRole;
  patientId: string;
  action: AccessAction;
  section: string;
  field?: string;
  metadata?: Record<string, unknown>;
  sessionId: string;
  occurredAt?: Date;
}

export interface AccessLogStore {
  append(row: {
    organizationId: string;
    actorUserId: string | null;
    action: string;
    subjectType: string;
    subjectId: string;
    metadata: Record<string, unknown>;
    createdAt: Date;
  }): Promise<void>;
  listForPatient(
    patientId: string,
    sinceDays: number,
  ): Promise<
    Array<{
      action: string;
      actorUserId: string | null;
      metadata: Record<string, unknown>;
      createdAt: Date;
    }>
  >;
}

/** Append a chart-access event to AuditLog with a stable metadata schema. */
export async function recordChartAccess(
  event: ChartAccessEvent,
  store: AccessLogStore,
): Promise<void> {
  await store.append({
    organizationId: event.organizationId,
    actorUserId: event.actorUserId,
    action: event.action,
    subjectType: "patient",
    subjectId: event.patientId,
    metadata: {
      role: event.actorRole,
      section: event.section,
      field: event.field ?? null,
      sessionId: event.sessionId,
      ...event.metadata,
    },
    createdAt: event.occurredAt ?? new Date(),
  });
}

export interface SessionStats {
  sessionId: string;
  actorUserId: string | null;
  role: AccessRole;
  start: Date;
  end: Date;
  durationSeconds: number;
  /** Click-equivalent events (excludes heartbeats). */
  clicks: number;
  destinations: string[];
}

export interface RoleClickAnalytics {
  role: AccessRole;
  sessionCount: number;
  avgClicksPerSession: number;
  avgSessionSeconds: number;
  topDestinations: Array<{ section: string; count: number }>;
}

/** Reconstruct sessions from raw rows. A session is "all rows sharing
 * a sessionId, in time order." Single-event sessions get a 30s floor. */
export function reconstructSessions(
  rows: Array<{
    action: string;
    actorUserId: string | null;
    metadata: Record<string, unknown>;
    createdAt: Date;
  }>,
): SessionStats[] {
  const bySession = new Map<string, typeof rows>();
  for (const r of rows) {
    const sessionId = (r.metadata?.sessionId as string) ?? "unknown";
    const arr = bySession.get(sessionId) ?? [];
    arr.push(r);
    bySession.set(sessionId, arr);
  }

  const out: SessionStats[] = [];
  for (const [sessionId, list] of bySession) {
    list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const start = list[0].createdAt;
    const end = list[list.length - 1].createdAt;
    const duration = Math.max(30, Math.floor((end.getTime() - start.getTime()) / 1000));
    const clicks = list.filter((r) => r.action !== "session.heartbeat").length;
    const destinations = list
      .map((r) => (r.metadata?.section as string) ?? null)
      .filter((s): s is string => !!s);
    out.push({
      sessionId,
      actorUserId: list[0].actorUserId,
      role: ((list[0].metadata?.role as AccessRole) ?? "system"),
      start,
      end,
      durationSeconds: duration,
      clicks,
      destinations,
    });
  }
  return out;
}

export function aggregateByRole(sessions: SessionStats[]): RoleClickAnalytics[] {
  const byRole = new Map<AccessRole, SessionStats[]>();
  for (const s of sessions) {
    const arr = byRole.get(s.role) ?? [];
    arr.push(s);
    byRole.set(s.role, arr);
  }

  const out: RoleClickAnalytics[] = [];
  for (const [role, list] of byRole) {
    const totalClicks = list.reduce((acc, s) => acc + s.clicks, 0);
    const totalSeconds = list.reduce((acc, s) => acc + s.durationSeconds, 0);
    const destCounts = new Map<string, number>();
    for (const s of list) {
      for (const d of s.destinations) {
        destCounts.set(d, (destCounts.get(d) ?? 0) + 1);
      }
    }
    const topDestinations = Array.from(destCounts.entries())
      .map(([section, count]) => ({ section, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    out.push({
      role,
      sessionCount: list.length,
      avgClicksPerSession: list.length === 0 ? 0 : totalClicks / list.length,
      avgSessionSeconds: list.length === 0 ? 0 : totalSeconds / list.length,
      topDestinations,
    });
  }
  return out;
}

export interface HipaaExportRow {
  timestampIso: string;
  actorUserId: string | null;
  actorRole: AccessRole;
  patientId: string;
  action: string;
  section: string;
  field: string | null;
  sessionId: string;
}

/** Deterministic, immutable export rows for the HIPAA audit PDF. */
export function buildHipaaExport(
  patientId: string,
  rows: Array<{
    action: string;
    actorUserId: string | null;
    metadata: Record<string, unknown>;
    createdAt: Date;
  }>,
): HipaaExportRow[] {
  return rows
    .slice()
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((r) => ({
      timestampIso: r.createdAt.toISOString(),
      actorUserId: r.actorUserId,
      actorRole: ((r.metadata?.role as AccessRole) ?? "system"),
      patientId,
      action: r.action,
      section: (r.metadata?.section as string) ?? "",
      field: ((r.metadata?.field as string) ?? null),
      sessionId: ((r.metadata?.sessionId as string) ?? ""),
    }));
}
