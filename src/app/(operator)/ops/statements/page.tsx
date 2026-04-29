import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow } from "@/components/ui/ornament";
import { formatMoney } from "@/lib/domain/billing";
import { formatDate } from "@/lib/utils/format";
import type { StatementStatus } from "@prisma/client";

export const metadata = { title: "Patient statements" };

const STATUS_TONE: Record<StatementStatus, "success" | "warning" | "danger" | "neutral" | "accent"> = {
  draft: "neutral",
  sent: "accent",
  viewed: "accent",
  partially_paid: "warning",
  paid: "success",
  overdue: "danger",
  disputed: "danger",
  voided: "neutral",
};

export default async function StatementsPage() {
  const user = await requireUser();
  const organizationId = user.organizationId!;

  const [statements, totals] = await Promise.all([
    prisma.statement.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.statement.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: { _all: true },
      _sum: { amountDueCents: true, paidToDateCents: true },
    }),
  ]);

  const byStatus = Object.fromEntries(
    totals.map((t) => [t.status, { count: t._count._all, due: t._sum.amountDueCents ?? 0, paid: t._sum.paidToDateCents ?? 0 }]),
  ) as Record<StatementStatus, { count: number; due: number; paid: number }>;

  const totalOutstanding =
    (byStatus.sent?.due ?? 0) + (byStatus.viewed?.due ?? 0) + (byStatus.partially_paid?.due ?? 0) + (byStatus.overdue?.due ?? 0);
  const totalPaid = (byStatus.paid?.paid ?? 0) + (byStatus.partially_paid?.paid ?? 0);

  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Track 7 · Financial Ops"
        title="Patient statements"
        description="30-day cycle from first patient-responsibility posting until paid. Multi-channel delivery via the reminder pipeline."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Outstanding" value={formatMoney(totalOutstanding)} tone="warning" hint={`${(byStatus.sent?.count ?? 0) + (byStatus.viewed?.count ?? 0) + (byStatus.partially_paid?.count ?? 0) + (byStatus.overdue?.count ?? 0)} statements live`} />
        <StatCard label="Collected (lifetime)" value={formatMoney(totalPaid)} tone="success" />
        <StatCard label="Overdue" value={String(byStatus.overdue?.count ?? 0)} tone="danger" hint={formatMoney(byStatus.overdue?.due ?? 0)} />
        <StatCard label="Disputed" value={String(byStatus.disputed?.count ?? 0)} tone="danger" hint={formatMoney(byStatus.disputed?.due ?? 0)} />
      </div>

      <div className="mb-4">
        <Eyebrow>Latest 100 statements</Eyebrow>
      </div>

      {statements.length === 0 ? (
        <EmptyState
          title="No statements yet"
          description="Statements generate automatically 30 days after a claim's patient-responsibility line is posted."
        />
      ) : (
        <div className="space-y-2">
          {statements.map((s) => (
            <Card key={s.id} tone="raised">
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <Avatar firstName={s.patient.firstName} lastName={s.patient.lastName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Link href={`/clinic/patients/${s.patient.id}/billing`} className="text-sm font-medium text-text hover:text-accent">
                        {s.patient.firstName} {s.patient.lastName}
                      </Link>
                      <Badge tone={STATUS_TONE[s.status]}>{s.status}</Badge>
                      <span className="text-[11px] text-text-subtle">{s.statementNumber}</span>
                    </div>
                    <p className="text-[11px] text-text-subtle">
                      {formatDate(s.periodStart)} – {formatDate(s.periodEnd)} · due {formatDate(s.dueDate)}
                      {s.sentAt && ` · sent ${formatDate(s.sentAt)} via ${s.deliveryMethod}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-base text-text tabular-nums">{formatMoney(s.amountDueCents)}</p>
                    {s.paidToDateCents > 0 && (
                      <p className="text-[11px] text-success tabular-nums">{formatMoney(s.paidToDateCents)} paid</p>
                    )}
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
