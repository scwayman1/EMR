import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow } from "@/components/ui/ornament";
import { formatMoney } from "@/lib/domain/billing";
import { formatDate } from "@/lib/utils/format";
import type { BankDepositStatus } from "@prisma/client";

export const metadata = { title: "Lockbox reconciliation" };

const STATUS_TONE: Record<BankDepositStatus, "success" | "warning" | "danger" | "neutral" | "accent"> = {
  matched: "success",
  partially_matched: "warning",
  variance: "danger",
  unmatched: "danger",
  pending: "neutral",
};

export default async function LockboxPage() {
  const user = await requireUser();
  const organizationId = user.organizationId!;

  const [deposits, statusTotals] = await Promise.all([
    prisma.bankDeposit.findMany({
      where: { organizationId },
      orderBy: { depositDate: "desc" },
      take: 100,
      include: {
        bankAccount: { select: { name: true, last4: true } },
        matches: { select: { id: true, amountCents: true, eraFileId: true, paymentId: true } },
      },
    }),
    prisma.bankDeposit.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: { _all: true },
      _sum: { amountCents: true },
    }),
  ]);

  const totals = Object.fromEntries(
    statusTotals.map((t) => [t.status, { count: t._count._all, sum: t._sum.amountCents ?? 0 }]),
  ) as Record<BankDepositStatus, { count: number; sum: number }>;

  const totalDeposited = deposits.reduce((a, d) => a + d.amountCents, 0);
  const totalMatched = deposits.reduce((a, d) => a + d.matchedAmountCents, 0);
  const matchRate = totalDeposited > 0 ? Math.round((totalMatched / totalDeposited) * 100) : 0;

  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Track 7 · Financial Ops"
        title="Lockbox reconciliation"
        description="Match every bank deposit to one or more ERAs / patient payments. Variance lands on the daily close exception list."
      />

      <div className="mb-6 flex justify-end">
        <Link
          href="/ops/lockbox/reconcile"
          className="inline-flex items-center justify-center rounded-md bg-accent text-accent-ink px-4 h-9 text-sm font-medium hover:bg-accent-strong"
        >
          + Upload bank CSV
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Match rate" value={`${matchRate}%`} tone={matchRate >= 95 ? "success" : matchRate >= 80 ? "accent" : "warning"} hint={`${formatMoney(totalMatched)} of ${formatMoney(totalDeposited)}`} />
        <StatCard label="Matched" value={String(totals.matched?.count ?? 0)} hint={formatMoney(totals.matched?.sum ?? 0)} tone="success" />
        <StatCard label="Partial" value={String(totals.partially_matched?.count ?? 0)} hint={formatMoney(totals.partially_matched?.sum ?? 0)} tone="warning" />
        <StatCard label="Unmatched / variance" value={String((totals.unmatched?.count ?? 0) + (totals.variance?.count ?? 0))} hint={formatMoney((totals.unmatched?.sum ?? 0) + (totals.variance?.sum ?? 0))} tone="danger" />
      </div>

      <div className="mb-4">
        <Eyebrow>Recent deposits</Eyebrow>
      </div>

      {deposits.length === 0 ? (
        <EmptyState
          title="No deposits ingested"
          description="Upload a bank statement (CSV / OFX / BAI2) to seed the matcher."
        />
      ) : (
        <div className="space-y-2">
          {deposits.map((d) => (
            <Card key={d.id} tone="raised">
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-text">{d.bankAccount?.name ?? "Unassigned account"}</span>
                      <Badge tone={STATUS_TONE[d.status]}>{d.status}</Badge>
                      <span className="text-[11px] text-text-subtle uppercase">{d.source}</span>
                    </div>
                    <p className="text-[11px] text-text-subtle">
                      {formatDate(d.depositDate)} · ref {d.bankReference}
                      {d.matches.length > 0 && ` · ${d.matches.length} match${d.matches.length === 1 ? "" : "es"}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-base text-text tabular-nums">
                      {formatMoney(d.amountCents)}
                    </p>
                    {d.matchedAmountCents > 0 && d.matchedAmountCents !== d.amountCents && (
                      <p className="text-[11px] text-[color:var(--warning)] tabular-nums">
                        matched {formatMoney(d.matchedAmountCents)}
                      </p>
                    )}
                    {d.varianceCents !== null && d.varianceCents !== 0 && (
                      <p className="text-[11px] text-danger tabular-nums">
                        Δ {formatMoney(Math.abs(d.varianceCents))}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card tone="raised" className="mt-8">
        <CardHeader>
          <CardTitle className="text-sm">Matcher behaviour</CardTitle>
          <CardDescription>EMR-224 — Lockbox / bank-deposit matching</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-text-muted">
          <p>
            Each deposit looks for candidates within ± 5 days. Exact single-candidate match wins
            outright; otherwise a largest-first greedy fill consumes ERAs / patient payments
            until the deposit is satisfied within 2¢ tolerance. Partial matches flag for human
            review on the daily close.
          </p>
        </CardContent>
      </Card>
    </PageShell>
  );
}

function StatCard({ label, value, tone = "neutral", hint }: { label: string; value: string; tone?: "neutral" | "success" | "warning" | "danger" | "accent"; hint?: string }) {
  const colors: Record<string, string> = { neutral: "text-text", success: "text-success", warning: "text-[color:var(--warning)]", danger: "text-danger", accent: "text-accent" };
  return (
    <Card tone="raised">
      <CardContent className="pt-5 pb-5">
        <p className={`font-display text-2xl tabular-nums ${colors[tone]}`}>{value}</p>
        <p className="text-xs text-text-muted mt-1">{label}</p>
        {hint && <p className="text-[10px] text-text-subtle mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}
