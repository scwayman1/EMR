import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Eyebrow, EditorialRule, LeafSprig } from "@/components/ui/ornament";
import { Button } from "@/components/ui/button";
import { formatRelative } from "@/lib/utils/format";

export const metadata = { title: "Revenue Cockpit" };

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
  scrubbing: "var(--text-subtle)",
  scrub_blocked: "var(--warning)",
  ready: "var(--accent)",
  submitted: "var(--info)",
  ch_rejected: "var(--danger)",
  pending: "var(--highlight)",
  accepted: "var(--info)",
  adjudicated: "var(--accent)",
  paid: "var(--success)",
  partial: "var(--accent)",
  denied: "var(--danger)",
  appealed: "var(--highlight)",
  closed: "var(--success)",
  voided: "var(--border-strong)",
  written_off: "var(--border-strong)",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  scrubbing: "Scrubbing",
  scrub_blocked: "Blocked",
  ready: "Ready",
  submitted: "Submitted",
  ch_rejected: "Rejected",
  pending: "Pending",
  accepted: "Accepted",
  adjudicated: "Adjudicated",
  paid: "Paid",
  partial: "Partial",
  denied: "Denied",
  appealed: "Appealed",
  closed: "Closed",
  voided: "Voided",
  written_off: "Written off",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function RevenuePage() {
  const user = await requireUser();
  const organizationId = user.organizationId!;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);

  const [byStatus, byProvider, byPayer, recent30Days, topCptCodes, deniedClaims, arAging, recentEscalations] = await Promise.all([
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
    // Denied claims for the denial queue (ranked by amount)
    prisma.claim.findMany({
      where: { organizationId, status: { in: ["denied", "partial", "appealed"] } },
      orderBy: { billedAmountCents: "desc" },
      take: 15,
      include: {
        patient: { select: { firstName: true, lastName: true } },
        denialEvents: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    // AR aging buckets: claims submitted but not yet paid/closed
    prisma.claim.findMany({
      where: {
        organizationId,
        status: { in: ["submitted", "accepted", "adjudicated", "pending", "partial", "denied", "appealed"] },
      },
      select: { id: true, billedAmountCents: true, submittedAt: true, status: true },
    }),
    // Recent escalation cases
    prisma.escalationCase.findMany({
      where: { organizationId, status: { in: ["open", "assigned", "in_review"] } },
      orderBy: { createdAt: "desc" },
      take: 8,
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
        eyebrow="Revenue Cockpit"
        title="Billing command center"
        description="Claims funnel, AR aging, denial queue, payer performance, and KPIs — the single view for practice revenue."
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

      {/* ── Claims Funnel (Layer 10 §1) ─────────────────────── */}
      <div className="mb-10">
        <Eyebrow className="mb-4">Claims funnel</Eyebrow>
        <Card tone="raised">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-end gap-1 h-32">
              {[
                { label: "Coded", statuses: ["draft", "scrubbing", "scrub_blocked", "ready"] },
                { label: "Submitted", statuses: ["submitted", "ch_rejected"] },
                { label: "Processing", statuses: ["accepted", "adjudicated", "pending"] },
                { label: "Paid", statuses: ["paid", "closed"] },
                { label: "Denied", statuses: ["denied", "appealed", "partial"] },
              ].map((stage) => {
                const count = byStatus
                  .filter((s) => stage.statuses.includes(s.status))
                  .reduce((a, s) => a + s._count, 0);
                const maxCount = Math.max(1, ...byStatus.map((s) => s._count));
                const heightPct = Math.max(8, (count / maxCount) * 100);
                const isDenied = stage.label === "Denied";
                return (
                  <div key={stage.label} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[11px] font-display tabular-nums text-text">
                      {count}
                    </span>
                    <div
                      className={`w-full rounded-t-md transition-all ${
                        isDenied ? "bg-danger/70" : "bg-accent/70"
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[10px] text-text-subtle">{stage.label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── AR Aging (Layer 10 §3) ───────────────────────────── */}
      {(() => {
        const now = Date.now();
        const buckets = { "0-30": { count: 0, cents: 0 }, "31-60": { count: 0, cents: 0 }, "61-90": { count: 0, cents: 0 }, "90+": { count: 0, cents: 0 } };
        for (const c of arAging) {
          const days = c.submittedAt ? Math.floor((now - c.submittedAt.getTime()) / 86_400_000) : 0;
          const key = days <= 30 ? "0-30" : days <= 60 ? "31-60" : days <= 90 ? "61-90" : "90+";
          buckets[key].count++;
          buckets[key].cents += c.billedAmountCents;
        }
        const totalAR = Object.values(buckets).reduce((a, b) => a + b.cents, 0);
        return (
          <div className="mb-10">
            <Eyebrow className="mb-4">AR aging</Eyebrow>
            <div className="grid grid-cols-4 gap-3">
              {(Object.entries(buckets) as [string, { count: number; cents: number }][]).map(
                ([label, data]) => {
                  const isOld = label === "90+";
                  const pct = totalAR > 0 ? Math.round((data.cents / totalAR) * 100) : 0;
                  return (
                    <Card key={label} className={isOld ? "border-l-4 border-l-danger" : ""}>
                      <CardContent className="pt-5 pb-5">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-text-subtle">
                          {label} days
                        </p>
                        <p className={`font-display text-2xl tabular-nums mt-1 ${isOld ? "text-danger" : "text-text"}`}>
                          {formatMoney(data.cents)}
                        </p>
                        <p className="text-[11px] text-text-muted mt-1">
                          {data.count} claim{data.count !== 1 ? "s" : ""} · {pct}% of AR
                        </p>
                      </CardContent>
                    </Card>
                  );
                },
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Denial Queue (Layer 10 §2) ───────────────────────── */}
      {deniedClaims.length > 0 && (
        <div className="mb-10">
          <Eyebrow className="mb-4">Denial queue — ranked by recoverable dollars</Eyebrow>
          <Card tone="raised">
            <CardContent className="pt-4 pb-4">
              <div className="space-y-2">
                {deniedClaims.map((claim: any) => {
                  const denial = claim.denialEvents?.[0];
                  return (
                    <Link
                      key={claim.id}
                      href={`/clinic/patients/${claim.patientId}?tab=billing`}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-muted transition-colors"
                    >
                      <span
                        className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                          claim.status === "denied" ? "bg-danger" : claim.status === "appealed" ? "bg-[color:var(--warning)]" : "bg-accent"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-text">
                            {claim.patient.firstName} {claim.patient.lastName}
                          </span>
                          <Badge tone={claim.status === "denied" ? "danger" : "warning"} className="text-[9px]">
                            {STATUS_LABEL[claim.status] ?? claim.status}
                          </Badge>
                          {denial && (
                            <span className="text-[10px] text-text-subtle">
                              CARC {denial.carcCode}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-muted">
                          {claim.claimNumber ?? claim.id.slice(0, 8)} · {claim.payerName ?? "Unknown payer"}
                        </p>
                      </div>
                      <span className="font-display text-sm tabular-nums text-danger shrink-0">
                        {formatMoneyPrecise(claim.billedAmountCents - claim.paidAmountCents)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Escalations Queue (Layer 10 §6) ──────────────────── */}
      {recentEscalations.length > 0 && (
        <div className="mb-10">
          <Eyebrow className="mb-4">Open escalations</Eyebrow>
          <Card tone="raised">
            <CardContent className="pt-4 pb-4">
              <div className="space-y-2">
                {recentEscalations.map((esc: any) => (
                  <div
                    key={esc.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border-l-3 ${
                      esc.tier === "tier_3" ? "border-l-danger bg-danger/[0.03]" :
                      esc.tier === "tier_2" ? "border-l-[color:var(--warning)] bg-[color:var(--warning)]/[0.03]" :
                      "border-l-accent/40"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge
                          tone={esc.tier === "tier_3" ? "danger" : esc.tier === "tier_2" ? "warning" : "accent"}
                          className="text-[9px]"
                        >
                          {esc.tier.replace("_", " ")}
                        </Badge>
                        <Badge tone="neutral" className="text-[9px]">
                          {esc.category.replace(/_/g, " ")}
                        </Badge>
                        <Badge
                          tone={esc.status === "open" ? "warning" : "accent"}
                          className="text-[9px]"
                        >
                          {esc.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-text mt-1 line-clamp-1">{esc.summary}</p>
                      <p className="text-[10px] text-text-subtle mt-0.5">
                        from {esc.sourceAgent} · {formatRelative(esc.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
