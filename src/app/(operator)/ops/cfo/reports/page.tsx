import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eyebrow } from "@/components/ui/ornament";
import { fmtMoney } from "@/lib/finance/formatting";
import { CfoTabs, GenerateReportButton } from "../components";

export const metadata = { title: "Reports archive · CFO" };
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await requireUser();
  const orgId = user.organizationId!;

  const reports = await prisma.financialReport.findMany({
    where: { organizationId: orgId },
    orderBy: { generatedAt: "desc" },
    take: 200,
  });

  // Group briefings (the "primary" report) and pull the rest
  const briefings = reports.filter((r) => r.type === "cfo_briefing");

  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="CFO · Reports archive"
        title="Generated reports"
        description="Every snapshot the CFO agent has produced. Click any briefing to view the full statements that shipped with it."
        actions={<GenerateReportButton period="weekly" />}
      />
      <CfoTabs active="reports" />

      <div className="space-y-2">
        {briefings.length === 0 && (
          <Card>
            <CardContent className="pt-8 pb-8 text-center">
              <p className="text-text-muted text-sm">
                No reports generated yet. Click <em>Generate</em> above to create the first weekly briefing.
              </p>
            </CardContent>
          </Card>
        )}
        {briefings.map((r) => {
          const narrative = (r.narrative ?? "").trim();
          const firstSentence = narrative.split(/\n\n/)[0]?.slice(0, 240);
          return (
            <Link key={r.id} href={`/ops/cfo/reports/${r.id}`}>
              <Card tone="raised" className="card-hover">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge tone="accent" className="text-[10px]">{r.period}</Badge>
                        <span className="text-sm font-medium text-text">
                          {r.periodStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} → {r.periodEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        <span className="text-[11px] text-text-subtle">
                          generated {r.generatedAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </span>
                      </div>
                      {firstSentence && (
                        <p className="text-sm text-text-muted line-clamp-2 leading-relaxed">{firstSentence}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3 shrink-0 text-right">
                      <Stat label="Revenue" value={fmtMoney(r.revenueCents, { compact: true })} />
                      <Stat label="EBITDA" value={fmtMoney(r.ebitdaCents, { compact: true })} />
                      <Stat label="Cash" value={fmtMoney(r.cashCents, { compact: true })} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-text-subtle">{label}</p>
      <p className="font-display text-base text-text tabular-nums">{value}</p>
    </div>
  );
}
