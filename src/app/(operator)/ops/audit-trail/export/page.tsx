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
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Audit Trail PDF Export" };

/**
 * EMR-064 — Operator-facing page that previews a print-ready audit-trail
 * report and lets the privacy officer "Save as PDF" via the browser.
 *
 * Why a print-stylesheet page rather than a server-side PDF library?
 * We want zero new infra dependency and a one-button export. Browser
 * "Save as PDF" produces an indistinguishable artifact for HIPAA
 * production needs (text-searchable, embedded, vector). The page
 * carries a strong print stylesheet so the on-screen UI hides during
 * print and only the report content is paginated.
 */

interface PageProps {
  searchParams: {
    days?: string;
    patient?: string;
    actor?: string;
    action?: string;
  };
}

const ACTION_TONE: Record<string, "warning" | "info" | "success" | "neutral"> = {
  "phi.sensitive.break_glass": "warning",
  "rx.contraindication.override": "warning",
  "auth.login.failed": "warning",
  "chart.viewed": "info",
  "section.viewed": "info",
  "document.downloaded": "info",
  "rx.signed": "success",
};

function formatActor(actorUserId: string | null, actorAgent: string | null): string {
  if (actorUserId) return actorUserId;
  if (actorAgent) return actorAgent;
  return "system";
}

function tone(action: string): "warning" | "info" | "success" | "neutral" {
  return ACTION_TONE[action] ?? "neutral";
}

