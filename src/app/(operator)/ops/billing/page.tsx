import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow } from "@/components/ui/ornament";
import { StatCard } from "@/components/ui/stat-card";
import { formatDate } from "@/lib/utils/format";

export const metadata = { title: "Billing Workqueue" };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral" | "accent" | "info"> = {
  draft: "neutral",
  submitted: "info",
  pending: "warning",
  paid: "success",
  partial: "accent",
  denied: "danger",
  appealed: "warning",
  written_off: "neutral",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  pending: "Pending",
  paid: "Paid",
  partial: "Partial",
  denied: "Denied",
  appealed: "Appealed",
  written_off: "Written off",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const user = await requireUser();
  const organizationId = user.organizationId!;
  const activeStatus = searchParams.status ?? "all";

  const [claims, statusCounts] = await Promise.all([
    prisma.claim.findMany({
      where: {
        organizationId,
        ...(activeStatus !== "all" ? { status: activeStatus as any } : {}),
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        provider: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { serviceDate: "desc" },
      take: 50,
    }),
    prisma.claim.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: true,
      _sum: {
        billedAmountCents: true,
        paidAmountCents: true,
      },
    }),
  ]);

  const countByStatus = Object.fromEntries(
    statusCounts.map((s) => [s.status, s._count]),
  );
  const totalCount = statusCounts.reduce((acc, s) => acc + s._count, 0);

  // Totals for the stat strip
  const totalBilled = statusCounts.reduce(
    (acc, s) => acc + (s._sum.billedAmountCents ?? 0),
    0,
  );
  const totalPaid = statusCounts.reduce(
    (acc, s) => acc + (s._sum.paidAmountCents ?? 0),
    0,
  );
  const outstandingCents = totalBilled - totalPaid;
  const denialCount = countByStatus.denied ?? 0;
  const pendingRevenueCents = statusCounts
    .filter((s) => s.status === "accepted" || s.status === "adjudicated" || s.status === "submitted")
    .reduce((acc, s) => acc + (s._sum.billedAmountCents ?? 0), 0);

  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Practice management"
        title="Billing workqueue"
        description="All claims across the practice — filter by status, review denials, and submit drafts."
      />

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total billed"
          value={formatMoney(totalBilled)}
          hint={`${totalCount} claims`}
          size="md"
        />
        <StatCard
          label="Collected"
          value={formatMoney(totalPaid)}
          tone="success"
          hint={`${totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0}% of billed`}
          size="md"
        />
        <StatCard
          label="Pending revenue"
          value={formatMoney(pendingRevenueCents)}
          tone="accent"
          hint="Submitted or in process"
          size="md"
        />
        <StatCard
          label="Outstanding"
          value={formatMoney(outstandingCents)}
          tone="warning"
          hint={denialCount > 0 ? `${denialCount} denials need action` : "No denials"}
          size="md"
        />
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-border pb-4">
        <FilterTab
          label="All"
          count={totalCount}
          active={activeStatus === "all"}
          href="/ops/billing"
        />
        {(["draft", "submitted", "accepted", "adjudicated", "paid", "partial", "denied", "closed"] as const).map(
          (status) => (
            <FilterTab
              key={status}
              label={STATUS_LABEL[status]}
              count={countByStatus[status] ?? 0}
              active={activeStatus === status}
              href={`/ops/billing?status=${status}`}
              tone={STATUS_TONE[status]}
            />
          ),
        )}
      </div>

      {/* Claims table */}
      {claims.length === 0 ? (
        <EmptyState
          title="No claims in this view"
          description="Finalized notes become claims. Try a different filter or draft a new visit note."
        />
      ) : (
        <Card tone="raised">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-3 px-5 font-medium text-text-subtle text-[10px] uppercase tracking-wider">Patient</th>
                    <th className="py-3 px-5 font-medium text-text-subtle text-[10px] uppercase tracking-wider">Date</th>
                    <th className="py-3 px-5 font-medium text-text-subtle text-[10px] uppercase tracking-wider">Codes</th>
                    <th className="py-3 px-5 font-medium text-text-subtle text-[10px] uppercase tracking-wider">Payer</th>
                    <th className="py-3 px-5 font-medium text-text-subtle text-[10px] uppercase tracking-wider text-right">Billed</th>
                    <th className="py-3 px-5 font-medium text-text-subtle text-[10px] uppercase tracking-wider text-right">Paid</th>
                    <th className="py-3 px-5 font-medium text-text-subtle text-[10px] uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {claims.map((claim) => {
                    const cptCodes = claim.cptCodes as Array<{ code: string; label: string }>;
                    const icd10Codes = claim.icd10Codes as Array<{ code: string }>;
                    return (
                      <tr
                        key={claim.id}
                        className="hover:bg-surface-muted/40 transition-colors"
                      >
                        <td className="py-3 px-5">
                          <Link
                            href={`/clinic/patients/${claim.patient.id}`}
                            className="flex items-center gap-2 group"
                          >
                            <Avatar
                              firstName={claim.patient.firstName}
                              lastName={claim.patient.lastName}
                              size="sm"
                            />
                            <span className="font-medium text-text group-hover:text-accent transition-colors">
                              {claim.patient.firstName} {claim.patient.lastName}
                            </span>
                          </Link>
                        </td>
                        <td className="py-3 px-5 text-text-muted tabular-nums">
                          {formatDate(claim.serviceDate)}
                        </td>
                        <td className="py-3 px-5">
                          <div className="flex flex-wrap gap-1">
                            {cptCodes.slice(0, 2).map((c) => (
                              <span
                                key={c.code}
                                className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-accent/10 text-accent"
                              >
                                {c.code}
                              </span>
                            ))}
                            {icd10Codes.slice(0, 2).map((c) => (
                              <span
                                key={c.code}
                                className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-highlight/10 text-[color:var(--highlight)]"
                              >
                                {c.code}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-5 text-text-muted text-xs">
                          {claim.payerName ?? "—"}
                        </td>
                        <td className="py-3 px-5 text-right font-medium text-text tabular-nums">
                          {formatMoney(claim.billedAmountCents)}
                        </td>
                        <td className="py-3 px-5 text-right tabular-nums">
                          <span
                            className={
                              claim.paidAmountCents === 0
                                ? "text-text-subtle"
                                : "text-success"
                            }
                          >
                            {formatMoney(claim.paidAmountCents)}
                          </span>
                        </td>
                        <td className="py-3 px-5">
                          <Badge tone={STATUS_TONE[claim.status]}>
                            {STATUS_LABEL[claim.status]}
                          </Badge>
                          {claim.status === "denied" && claim.denialReason && (
                            <p className="text-[10px] text-danger mt-1 max-w-[200px]">
                              {claim.denialReason}
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Denials alert */}
      {denialCount > 0 && activeStatus === "all" && (
        <Card tone="raised" className="mt-8 border-l-4 border-l-danger">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span>⚠️</span>
              {denialCount} denied claim{denialCount !== 1 ? "s" : ""} need
              attention
            </CardTitle>
            <CardDescription>
              Review denial reasons, correct the coding or documentation, and
              resubmit or appeal within the payer&apos;s window.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/ops/billing?status=denied"
              className="inline-flex items-center gap-2 text-sm font-medium text-danger hover:text-danger/80 transition-colors"
            >
              View denials &rarr;
            </Link>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FilterTab({
  label,
  count,
  active,
  href,
  tone = "neutral",
}: {
  label: string;
  count: number;
  active: boolean;
  href: string;
  tone?: "success" | "warning" | "danger" | "neutral" | "accent" | "info";
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
        active
          ? "bg-accent text-accent-ink shadow-sm"
          : "bg-surface-muted text-text-muted hover:bg-surface-raised border border-border"
      }`}
    >
      {label}
      <span
        className={`text-[10px] tabular-nums px-1.5 py-0.5 rounded-full ${
          active
            ? "bg-accent-ink/20 text-accent-ink"
            : "bg-surface text-text-subtle"
        }`}
      >
        {count}
      </span>
    </Link>
  );
}
