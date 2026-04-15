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
import { formatMoney } from "@/lib/domain/billing";
import {
  ageClaims,
  recoverabilityScore,
  daysInAR,
  BUCKET_ORDER,
  type AgingBucket,
} from "@/lib/billing/aging";

export const metadata = { title: "Aging Workbench" };

const BUCKET_COLORS: Record<AgingBucket, string> = {
  "0-30": "var(--success)",
  "31-60": "var(--accent)",
  "61-90": "var(--highlight)",
  "91-120": "var(--warning)",
  "120+": "var(--danger)",
};

const BUCKET_LABELS: Record<AgingBucket, string> = {
  "0-30": "0–30 days",
  "31-60": "31–60 days",
  "61-90": "61–90 days",
  "91-120": "91–120 days",
  "120+": "120+ days",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AgingPage({
  searchParams,
}: {
  searchParams: { bucket?: string; type?: string };
}) {
  const user = await requireUser();
  const organizationId = user.organizationId!;
  const activeBucket = (searchParams.bucket as AgingBucket | undefined) ?? null;
  const activeType = searchParams.type ?? "all"; // all | insurance | patient

  const claims = await prisma.claim.findMany({
    where: {
      organizationId,
      status: { notIn: ["written_off"] },
    },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
      payments: { select: { source: true, amountCents: true } },
    },
    orderBy: { serviceDate: "asc" },
  });

  const { aged, totals } = ageClaims(claims);
  const dar = daysInAR(claims);

  // Filter
  let filtered = aged;
  if (activeBucket) {
    filtered = filtered.filter((a) => a.bucket === activeBucket);
  }
  if (activeType === "insurance") {
    filtered = filtered.filter((a) => a.insuranceBalanceCents > 0);
  } else if (activeType === "patient") {
    filtered = filtered.filter((a) => a.patientBalanceCents > 0);
  }

  // Build patient lookup
  const patientMap = Object.fromEntries(
    claims.map((c) => [c.id, c.patient]),
  );

  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Practice management"
        title="Aging workbench"
        description="Insurance A/R and patient A/R, bucketed by age. Work the oldest first."
      />

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total A/R"
          value={formatMoney(totals.total)}
          hint={`${aged.length} open balances`}
        />
        <StatCard
          label="Insurance A/R"
          value={formatMoney(totals.insurance)}
          tone="accent"
          hint={`${totals.total > 0 ? Math.round((totals.insurance / totals.total) * 100) : 0}% of total`}
        />
        <StatCard
          label="Patient A/R"
          value={formatMoney(totals.patient)}
          tone="warning"
          hint={`${totals.total > 0 ? Math.round((totals.patient / totals.total) * 100) : 0}% of total`}
        />
        <StatCard
          label="Days in A/R"
          value={dar.toString()}
          hint="average across open claims"
        />
      </div>

      {/* Bucket distribution */}
      <Card tone="raised" className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">Aging buckets</CardTitle>
          <CardDescription>
            How balances are distributed across age ranges.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {BUCKET_ORDER.map((bucket) => {
              const data = totals.byBucket[bucket];
              const pct = totals.total > 0 ? (data.total / totals.total) * 100 : 0;
              return (
                <Link
                  key={bucket}
                  href={`/ops/aging?bucket=${bucket}`}
                  className="block group"
                >
                  <div className="flex items-center gap-4 mb-1.5">
                    <div className="flex items-center gap-2 w-32">
                      <span
                        className="h-3 w-3 rounded-sm"
                        style={{ backgroundColor: BUCKET_COLORS[bucket] }}
                      />
                      <span className="text-sm font-medium text-text group-hover:text-accent transition-colors">
                        {BUCKET_LABELS[bucket]}
                      </span>
                    </div>
                    <div className="flex-1 h-6 bg-surface-muted rounded-md overflow-hidden flex">
                      {data.insurance > 0 && (
                        <div
                          className="h-full bg-accent/60"
                          style={{
                            width: `${(data.insurance / Math.max(totals.total, 1)) * 100}%`,
                          }}
                          title={`Insurance: ${formatMoney(data.insurance)}`}
                        />
                      )}
                      {data.patient > 0 && (
                        <div
                          className="h-full bg-[color:var(--warning)]/60"
                          style={{
                            width: `${(data.patient / Math.max(totals.total, 1)) * 100}%`,
                          }}
                          title={`Patient: ${formatMoney(data.patient)}`}
                        />
                      )}
                    </div>
                    <div className="text-right w-32">
                      <p className="text-sm font-medium text-text tabular-nums">
                        {formatMoney(data.total)}
                      </p>
                      <p className="text-[10px] text-text-subtle">
                        {pct.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/60 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-accent/60" />
              <span className="text-text-muted">Insurance A/R</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-[color:var(--warning)]/60" />
              <span className="text-text-muted">Patient A/R</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="text-[10px] uppercase tracking-wider text-text-subtle mr-2">
          Filter:
        </span>
        <FilterPill label="All" active={activeType === "all" && !activeBucket} href="/ops/aging" />
        <FilterPill
          label="Insurance only"
          active={activeType === "insurance"}
          href="/ops/aging?type=insurance"
        />
        <FilterPill
          label="Patient only"
          active={activeType === "patient"}
          href="/ops/aging?type=patient"
        />
        {activeBucket && (
          <FilterPill
            label={`${BUCKET_LABELS[activeBucket]} ✕`}
            active={true}
            href="/ops/aging"
          />
        )}
      </div>

      {/* Worklist */}
      <div className="mb-4">
        <Eyebrow>Worklist {activeBucket && `· ${BUCKET_LABELS[activeBucket]}`}</Eyebrow>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Nothing in this bucket"
          description="A clean A/R is the goal. Pick a different filter or revisit later."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => {
            const patient = patientMap[entry.id];
            const score = recoverabilityScore(entry);
            return (
              <Card key={entry.id} tone="raised">
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    {patient && (
                      <Avatar
                        firstName={patient.firstName}
                        lastName={patient.lastName}
                        size="sm"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        {patient && (
                          <Link
                            href={`/clinic/patients/${patient.id}/billing`}
                            className="text-sm font-medium text-text hover:text-accent transition-colors"
                          >
                            {patient.firstName} {patient.lastName}
                          </Link>
                        )}
                        <span
                          className="inline-block h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: BUCKET_COLORS[entry.bucket] }}
                        />
                        <span className="text-[11px] text-text-subtle">
                          {entry.ageDays}d · {entry.payerName ?? "Self-pay"}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-subtle">
                        DOS {formatDate(entry.serviceDate)} ·{" "}
                        <span className="capitalize">{entry.status}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      {/* Insurance vs patient breakdown */}
                      <div className="text-right">
                        {entry.insuranceBalanceCents > 0 && (
                          <p className="text-xs text-accent tabular-nums">
                            Ins: {formatMoney(entry.insuranceBalanceCents)}
                          </p>
                        )}
                        {entry.patientBalanceCents > 0 && (
                          <p className="text-xs text-[color:var(--warning)] tabular-nums">
                            Pt: {formatMoney(entry.patientBalanceCents)}
                          </p>
                        )}
                      </div>
                      <div className="text-right w-24">
                        <p className="font-display text-base text-text tabular-nums">
                          {formatMoney(entry.balanceCents)}
                        </p>
                        <p className="text-[10px] text-text-subtle">
                          {score}% recoverable
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "accent";
  hint?: string;
}) {
  const colors: Record<string, string> = {
    neutral: "text-text",
    success: "text-success",
    warning: "text-[color:var(--warning)]",
    danger: "text-danger",
    accent: "text-accent",
  };
  return (
    <Card tone="raised">
      <CardContent className="pt-5 pb-5">
        <p className={`font-display text-2xl tabular-nums ${colors[tone]}`}>
          {value}
        </p>
        <p className="text-xs text-text-muted mt-1">{label}</p>
        {hint && <p className="text-[10px] text-text-subtle mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function FilterPill({
  label,
  active,
  href,
}: {
  label: string;
  active: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all ${
        active
          ? "bg-accent text-accent-ink"
          : "bg-surface-muted text-text-muted hover:bg-surface-raised border border-border"
      }`}
    >
      {label}
    </Link>
  );
}
