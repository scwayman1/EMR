import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow } from "@/components/ui/ornament";
import { formatMoney } from "@/lib/domain/billing";
import { formatDate } from "@/lib/utils/format";
import { summarizeNsfImpact } from "@/lib/billing/nsf-handler";
import type { NsfEventType } from "@prisma/client";

export const metadata = { title: "NSF & chargebacks" };

const TYPE_LABEL: Record<NsfEventType, string> = {
  nsf: "NSF",
  chargeback: "Chargeback",
  reversal: "Reversal",
};

export default async function NsfPage() {
  const user = await requireUser();
  const organizationId = user.organizationId!;

  const events = await prisma.nsfEvent.findMany({
    where: { organizationId },
    orderBy: { occurredAt: "desc" },
    take: 100,
    include: {
      payment: { select: { id: true, paymentDate: true, amountCents: true, source: true } },
      claim: { select: { id: true, payerName: true, serviceDate: true } },
    },
  });

  const rollup = summarizeNsfImpact(events.map((e) => ({
    type: e.type,
    amountCents: e.amountCents,
    bankFeeCents: e.bankFeeCents,
    resolved: e.resolved,
  })));

  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Track 7 · Financial Ops"
        title="NSF & chargebacks"
        description="Bounced card / ACH payments and issuer chargebacks. The ledger reverses cleanly; collections re-open with NSF-aware tone."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total events" value={String(rollup.count)} hint={formatMoney(rollup.totalReversedCents)} tone={rollup.count > 0 ? "warning" : "success"} />
        <StatCard label="Bank fees lost" value={formatMoney(rollup.totalBankFeesCents)} tone="danger" />
        <StatCard label="Unresolved" value={String(rollup.unresolved)} tone={rollup.unresolved > 0 ? "warning" : "success"} />
        <StatCard label="Chargebacks" value={String(rollup.byType.chargeback.count)} hint={formatMoney(rollup.byType.chargeback.reversedCents)} tone={rollup.byType.chargeback.count > 3 ? "danger" : "neutral"} />
      </div>

      <div className="mb-4">
        <Eyebrow>Recent events</Eyebrow>
      </div>

      {events.length === 0 ? (
        <EmptyState
          title="No NSF events"
          description="When a payment bounces or is charged back, it appears here with its full ledger impact."
        />
      ) : (
        <div className="space-y-2">
          {events.map((e) => (
            <Card key={e.id} tone="raised">
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge tone={e.resolved ? "success" : "warning"}>{TYPE_LABEL[e.type]}</Badge>
                      {e.resolved ? (
                        <span className="text-[11px] text-success">resolved</span>
                      ) : (
                        <span className="text-[11px] text-[color:var(--warning)]">open</span>
                      )}
                      <span className="text-[11px] text-text-subtle">
                        {formatDate(e.occurredAt)}
                        {e.claim?.payerName && ` · ${e.claim.payerName}`}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-subtle">
                      Payment {e.payment.id.slice(0, 8)} · {e.payment.source} · originally {formatMoney(e.payment.amountCents)} on {formatDate(e.payment.paymentDate)}
                      {e.reason && ` · reason: ${e.reason}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-base text-danger tabular-nums">−{formatMoney(e.amountCents)}</p>
                    {e.bankFeeCents > 0 && (
                      <p className="text-[11px] text-danger tabular-nums">+ {formatMoney(e.bankFeeCents)} fee</p>
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
          <CardTitle className="text-sm">How NSF reversal works</CardTitle>
          <CardDescription>EMR-227 — NSF / chargeback handler</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-text-muted">
          <p>
            On NSF / chargeback, the original <code>FinancialEvent</code> is offset by a negative
            <code>chargeback</code> entry, the claim's patient balance re-opens via a
            <code>takeback</code> adjustment, and the bank fee is recorded as a separate
            practice expense. Subsequent collections messaging shifts to a supportive-NSF tone
            on the next outreach, then escalates from there.
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
