import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { MetricTile } from "@/components/ui/metric-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow, EditorialRule, LeafSprig } from "@/components/ui/ornament";
import { formatDate, formatRelative } from "@/lib/utils/format";

// ---------------------------------------------------------------------------
// Agent Activity Detail — click an agent card in Mission Control → see
// exactly what it did, which patients it processed, what needs attention.
// ---------------------------------------------------------------------------

const AGENT_DISPLAY: Record<string, { name: string; emoji: string; description: string }> = {
  correspondenceNurse: { name: "Nurse Nora", emoji: "\uD83D\uDC69\u200D\u2695\uFE0F", description: "Triages inbound patient messages, flags emergencies, and drafts clinically appropriate responses." },
  scribe: { name: "Scribe", emoji: "\uD83D\uDCDD", description: "Drafts structured SOAP notes from encounter context, patient history, and pre-visit briefings." },
  preVisitIntelligence: { name: "Visit Prep", emoji: "\uD83D\uDCCB", description: "Prepares clinician briefings before each visit — what changed, what to ask, what needs attention." },
  codingReadiness: { name: "Coding Readiness", emoji: "\u2705", description: "Checks that finalized notes include documentation to support billed codes." },
  codingOptimization: { name: "Code Optimizer", emoji: "\uD83D\uDCCA", description: "Reviews and optimizes CPT/ICD-10 codes for compliant, maximized reimbursement." },
  encounterIntelligence: { name: "Charge Capture", emoji: "\uD83D\uDCB0", description: "Extracts billable services from clinical documentation so nothing gets missed." },
  claimConstruction: { name: "Claim Builder", emoji: "\uD83D\uDCC4", description: "Assembles coded charges into valid professional claims ready for submission." },
  chargeIntegrity: { name: "Scrubber", emoji: "\uD83D\uDD0D", description: "Validates claims against payer and coding rules before submission." },
  denialTriage: { name: "Denial Triage", emoji: "\u26A0\uFE0F", description: "Triages denied claims, identifies root cause, and routes to resolution." },
  denialResolution: { name: "Denial Resolver", emoji: "\uD83D\uDD27", description: "Classifies denials by CARC code and routes to auto-correct, appeal, or escalation." },
  appealsGeneration: { name: "Appeals Writer", emoji: "\uD83D\uDCE8", description: "Drafts appeal letters with supporting documentation for denied claims." },
  complianceAudit: { name: "Compliance", emoji: "\uD83D\uDEE1\uFE0F", description: "Monitors for upcoding, modifier abuse, and frequency anomalies." },
  eligibilityBenefits: { name: "Eligibility", emoji: "\uD83C\uDFE5", description: "Verifies patient insurance coverage before claims enter the pipeline." },
  priorAuthVerification: { name: "Prior Auth", emoji: "\uD83D\uDD10", description: "Tracks prior authorization status and attaches auth numbers before submission." },
  clearinghouseSubmission: { name: "Clearinghouse", emoji: "\uD83D\uDE80", description: "Formats claims as 837P transactions and submits to clearinghouse." },
  reconciliation: { name: "Reconciliation", emoji: "\uD83D\uDCB3", description: "Reconciles insurance payments and adjustments against expected amounts." },
  aging: { name: "Aging Monitor", emoji: "\u23F0", description: "Monitors receivables by aging bucket and flags overdue balances." },
  underpaymentDetection: { name: "Underpayment", emoji: "\uD83D\uDCC9", description: "Flags claims paid less than expected." },
  patientCollections: { name: "Patient Billing", emoji: "\uD83D\uDCB1", description: "Drafts patient-facing balance reminders and payment plan offers." },
  patientExplanation: { name: "Statement Explainer", emoji: "\uD83D\uDCD6", description: "Generates plain-language explanations of patient billing statements." },
  outcomeTracker: { name: "Outcome Tracker", emoji: "\uD83D\uDCC8", description: "Schedules outcome check-in reminders and detects trends in patient data." },
  patientOutreach: { name: "Outreach", emoji: "\uD83D\uDCEC", description: "Reaches out to quiet patients and schedules follow-up check-ins." },
  physicianNudge: { name: "Coach", emoji: "\uD83D\uDCA1", description: "Surfaces reminders — unsigned notes, overdue patients, unreviewed results." },
  intake: { name: "Intake", emoji: "\uD83D\uDCCB", description: "Evaluates patient intake completeness and writes chart readiness summaries." },
  fairytaleSummary: { name: "Storybook", emoji: "\uD83D\uDCD6", description: "Generates warm, literary chart summaries for patient storybooks." },
  documentOrganizer: { name: "Doc Organizer", emoji: "\uD83D\uDCC1", description: "Classifies and tags uploaded documents into the correct chart section." },
  messagingAssistant: { name: "Messaging", emoji: "\uD83D\uDCAC", description: "Drafts routine outbound patient messages for clinician review." },
  researchSynthesizer: { name: "Research", emoji: "\uD83D\uDD2C", description: "Surfaces relevant cannabis studies and guidelines for patient conditions." },
  scheduling: { name: "Scheduling", emoji: "\uD83D\uDCC5", description: "Creates appointment reminder workflows before upcoming visits." },
  practiceLaunch: { name: "Launch Guide", emoji: "\uD83D\uDE80", description: "Guides operators through practice setup with AI validation." },
  registry: { name: "Registry", emoji: "\uD83D\uDDD7\uFE0F", description: "Updates patient registry when diagnoses change." },
  patientEducation: { name: "Education", emoji: "\uD83C\uDF93", description: "Generates personalized patient education sheets at appropriate reading levels." },
  patientSimplifier: { name: "Simplifier", emoji: "\uD83D\uDCA7", description: "Rewrites clinical text at 3rd-grade reading level for patient understanding." },
  dosingRecommendation: { name: "Dosing Engine", emoji: "\u2696\uFE0F", description: "Generates evidence-based cannabis dosing recommendations." },
  revenueCommand: { name: "Revenue Command", emoji: "\uD83D\uDCCA", description: "Reports on financial health and flags key levers for practice growth." },
  refundCredit: { name: "Refund/Credit", emoji: "\uD83D\uDD04", description: "Identifies overpayments and credits available for refund." },
  adjudicationInterpretation: { name: "ERA Parser", emoji: "\uD83D\uDCE5", description: "Parses ERA/835 responses and matches payments to claims." },
};

