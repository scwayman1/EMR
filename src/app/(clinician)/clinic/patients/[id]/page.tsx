import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sparkline } from "@/components/ui/sparkline";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/ornament";
import { formatDate, formatRelative } from "@/lib/utils/format";
import { ChartTabs, type TabKey } from "./chart-tabs";
import { startVisit } from "./actions";

interface PageProps {
  params: { id: string };
  searchParams: { tab?: string };
}

export default async function PatientChartPage({ params, searchParams }: PageProps) {
  const user = await requireUser();
  const tab = (searchParams.tab as TabKey) || "summary";

  const patient = await prisma.patient.findFirst({
    where: {
      id: params.id,
      organizationId: user.organizationId!,
      deletedAt: null,
    },
    include: {
      chartSummary: true,
      outcomeLogs: { orderBy: { loggedAt: "asc" }, take: 120 },
      encounters: {
        orderBy: { scheduledFor: "desc" },
        include: {
          notes: {
            include: { codingSuggestion: true },
            orderBy: { createdAt: "desc" },
          },
        },
      },
      documents: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
      },
      assessmentResponses: {
        include: { assessment: true },
        orderBy: { submittedAt: "desc" },
        take: 10,
      },
      messageThreads: {
        orderBy: { lastMessageAt: "desc" },
        take: 10,
        include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
      },
    },
  });

  if (!patient) notFound();

  // Outcome data by metric
  const pain = patient.outcomeLogs.filter((l) => l.metric === "pain").map((l) => l.value);
  const sleep = patient.outcomeLogs.filter((l) => l.metric === "sleep").map((l) => l.value);
  const anxiety = patient.outcomeLogs.filter((l) => l.metric === "anxiety").map((l) => l.value);
  const mood = patient.outcomeLogs.filter((l) => l.metric === "mood").map((l) => l.value);

  // All notes flattened
  const allNotes = patient.encounters.flatMap((e) =>
    e.notes.map((n) => ({ ...n, encounter: e }))
  );
  allNotes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Bound start visit action
  const startVisitWithPatient = startVisit.bind(null, params.id);

  // Latest metric values for the summary tile
  const latestMetric = (metric: string) => {
    const logs = patient.outcomeLogs.filter((l) => l.metric === metric);
    return logs.length > 0 ? logs[logs.length - 1].value : null;
  };

  const completenessScore = patient.chartSummary?.completenessScore ?? 0;

  return (
    <PageShell maxWidth="max-w-[1280px]">
      {/* ── Dossier header ────────────────────────────────── */}
      <Card tone="ambient" className="mb-8">
        <CardContent className="pt-8 pb-8">
          <div className="flex flex-wrap items-start gap-6">
            <Avatar firstName={patient.firstName} lastName={patient.lastName} size="lg" />
            <div className="flex-1 min-w-0">
              <Eyebrow className="mb-2">Patient chart</Eyebrow>
              <h1 className="font-display text-3xl text-text tracking-tight leading-tight">
                {patient.firstName} {patient.lastName}
              </h1>
              {patient.presentingConcerns && (
                <p className="text-[15px] text-text-muted mt-1.5 leading-relaxed max-w-xl">
                  {patient.presentingConcerns}
                </p>
              )}
              <div className="flex items-center gap-2 flex-wrap mt-3">
                <Badge tone="neutral">{patient.status}</Badge>
                {patient.qualificationStatus !== "unknown" && (
                  <Badge
                    tone={
                      patient.qualificationStatus === "qualified"
                        ? "success"
                        : patient.qualificationStatus === "pending"
                          ? "warning"
                          : patient.qualificationStatus === "ineligible"
                            ? "danger"
                            : "info"
                    }
                  >
                    {patient.qualificationStatus}
                  </Badge>
                )}
                <span className="text-xs text-text-subtle">
                  DOB {formatDate(patient.dateOfBirth)} · {patient.email ?? "No email"}
                </span>
              </div>

              {/* Chart readiness */}
              <div className="mt-4 max-w-xs">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-text-subtle">Chart readiness</span>
                  <Badge tone="accent">{completenessScore}%</Badge>
                </div>
                <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-accent to-accent-strong rounded-full transition-all duration-500"
                    style={{ width: `${completenessScore}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex items-center gap-2 shrink-0 pt-1">
              <Link
                href={
                  patient.messageThreads[0]
                    ? `/clinic/messages?thread=${patient.messageThreads[0].id}`
                    : "/clinic/messages"
                }
              >
                <Button variant="secondary" size="sm">
                  Message
                </Button>
              </Link>
              <Link href={`/clinic/patients/${params.id}?tab=documents`}>
                <Button variant="secondary" size="sm">
                  View records
                </Button>
              </Link>
              <form action={startVisitWithPatient}>
                <Button type="submit" size="sm">
                  Start visit
                </Button>
              </form>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Tab bar ───────────────────────────────────────── */}
      <ChartTabs patientId={params.id} />

      {/* ── Tab content ───────────────────────────────────── */}
      {tab === "summary" && (
        <SummaryTab
          patient={patient}
          pain={pain}
          sleep={sleep}
          latestPain={latestMetric("pain")}
          latestSleep={latestMetric("sleep")}
          latestAnxiety={latestMetric("anxiety")}
          latestMood={latestMetric("mood")}
        />
      )}
      {tab === "timeline" && <TimelineTab patient={patient} />}
      {tab === "notes" && <NotesTab notes={allNotes} patientId={params.id} startVisitAction={startVisitWithPatient} />}
      {tab === "documents" && <DocumentsTab documents={patient.documents} />}
      {tab === "outcomes" && (
        <OutcomesTab
          outcomeLogs={patient.outcomeLogs}
          pain={pain}
          sleep={sleep}
          anxiety={anxiety}
          mood={mood}
        />
      )}
    </PageShell>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Summary tab
   ═══════════════════════════════════════════════════════════════════ */
function SummaryTab({
  patient,
  pain,
  sleep,
  latestPain,
  latestSleep,
  latestAnxiety,
  latestMood,
}: {
  patient: any;
  pain: number[];
  sleep: number[];
  latestPain: number | null;
  latestSleep: number | null;
  latestAnxiety: number | null;
  latestMood: number | null;
}) {
  return (
    <div className="space-y-6">
      {/* Missing fields callout */}
      {patient.chartSummary &&
        patient.chartSummary.missingFields.length > 0 && (
          <Card tone="outlined">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-highlight-soft flex items-center justify-center shrink-0 mt-0.5">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[color:var(--highlight)]">
                    <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM8 5v3.5m0 2h.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-text">
                    Missing chart information
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    {patient.chartSummary.missingFields.join(", ")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      {/* Chart summary */}
      <Card>
        <CardHeader>
          <CardTitle>Chart Summary</CardTitle>
          <CardDescription>
            Generated by the intake agent. Refreshed on every intake update.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {patient.chartSummary ? (
            <div className="prose-clinical whitespace-pre-wrap">
              {patient.chartSummary.summaryMd}
            </div>
          ) : (
            <p className="text-sm text-text-muted">
              No chart summary yet. It will be generated as intake is completed.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Metric tiles 2x2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricTile label="Pain" value={latestPain} unit="/10" />
        <MetricTile label="Sleep" value={latestSleep} unit="/10" />
        <MetricTile label="Anxiety" value={latestAnxiety} unit="/10" />
        <MetricTile label="Mood" value={latestMood} unit="/10" />
      </div>

      {/* Sparkline trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pain trend</CardTitle>
          </CardHeader>
          <CardContent>
            <Sparkline data={pain.length > 1 ? pain : [0, 0]} width={400} height={80} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sleep trend</CardTitle>
          </CardHeader>
          <CardContent>
            <Sparkline
              data={sleep.length > 1 ? sleep : [0, 0]}
              width={400}
              height={80}
              color="var(--highlight)"
              fill="var(--highlight-soft)"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null;
  unit: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-5 text-center">
        <p className="text-xs text-text-subtle uppercase tracking-wider mb-1">{label}</p>
        <p className="font-display text-2xl text-text tracking-tight">
          {value !== null ? value.toFixed(1) : "—"}
          <span className="text-sm text-text-muted font-sans ml-0.5">{value !== null ? unit : ""}</span>
        </p>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Timeline tab
   ═══════════════════════════════════════════════════════════════════ */
function TimelineTab({ patient }: { patient: any }) {
  // Build a unified timeline from encounters, documents, messages, and outcome logs
  type TimelineItem = {
    type: "encounter" | "document" | "message" | "outcome";
    date: Date;
    title: string;
    description?: string;
    id: string;
  };

  const items: TimelineItem[] = [];

  for (const e of patient.encounters) {
    items.push({
      type: "encounter",
      date: new Date(e.scheduledFor ?? e.createdAt),
      title: `${e.modality} visit`,
      description: `${e.status}${e.reason ? ` — ${e.reason}` : ""}${
        e.notes.length > 0 ? ` · ${e.notes.length} note${e.notes.length > 1 ? "s" : ""}` : ""
      }`,
      id: e.id,
    });
  }

  for (const d of patient.documents) {
    items.push({
      type: "document",
      date: new Date(d.createdAt),
      title: d.originalName,
      description: `${d.kind} · ${formatFileSize(d.sizeBytes)}`,
      id: d.id,
    });
  }

  for (const t of patient.messageThreads) {
    items.push({
      type: "message",
      date: new Date(t.lastMessageAt),
      title: t.subject,
      description: t.messages[0]?.body?.slice(0, 80) ?? undefined,
      id: t.id,
    });
  }

  // Recent outcome logs (last 10 unique dates)
  const recentLogs = patient.outcomeLogs.slice(-10);
  const logDates = new Set<string>();
  for (const log of recentLogs) {
    const dateStr = new Date(log.loggedAt).toDateString();
    if (!logDates.has(dateStr)) {
      logDates.add(dateStr);
      items.push({
        type: "outcome",
        date: new Date(log.loggedAt),
        title: `Outcome logged`,
        description: `${log.metric}: ${log.value.toFixed(1)}/10`,
        id: log.id,
      });
    }
  }

  items.sort((a, b) => b.date.getTime() - a.date.getTime());

  const dotColor: Record<string, string> = {
    encounter: "bg-accent",
    document: "bg-[color:var(--highlight)]",
    message: "bg-info",
    outcome: "bg-[color:var(--success)]",
  };

  const typeLabel: Record<string, string> = {
    encounter: "Visit",
    document: "Document",
    message: "Message",
    outcome: "Outcome",
  };

  const badgeTone: Record<string, "accent" | "highlight" | "info" | "success"> = {
    encounter: "accent",
    document: "highlight",
    message: "info",
    outcome: "success",
  };

  return (
    <div>
      {items.length === 0 ? (
        <Card>
          <CardContent className="pt-6 pb-6 text-center">
            <p className="text-sm text-text-muted">No timeline events yet.</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-0">
          {items.map((item, i) => (
            <li key={`${item.type}-${item.id}`} className="flex gap-4">
              <div className="w-28 shrink-0 text-xs text-text-subtle tabular-nums pt-1.5 text-right">
                {formatRelative(item.date)}
              </div>
              <div className="flex flex-col items-center">
                <div className={`h-3 w-3 rounded-full ${dotColor[item.type]} ring-4 ring-surface shrink-0 mt-1.5`} />
                {i < items.length - 1 && (
                  <div className="w-px flex-1 bg-border min-h-[2rem]" />
                )}
              </div>
              <div className="flex-1 min-w-0 pb-6">
                <div className="flex items-center gap-2 mb-0.5">
                  <Badge tone={badgeTone[item.type]} className="text-[10px]">
                    {typeLabel[item.type]}
                  </Badge>
                  <p className="text-sm font-medium text-text truncate">
                    {item.title}
                  </p>
                </div>
                {item.description && (
                  <p className="text-xs text-text-muted mt-0.5 line-clamp-2">
                    {item.description}
                  </p>
                )}
                <p className="text-[11px] text-text-subtle mt-1">
                  {formatDate(item.date)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Notes tab
   ═══════════════════════════════════════════════════════════════════ */
function NotesTab({
  notes,
  patientId,
  startVisitAction,
}: {
  notes: any[];
  patientId: string;
  startVisitAction: () => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-display text-xl text-text tracking-tight">
          Clinical Notes
        </h2>
        <form action={startVisitAction}>
          <Button type="submit" size="sm">
            Draft a note
          </Button>
        </form>
      </div>

      {notes.length === 0 ? (
        <Card>
          <CardContent className="pt-6 pb-6 text-center">
            <p className="text-sm text-text-muted">
              No notes yet. Start a visit to draft the first note.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <Link
              key={note.id}
              href={`/clinic/patients/${patientId}/notes/${note.id}`}
              className="block"
            >
              <Card className="card-hover">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          tone={
                            note.status === "finalized"
                              ? "success"
                              : note.status === "needs_review"
                                ? "warning"
                                : "neutral"
                          }
                        >
                          {note.status}
                        </Badge>
                        {note.aiDrafted && (
                          <Badge tone="highlight">AI-drafted</Badge>
                        )}
                        {note.aiConfidence !== null && (
                          <span className="text-[11px] text-text-subtle">
                            {Math.round(note.aiConfidence * 100)}% confidence
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-text">
                        {note.encounter.modality} visit note
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {note.encounter.reason ?? "General visit"} ·{" "}
                        {formatDate(note.encounter.scheduledFor ?? note.encounter.createdAt)}
                      </p>
                      {/* Preview first block */}
                      {Array.isArray(note.blocks) && note.blocks.length > 0 && (
                        <p className="text-xs text-text-subtle mt-2 line-clamp-2">
                          {(note.blocks[0] as any).heading}: {(note.blocks[0] as any).body?.slice(0, 120)}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-text-subtle tabular-nums shrink-0">
                      {formatDate(note.createdAt)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Documents tab
   ═══════════════════════════════════════════════════════════════════ */
function DocumentsTab({ documents }: { documents: any[] }) {
  return (
    <div>
      <h2 className="font-display text-xl text-text tracking-tight mb-4">
        Documents
      </h2>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="pt-6 pb-6 text-center">
            <p className="text-sm text-text-muted">No documents uploaded yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-2 pb-2">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs text-text-subtle font-medium uppercase tracking-wider py-3 px-2">
                    Document
                  </th>
                  <th className="text-left text-xs text-text-subtle font-medium uppercase tracking-wider py-3 px-2">
                    Kind
                  </th>
                  <th className="text-left text-xs text-text-subtle font-medium uppercase tracking-wider py-3 px-2">
                    Classification
                  </th>
                  <th className="text-right text-xs text-text-subtle font-medium uppercase tracking-wider py-3 px-2">
                    Size
                  </th>
                  <th className="text-right text-xs text-text-subtle font-medium uppercase tracking-wider py-3 px-2">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-surface-muted/50 transition-colors">
                    <td className="py-3 px-2">
                      <p className="text-sm text-text font-medium truncate max-w-[240px]">
                        {doc.originalName}
                      </p>
                      <p className="text-[11px] text-text-subtle">{doc.mimeType}</p>
                    </td>
                    <td className="py-3 px-2">
                      <Badge
                        tone={doc.kind === "unclassified" ? "neutral" : "accent"}
                      >
                        {doc.kind}
                      </Badge>
                    </td>
                    <td className="py-3 px-2">
                      {doc.aiClassified ? (
                        <Badge tone="success">AI classified</Badge>
                      ) : doc.needsReview ? (
                        <Badge tone="warning">Needs review</Badge>
                      ) : (
                        <Badge tone="neutral">Pending</Badge>
                      )}
                    </td>
                    <td className="py-3 px-2 text-right text-xs text-text-subtle tabular-nums">
                      {formatFileSize(doc.sizeBytes)}
                    </td>
                    <td className="py-3 px-2 text-right text-xs text-text-subtle tabular-nums">
                      {formatDate(doc.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Outcomes tab
   ═══════════════════════════════════════════════════════════════════ */
function OutcomesTab({
  outcomeLogs,
  pain,
  sleep,
  anxiety,
  mood,
}: {
  outcomeLogs: any[];
  pain: number[];
  sleep: number[];
  anxiety: number[];
  mood: number[];
}) {
  const energy = outcomeLogs.filter((l: any) => l.metric === "energy").map((l: any) => l.value);
  const appetite = outcomeLogs.filter((l: any) => l.metric === "appetite").map((l: any) => l.value);

  const sparklines: { label: string; data: number[]; color?: string; fill?: string }[] = [
    { label: "Pain", data: pain },
    { label: "Sleep", data: sleep, color: "var(--highlight)", fill: "var(--highlight-soft)" },
    { label: "Anxiety", data: anxiety, color: "var(--info)", fill: "rgba(46, 91, 140, 0.1)" },
    { label: "Mood", data: mood, color: "var(--success)", fill: "rgba(58, 133, 96, 0.1)" },
    { label: "Energy", data: energy, color: "var(--highlight)", fill: "var(--highlight-soft)" },
    { label: "Appetite", data: appetite },
  ];

  // Recent logs for the table
  const recentLogs = [...outcomeLogs].reverse().slice(0, 30);

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl text-text tracking-tight">
        Outcome Trends
      </h2>

      {/* Full-size sparkline charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sparklines.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-1">
              <CardTitle className="text-base">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <Sparkline
                data={s.data.length > 1 ? s.data : [0, 0]}
                width={320}
                height={80}
                color={s.color}
                fill={s.fill}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent outcome logs table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Outcome Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <p className="text-sm text-text-muted">No outcome logs recorded yet.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs text-text-subtle font-medium uppercase tracking-wider py-2 px-2">
                    Date
                  </th>
                  <th className="text-left text-xs text-text-subtle font-medium uppercase tracking-wider py-2 px-2">
                    Metric
                  </th>
                  <th className="text-right text-xs text-text-subtle font-medium uppercase tracking-wider py-2 px-2">
                    Value
                  </th>
                  <th className="text-left text-xs text-text-subtle font-medium uppercase tracking-wider py-2 px-2">
                    Note
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {recentLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-surface-muted/50 transition-colors">
                    <td className="py-2 px-2 text-xs text-text-subtle tabular-nums">
                      {formatDate(log.loggedAt)}
                    </td>
                    <td className="py-2 px-2">
                      <Badge tone="neutral">{log.metric}</Badge>
                    </td>
                    <td className="py-2 px-2 text-right text-sm text-text tabular-nums font-medium">
                      {log.value.toFixed(1)}
                    </td>
                    <td className="py-2 px-2 text-xs text-text-muted truncate max-w-[200px]">
                      {log.note ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Utilities
   ═══════════════════════════════════════════════════════════════════ */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
