import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatRelative } from "@/lib/utils/format";

/**
 * Clinical Billing Summary — the physician's billing surface.
 *
 * This is NOT the financial cockpit. It's a per-patient clinical billing
 * context designed for the physician who needs to:
 *   1. See claim status at a glance (is this visit billed? paid? denied?)
 *   2. Act on coding alerts (docs support a higher code — add detail?)
 *   3. Support appeals (payer denied for medical necessity — review?)
 *   4. Know what the patient owes (so they can discuss during visits)
 *
 * In a small cannabis practice, the physician IS often the owner.
 * This view gives them enough to manage billing without switching to
 * the operator console.
 */

interface ClinicalBillingSummaryProps {
  claims: any[];
  patientFirstName: string;
  patientId: string;
}

// Status rendering
const STATUS_CONFIG: Record<
  string,
  { tone: "neutral" | "accent" | "success" | "warning" | "danger" | "info" | "highlight"; label: string }
> = {
  draft: { tone: "neutral", label: "Draft" },
  scrubbing: { tone: "neutral", label: "Scrubbing" },
  scrub_blocked: { tone: "warning", label: "Scrub blocked" },
  ready: { tone: "accent", label: "Ready" },
  submitted: { tone: "info", label: "Submitted" },
  ch_rejected: { tone: "danger", label: "Rejected" },
  accepted: { tone: "info", label: "Processing" },
  adjudicated: { tone: "info", label: "Adjudicated" },
  paid: { tone: "success", label: "Paid" },
  partial: { tone: "warning", label: "Partial" },
  denied: { tone: "danger", label: "Denied" },
  appealed: { tone: "highlight", label: "Appealed" },
  closed: { tone: "success", label: "Closed" },
  voided: { tone: "neutral", label: "Voided" },
  written_off: { tone: "neutral", label: "Written off" },
};

