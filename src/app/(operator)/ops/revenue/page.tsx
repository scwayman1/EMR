import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Eyebrow, EditorialRule, LeafSprig } from "@/components/ui/ornament";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Revenue Dashboard" };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatMoneyPrecise(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

const STATUS_COLORS: Record<string, string> = {
  draft: "var(--text-subtle)",
  submitted: "var(--info)",
  pending: "var(--highlight)",
  paid: "var(--success)",
  partial: "var(--accent)",
  denied: "var(--danger)",
  appealed: "var(--highlight)",
  written_off: "var(--border-strong)",
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

export default async function RevenuePage() {
  const user = await requireUser();
  const organizationId = user.organizationId!;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);

  const [byStatus, byProvider, byPayer, recent30Days, topCptCodes] = await Promise.all([
    // Claims grouped by status (all-time)
    prisma.claim.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: true,
      _sum: { billedAmountCents: true, paidAmountCents: true },
    }),
    // Claims grouped by provider
    prisma.claim.groupBy({
      by: ["providerId"],
      where: { organizationId },
      _count: true,
      _sum: { billedAmountCents: true, paidAmountCents: true },
    }),
    // Claims grouped by payer
    prisma.claim.groupBy({
      by: ["payerName"],
      where: { organizationId },
      _count: true,
      _sum: { billedAmountCents: true, paidAmountCents: true },
    }),
    // Last 30 days
    prisma.claim.aggregate({
      where: { organizationId, serviceDate: { gte: thirtyDaysAgo } },
      _count: true,
      _sum: { billedAmountCents: true, paidAmountCents: true },
    }),
    // All claims to extract top CPT codes
    prisma.claim.findMany({
      where: { organizationId },
      select: { cptCodes: true },
      take: 200,
    }),
  ]);

  // Lookup providers
  const providerIds = byProvider.map((p) => p.providerId).filter(Boolean) as string[];
  const providers = await prisma.provider.findMany({
    where: { id: { in: providerIds } },
    include: { user: { select: { firstName: true, lastName: true } } },
  });
  const providerMap = Object.fromEntries(providers.map((p) => [p.id, p]));

  // Top CPT codes by frequency
  const cptCounts: Record<string, { count: number; revenue: number; label: string }> = {};
  for (const claim of topCptCodes) {
    const codes = claim.cptCodes as Array<{ code: string; label: string; chargeAmount?: number }>;
    for (const c of codes) {
      if (!cptCounts[c.code]) {
        cptCounts[c.code] = { count: 0, revenue: 0, label: c.label };
      }
      cptCounts[c.code].count++;
      cptCounts[c.code].revenue += c.chargeAmount ?? 0;
    }
  }
  const topCodes = Object.entries(cptCounts)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 6);

  const totalBilled = byStatus.reduce(
    (acc, s) => acc + (s._sum.billedAmountCents ?? 0),
    0,
  );
  const totalPaid = byStatus.reduce(
    (acc, s) => acc + (s._sum.paidAmountCents ?? 0),
    0,
  );
  const collectionRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;
  const month30Billed = recent30Days._sum.billedAmountCents ?? 0;
  const month30Paid = recent30Days._sum.paidAmountCents ?? 0;

  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Practice management"
        title="Revenue dashboard"
        description="Real-time view of practice financials — billed, collected, outstanding, by provider and payer."
        actions={
          <Link href="/ops/billing">
            <Button variant="secondary" size="sm">
              Billing workqueue
            </Button>
          </Link>
        }
      />

      {/* Hero stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <Card tone="raised">
          <CardContent className="pt-6 pb-6">
            <p className="text-xs text-text-subtle uppercase tracking-wider">
              Total billed
            </p>
            <p className="font-display text-3xl text-text tabular-nums mt-1">
              {formatMoney(totalBilled)}
            </p>
            <p className="text-[11px] text-text-subtle mt-2">
              {byStatus.reduce((a, s) => a + s._count, 0)} claims all-time
            </p>
          </CardContent>
        </Card>
        <Card tone="raised">
          <CardContent className="pt-6 pb-6">
            <p className="text-xs text-text-subtle uppercase tracking-wider">
              Collected
            </p>
            <p className="font-display text-3xl text-success tabular-nums mt-1">
              {formatMoney(totalPaid)}
            </p>
            <p className="text-[11px] text-text-subtle mt-2">
              {collectionRate}% collection rate
            </p>
          </CardContent>
        </Card>
        <Card tone="raised">
          <CardContent className="pt-6 pb-6">
            <p className="text-xs text-text-subtle uppercase tracking-wider">
              Last 30 days
            </p>
            <p className="font-display text-3xl text-accent tabular-nums mt-1">
              {formatMoney(month30Billed)}
            </p>
            <p className="text-[11px] text-text-subtle mt-2">
              {recent30Days._count} visits · {formatMoney(month30Paid)} collected
            </p>
          </CardContent>
        </Card>
        <Card tone="raised">
          <CardContent className="pt-6 pb-6">
            <p className="text-xs text-text-subtle uppercase tracking-wider">
              Outstanding
            </p>
            <p className="font-display text-3xl text-[color:var(--warning)] tabular-nums mt-1">
              {formatMoney(totalBilled - totalPaid)}
            </p>
            <p className="text-[11px] text-text-subtle mt-2">
              Billed but not yet collected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Claim status breakdown */}
      <div className="mb-10">
        <Eyebrow className="mb-4">Claim status breakdown</Eyebrow>
        <Card tone="raised">
          <CardContent className="pt-6 pb-6">
            <div className="space-y-3">
              {byStatus.map((s) => {
                const pct =
                  totalBilled > 0
                    ? Math.round(
                        ((s._sum.billedAmountCents ?? 0) / totalBilled) * 100,
                      )
                    : 0;
                return (
                  <div key={s.status}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: STATUS_COLORS[s.status] }}
                        />
                        <span className="text-sm font-medium text-text">
                          {STATUS_LABEL[s.status]}
                        </span>
                        <span className="text-xs text-text-subtle">
                          ({s._count})
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-text-muted tabular-nums">
                          {formatMoneyPrecise(s._sum.billedAmountCents ?? 0)}
                        </span>
                        <span className="text-xs text-text-subtle tabular-nums w-10 text-right">
                          {pct}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: STATUS_COLORS[s.status],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <EditorialRule className="my-10" />

      {/* Provider productivity */}
      <div className="mb-10">
        <Eyebrow className="mb-4">Provider productivity</Eyebrow>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {byProvider.map((pg) => {
            const provider = pg.providerId ? providerMap[pg.providerId] : null;
            if (!provider) return null;
            const billed = pg._sum.billedAmountCents ?? 0;
            const paid = pg._sum.paidAmountCents ?? 0;
            const rate = billed > 0 ? Math.round((paid / billed) * 100) : 0;
            return (
              <Card key={pg.providerId} tone="raised" className="card-hover">
                <CardContent className="pt-6 pb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar
                      firstName={provider.user.firstName}
                      lastName={provider.user.lastName}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-base text-text truncate">
                        {provider.user.firstName} {provider.user.lastName}
                      </p>
                      <p className="text-xs text-text-subtle truncate">
                        {provider.title ?? "Provider"}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] text-text-subtle uppercase tracking-wider">
                        Claims
                      </p>
                      <p className="font-display text-xl text-text tabular-nums mt-0.5">
                        {pg._count}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-subtle uppercase tracking-wider">
                        Billed
                      </p>
                      <p className="font-display text-xl text-text tabular-nums mt-0.5">
                        {formatMoney(billed)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-subtle uppercase tracking-wider">
                        Collected
                      </p>
                      <p className="font-display text-xl text-success tabular-nums mt-0.5">
                        {rate}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Payer mix */}
      <div className="mb-10">
        <Eyebrow className="mb-4">Payer mix</Eyebrow>
        <Card tone="raised">
          <CardContent className="pt-6 pb-6">
            <div className="space-y-4">
              {byPayer
                .filter((p) => p.payerName)
                .sort(
                  (a, b) =>
                    (b._sum.billedAmountCents ?? 0) -
                    (a._sum.billedAmountCents ?? 0),
                )
                .map((p) => {
                  const pct =
                    totalBilled > 0
                      ? Math.round(
                          ((p._sum.billedAmountCents ?? 0) / totalBilled) * 100,
                        )
                      : 0;
                  return (
                    <div key={p.payerName} className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text truncate">
                          {p.payerName}
                        </p>
                        <p className="text-[11px] text-text-subtle">
                          {p._count} claim{p._count !== 1 ? "s" : ""} · {formatMoneyPrecise(p._sum.paidAmountCents ?? 0)} collected
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-32 bg-surface-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-sm text-text tabular-nums w-20 text-right">
                          {formatMoney(p._sum.billedAmountCents ?? 0)}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top CPT codes */}
      <div>
        <Eyebrow className="mb-4">Top billed codes</Eyebrow>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {topCodes.map(([code, data]) => (
            <Card key={code} tone="raised">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm text-accent font-medium">
                      {code}
                    </p>
                    <p className="text-xs text-text-muted mt-1 leading-snug line-clamp-2">
                      {data.label}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display text-lg text-text tabular-nums">
                      {data.count}
                    </p>
                    <p className="text-[10px] text-text-subtle">used</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
