import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow } from "@/components/ui/ornament";
import { formatMoney } from "@/lib/domain/billing";
import { formatDate } from "@/lib/utils/format";

export const metadata = { title: "Payer contracts" };

export default async function ContractsPage() {
  const user = await requireUser();
  const organizationId = user.organizationId!;
  const today = new Date();

  const contracts = await prisma.payerContract.findMany({
    where: { organizationId },
    include: {
      rates: { orderBy: [{ cptCode: "asc" }, { modifier: "asc" }] },
    },
    orderBy: [{ payerName: "asc" }, { effectiveStart: "desc" }],
  });

  // Group by payer so multiple effective windows render under one heading.
  const byPayer = new Map<string, typeof contracts>();
  for (const c of contracts) {
    const arr = byPayer.get(c.payerName) ?? [];
    arr.push(c);
    byPayer.set(c.payerName, arr);
  }

  const activeCount = contracts.filter((c) => c.active && c.effectiveStart <= today && (!c.effectiveEnd || c.effectiveEnd >= today)).length;
  const totalRates = contracts.reduce((a, c) => a + c.rates.length, 0);

  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Track 7 · Financial Ops"
        title="Payer contracts"
        description="Negotiated allowables per CPT × modifier. Drives the underpayment detector — when a payer pays less than 95% of the contract rate, we flag the line."
      />

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Active contracts" value={String(activeCount)} tone="success" />
        <StatCard label="Total contracts" value={String(contracts.length)} hint="incl. expired & superseded" />
        <StatCard label="CPT rate rows" value={String(totalRates)} tone="accent" />
      </div>

      <div className="mb-4">
        <Eyebrow>Contracts by payer</Eyebrow>
      </div>

      {contracts.length === 0 ? (
        <EmptyState
          title="No contracts loaded"
          description="Upload a contract CSV (cpt_code,modifier,allowed_amount) to seed the underpayment detector."
        />
      ) : (
        <div className="space-y-6">
          {Array.from(byPayer.entries()).map(([payerName, list]) => (
            <Card key={payerName} tone="raised">
              <CardHeader>
                <CardTitle className="text-base">{payerName}</CardTitle>
                <CardDescription>{list.length} contract version{list.length === 1 ? "" : "s"} · {list[0].payerId ?? "no EDI id"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {list.map((c) => {
                    const isActive = c.active && c.effectiveStart <= today && (!c.effectiveEnd || c.effectiveEnd >= today);
                    return (
                      <div key={c.id} className="border border-border/60 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-text">{c.contractName}</span>
                          {isActive ? (
                            <Badge tone="success">active</Badge>
                          ) : c.effectiveEnd && c.effectiveEnd < today ? (
                            <Badge tone="neutral">expired</Badge>
                          ) : (
                            <Badge tone="warning">scheduled</Badge>
                          )}
                          <span className="text-[11px] text-text-subtle">
                            {formatDate(c.effectiveStart)} → {c.effectiveEnd ? formatDate(c.effectiveEnd) : "open"}
                          </span>
                        </div>
                        {c.notes && <p className="text-[11px] text-text-subtle mb-2">{c.notes}</p>}
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                          {c.rates.slice(0, 12).map((r) => (
                            <div key={r.id} className="text-[11px] bg-surface-muted rounded px-2 py-1">
                              <span className="text-text font-medium">{r.cptCode}{r.modifier ? `-${r.modifier}` : ""}</span>
                              <span className="text-text-subtle ml-1 tabular-nums">{formatMoney(r.allowedCents)}</span>
                            </div>
                          ))}
                          {c.rates.length > 12 && (
                            <div className="text-[11px] text-text-subtle px-2 py-1">+{c.rates.length - 12} more</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