export function ClinicalBillingSummary({
  claims,
  patientFirstName,
  patientId,
}: ClinicalBillingSummaryProps) {
  if (claims.length === 0) {
    return (
      <EmptyState
        title="No billing activity yet"
        description={`Claims will appear here once ${patientFirstName}'s encounters are billed. The agent fleet handles claim construction automatically after note finalization.`}
      />
    );
  }

  // Summary metrics
  const totalBilledCents = claims.reduce((s, c) => s + c.billedAmountCents, 0);
  const totalPaidCents = claims.reduce((s, c) => s + c.paidAmountCents, 0);
  const totalPatientRespCents = claims.reduce((s, c) => s + c.patientRespCents, 0);
  const deniedClaims = claims.filter((c) => c.status === "denied" || c.status === "partial");
  const actionNeeded = claims.filter(
    (c) =>
      c.status === "denied" ||
      c.status === "scrub_blocked" ||
      c.status === "ch_rejected",
  );

  return (
    <div className="space-y-6">
      {/* ── Summary strip ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Total billed"
          value={formatCents(totalBilledCents)}
          sub={`${claims.length} claim${claims.length !== 1 ? "s" : ""}`}
        />
        <MetricCard
          label="Total collected"
          value={formatCents(totalPaidCents)}
          sub={totalBilledCents > 0
            ? `${Math.round((totalPaidCents / totalBilledCents) * 100)}% of billed`
            : "—"}
          accent={totalPaidCents > 0}
        />
        <MetricCard
          label="Patient owes"
          value={formatCents(totalPatientRespCents)}
          sub={totalPatientRespCents > 0 ? "discuss with patient" : "nothing due"}
          warn={totalPatientRespCents > 0}
        />
        <MetricCard
          label="Needs attention"
          value={String(actionNeeded.length)}
          sub={actionNeeded.length > 0 ? "denied or blocked" : "all clear"}
          warn={actionNeeded.length > 0}
        />
      </div>

      {/* ── Action alerts (denials, blocks) ────────────────────── */}
      {actionNeeded.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display text-base text-text">
            Needs your attention
          </h3>
          {actionNeeded.map((claim) => (
            <ActionCard key={claim.id} claim={claim} />
          ))}
        </div>
      )}

      {/* ── Claim timeline ─────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-base text-text">
            Claim history
          </h3>
          <Link
            href={`/clinic/patients/${patientId}/billing`}
            className="text-xs text-accent hover:underline"
          >
            Full financial cockpit →
          </Link>
        </div>
        <div className="space-y-2">
          {claims.map((claim) => (
            <ClaimRow key={claim.id} claim={claim} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MetricCard({
  label,
  value,
  sub,
  accent,
  warn,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <Card className="p-4">
      <p className="text-[10px] uppercase tracking-[0.12em] text-text-subtle mb-1">
        {label}
      </p>
      <p
        className={`font-display text-2xl tabular-nums ${
          warn ? "text-danger" : accent ? "text-accent" : "text-text"
        }`}
      >
        {value}
      </p>
      <p className="text-[11px] text-text-muted mt-1">{sub}</p>
    </Card>
  );
}

function ActionCard({ claim }: { claim: any }) {
  const statusCfg = STATUS_CONFIG[claim.status] ?? STATUS_CONFIG.draft;
  const denials = claim.denialEvents ?? [];
  const latestDenial = denials[0];
  const appeals = claim.appealPackets ?? [];
  const latestAppeal = appeals[0];

  return (
    <Card
      className={`border-l-4 p-4 ${
        claim.status === "denied"
          ? "border-l-danger"
          : claim.status === "ch_rejected"
            ? "border-l-[color:var(--warning)]"
            : "border-l-[color:var(--info)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <Badge tone={statusCfg.tone} className="text-[10px]">
              {statusCfg.label}
            </Badge>
            <span className="text-sm font-medium text-text">
              {claim.claimNumber ?? claim.id.slice(0, 8)}
            </span>
            <span className="text-xs text-text-subtle">
              DOS {formatDate(claim.serviceDate)}
            </span>
          </div>

          {latestDenial && (
            <div className="mb-2">
              <p className="text-sm text-text">
                <span className="font-medium">Denial:</span> CARC{" "}
                {latestDenial.carcCode}
                {latestDenial.rarcCode ? ` / RARC ${latestDenial.rarcCode}` : ""}
                {" — "}
                {formatCents(latestDenial.amountDeniedCents)}
              </p>
              {latestDenial.denialCategory && (
                <Badge tone="neutral" className="text-[9px] mt-1">
                  {humanizeCategory(latestDenial.denialCategory)}
                </Badge>
              )}
            </div>
          )}

          {latestAppeal && (
            <div className="rounded-md bg-highlight-soft/40 border border-highlight/20 px-3 py-2 mt-2">
              <p className="text-[10px] uppercase tracking-wider text-[color:var(--highlight-hover)] mb-0.5">
                Appeal — Level {latestAppeal.appealLevel}
              </p>
              <p className="text-xs text-text">
                Status: {latestAppeal.status}
                {latestAppeal.submittedAt && (
                  <> · submitted {formatRelative(latestAppeal.submittedAt)}</>
                )}
              </p>
            </div>
          )}

          {claim.status === "denied" && !latestAppeal && latestDenial?.recoverable && (
            <p className="text-xs text-accent mt-2 italic">
              This denial may be recoverable. The appeals agent will generate a
              draft if the amount exceeds $75.
            </p>
          )}

          {claim.status === "scrub_blocked" && (
            <p className="text-xs text-text-muted mt-1">
              Claim is blocked by pre-submission validation. Check scrub issues
              in the financial cockpit.
            </p>
          )}
        </div>

        <div className="text-right shrink-0">
          <p className="font-display text-lg tabular-nums text-text">
            {formatCents(claim.billedAmountCents)}
          </p>
          {claim.paidAmountCents > 0 && (
            <p className="text-xs text-success tabular-nums">
              paid {formatCents(claim.paidAmountCents)}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function ClaimRow({ claim }: { claim: any }) {
  const statusCfg = STATUS_CONFIG[claim.status] ?? STATUS_CONFIG.draft;
  const cptCodes = Array.isArray(claim.cptCodes)
    ? claim.cptCodes.map((c: any) => c.code ?? c).join(", ")
    : "—";

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-surface border border-border/60 hover:bg-surface-muted transition-colors">
      {/* Status dot */}
      <span
        className={`h-2.5 w-2.5 rounded-full shrink-0 ${
          claim.status === "paid" || claim.status === "closed"
            ? "bg-success"
            : claim.status === "denied"
              ? "bg-danger"
              : claim.status === "appealed" || claim.status === "partial"
                ? "bg-[color:var(--warning)]"
                : "bg-border-strong"
        }`}
      />

      {/* Claim info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text">
            {claim.claimNumber ?? claim.id.slice(0, 8)}
          </span>
          <Badge tone={statusCfg.tone} className="text-[9px]">
            {statusCfg.label}
          </Badge>
        </div>
        <p className="text-xs text-text-muted mt-0.5">
          {cptCodes} · {claim.payerName ?? "No payer"} · DOS{" "}
          {formatDate(claim.serviceDate)}
        </p>
      </div>

      {/* Amounts */}
      <div className="text-right shrink-0">
        <p className="text-sm font-display tabular-nums text-text">
          {formatCents(claim.billedAmountCents)}
        </p>
        {claim.paidAmountCents > 0 && (
          <p className="text-[11px] text-success tabular-nums">
            {formatCents(claim.paidAmountCents)} paid
          </p>
        )}
        {claim.patientRespCents > 0 && (
          <p className="text-[11px] text-text-muted tabular-nums">
            {formatCents(claim.patientRespCents)} pt resp
          </p>
        )}
      </div>

      {/* Timeline indicator */}
      <span className="text-[11px] text-text-subtle shrink-0 w-16 text-right">
        {formatRelative(claim.updatedAt ?? claim.createdAt)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCents(cents: number): string {
  if (cents === 0) return "$0";
  const negative = cents < 0;
  const abs = Math.abs(cents);
  return `${negative ? "-" : ""}$${(abs / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const CATEGORY_LABELS: Record<string, string> = {
  coding_error: "Coding error",
  missing_info: "Missing information",
  eligibility: "Eligibility issue",
  timely_filing: "Timely filing",
  medical_necessity: "Medical necessity",
  precertification: "Prior auth / precert",
  duplicate: "Duplicate claim",
  other: "Other",
};

function humanizeCategory(raw: string): string {
  return CATEGORY_LABELS[raw] ?? raw.replace(/_/g, " ");
}
