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
import { Eyebrow, EditorialRule } from "@/components/ui/ornament";
import { formatDate, formatRelative } from "@/lib/utils/format";
import { formatMoney } from "@/lib/domain/billing";
import {
  classifyDenial,
  NEXT_ACTION_LABEL,
  type DenialCategory,
} from "@/lib/billing/denials";

export const metadata = { title: "Denials Command Center" };

const URGENCY_TONE: Record<string, "danger" | "warning" | "neutral"> = {
  high: "danger",
  medium: "warning",
  low: "neutral",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function DenialsPage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const user = await requireUser();
  const organizationId = user.organizationId!;
  const activeCategory = searchParams.category ?? "all";

  const claims = await prisma.claim.findMany({
    where: {
      organizationId,
      status: { in: ["denied", "appealed"] },
    },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
      provider: {
        include: { user: { select: { firstName: true, lastName: true } } },
      },
    },
    orderBy: { deniedAt: "desc" },
    take: 100,
  });

  // Classify each denial
  const triaged = claims.map((claim) => ({
    claim,
    triage: classifyDenial(claim.denialReason),
  }));

  // Filter by category if active
  const filtered =
    activeCategory === "all"
      ? triaged
      : triaged.filter((t) => t.triage.category === activeCategory);

  // Stats by category
  const categoryCounts: Record<string, number> = {};
  const categoryDollars: Record<string, number> = {};
  for (const t of triaged) {
    categoryCounts[t.triage.category] = (categoryCounts[t.triage.category] ?? 0) + 1;
    categoryDollars[t.triage.category] =
      (categoryDollars[t.triage.category] ?? 0) + t.claim.billedAmountCents;
  }

  // Top categories sorted by count
  const sortedCategories = Object.entries(categoryCounts).sort(
    ([, a], [, b]) => b - a,
  );

  // Hero stats
  const totalDenials = triaged.length;
  const totalDollars = triaged.reduce(
    (acc, t) => acc + t.claim.billedAmountCents,
    0,
  );
  const highUrgencyCount = triaged.filter(
    (t) => t.triage.urgency === "high",
  ).length;

  // Payer denial mix
  const payerCounts: Record<string, number> = {};
  for (const t of triaged) {
    if (t.claim.payerName) {
      payerCounts[t.claim.payerName] =
        (payerCounts[t.claim.payerName] ?? 0) + 1;
    }
  }
  const topPayers = Object.entries(payerCounts).sort(([, a], [, b]) => b - a);

  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Practice management"
        title="Denials command center"
        description="Every denied claim, classified and routed to a next action. Work the worklist top-down — the urgent ones are surfaced first."
      />

      {/* Hero stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Open denials"
          value={totalDenials.toString()}
          tone={totalDenials > 0 ? "danger" : "neutral"}
        />
        <StatCard
          label="High urgency"
          value={highUrgencyCount.toString()}
          tone={highUrgencyCount > 0 ? "danger" : "success"}
        />
        <StatCard
          label="Total at risk"
          value={formatMoney(totalDollars)}
          tone="warning"
        />
        <StatCard
          label="Recovery target"
          value={formatMoney(Math.round(totalDollars * 0.6))}
          tone="accent"
          hint="60% baseline recovery rate"
        />
      </div>

      {/* Top categories */}
      {sortedCategories.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card tone="raised">
            <CardHeader>
              <CardTitle className="text-base">Denial root causes</CardTitle>
              <CardDescription>
                Trends by category. Fix upstream and these stop coming back.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sortedCategories.map(([category, count]) => {
                  const dollars = categoryDollars[category] ?? 0;
                  const pct = totalDenials > 0 ? Math.round((count / totalDenials) * 100) : 0;
                  return (
                    <div key={category}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm text-text capitalize">
                          {category.replace(/_/g, " ")}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-text-muted tabular-nums">
                            {formatMoney(dollars)}
                          </span>
                          <Badge tone="warning" className="text-[10px]">
                            {count}
                          </Badge>
                        </div>
                      </div>
                      <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-danger rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card tone="raised">
            <CardHeader>
              <CardTitle className="text-base">Denial mix by payer</CardTitle>
              <CardDescription>
                Who&apos;s denying you the most.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topPayers.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-4">
                  No payer data yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {topPayers.map(([payer, count]) => (
                    <div
                      key={payer}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm text-text">{payer}</span>
                      <Badge tone="warning">{count}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <EditorialRule className="my-8" />

      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <FilterTab
          label="All denials"
          count={totalDenials}
          active={activeCategory === "all"}
          href="/ops/denials"
        />
        {sortedCategories.map(([category, count]) => (
          <FilterTab
            key={category}
            label={category.replace(/_/g, " ")}
            count={count}
            active={activeCategory === category}
            href={`/ops/denials?category=${category}`}
          />
        ))}
      </div>

      {/* Worklist */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No denials in this view"
          description="When payers deny claims, they'll show up here classified and ready to work."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(({ claim, triage }) => (
            <Card
              key={claim.id}
              tone="raised"
              className={
                triage.urgency === "high"
                  ? "border-l-4 border-l-danger"
                  : "border-l-4 border-l-[color:var(--warning)]"
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
                        href={`/clinic/patients/${claim.patient.id}/billing`}
                        className="text-sm font-medium text-text hover:text-accent transition-colors"
                      >
                        {claim.patient.firstName} {claim.patient.lastName}
                      </Link>
                      <p className="text-[11px] text-text-subtle">
                        {formatDate(claim.serviceDate)} · {claim.payerName} · {claim.claimNumber}
                      </p>
                      {claim.deniedAt && (
                        <p className="text-[11px] text-text-subtle">
                          Denied {formatRelative(claim.deniedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-xl text-text tabular-nums">
                      {formatMoney(claim.billedAmountCents)}
                    </p>
                    <Badge
                      tone={URGENCY_TONE[triage.urgency]}
                      className="text-[10px] mt-1"
                    >
                      {triage.urgency} urgency
                    </Badge>
                  </div>
                </div>

                {/* Triage box */}
                <div className="bg-danger/[0.04] border border-danger/15 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge tone="danger" className="text-[9px]">
                      {triage.label}
                    </Badge>
                    <span className="font-mono text-[10px] text-text-subtle">
                      {triage.category}
                    </span>
                  </div>
                  <p className="text-sm text-text leading-snug mb-2">
                    {triage.description}
                  </p>
                  {claim.denialReason && (
                    <p className="text-xs text-text-muted italic">
                      Payer message: &ldquo;{claim.denialReason}&rdquo;
                    </p>
                  )}
                </div>

                {/* Suggested action */}
                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <span>Suggested action:</span>
                    <Badge tone="accent">
                      {NEXT_ACTION_LABEL[triage.suggestedAction]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/clinic/patients/${claim.patient.id}/billing`}
                      className="text-xs text-text-muted hover:text-text"
                    >
                      Open chart
                    </Link>
                    <button className="text-xs font-medium px-3 py-1.5 rounded-md bg-accent text-accent-ink hover:bg-accent/90">
                      Take action
                    </button>
                  </div>
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
        <p className={`font-display text-3xl tabular-nums ${colors[tone]}`}>
          {value}
        </p>
        <p className="text-xs text-text-muted mt-1">{label}</p>
        {hint && <p className="text-[10px] text-text-subtle mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function FilterTab({
  label,
  count,
  active,
  href,
}: {
  label: string;
  count: number;
  active: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-all ${
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
