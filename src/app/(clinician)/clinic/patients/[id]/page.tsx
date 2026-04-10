import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sparkline } from "@/components/ui/sparkline";
import { MetricTile } from "@/components/ui/metric-tile";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow, LeafSprig } from "@/components/ui/ornament";
import { formatDate, formatRelative } from "@/lib/utils/format";
import { ChartTabs, type TabKey } from "./chart-tabs";
import { CorrespondenceTab, type SerializedThread } from "./correspondence-tab";
import { startVisit } from "./actions";
import { checkInteractions, getSeverityLabel, type DrugInteraction } from "@/lib/domain/drug-interactions";
import { InteractionBadge } from "@/components/ui/interaction-badge";

/* ── Types ────────────────────────────────────────────────────── */

interface PageProps {
  params: { id: string };
  searchParams: { tab?: string };
}

/* ═══════════════════════════════════════════════════════════════════
   Page component — server-side data fetch + render
   ═══════════════════════════════════════════════════════════════════ */

export default async function PatientChartPage({ params, searchParams }: PageProps) {
  const user = await requireUser();
  const tab = (searchParams.tab as TabKey) || "records";

  /* ── Parallel data fetch ──────────────────────────────────── */
  const [patient, allNotes, threads, assessmentResponses, dosingRegimens, recentDoseLogs, cannabisProducts, patientMedications] = await Promise.all([
    prisma.patient.findFirst({
      where: {
        id: params.id,
        organizationId: user.organizationId!,
        deletedAt: null,
      },
      include: {
        chartSummary: true,
        documents: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
        },
        encounters: {
          orderBy: { scheduledFor: "desc" },
          include: {
            notes: {
              include: { codingSuggestion: true },
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    }),
    // Flatten notes via encounters (separate query to keep the patient query lean)
    prisma.note.findMany({
      where: {
        encounter: {
          patientId: params.id,
          organization: { id: user.organizationId! },
        },
      },
      include: {
        encounter: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.messageThread.findMany({
      where: { patientId: params.id },
      orderBy: { lastMessageAt: "desc" },
      take: 20,
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          include: {
            sender: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
    prisma.assessmentResponse.findMany({
      where: { patientId: params.id },
      include: { assessment: true },
      orderBy: { submittedAt: "desc" },
    }),
    // Cannabis dosing regimens with product info
    prisma.dosingRegimen.findMany({
      where: { patientId: params.id },
      include: { product: true },
      orderBy: { startDate: "desc" },
    }),
    // Recent dose logs
    prisma.doseLog.findMany({
      where: { patientId: params.id },
      include: { regimen: { include: { product: true } } },
      orderBy: { loggedAt: "desc" },
      take: 10,
    }),
    // Organization's cannabis product formulary
    prisma.cannabisProduct.findMany({
      where: { organizationId: user.organizationId!, active: true },
      orderBy: { name: "asc" },
    }),
    // Patient's conventional medications
    prisma.patientMedication.findMany({
      where: { patientId: params.id, active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!patient) notFound();

  /* ── Partition documents ──────────────────────────────────── */
  const recordDocs = patient.documents.filter(
    (d) => d.kind !== "image" && d.kind !== "lab"
  );
  const imageDocs = patient.documents.filter((d) => d.kind === "image");
  const labDocs = patient.documents.filter((d) => d.kind === "lab");

  /* ── Tab counts ───────────────────────────────────────────── */
  const activeRegimens = dosingRegimens.filter((r: any) => r.active);

  const counts = {
    records: recordDocs.length,
    images: imageDocs.length,
    labs: labDocs.length + assessmentResponses.length,
    notes: allNotes.length,
    correspondence: threads.length,
    rx: activeRegimens.length,
  };

  /* ── Bound start visit action ─────────────────────────────── */
  const startVisitWithPatient = startVisit.bind(null, params.id);

  const completenessScore = patient.chartSummary?.completenessScore ?? 0;

  /* ── Serialize threads for client component ───────────────── */
  const serializedThreads: SerializedThread[] = threads.map((t) => ({
    id: t.id,
    subject: t.subject,
    lastMessageAt: t.lastMessageAt.toISOString(),
    messages: t.messages.map((m) => ({
      id: m.id,
      body: m.body,
      status: m.status,
      aiDrafted: m.aiDrafted,
      senderUserId: m.senderUserId,
      senderAgent: m.senderAgent,
      sender: m.sender
        ? { firstName: m.sender.firstName, lastName: m.sender.lastName }
        : null,
      createdAt: m.createdAt.toISOString(),
    })),
  }));

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
                  DOB {formatDate(patient.dateOfBirth)} &middot; {patient.email ?? "No email"}
                </span>
              </div>

              {/* Chart readiness bar */}
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

            {/* Quick actions — no Message button (correspondence is now a tab) */}
            <div className="flex items-center gap-2 shrink-0 pt-1">
              <Link href={`/clinic/patients/${params.id}?tab=records`}>
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
      <ChartTabs patientId={params.id} counts={counts} />

      {/* ── Tab content ───────────────────────────────────── */}
      {tab === "records" && <RecordsTab documents={recordDocs} />}
      {tab === "images" && <ImagesTab documents={imageDocs} />}
      {tab === "labs" && (
        <LabsTab
          labDocuments={labDocs}
          assessmentResponses={assessmentResponses}
        />
      )}
      {tab === "notes" && (
        <NotesTab
          notes={allNotes}
          patientId={params.id}
          startVisitAction={startVisitWithPatient}
        />
      )}
      {tab === "correspondence" && (
        <CorrespondenceTab
          threads={serializedThreads}
          currentUserId={user.id}
          patientFirstName={patient.firstName}
          patientLastName={patient.lastName}
        />
      )}
      {tab === "rx" && (
        <CannabisRxTab
          regimens={dosingRegimens}
          doseLogs={recentDoseLogs}
          products={cannabisProducts}
          medications={patientMedications}
          patientId={params.id}
        />
      )}
    </PageShell>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Records tab
   ═══════════════════════════════════════════════════════════════════ */

function RecordsTab({ documents }: { documents: any[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-display text-xl text-text tracking-tight">
          Records
        </h2>
        <Button variant="secondary" size="sm">
          Upload
        </Button>
      </div>

      {documents.length === 0 ? (
        <EmptyState
          title="No records on file yet"
          description="Upload clinical documents, diagnoses, letters, and other records to build this patient's chart."
        />
      ) : (
        <div className="grid gap-3">
          {documents.map((doc) => (
            <Card key={doc.id} tone="raised" className="card-hover">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <Badge
                        tone={
                          doc.kind === "unclassified"
                            ? "neutral"
                            : doc.kind === "diagnosis"
                              ? "warning"
                              : doc.kind === "letter"
                                ? "info"
                                : "accent"
                        }
                      >
                        {doc.kind}
                      </Badge>
                      {doc.aiClassified ? (
                        <Badge tone="success">AI classified</Badge>
                      ) : doc.needsReview ? (
                        <Badge tone="warning">Needs review</Badge>
                      ) : (
                        <Badge tone="neutral">Pending</Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium text-text truncate">
                      {doc.originalName}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {doc.mimeType} &middot; {formatFileSize(doc.sizeBytes)}
                    </p>
                    {doc.tags.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {doc.tags.map((tag: string) => (
                          <span
                            key={tag}
                            className="text-[10px] text-text-subtle bg-surface-muted px-2 py-0.5 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-text-subtle tabular-nums shrink-0 text-right">
                    <span className="font-display">{formatDate(doc.createdAt)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Images tab
   ═══════════════════════════════════════════════════════════════════ */

function ImagesTab({ documents }: { documents: any[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-display text-xl text-text tracking-tight">
          Images
        </h2>
        <Button variant="secondary" size="sm">
          Upload image
        </Button>
      </div>

      {documents.length === 0 ? (
        <EmptyState
          title="No images uploaded"
          description="Medical images, X-rays, photos, and scans will appear here once uploaded."
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {documents.map((doc) => (
            <Card key={doc.id} tone="raised" className="card-hover overflow-hidden">
              {/* Thumbnail placeholder */}
              <div className="aspect-square bg-surface-muted flex flex-col items-center justify-center p-4 rounded-t-xl">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-text-subtle mb-2"
                >
                  <rect
                    x="3"
                    y="3"
                    width="18"
                    height="18"
                    rx="3"
                    stroke="currentColor"
                    strokeWidth="1.3"
                  />
                  <circle cx="8.5" cy="8.5" r="2" stroke="currentColor" strokeWidth="1.2" />
                  <path
                    d="M3 16l4.5-4.5a2 2 0 012.8 0L15 16"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M14 15l1.5-1.5a2 2 0 012.8 0L21 16"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="text-[11px] text-text-subtle text-center truncate max-w-full">
                  {doc.mimeType}
                </p>
              </div>
              <CardContent className="pt-3 pb-3">
                <p className="text-sm font-medium text-text truncate">
                  {doc.originalName}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {formatFileSize(doc.sizeBytes)} &middot;{" "}
                  <span className="font-display">{formatDate(doc.createdAt)}</span>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* DICOM banner */}
      <Card tone="outlined" className="mt-6">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent-soft flex items-center justify-center shrink-0">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                className="text-accent"
              >
                <path
                  d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-text">
                DICOM viewer coming soon
              </p>
              <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                Images will be viewable directly in the chart without a separate PACS system.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Labs tab
   ═══════════════════════════════════════════════════════════════════ */

function LabsTab({
  labDocuments,
  assessmentResponses,
}: {
  labDocuments: any[];
  assessmentResponses: any[];
}) {
  // Group assessment responses by assessment slug for sparklines
  const assessmentsBySlug: Record<
    string,
    { title: string; responses: { score: number | null; date: Date; interpretation: string | null }[] }
  > = {};

  for (const resp of assessmentResponses) {
    const slug = resp.assessment.slug;
    if (!assessmentsBySlug[slug]) {
      assessmentsBySlug[slug] = {
        title: resp.assessment.title,
        responses: [],
      };
    }
    assessmentsBySlug[slug].responses.push({
      score: resp.score,
      date: resp.submittedAt,
      interpretation: resp.interpretation,
    });
  }

  // Reverse to get chronological order for sparklines
  for (const slug of Object.keys(assessmentsBySlug)) {
    assessmentsBySlug[slug].responses.reverse();
  }

  const interpretationTone = (interp: string | null): "success" | "warning" | "danger" | "neutral" => {
    if (!interp) return "neutral";
    const lower = interp.toLowerCase();
    if (lower.includes("severe") || lower.includes("high")) return "danger";
    if (lower.includes("moderate") || lower.includes("mild")) return "warning";
    if (lower.includes("none") || lower.includes("minimal") || lower.includes("normal") || lower.includes("low"))
      return "success";
    return "neutral";
  };

  return (
    <div className="space-y-8">
      {/* ── Assessment scores section ────────────────────── */}
      <section>
        <h2 className="font-display text-xl text-text tracking-tight mb-4">
          Assessment Scores
        </h2>

        {Object.keys(assessmentsBySlug).length === 0 ? (
          <Card tone="outlined">
            <CardContent className="pt-5 pb-5 text-center">
              <p className="text-sm text-text-muted">
                No assessment responses recorded yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {Object.entries(assessmentsBySlug).map(([slug, data]) => {
              const latest = data.responses[data.responses.length - 1];
              const scores = data.responses
                .map((r) => r.score)
                .filter((s): s is number => s !== null);

              return (
                <Card key={slug} tone="raised">
                  <CardContent className="pt-5 pb-5">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-display text-lg font-medium text-text">
                            {data.title}
                          </h3>
                          {latest?.interpretation && (
                            <Badge tone={interpretationTone(latest.interpretation)}>
                              {latest.interpretation}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                          {latest?.score !== null && latest?.score !== undefined && (
                            <span className="font-display text-2xl text-text tabular-nums">
                              {latest.score}
                            </span>
                          )}
                          <span className="text-xs text-text-subtle">
                            Latest &middot; {formatDate(latest?.date)}
                          </span>
                        </div>
                        <p className="text-xs text-text-subtle mt-1">
                          {data.responses.length} response{data.responses.length !== 1 ? "s" : ""} recorded
                        </p>
                      </div>

                      {/* Sparkline trend */}
                      {scores.length >= 2 && (
                        <div className="shrink-0">
                          <Sparkline
                            data={scores}
                            width={180}
                            height={48}
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Lab documents section ────────────────────────── */}
      <section>
        <h2 className="font-display text-xl text-text tracking-tight mb-4">
          Lab Documents
        </h2>

        {labDocuments.length === 0 ? (
          <Card tone="outlined">
            <CardContent className="pt-5 pb-5 text-center">
              <p className="text-sm text-text-muted">
                No lab documents uploaded yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {labDocuments.map((doc) => (
              <Card key={doc.id} tone="raised" className="card-hover">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge tone="accent">lab</Badge>
                        {doc.aiClassified ? (
                          <Badge tone="success">AI classified</Badge>
                        ) : doc.needsReview ? (
                          <Badge tone="warning">Needs review</Badge>
                        ) : (
                          <Badge tone="neutral">Pending</Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium text-text truncate">
                        {doc.originalName}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {doc.mimeType} &middot; {formatFileSize(doc.sizeBytes)}
                      </p>
                      {doc.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {doc.tags.map((tag: string) => (
                            <span
                              key={tag}
                              className="text-[10px] text-text-subtle bg-surface-muted px-2 py-0.5 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-text-subtle tabular-nums shrink-0 text-right">
                      <span className="font-display">{formatDate(doc.createdAt)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
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
        <EmptyState
          title="No clinical notes yet"
          description="Start a visit to generate the first draft. The AI scribe will create structured notes from the encounter."
        />
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <Link
              key={note.id}
              href={`/clinic/patients/${patientId}/notes/${note.id}`}
              className="block"
            >
              <Card tone="raised" className="card-hover">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
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
                          <Badge tone="highlight">AI Draft</Badge>
                        )}
                        {note.aiDrafted && note.aiConfidence !== null && (
                          <span className="text-[11px] text-text-subtle tabular-nums">
                            {Math.round(note.aiConfidence * 100)}% confidence
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-text">
                        {note.encounter.modality} visit note
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {note.encounter.reason ?? "General visit"} &middot;{" "}
                        {formatDate(note.encounter.scheduledFor ?? note.encounter.createdAt)}
                      </p>
                      {/* Preview first block for finalized notes */}
                      {note.status === "finalized" &&
                        Array.isArray(note.blocks) &&
                        note.blocks.length > 0 && (
                          <p className="text-xs text-text-subtle mt-2 line-clamp-2">
                            {(note.blocks[0] as any).heading}:{" "}
                            {(note.blocks[0] as any).body?.slice(0, 120)}
                          </p>
                        )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-display text-xs text-text-subtle tabular-nums">
                        {formatDate(note.createdAt)}
                      </span>
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
   Cannabis Rx tab
   ═══════════════════════════════════════════════════════════════════ */

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  oil: "Oil",
  tincture: "Tincture",
  capsule: "Capsule",
  flower: "Flower",
  vape_cartridge: "Vape",
  edible: "Edible",
  topical: "Topical",
  suppository: "Suppository",
  spray: "Spray",
  other: "Other",
};

const ROUTE_LABELS: Record<string, string> = {
  oral: "Oral",
  sublingual: "Sublingual",
  inhalation: "Inhalation",
  topical: "Topical",
  rectal: "Rectal",
  vaginal: "Vaginal",
};

function formatRatio(thc: number | null, cbd: number | null): string | null {
  if (thc == null || cbd == null || (thc === 0 && cbd === 0)) return null;
  if (cbd === 0) return `${thc}:0 THC:CBD`;
  if (thc === 0) return `0:${cbd} THC:CBD`;
  // Normalize to smallest
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const d = gcd(Math.round(thc * 10), Math.round(cbd * 10));
  const r1 = Math.round((thc * 10) / d);
  const r2 = Math.round((cbd * 10) / d);
  return `${r1}:${r2}`;
}

function CannabisRxTab({
  regimens,
  doseLogs,
  products,
  medications,
  patientId,
}: {
  regimens: any[];
  doseLogs: any[];
  products: any[];
  medications: any[];
  patientId: string;
}) {
  const activeRegimens = regimens.filter((r) => r.active);
  const inactiveRegimens = regimens.filter((r) => !r.active);

  // Daily totals across active regimens
  const totalThcPerDay = activeRegimens.reduce(
    (sum: number, r: any) => sum + (r.calculatedThcMgPerDay ?? 0),
    0
  );
  const totalCbdPerDay = activeRegimens.reduce(
    (sum: number, r: any) => sum + (r.calculatedCbdMgPerDay ?? 0),
    0
  );

  // Extract cannabinoids from active regimens
  const cannabinoids = new Set<string>();
  for (const regimen of activeRegimens) {
    const product = regimen.product;
    if (product) {
      if (product.thcConcentration && product.thcConcentration > 0) cannabinoids.add("THC");
      if (product.cbdConcentration && product.cbdConcentration > 0) cannabinoids.add("CBD");
      if (product.cbnConcentration && product.cbnConcentration > 0) cannabinoids.add("CBN");
      if (product.cbgConcentration && product.cbgConcentration > 0) cannabinoids.add("CBG");
    }
  }

  // Check interactions between patient medications and cannabinoids
  const medNames = medications.map((m: any) => m.name);
  const interactions = checkInteractions(medNames, Array.from(cannabinoids));
  const redInteractions = interactions.filter((i) => i.severity === "red");
  const yellowInteractions = interactions.filter((i) => i.severity === "yellow");
  const greenInteractions = interactions.filter((i) => i.severity === "green");

  if (regimens.length === 0 && doseLogs.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display text-xl text-text tracking-tight">
            Cannabis Rx
          </h2>
          <Link href={`/clinic/patients/${patientId}/prescribe`}>
            <Button variant="primary" size="sm">
              New prescription
            </Button>
          </Link>
        </div>
        <EmptyState
          title="No cannabis prescriptions on file"
          description="Create one to begin structured dosing. You can select from your organization's product formulary and set precise mg-based regimens."
        />

        {/* Still show formulary even with no regimens */}
        {products.length > 0 && (
          <ProductFormulary products={products} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-display text-xl text-text tracking-tight">
          Cannabis Rx
        </h2>
        <Link href={`/clinic/patients/${patientId}/prescribe`}>
          <Button variant="primary" size="sm">
            New prescription
          </Button>
        </Link>
      </div>

      {/* ── Daily dosing summary ──────────────────────────── */}
      {activeRegimens.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricTile
            label="Total THC / day"
            value={`${totalThcPerDay.toFixed(1)} mg`}
            accent="forest"
            hint="Sum across all active regimens"
          />
          <MetricTile
            label="Total CBD / day"
            value={`${totalCbdPerDay.toFixed(1)} mg`}
            accent="amber"
            hint="Sum across all active regimens"
          />
          <MetricTile
            label="Active regimens"
            value={activeRegimens.length}
            accent="none"
            hint={inactiveRegimens.length > 0 ? `${inactiveRegimens.length} discontinued` : undefined}
          />
        </div>
      )}

      {/* ── Drug interaction check ──────────────────────────── */}
      {interactions.length > 0 && (
        <section>
          {/* Red alert banner */}
          {redInteractions.length > 0 && (
            <div className="rounded-xl border-2 border-red-300 bg-red-50 p-5 mb-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--danger)] text-white text-xs font-bold" aria-hidden="true">!</span>
                <h3 className="font-display text-lg font-medium text-danger tracking-tight">
                  Drug Interaction Alert
                </h3>
              </div>
              <div className="space-y-3">
                {redInteractions.map((interaction, i) => (
                  <div key={`red-${i}`} className="rounded-lg bg-white/70 border border-red-200 p-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="font-medium text-text text-sm">
                        {interaction.drug.charAt(0).toUpperCase() + interaction.drug.slice(1)} + {interaction.cannabinoid}
                      </p>
                      <InteractionBadge severity="red" />
                    </div>
                    <p className="text-sm text-text-muted leading-relaxed mb-1.5">
                      {interaction.mechanism}
                    </p>
                    <p className="text-xs text-danger font-medium">
                      {interaction.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Yellow and green interactions */}
          {(yellowInteractions.length > 0 || greenInteractions.length > 0) && (
            <Card tone="raised" className="mb-4">
              <CardHeader>
                <CardTitle className="text-base">
                  Interaction check
                </CardTitle>
                <CardDescription>
                  {medications.length} medication{medications.length !== 1 ? "s" : ""} checked against {cannabinoids.size} cannabinoid{cannabinoids.size !== 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="divide-y divide-border/50">
                  {yellowInteractions.map((interaction, i) => (
                    <div key={`yellow-${i}`} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <p className="font-medium text-text text-sm">
                          {interaction.drug.charAt(0).toUpperCase() + interaction.drug.slice(1)} + {interaction.cannabinoid}
                        </p>
                        <InteractionBadge severity="yellow" />
                      </div>
                      <p className="text-sm text-text-muted leading-relaxed mb-1">
                        {interaction.mechanism}
                      </p>
                      <p className="text-xs text-[color:var(--highlight-hover)] font-medium">
                        {interaction.recommendation}
                      </p>
                    </div>
                  ))}
                  {greenInteractions.map((interaction, i) => (
                    <div key={`green-${i}`} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <p className="font-medium text-text text-sm">
                          {interaction.drug.charAt(0).toUpperCase() + interaction.drug.slice(1)} + {interaction.cannabinoid}
                        </p>
                        <InteractionBadge severity="green" />
                      </div>
                      <p className="text-sm text-text-muted leading-relaxed">
                        {interaction.mechanism}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* ── Active regimen cards ──────────────────────────── */}
      {activeRegimens.length > 0 && (
        <section>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent mb-3">
            Active regimens
          </p>
          <div className="space-y-4">
            {activeRegimens.map((regimen: any) => (
              <RegimenCard key={regimen.id} regimen={regimen} />
            ))}
          </div>
        </section>
      )}

      {/* ── Discontinued regimens (collapsed) ─────────────── */}
      {inactiveRegimens.length > 0 && (
        <section>
          <details className="group">
            <summary className="cursor-pointer text-[11px] font-medium uppercase tracking-[0.16em] text-text-subtle mb-3 select-none hover:text-text transition-colors">
              Discontinued regimens ({inactiveRegimens.length})
              <span className="ml-1 text-[10px] group-open:rotate-90 inline-block transition-transform">&rsaquo;</span>
            </summary>
            <div className="space-y-4">
              {inactiveRegimens.map((regimen: any) => (
                <RegimenCard key={regimen.id} regimen={regimen} />
              ))}
            </div>
          </details>
        </section>
      )}

      {/* ── Recent dose logs ──────────────────────────────── */}
      {doseLogs.length > 0 && (
        <section>
          <h3 className="font-display text-lg text-text tracking-tight mb-4">
            Recent dose logs
          </h3>
          <Card tone="raised">
            <CardContent className="pt-0 pb-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60">
                      <th className="text-left py-3 pr-4 text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                        Date
                      </th>
                      <th className="text-left py-3 pr-4 text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                        Product
                      </th>
                      <th className="text-right py-3 pr-4 text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                        Volume
                      </th>
                      <th className="text-right py-3 pr-4 text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
                        THC mg
                      </th>
                      <th className="text-right py-3 pr-4 text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--highlight)]">
                        CBD mg
                      </th>
                      <th className="text-left py-3 text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {doseLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-surface-muted/40 transition-colors">
                        <td className="py-3 pr-4 text-text-muted tabular-nums whitespace-nowrap font-display text-xs">
                          {formatDate(log.loggedAt)}
                        </td>
                        <td className="py-3 pr-4 text-text text-sm">
                          {log.regimen?.product?.name ?? "Unknown"}
                        </td>
                        <td className="py-3 pr-4 text-right text-text tabular-nums">
                          {log.actualVolume} {log.volumeUnit}
                        </td>
                        <td className="py-3 pr-4 text-right text-accent font-medium tabular-nums">
                          {log.estimatedThcMg != null ? log.estimatedThcMg.toFixed(1) : "—"}
                        </td>
                        <td className="py-3 pr-4 text-right text-[color:var(--highlight)] font-medium tabular-nums">
                          {log.estimatedCbdMg != null ? log.estimatedCbdMg.toFixed(1) : "—"}
                        </td>
                        <td className="py-3 text-text-muted text-xs max-w-[200px] truncate">
                          {log.note || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* ── Product formulary (collapsed) ─────────────────── */}
      {products.length > 0 && (
        <ProductFormulary products={products} />
      )}
    </div>
  );
}

function RegimenCard({ regimen }: { regimen: any }) {
  const product = regimen.product;
  const ratio = formatRatio(
    regimen.calculatedThcMgPerDose,
    regimen.calculatedCbdMgPerDose
  );

  return (
    <Card tone="raised" className="card-hover">
      <CardContent className="pt-6 pb-6">
        <div className="flex flex-col gap-4">
          {/* ── Top row: product info + badges ──────────── */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                {product && (
                  <Badge tone="accent">
                    {PRODUCT_TYPE_LABELS[product.productType] ?? product.productType}
                  </Badge>
                )}
                {ratio && (
                  <Badge tone="highlight">
                    {ratio}
                  </Badge>
                )}
                {regimen.active ? (
                  <Badge tone="success">Active</Badge>
                ) : (
                  <Badge tone="neutral">Discontinued</Badge>
                )}
                {product?.route && (
                  <Badge tone="neutral">
                    {ROUTE_LABELS[product.route] ?? product.route}
                  </Badge>
                )}
              </div>
              <h4 className="font-display text-lg font-medium text-text tracking-tight">
                {product?.name ?? "Unknown product"}
              </h4>
              {product?.brand && (
                <p className="text-sm text-text-muted">{product.brand}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="secondary" size="sm">
                Edit
              </Button>
              {regimen.active && (
                <Button variant="ghost" size="sm">
                  Discontinue
                </Button>
              )}
            </div>
          </div>

          {/* ── Dosing details grid ────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-1">
                Per dose
              </p>
              <p className="text-sm text-text font-medium tabular-nums">
                {regimen.volumePerDose} {regimen.volumeUnit}
              </p>
              <p className="text-xs text-text-muted tabular-nums mt-0.5">
                <span className="text-accent">{regimen.calculatedThcMgPerDose?.toFixed(1) ?? "—"} mg THC</span>
                {" + "}
                <span className="text-[color:var(--highlight)]">{regimen.calculatedCbdMgPerDose?.toFixed(1) ?? "—"} mg CBD</span>
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-1">
                Per day
              </p>
              <p className="text-sm text-text font-medium tabular-nums">
                {regimen.frequencyPerDay}x daily
              </p>
              <p className="text-xs text-text-muted tabular-nums mt-0.5">
                <span className="text-accent">{regimen.calculatedThcMgPerDay?.toFixed(1) ?? "—"} mg THC</span>
                {" + "}
                <span className="text-[color:var(--highlight)]">{regimen.calculatedCbdMgPerDay?.toFixed(1) ?? "—"} mg CBD</span>
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-1">
                Timing
              </p>
              <p className="text-sm text-text-muted">
                {regimen.timingInstructions ?? "As directed"}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-1">
                Start date
              </p>
              <p className="text-sm text-text-muted font-display tabular-nums">
                {formatDate(regimen.startDate)}
              </p>
              {regimen.endDate && (
                <p className="text-xs text-text-subtle mt-0.5">
                  End: {formatDate(regimen.endDate)}
                </p>
              )}
            </div>
          </div>

          {/* ── Patient instructions callout ───────────── */}
          {regimen.patientInstructions && (
            <div className="rounded-lg bg-accent-soft border border-accent/15 px-4 py-3">
              <div className="flex items-center gap-2 mb-1.5">
                <LeafSprig size={14} className="text-accent/70" />
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
                  Patient instructions
                </p>
              </div>
              <p className="text-sm text-text leading-relaxed">
                {regimen.patientInstructions}
              </p>
            </div>
          )}

          {/* ── Clinician notes ────────────────────────── */}
          {regimen.clinicianNotes && (
            <div className="rounded-lg bg-surface-muted/60 border border-border/50 px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-1.5">
                Clinician notes
              </p>
              <p className="text-sm text-text-muted leading-relaxed">
                {regimen.clinicianNotes}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ProductFormulary({ products }: { products: any[] }) {
  return (
    <section>
      <details className="group">
        <summary className="cursor-pointer text-[11px] font-medium uppercase tracking-[0.16em] text-text-subtle mb-3 select-none hover:text-text transition-colors">
          Available products ({products.length})
          <span className="ml-1 text-[10px] group-open:rotate-90 inline-block transition-transform">&rsaquo;</span>
        </summary>
        <div className="grid gap-3">
          {products.map((product: any) => {
            const ratio = formatRatio(
              product.thcConcentration,
              product.cbdConcentration
            );
            return (
              <Card key={product.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge tone="accent">
                          {PRODUCT_TYPE_LABELS[product.productType] ?? product.productType}
                        </Badge>
                        {ratio && (
                          <Badge tone="highlight">{ratio}</Badge>
                        )}
                        {product.route && (
                          <Badge tone="neutral">
                            {ROUTE_LABELS[product.route] ?? product.route}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium text-text">
                        {product.name}
                      </p>
                      {product.brand && (
                        <p className="text-xs text-text-muted mt-0.5">
                          {product.brand}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0 space-y-0.5">
                      {product.thcConcentration != null && (
                        <p className="text-xs tabular-nums">
                          <span className="text-accent font-medium">{product.thcConcentration} {product.concentrationUnit ?? "mg/mL"}</span>
                          <span className="text-text-subtle"> THC</span>
                        </p>
                      )}
                      {product.cbdConcentration != null && (
                        <p className="text-xs tabular-nums">
                          <span className="text-[color:var(--highlight)] font-medium">{product.cbdConcentration} {product.concentrationUnit ?? "mg/mL"}</span>
                          <span className="text-text-subtle"> CBD</span>
                        </p>
                      )}
                      {product.unitSize && (
                        <p className="text-[11px] text-text-subtle tabular-nums">
                          {product.unitSize}
                        </p>
                      )}
                    </div>
                  </div>
                  {product.description && (
                    <p className="text-xs text-text-subtle mt-2 leading-relaxed">
                      {product.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </details>
    </section>
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
