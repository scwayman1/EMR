import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  reconstructSessions,
  aggregateByRole,
  buildHipaaExport,
  type AccessRole,
} from "@/lib/billing/access-log";

export const metadata = { title: "Master Access Log" };

const ROLE_TONE: Record<AccessRole, "highlight" | "accent" | "info" | "success" | "warning" | "neutral"> = {
  patient: "info",
  provider: "highlight",
  office_manager: "accent",
  researcher: "success",
  system: "neutral",
};

function formatSeconds(s: number): string {
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${(s / 60).toFixed(1)}m`;
  return `${(s / 3600).toFixed(1)}h`;
}

export default async function AccessLogPage({
  searchParams,
}: {
  searchParams: { patient?: string; days?: string };
}) {
  const user = await requireUser();
  const organizationId = user.organizationId!;
  const sinceDays = Math.max(1, Math.min(90, parseInt(searchParams.days ?? "14", 10) || 14));
  const sinceCutoff = new Date(Date.now() - sinceDays * 86_400_000);

  // Pull recent AuditLog rows that look like chart access — this is
  // the "read" side of `recordChartAccess()`.
  const rows = await prisma.auditLog.findMany({
    where: {
      organizationId,
      createdAt: { gte: sinceCutoff },
      action: {
        in: [
          "chart.viewed",
          "section.viewed",
          "field.edited",
          "document.downloaded",
          "message.sent",
          "rx.signed",
          "claim.submitted",
          "session.heartbeat",
        ],
      },
      ...(searchParams.patient
        ? { subjectType: "patient", subjectId: searchParams.patient }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  const normalized = rows.map((r) => ({
    action: r.action,
    actorUserId: r.actorUserId,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    createdAt: r.createdAt,
  }));

  const sessions = reconstructSessions(normalized);
  const byRole = aggregateByRole(sessions);
  const hipaaExport = searchParams.patient
    ? buildHipaaExport(searchParams.patient, normalized)
    : [];

  const totalEvents = rows.length;
  const totalSessions = sessions.length;
  const uniqueActors = new Set(rows.map((r) => r.actorUserId).filter(Boolean)).size;
  const uniquePatients = new Set(rows.map((r) => r.subjectId).filter(Boolean)).size;

  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Compliance"
        title="Master access log"
        description={`Immutable record of every chart access — last ${sinceDays} days. Filter by patient to scope a HIPAA audit; export from the panel below.`}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Events" value={totalEvents.toLocaleString()} size="md" />
        <StatCard label="Sessions" value={totalSessions.toLocaleString()} tone="accent" size="md" />
        <StatCard label="Distinct actors" value={String(uniqueActors)} size="md" />
        <StatCard label="Distinct patients" value={String(uniquePatients)} size="md" />
      </div>

      <form action="/ops/access-log" method="get" className="mb-6 flex gap-2 items-end">
        <label className="flex flex-col gap-1 flex-1">
          <span className="text-xs text-text-muted">Patient id</span>
          <input
            name="patient"
            defaultValue={searchParams.patient ?? ""}
            placeholder="Optional — leave blank for org-wide view"
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-muted">Days</span>
          <input
            type="number"
            name="days"
            defaultValue={String(sinceDays)}
            min={1}
            max={90}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm w-24"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-text px-4 py-2 text-sm text-surface hover:opacity-90"
        >
          Apply
        </button>
      </form>

      <Card tone="raised" className="mb-6">
        <CardHeader>
          <CardTitle>Click analytics by role</CardTitle>
          <CardDescription>
            Mean session length and click counts per role across the selected window.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {byRole.length === 0 ? (
            <EmptyState
              title="No sessions in this window"
              description="Adjust the days filter or wait for activity."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-2 pr-4 font-medium text-text-subtle text-[10px] uppercase tracking-wider">Role</th>
                    <th className="py-2 pr-4 font-medium text-text-subtle text-[10px] uppercase tracking-wider">Sessions</th>
                    <th className="py-2 pr-4 font-medium text-text-subtle text-[10px] uppercase tracking-wider">Avg clicks</th>
                    <th className="py-2 pr-4 font-medium text-text-subtle text-[10px] uppercase tracking-wider">Avg session</th>
                    <th className="py-2 font-medium text-text-subtle text-[10px] uppercase tracking-wider">Top destinations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {byRole.map((r) => (
                    <tr key={r.role}>
                      <td className="py-3 pr-4">
                        <Badge tone={ROLE_TONE[r.role]}>{r.role}</Badge>
                      </td>
                      <td className="py-3 pr-4 tabular-nums text-text">{r.sessionCount}</td>
                      <td className="py-3 pr-4 tabular-nums text-text">
                        {r.avgClicksPerSession.toFixed(1)}
                      </td>
                      <td className="py-3 pr-4 tabular-nums text-text">
                        {formatSeconds(r.avgSessionSeconds)}
                      </td>
                      <td className="py-3 text-text-muted text-xs">
                        {r.topDestinations.map((d) => `${d.section} (${d.count})`).join(" · ") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {searchParams.patient && (
        <Card tone="raised">
          <CardHeader>
            <CardTitle>HIPAA export preview · {searchParams.patient}</CardTitle>
            <CardDescription>
              Deterministic, immutable export rows. Pipe through the compliance team's PDF generator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hipaaExport.length === 0 ? (
              <p className="text-sm text-text-subtle">
                No events recorded for this patient in the window.
              </p>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-surface">
                    <tr className="border-b border-border text-left">
                      <th className="py-2 pr-3 text-text-subtle">When</th>
                      <th className="py-2 pr-3 text-text-subtle">Actor</th>
                      <th className="py-2 pr-3 text-text-subtle">Role</th>
                      <th className="py-2 pr-3 text-text-subtle">Action</th>
                      <th className="py-2 pr-3 text-text-subtle">Section</th>
                      <th className="py-2 text-text-subtle">Field</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {hipaaExport.slice(0, 200).map((row, i) => (
                      <tr key={i}>
                        <td className="py-2 pr-3 tabular-nums text-text-muted">{row.timestampIso}</td>
                        <td className="py-2 pr-3 text-text">{row.actorUserId ?? "system"}</td>
                        <td className="py-2 pr-3">
                          <Badge tone={ROLE_TONE[row.actorRole]}>{row.actorRole}</Badge>
                        </td>
                        <td className="py-2 pr-3 text-text">{row.action}</td>
                        <td className="py-2 pr-3 text-text-muted">{row.section}</td>
                        <td className="py-2 text-text-muted">{row.field ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {hipaaExport.length > 200 && (
                  <p className="text-xs text-text-subtle mt-2">
                    Showing first 200 of {hipaaExport.length}. PDF export includes all rows.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