export default async function AuditTrailExportPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const organizationId = user.organizationId!;

  const sinceDays = Math.max(1, Math.min(365, parseInt(searchParams.days ?? "30", 10) || 30));
  const since = new Date(Date.now() - sinceDays * 86_400_000);

  const where: any = { organizationId, createdAt: { gte: since } };
  if (searchParams.patient) {
    where.subjectType = "patient";
    where.subjectId = searchParams.patient;
  }
  if (searchParams.actor) {
    where.OR = [
      { actorUserId: searchParams.actor },
      { actorAgent: searchParams.actor },
    ];
  }
  if (searchParams.action) {
    where.action = searchParams.action;
  }

  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  // Counts that surface on the report header
  const totalEvents = rows.length;
  const uniqueActors = new Set(
    rows.map((r) => r.actorUserId ?? r.actorAgent ?? "system"),
  ).size;
  const uniquePatients = new Set(
    rows
      .filter((r) => r.subjectType === "patient" && r.subjectId)
      .map((r) => r.subjectId!),
  ).size;
  const breakGlassCount = rows.filter(
    (r) => r.action === "phi.sensitive.break_glass",
  ).length;
  const contraindicationOverrides = rows.filter(
    (r) => r.action === "rx.contraindication.override",
  ).length;

  const generatedAt = new Date();
  const reportId = `AUD-${generatedAt.toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;

  // Group by action for the summary section
  const byAction = new Map<string, number>();
  for (const r of rows) {
    byAction.set(r.action, (byAction.get(r.action) ?? 0) + 1);
  }
  const actionRows = [...byAction.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <PageShell>
      {/* Print-only stylesheet */}
      <style>{`
        @media print {
          html, body {
            background: white !important;
            color: black !important;
            font-size: 11pt;
          }
          .no-print { display: none !important; }
          .print-page-break { page-break-after: always; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          .audit-shell { padding: 0 !important; box-shadow: none !important; }
          a { color: inherit; text-decoration: none; }
        }
        @page { size: letter; margin: 0.6in; }
      `}</style>

      <div className="no-print">
        <PageHeader
          eyebrow="Compliance"
          title="Audit Trail PDF Export"
          description="Generate a print-ready audit-trail report for an external production request, internal review, or regulator response. Use the browser's Save as PDF action after the report renders."
          actions={
            <form method="get" className="flex items-center gap-2">
              <input
                name="days"
                type="number"
                min={1}
                max={365}
                defaultValue={sinceDays}
                className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
              />
              <input
                name="patient"
                type="text"
                placeholder="Patient ID (optional)"
                defaultValue={searchParams.patient ?? ""}
                className="w-44 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
              />
              <input
                name="actor"
                type="text"
                placeholder="Actor (optional)"
                defaultValue={searchParams.actor ?? ""}
                className="w-44 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
              />
              <input
                name="action"
                type="text"
                placeholder="Action (optional)"
                defaultValue={searchParams.action ?? ""}
                className="w-44 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
              />
              <button
                type="submit"
                className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
              >
                Apply filters
              </button>
            </form>
          }
        />
      </div>

      {/* Report itself — visible on screen + print */}
      <article className="audit-shell rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 print:p-0 print:shadow-none print:ring-0">
        <header className="mb-6 border-b border-slate-200 pb-4">
          <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
            Leafjourney EMR — Audit Trail Report
          </div>
          <h1 className="mt-1 font-display text-2xl text-slate-900">
            Audit Trail · {since.toISOString().slice(0, 10)} → {generatedAt
              .toISOString()
              .slice(0, 10)}
          </h1>
          <div className="mt-2 grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-slate-700 sm:grid-cols-4">
            <div>
              <span className="font-medium">Report ID:</span> {reportId}
            </div>
            <div>
              <span className="font-medium">Organization:</span> {organizationId}
            </div>
            <div>
              <span className="font-medium">Generated:</span>{" "}
              {generatedAt.toISOString().replace("T", " ").slice(0, 19)} UTC
            </div>
            <div>
              <span className="font-medium">Generated by:</span>{" "}
              {user.email ?? user.id}
            </div>
            {searchParams.patient && (
              <div className="col-span-full">
                <span className="font-medium">Patient filter:</span>{" "}
                {searchParams.patient}
              </div>
            )}
            {searchParams.actor && (
              <div className="col-span-full">
                <span className="font-medium">Actor filter:</span>{" "}
                {searchParams.actor}
              </div>
            )}
            {searchParams.action && (
              <div className="col-span-full">
                <span className="font-medium">Action filter:</span>{" "}
                {searchParams.action}
              </div>
            )}
          </div>
        </header>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard label="Total events" value={totalEvents.toLocaleString()} tone="info" />
          <StatCard label="Unique actors" value={uniqueActors.toString()} tone="info" />
          <StatCard label="Patients touched" value={uniquePatients.toString()} tone="info" />
          <StatCard
            label="Break-glass"
            value={breakGlassCount.toString()}
            tone={breakGlassCount > 0 ? "warning" : "info"}
          />
          <StatCard
            label="Rx overrides"
            value={contraindicationOverrides.toString()}
            tone={contraindicationOverrides > 0 ? "warning" : "info"}
          />
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Activity by action</CardTitle>
            <CardDescription>
              Distribution of every audit action in the selected window.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-1">Action</th>
                  <th className="py-1 text-right">Events</th>
                </tr>
              </thead>
              <tbody>
                {actionRows.map(([action, n]) => (
                  <tr key={action} className="border-b border-slate-100 last:border-0">
                    <td className="py-1.5 font-mono text-[12px]">
                      <Badge tone={tone(action)}>{action}</Badge>
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="print-page-break" />

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Event log</CardTitle>
            <CardDescription>
              Chronological record (newest first). Capped at 5,000 rows; refine
              the filters above to export a focused window for production.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <EmptyState
                title="No events"
                description="No audit events match the current filters."
              />
            ) : (
              <table className="w-full text-[12px]">
                <thead className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-1 pr-2">Timestamp (UTC)</th>
                    <th className="py-1 pr-2">Actor</th>
                    <th className="py-1 pr-2">Action</th>
                    <th className="py-1 pr-2">Subject</th>
                    <th className="py-1">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const md = (r.metadata as Record<string, unknown> | null) ?? {};
                    const detail = Object.entries(md)
                      .filter(([k]) => k !== "userAgent" && k !== "ipAddress")
                      .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
                      .join("; ");
                    return (
                      <tr
                        key={r.id}
                        className="border-b border-slate-100 align-top last:border-0"
                      >
                        <td className="py-1 pr-2 font-mono text-[11px] text-slate-700">
                          {r.createdAt.toISOString().replace("T", " ").slice(0, 19)}
                        </td>
                        <td className="py-1 pr-2 text-slate-800">
                          {formatActor(r.actorUserId, r.actorAgent)}
                        </td>
                        <td className="py-1 pr-2">
                          <span className="font-mono text-[11px]">{r.action}</span>
                        </td>
                        <td className="py-1 pr-2 text-slate-600">
                          {r.subjectType ? (
                            <>
                              <span className="text-slate-400">{r.subjectType}/</span>
                              {r.subjectId ?? "—"}
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-1 text-slate-600 break-all">{detail || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <footer className="mt-8 border-t border-slate-200 pt-4 text-[11px] text-slate-500">
          <p>
            This report is system-generated from immutable AuditLog records.
            Tampering with the underlying records would invalidate the
            integrity hash chain referenced in
            <code className="mx-1 rounded bg-slate-100 px-1 py-0.5">docs/compliance/encryption.md</code>.
            Treat this PDF as protected health information; redact patient
            identifiers before any external distribution.
          </p>
          <p className="mt-2 text-slate-400">
            Report ID {reportId} · Page generated {generatedAt.toISOString()}
          </p>
        </footer>
      </article>

      <div className="no-print mt-6 flex items-center justify-end gap-3 print:hidden">
        <p className="text-sm text-slate-500">
          Use your browser's print dialog (⌘P / Ctrl-P) and choose "Save as PDF".
        </p>
      </div>
    </PageShell>
  );
}
