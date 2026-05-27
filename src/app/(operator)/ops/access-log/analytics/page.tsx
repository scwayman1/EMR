// EMR-121 — Master access log + click analytics deep dive.
//
// Builds on the existing /ops/access-log page. That page is the audit
// browser; this one is the analytics view: per-role workflow efficiency,
// session-length distributions, peak-hour heatmap, and top destinations.
//
// Joins AuditLog rows with the click-tracker library (EMR-104) so the
// same compute path that drives in-process counters also drives this
// dashboard.

import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  reconstructSessions,
  aggregateByRole,
  type AccessRole,
} from "@/lib/billing/access-log";
import {
  summarizeSession,
  aggregateAcrossSessions,
  type ClickEvent,
  type WorkflowScenario,
} from "@/lib/analytics/click-tracker";

export const metadata = { title: "Access log analytics" };

const ROLE_TONE: Record<
  AccessRole,
  "highlight" | "accent" | "info" | "success" | "warning" | "neutral"
> = {
  patient: "info",
  provider: "highlight",
  office_manager: "accent",
  researcher: "success",
  system: "neutral",
};

const ACTION_TO_WORKFLOW: Record<string, WorkflowScenario | undefined> = {
  "rx.signed": "rx_signature",
  "claim.submitted": "claim_submit",
  "message.sent": "message_triage",
  "section.viewed": undefined,
  "field.edited": "note_signoff",
};