const STATUS_TONE: Record<string, "success" | "warning" | "info" | "neutral" | "danger"> = {
  succeeded: "success",
  needs_approval: "warning",
  running: "info",
  pending: "neutral",
  failed: "danger",
  cancelled: "neutral",
};

export default async function AgentDetailPage({
  params,
}: {
  params: { name: string };
}) {
  const user = await requireUser();
  const organizationId = user.organizationId!;
  const agentName = decodeURIComponent(params.name);

  const display = AGENT_DISPLAY[agentName];
  if (!display) notFound();

  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [recentJobs, weekJobs, feedbackStats] = await Promise.all([
    // Last 24h jobs with details
    prisma.agentJob.findMany({
      where: { organizationId, agentName, createdAt: { gte: last24h } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    // Last 7d for stats
    prisma.agentJob.findMany({
      where: { organizationId, agentName, createdAt: { gte: last7d } },
      select: { status: true, createdAt: true },
    }),
    // Feedback stats
    prisma.agentFeedback.findMany({
      where: { agentName, createdAt: { gte: last7d } },
      select: { action: true },
    }),
  ]);

  // Stats
  const statusCounts: Record<string, number> = {};
  for (const j of weekJobs) {
    statusCounts[j.status] = (statusCounts[j.status] ?? 0) + 1;
  }

  const totalWeek = weekJobs.length;
  const succeeded = statusCounts["succeeded"] ?? 0;
  const needsApproval = statusCounts["needs_approval"] ?? 0;
  const failed = statusCounts["failed"] ?? 0;
  const successRate = totalWeek > 0 ? Math.round((succeeded / totalWeek) * 100) : 0;

  // Feedback
  const approved = feedbackStats.filter((f) => f.action === "approved").length;
  const approvedEdited = feedbackStats.filter((f) => f.action === "approved_with_edits").length;
  const rejected = feedbackStats.filter((f) => f.action === "rejected").length;
  const totalFeedback = feedbackStats.length;
  const approvalRate = totalFeedback > 0 ? Math.round(((approved + approvedEdited) / totalFeedback) * 100) : null;

  // Extract patient IDs from recent jobs to show which patients were touched
  const patientIds = new Set<string>();
  for (const job of recentJobs) {
    const input = job.input as any;
    if (input?.patientId) patientIds.add(input.patientId);
  }

  const touchedPatients = patientIds.size > 0
    ? await prisma.patient.findMany({
        where: { id: { in: Array.from(patientIds) } },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];

  return (
    <PageShell maxWidth="max-w-[1040px]">
      {/* Back link */}
      <Link href="/clinic" className="text-sm text-accent hover:underline mb-4 inline-block">
        &larr; Back to Mission Control
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-3xl">
          {display.emoji}
        </span>
        <div>
          <h1 className="font-display text-3xl text-text tracking-tight">{display.name}</h1>
          <p className="text-sm text-text-muted mt-1 max-w-xl">{display.description}</p>
          <p className="text-xs text-text-subtle mt-2">
            Agent: <code className="text-accent">{agentName}</code>
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        <MetricTile label="This week" value={totalWeek} accent="forest" hint="Total runs" />
        <MetricTile label="Succeeded" value={succeeded} accent="forest" />
        <MetricTile label="Needs review" value={needsApproval} accent="amber" />
        <MetricTile label="Failed" value={failed} accent="none" />
        <MetricTile
          label="Success rate"
          value={`${successRate}%`}
          accent={successRate >= 90 ? "forest" : successRate >= 70 ? "amber" : "none"}
        />
      </div>

      {/* Approval rate */}
      {approvalRate !== null && (
        <Card tone="raised" className="mb-8 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-1">
                Physician approval rate (7 days)
              </p>
              <p className="font-display text-3xl text-text tabular-nums">{approvalRate}%</p>
              <p className="text-xs text-text-muted mt-1">
                {approved} approved clean · {approvedEdited} approved with edits · {rejected} rejected
              </p>
            </div>
            <div className={`flex h-16 w-16 items-center justify-center rounded-full border-4 ${
              approvalRate >= 85 ? "border-success text-success" : approvalRate >= 60 ? "border-[color:var(--highlight)] text-[color:var(--highlight)]" : "border-danger text-danger"
            }`}>
              <span className="font-display text-xl font-bold">{approvalRate}%</span>
            </div>
          </div>
        </Card>
      )}

      <EditorialRule className="mb-8" />

      {/* Patients touched */}
      {touchedPatients.length > 0 && (
        <section className="mb-8">
          <Eyebrow className="mb-4">Patients processed (last 24h)</Eyebrow>
          <div className="flex flex-wrap gap-2">
            {touchedPatients.map((p) => (
              <Link key={p.id} href={`/clinic/patients/${p.id}`}>
                <Card className="card-hover cursor-pointer px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar firstName={p.firstName} lastName={p.lastName} size="sm" />
                    <span className="text-sm font-medium text-text">
                      {p.firstName} {p.lastName}
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent jobs */}
      <section>
        <Eyebrow className="mb-4">Recent activity (last 24h)</Eyebrow>
        {recentJobs.length === 0 ? (
          <EmptyState
            title="No recent activity"
            description={`${display.name} hasn't run in the last 24 hours.`}
          />
        ) : (
          <div className="space-y-2">
            {recentJobs.map((job) => {
              const input = job.input as any;
              return (
                <Card key={job.id} tone="default">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Badge tone={STATUS_TONE[job.status] ?? "neutral"}>
                          {job.status.replace("_", " ")}
                        </Badge>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-text truncate">
                            {job.workflowName}
                            {input?.patientId && (
                              <span className="text-text-muted"> · patient {input.patientId.slice(0, 8)}...</span>
                            )}
                          </p>
                          <p className="text-xs text-text-subtle mt-0.5">
                            {formatRelative(job.createdAt)}
                            {job.completedAt && (
                              <> · took {Math.round((job.completedAt.getTime() - job.createdAt.getTime()) / 1000)}s</>
                            )}
                            {job.attempts > 1 && (
                              <> · {job.attempts} attempts</>
                            )}
                          </p>
                        </div>
                      </div>

                      {job.status === "needs_approval" && (
                        <Link href="/clinic/approvals">
                          <Button size="sm">Review</Button>
                        </Link>
                      )}
                      {job.status === "failed" && job.lastError && (
                        <span className="text-xs text-danger max-w-[200px] truncate" title={job.lastError}>
                          {job.lastError}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <div className="mt-8 mb-4 flex justify-center">
        <LeafSprig size={24} className="text-accent/40" />
      </div>
    </PageShell>
  );
}
