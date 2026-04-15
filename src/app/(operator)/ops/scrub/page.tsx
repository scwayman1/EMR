import Link from "next/link";
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
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow } from "@/components/ui/ornament";
import { formatDate } from "@/lib/utils/format";
import {
  scrubClaim,
  countBySeverity,
  isClaimSubmittable,
  type ScrubIssue,
} from "@/lib/billing/scrub";
import { formatMoney } from "@/lib/domain/billing";

export const metadata = { title: "Claim Scrub Workbench" };

// ---------------------------------------------------------------------------
// Severity styling
// ---------------------------------------------------------------------------

const SEVERITY_COLORS: Record<string, string> = {
  error: "var(--danger)",
  warning: "var(--warning)",
  info: "var(--info)",
};

const SEVERITY_LABELS: Record<string, string> = {
  error: "Error",
  warning: "Warning",
  info: "Info",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ScrubWorkbenchPage() {
  const user = await requireUser();
  const organizationId = user.organizationId!;

  // Pull claims that haven't been submitted yet (draft + held) so we can
  // run the scrub on them and surface issues to billers.
  const claims = await prisma.claim.findMany({
    where: {
      organizationId,
      status: { in: ["draft", "submitted"] },
    },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
      provider: { select: { id: true } },
    },
    orderBy: { serviceDate: "desc" },
    take: 50,
  });

  // Coverage lookup for eligibility checks
  const patientIds = claims.map((c) => c.patientId);
  const coverages = await prisma.patientCoverage.findMany({
    where: { patientId: { in: patientIds }, type: "primary", active: true },
  });
  const coverageMap = Object.fromEntries(
    coverages.map((c) => [c.patientId, c]),
  );

  // Run the scrub engine on every claim
  const scrubbed = claims.map((claim) => {
    const issues = scrubClaim({
      cptCodes: claim.cptCodes as any,
      icd10Codes: claim.icd10Codes as any,
      payerName: claim.payerName,
      serviceDate: claim.serviceDate,
      providerId: claim.providerId,
      patientCoverage: coverageMap[claim.patientId]
        ? {
            eligibilityStatus: coverageMap[claim.patientId].eligibilityStatus,
            payerName: coverageMap[claim.patientId].payerName,
          }
        : null,
    });
    return {
      claim,
      issues,
      counts: countBySeverity(issues),
      submittable: isClaimSubmittable(issues),
    };
  });

  // Stats
  const totalClaims = scrubbed.length;
  const cleanClaims = scrubbed.filter((s) => s.issues.length === 0).length;
  const blockedClaims = scrubbed.filter((s) => !s.submittable).length;
  const totalErrors = scrubbed.reduce((acc, s) => acc + s.counts.error, 0);
  const totalWarnings = scrubbed.reduce((acc, s) => acc + s.counts.warning, 0);
  const totalDollarsHeld = scrubbed
    .filter((s) => !s.submittable)
    .reduce((acc, s) => acc + s.claim.billedAmountCents, 0);

  // Group by primary issue category
  const ruleCounts: Record<string, number> = {};
  for (const s of scrubbed) {
    for (const i of s.issues) {
      ruleCounts[i.ruleCode] = (ruleCounts[i.ruleCode] ?? 0) + 1;
    }
  }
  const topIssues = Object.entries(ruleCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Practice management"
        title="Claim scrub workbench"
        description="Every claim is checked against payer + coding rules. Plain language issues, structured detail, suggested fixes."
      />

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StatCard label="Claims in queue" value={totalClaims.toString()} />
        <StatCard
          label="Clean & ready"
          value={cleanClaims.toString()}
          tone="success"
        />
        <StatCard
          label="Blocked"
          value={blockedClaims.toString()}
          tone="danger"
          hint={blockedClaims > 0 ? formatMoney(totalDollarsHeld) + " held" : undefined}
        />
        <StatCard
          label="Errors"
          value={totalErrors.toString()}
          tone="danger"
        />
        <StatCard
          label="Warnings"
          value={totalWarnings.toString()}
          tone="warning"
        />
      </div>

      {/* Top issues */}
      {topIssues.length > 0 && (
        <Card tone="raised" className="mb-8">
          <CardHeader>
            <CardTitle className="text-base">Top issues this week</CardTitle>
            <CardDescription>
              Fixing root causes upstream prevents these from coming back.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topIssues.map(([ruleCode, count]) => (
                <div
                  key={ruleCode}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-text-subtle">
                      {ruleCode}
                    </span>
                    <span className="text-sm text-text">
                      {humanizeRuleCode(ruleCode)}
                    </span>
                  </div>
                  <Badge tone="warning">{count} occurrences</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Claims with issues */}
      <div className="mb-4">
        <Eyebrow>Claims requiring review</Eyebrow>
      </div>

      {scrubbed.length === 0 ? (
        <EmptyState
          title="No claims in scrub queue"
          description="When new visit notes are finalized, draft claims will appear here for review."
        />
      ) : (
        <div className="space-y-3">
          {scrubbed.map(({ claim, issues, counts, submittable }) => (
            <Card
              key={claim.id}
              tone="raised"
              className={
                !submittable
                  ? "border-l-4 border-l-danger"
                  : issues.length > 0
                    ? "border-l-4 border-l-[color:var(--warning)]"
                    : "border-l-4 border-l-success"
              }
            >
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar
                      firstName={claim.patient.firstName}
                      lastName={claim.patient.lastName}
                      size="md"
                    />
                    <div>
                      <Link
                        href={`/clinic/patients/${claim.patient.id}`}
                        className="text-sm font-medium text-text hover:text-accent transition-colors"
                      >
                        {claim.patient.firstName} {claim.patient.lastName}
                      </Link>
                      <p className="text-[11px] text-text-subtle">
                        {formatDate(claim.serviceDate)} ·{" "}
                        {claim.payerName ?? "No payer"} · {claim.claimNumber}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-xl text-text tabular-nums">
                      {formatMoney(claim.billedAmountCents)}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      {counts.error > 0 && (
                        <Badge tone="danger" className="text-[9px]">
                          {counts.error} error
                          {counts.error !== 1 ? "s" : ""}
                        </Badge>
                      )}
                      {counts.warning > 0 && (
                        <Badge tone="warning" className="text-[9px]">
                          {counts.warning} warning
                          {counts.warning !== 1 ? "s" : ""}
                        </Badge>
                      )}
                      {counts.info > 0 && (
                        <Badge tone="info" className="text-[9px]">
                          {counts.info} info
                        </Badge>
                      )}
                      {issues.length === 0 && (
                        <Badge tone="success" className="text-[9px]">
                          Clean
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* CPT + ICD codes */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {(claim.cptCodes as any[]).map((c) => (
                    <span
                      key={c.code}
                      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-accent/10 text-accent"
                    >
                      {c.code}
                    </span>
                  ))}
                  {(claim.icd10Codes as any[]).map((c) => (
                    <span
                      key={c.code}
                      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-highlight/10 text-[color:var(--highlight)]"
                    >
                      {c.code}
                    </span>
                  ))}
                </div>

                {/* Issues */}
                {issues.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {issues.map((issue, i) => (
                      <IssueRow key={i} issue={issue} />
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                  <Link
                    href={`/clinic/patients/${claim.patient.id}/billing`}
                    className="text-xs text-text-muted hover:text-text"
                  >
                    Open billing
                  </Link>
                  <button
                    disabled={!submittable}
                    className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                      submittable
                        ? "bg-accent text-accent-ink hover:bg-accent/90"
                        : "bg-surface-muted text-text-subtle cursor-not-allowed"
                    }`}
                  >
                    {submittable ? "Submit claim" : "Blocked — fix errors"}
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function IssueRow({ issue }: { issue: ScrubIssue }) {
  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg bg-surface-muted/40"
      style={{
        borderLeft: `2px solid ${SEVERITY_COLORS[issue.severity]}`,
      }}
    >
      <div className="shrink-0 pt-0.5">
        <span
          className="inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold text-white"
          style={{ backgroundColor: SEVERITY_COLORS[issue.severity] }}
        >
          {issue.severity === "error" ? "!" : issue.severity === "warning" ? "?" : "i"}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono text-text-subtle uppercase">
            {issue.ruleCode}
          </span>
          {issue.relatedCode && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent/10 text-accent">
              {issue.relatedCode}
            </span>
          )}
        </div>
        <p className="text-sm text-text leading-snug">{issue.message}</p>
        <p className="text-xs text-text-muted mt-1 leading-snug">
          → {issue.suggestion}
        </p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "success" | "warning" | "danger";
  hint?: string;
}) {
  const colors: Record<string, string> = {
    neutral: "text-text",
    success: "text-success",
    warning: "text-[color:var(--warning)]",
    danger: "text-danger",
  };
  return (
    <Card tone="raised">
      <CardContent className="pt-5 pb-5">
        <p className={`font-display text-3xl tabular-nums ${colors[tone]}`}>
          {value}
        </p>
        <p className="text-xs text-text-muted mt-1">{label}</p>
        {hint && <p className="text-[10px] text-text-subtle mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function humanizeRuleCode(code: string): string {
  return code
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