function formatSeconds(s: number): string {
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${(s / 60).toFixed(1)}m`;
  return `${(s / 3600).toFixed(1)}h`;
}

export default async function AccessLogAnalyticsPage({
  searchParams,
}: {
  searchParams: { days?: string };
}) {
  const user = await requireUser();
  const orgId = user.organizationId!;
  const sinceDays = Math.max(
    1,
    Math.min(90, parseInt(searchParams.days ?? "14", 10) || 14),
  );
  const sinceCutoff = new Date(Date.now() - sinceDays * 86_400_000);

  const rows = await prisma.auditLog.findMany({
    where: {
      organizationId: orgId,
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
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const normalized = rows.map((r) => ({
    action: r.action,
    actorUserId: r.actorUserId,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    createdAt: r.createdAt,
  }));

  const sessions = reconstructSessions(normalized);
  const byRole = aggregateByRole(sessions);

  // Build click-tracker events from audit rows so we can reuse the
  // workflow efficiency math from EMR-104.
  const clickEvents: ClickEvent[] = normalized.map((r) => ({
    sessionId: (r.metadata?.sessionId as string) ?? "unknown",
    surface: (r.metadata?.section as string) ?? r.action,
    kind: r.action === "session.heartbeat" ? "view" : "click",
    workflow: ACTION_TO_WORKFLOW[r.action],
    occurredAt: r.createdAt,
  }));

  // Group events by session, run summarizer per session, then aggregate.
  const eventsBySession = new Map<string, ClickEvent[]>();
  for (const e of clickEvents) {
    const arr = eventsBySession.get(e.sessionId) ?? [];
    arr.push(e);
    eventsBySession.set(e.sessionId, arr);
  }
  const sessionReports = [...eventsBySession.entries()].map(([sid, evts]) =>
    summarizeSession(sid, evts),
  );
  const workflowEfficiency = aggregateAcrossSessions(sessionReports);

  // Peak-hour heatmap (24x7) from event timestamps.
  const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const r of rows) {
    const day = r.createdAt.getDay();
    const hour = r.createdAt.getHours();
    heatmap[day][hour]++;
  }
  const heatmapMax = Math.max(1, ...heatmap.flat());

  // Session-length distribution buckets.
  const lenBuckets = { lt30s: 0, "30s-2m": 0, "2m-10m": 0, "10m-30m": 0, "30m+": 0 };
  for (const s of sessions) {
    const sec = s.durationSeconds;
    if (sec < 30) lenBuckets.lt30s++;
    else if (sec < 120) lenBuckets["30s-2m"]++;
    else if (sec < 600) lenBuckets["2m-10m"]++;
    else if (sec < 1800) lenBuckets["10m-30m"]++;
    else lenBuckets["30m+"]++;
  }

  const totalSessions = sessions.length;
  const totalClicks = sessions.reduce((acc, s) => acc + s.clicks, 0);

  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Compliance · Analytics"
        title="Access analytics"
        description={`Click + session analytics over the master access log — last ${sinceDays} days. Pair with /ops/access-log for the audit browser.`}
      />

      <form action="/ops/access-log/analytics" method="get" className="mb-6 flex gap-2 items-end">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-muted">Window (days)</span>
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Sessions" value={totalSessions.toLocaleString()} size="md" />
        <StatCard label="Clicks" value={totalClicks.toLocaleString()} tone="accent" size="md" />
        <StatCard
          label="Avg session"
          value={
            totalSessions > 0
              ? formatSeconds(
                  sessions.reduce((acc, s) => acc + s.durationSeconds, 0) /
                    totalSessions,
                )
              : "—"
          }
          tone="info"
          size="md"
        />
        <StatCard
          label="Avg clicks/session"
          value={totalSessions > 0 ? (totalClicks / totalSessions).toFixed(1) : "—"}
          size="md"
        />
      </div>

      <Card tone="raised" className="mb-6">
        <CardHeader>
          <CardTitle>Workflow efficiency</CardTitle>
          <CardDescription>
            Average clicks per workflow vs. par. A score of 1.0 means at-or-below par.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {workflowEfficiency.length === 0 ? (
            <EmptyState
              title="No tagged workflows yet"
              description="Workflow efficiency populates once chart actions are tagged via the click-tracker."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-2 pr-3 text-text-subtle text-[11px] uppercase tracking-wider">Workflow</th>
                    <th className="py-2 pr-3 text-text-subtle text-[11px] uppercase tracking-wider text-right">Sessions</th>
                    <th className="py-2 pr-3 text-text-subtle text-[11px] uppercase tracking-wider text-right">Avg clicks</th>
                    <th className="py-2 pr-3 text-text-subtle text-[11px] uppercase tracking-wider text-right">Median span</th>
                    <th className="py-2 text-text-subtle text-[11px] uppercase tracking-wider text-right">Efficiency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {workflowEfficiency.map((w) => (
                    <tr key={w.workflow}>
                      <td className="py-2 pr-3 text-text">{w.workflow}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-text-muted">{w.sessionCount}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-text">{w.avgClicks}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-text-muted">
                        {formatSeconds(w.medianSpanSeconds)}
                      </td>
                      <td className="py-2 text-right">
                        <Badge tone={w.avgEfficiency >= 0.9 ? "success" : w.avgEfficiency >= 0.6 ? "neutral" : "warning"}>
                          {(w.avgEfficiency * 100).toFixed(0)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card tone="raised" className="mb-6">
        <CardHeader>
          <CardTitle>Session length distribution</CardTitle>
          <CardDescription>
            How long users stay in a session. Long sessions can indicate stuck workflows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(lenBuckets).map(([label, n]) => (
              <div key={label} className="rounded-lg border border-border bg-surface px-4 py-3">
                <p className="text-xs text-text-subtle">{label}</p>
                <p className="font-display text-2xl text-text mt-1 tabular-nums">{n}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card tone="raised" className="mb-6">
        <CardHeader>
          <CardTitle>Per-role click patterns</CardTitle>
          <CardDescription>Mean session length, clicks, and top destinations by role.</CardDescription>
        </CardHeader>
        <CardContent>
          {byRole.length === 0 ? (
            <EmptyState title="No sessions yet" description="Wait for activity in this window." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-2 pr-3 text-text-subtle text-[11px] uppercase tracking-wider">Role</th>
                    <th className="py-2 pr-3 text-text-subtle text-[11px] uppercase tracking-wider text-right">Sessions</th>
                    <th className="py-2 pr-3 text-text-subtle text-[11px] uppercase tracking-wider text-right">Avg clicks</th>
                    <th className="py-2 pr-3 text-text-subtle text-[11px] uppercase tracking-wider text-right">Avg session</th>
                    <th className="py-2 text-text-subtle text-[11px] uppercase tracking-wider">Top destinations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {byRole.map((r) => (
                    <tr key={r.role}>
                      <td className="py-3 pr-3">
                        <Badge tone={ROLE_TONE[r.role]}>{r.role}</Badge>
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums">{r.sessionCount}</td>
                      <td className="py-3 pr-3 text-right tabular-nums">{r.avgClicksPerSession.toFixed(1)}</td>
                      <td className="py-3 pr-3 text-right tabular-nums">{formatSeconds(r.avgSessionSeconds)}</td>
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

      <Card tone="raised">
        <CardHeader>
          <CardTitle>Activity heatmap (day × hour)</CardTitle>
          <CardDescription>Where the practice's attention lands during the week.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="text-[10px] tabular-nums">
              <thead>
                <tr>
                  <th className="px-1 py-1 text-text-subtle text-left">Day</th>
                  {Array.from({ length: 24 }, (_, h) => (
                    <th key={h} className="px-1 py-1 text-text-subtle text-center w-6">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, di) => (
                  <tr key={day}>
                    <td className="px-1 py-1 text-text-muted pr-3">{day}</td>
                    {heatmap[di].map((n, h) => {
                      const intensity = n / heatmapMax;
                      const bg = `rgba(58, 113, 81, ${(intensity * 0.85 + 0.05).toFixed(2)})`;
                      return (
                        <td
                          key={h}
                          className="text-center text-[10px] text-text-muted"
                          title={`${day} ${h}:00 — ${n}`}
                          style={{ backgroundColor: bg, height: 18, width: 22 }}
                        >
                          {n > 0 ? n : ""}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
