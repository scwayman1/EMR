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
import type { EraFileStatus } from "@prisma/client";

export const metadata = { title: "ERA Inbox" };

const STATUS_TONE: Record<EraFileStatus, "success" | "accent" | "warning" | "danger" | "neutral"> = {
  posted: "success",
  parsed: "accent",
  received: "neutral",
  failed: "danger",
  duplicate: "warning",
};

export default async function EraInboxPage() {
  const user = await requireUser();
  const organizationId = user.organizationId!;

  const [files, totals] = await Promise.all([
    prisma.eraFile.findMany({
      where: { organizationId },
      orderBy: { receivedAt: "desc" },
      take: 100,
      include: { _count: { select: { adjudications: true } } },
    }),
    prisma.eraFile.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: { _all: true },
      _sum: { totalAmountCents: true },
    }),
  ]);

  const totalsByStatus = Object.fromEntries(
    totals.map((t) => [t.status, { count: t._count._all, sum: t._sum.totalAmountCents ?? 0 }]),
  ) as Record<EraFileStatus, { count: number; sum: number }>;

  const totalReceivedCents = files.reduce((a, f) => a + f.totalAmountCents, 0);

  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Track 7 · Financial Ops"
        title="ERA inbox"
        description="Raw 835 / EFT remittances from the clearinghouse. Each row is one check; dedupe is by (payer, check#) plus a content-hash fallback."
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StatCard label="Posted" value={String(totalsByStatus.posted?.count ?? 0)} hint={formatMoney(totalsByStatus.posted?.sum ?? 0)} tone="success" />
        <StatCard label="Parsed" value={String(totalsByStatus.parsed?.count ?? 0)} hint={formatMoney(totalsByStatus.parsed?.sum ?? 0)} tone="accent" />
        <StatCard label="Received" value={String(totalsByStatus.received?.count ?? 0)} hint={formatMoney(totalsByStatus.received?.sum ?? 0)} />
        <StatCard label="Failed" value={String(totalsByStatus.failed?.count ?? 0)} hint={formatMoney(totalsByStatus.failed?.sum ?? 0)} tone="danger" />
        <StatCard label="Duplicate" value={String(totalsByStatus.duplicate?.count ?? 0)} tone="warning" />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <Eyebrow>Latest 100 ERAs · {formatMoney(totalReceivedCents)} cumulative</Eyebrow>
      </div>

      {files.length === 0 ? (
        <EmptyState
          title="No ERAs yet"
          description="When the clearinghouse adapter ingests an 835, it lands here. Each row links to the parsed line items."
        />
      ) : (
        <div className="space-y-2">
          {files.map((f) => (
            <Card key={f.id} tone="raised">
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-text">{f.payerName}</span>
                      <Badge tone={STATUS_TONE[f.status]}>{f.status}</Badge>
                      {f._count.adjudications > 0 && (
                        <span className="text-[11px] text-text-subtle">
                          {f._count.adjudications} claims
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-text-subtle">
                      Trace {f.checkNumber} · {f.paymentMethod.toUpperCase()} · check date {formatDate(f.checkDate)} · received {formatDate(f.receivedAt)}
                    </p>
                    {f.parseError && (
                      <p className="text-[11px] text-danger mt-1">Parse error: {f.parseError}</p>
                    )}
                  </div>
                  <div className="text-right w-32">
                    <p className="font-display text-base text-text tabular-nums">
                      {formatMoney(f.totalAmountCents)}
                    </p>
                    <p className="text-[10px] text-text-subtle">
                      {f.parsedAt ? `parsed ${formatDate(f.parsedAt)}` : "not yet parsed"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card tone="raised" className="mt-8">
        <CardHeader>
          <CardTitle className="text-sm">How ingestion works</CardTitle>
          <CardDescription>EMR-221 — ERA / 835 ingestion pipeline</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-text-muted">
          <p>
            Files arrive via clearinghouse SFTP / API (EMR-217 adapter). Each payload is hashed
            and deduped before parsing — a retried delivery never double-posts. Parsed files
            create <code>AdjudicationResult</code> rows and fire <code>adjudication.received</code>
            events, which the adjudication agent picks up to update claim balances and write
            <code>FinancialEvent</code> entries.
          </p>
          <p>
            <strong>PLB</strong> (provider-level adjustments — refunds, forward balances,
            takebacks) are posted as separate ledger entries and surface here under "Failed"
            when reconciliation can't tie them to a claim.
          </p>
        </CardContent>
      </Card>
    </PageShell>
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
        <p className={`font-display text-2xl tabular-nums ${colors[tone]}`}>{value}</p>
        <p className="text-xs text-text-muted mt-1">{label}</p>
        {hint && <p className="text-[10px] text-text-subtle mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}
