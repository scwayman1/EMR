import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow } from "@/components/ui/ornament";
import { formatMoney } from "@/lib/domain/billing";
import { formatDate } from "@/lib/utils/format";
import { winRateByPayer, winRateByCarc } from "@/lib/billing/appeal-outcomes";
import type { AppealResult } from "@prisma/client";

export const metadata = { title: "Appeal outcomes" };

const RESULT_TONE: Record<AppealResult, "success" | "danger" | "warning" | "neutral"> = {
  overturned: "success",
  partial: "warning",
  upheld: "danger",
  withdrawn: "neutral",
  no_response: "warning",
  pending: "neutral",
};

export default async function AppealOutcomesPage() {
  const user = await requireUser();
  const organizationId = user.organizationId!;

  const outcomes = await prisma.appealOutcome.findMany({
    where: { organizationId },
    orderBy: [{ decisionDate: "desc" }, { createdAt: "desc" }],
    take: 200,
    include: {
      claim: { select: { id: true, serviceDate: true, billedAmountCents: true } },
    },
  });

  const payerStats = winRateByPayer(outcomes.map((o) => ({
    payerName: o.payerName,
    result: o.result,
    recoveredCents: o.recoveredCents,
  })));
  const carcStats = winRateByCarc(outcomes.map((o) => ({
    carcCode: o.carcCode,
    result: o.result,
    recoveredCents: o.recoveredCents,
  })));

  const decided = outcomes.filter((o) => o.result === "overturned" || o.result === "upheld" || o.result === "partial");
  const overallWins = decided.filter((o) => o.result === "overturned").length;
  const overallWinRate = decided.length > 0 ? Math.round((overallWins / decided.length) * 100) : 0;
  const totalRecovered = outcomes.reduce((a, o) => a + o.recoveredCents, 0);

  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Track 7 · Financial Ops"
        title="Appeal outcomes"
        description="Which appeals win, against whom, and using which arguments. Feeds the appeals agent so future letters lead with the proven argument."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Win rate" value={`${overallWinRate}%`} tone={overallWinRate >= 50 ? "success" : overallWinRate >= 30 ? "accent" : "warning"} hint={`${overallWins} wins of ${decided.length} decided`} />
        <StatCard label="Total recovered" value={formatMoney(totalRecovered)} tone="success" />
        <StatCard label="Pending" value={String(outcomes.filter((o) => o.result === "pending").length)} hint="awaiting payer response" />
        <StatCard label="No response" value={String(outcomes.filter((o) => o.result === "no_response").length)} tone="warning" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card tone="raised">
          <CardHeader>
            <CardTitle className="text-base">Win rate by payer</CardTitle>
            <CardDescription>Top payers by appeal volume</CardDescription>
          </CardHeader>
          <CardContent>
            {payerStats.length === 0 ? (
              <p className="text-sm text-text-subtle">No outcomes recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {payerStats.slice(0, 8).map((p) => (
                  <div key={p.payerName} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0 truncate text-sm text-text">{p.payerName}</div>
                    <div className="w-32 h-2 bg-surface-muted rounded-full overflow-hidden">
                      <div className="h-full bg-success" style={{ width: `${Math.round(p.winRate * 100)}%` }} />
                    </div>
                    <div className="text-[11px] text-text-subtle tabular-nums w-20 text-right">
                      {Math.round(p.winRate * 100)}% · {p.total}
                    </div>
                    <div className="text-[11px] text-success tabular-nums w-24 text-right">
                      {formatMoney(p.recoveredCents)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card tone="raised">
          <CardHeader>
            <CardTitle className="text-base">Win rate by CARC</CardTitle>
            <CardDescription>Which denial codes overturn most often</CardDescription>
          </CardHeader>
          <CardContent>
            {carcStats.length === 0 ? (
              <p className="text-sm text-text-subtle">No outcomes recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {carcStats.slice(0, 8).map((c) => (
                  <div key={c.carcCode} className="flex items-center gap-3">
                    <div className="w-12 text-sm font-medium text-text">{c.carcCode}</div>
                    <div className="flex-1 h-2 bg-surface-muted rounded-full overflow-hidden">
                      <div className="h-full bg-success" style={{ width: `${Math.round(c.winRate * 100)}%` }} />
                    </div>
                    <div className="text-[11px] text-text-subtle tabular-nums w-20 text-right">
                      {Math.round(c.winRate * 100)}% · {c.total}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mb-4">
        <Eyebrow>Recent outcomes</Eyebrow>
      </div>

      {outcomes.length === 0 ? (
        <EmptyState
          title="No outcomes yet"
          description="When an appealed claim is adjudicated again, the result lands here and feeds the learning loop."
        />
      ) : (
        <div className="space-y-2">
          {outcomes.slice(0, 25).map((o) => (
            <Card key={o.id} tone="raised">
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge tone={RESULT_TONE[o.result]}>{o.result}</Badge>
                      <span className="text-sm font-medium text-text">{o.payerName}</span>
                      {o.carcCode && <span className="text-[11px] text-text-subtle">CARC {o.carcCode}</span>}
                    </div>
                    <p className="text-[11px] text-text-subtle">
                      {o.decisionDate ? formatDate(o.decisionDate) : "no decision date"}
                      {o.argumentTags.length > 0 && ` · arguments: ${o.argumentTags.join(", ")}`}
                    </p>
                  </div>
                  <div className="text-right">
                    {o.recoveredCents > 0 ? (
                      <p className="font-display text-base text-success tabular-nums">+{formatMoney(o.recoveredCents)}</p>
                    ) : (
                      <p className="text-[11px] text-text-subtle">no recovery</p>
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
