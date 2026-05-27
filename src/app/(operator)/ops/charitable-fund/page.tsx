import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  summarizeFund,
  verifyChain,
  decideProposal,
  centsToDollarsCompact,
} from "@/lib/domain/charitable-fund";
import {
  buildDemoFundLedger,
  buildDemoProposals,
} from "@/lib/domain/charitable-fund-demo";

export const metadata = { title: "Charitable Fund · Operator" };

export default async function OpsCharitableFundPage() {
  await requireUser();
  const chain = buildDemoFundLedger();
  const summary = summarizeFund(chain);
  const verification = verifyChain(chain);
  const proposals = buildDemoProposals();

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow="Article VII §5"
        title="Charitable Fund — admin"
        description="Propose distributions, review board sign-off, and confirm the public ledger's chain integrity."
        actions={
          <a href="/advocacy/fund" target="_blank" rel="noreferrer">
            <Button size="sm" variant="secondary">
              View public ledger
            </Button>
          </a>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-[11px] uppercase tracking-wider text-text-subtle">Balance</p>
            <p className="font-display text-2xl text-text mt-1 tabular-nums">
              {centsToDollarsCompact(summary.balanceCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-[11px] uppercase tracking-wider text-text-subtle">Inflows (lifetime)</p>
            <p className="font-display text-2xl text-text mt-1 tabular-nums">
              {centsToDollarsCompact(summary.totalInflowsCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-[11px] uppercase tracking-wider text-text-subtle">Distributions</p>
            <p className="font-display text-2xl text-text mt-1 tabular-nums">
              {centsToDollarsCompact(summary.totalOutflowsCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-[11px] uppercase tracking-wider text-text-subtle">Chain integrity</p>
            <p className="font-display text-lg mt-1">
              <Badge tone={verification.ok ? "success" : "danger"}>
                {verification.ok ? "Intact" : `Broken at #${verification.brokenAt + 1}`}
              </Badge>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardContent className="py-6">
          <p className="text-xs uppercase tracking-wider text-text-subtle mb-4">Pending distribution proposals</p>
          <ul className="divide-y divide-border/60">
            {proposals.map((p) => {
              const decision = decideProposal(p);
              return (
                <li key={p.id} className="py-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm text-text font-medium">{p.charityName}</p>
                      <Badge
                        tone={
                          decision === "approved"
                            ? "success"
                            : decision === "blocked"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {decision.replace("_", " ")}
                      </Badge>
                      {p.conflictOfInterest && <Badge tone="danger">Conflict of interest</Badge>}
                    </div>
                    <p className="text-sm text-text-muted mt-1">{p.rationale}</p>
                    <p className="text-[11px] text-text-subtle mt-1">
                      Proposed by {p.proposerName} · {new Date(p.proposedAt).toLocaleDateString()}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-[11px] text-text-subtle">
                      <span>Patient Advisory: <Badge tone={tone(p.patientAdvisoryReview)}>{p.patientAdvisoryReview}</Badge></span>
                      <span>Clinical Advisory: <Badge tone={tone(p.clinicalAdvisoryReview)}>{p.clinicalAdvisoryReview}</Badge></span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display text-lg text-text tabular-nums">{centsToDollarsCompact(p.amountCents)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="py-6">
          <p className="text-xs uppercase tracking-wider text-text-subtle mb-3">Top recipients (lifetime)</p>
          <ul className="space-y-2">
            {summary.topRecipients.map((r) => (
              <li key={r.charityId} className="flex items-center justify-between text-sm">
                <span className="text-text">{r.charityName}</span>
                <span className="text-text-muted tabular-nums">{centsToDollarsCompact(r.totalCents)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </PageShell>
  );
}

function tone(s: "pending" | "approved" | "blocked"): "warning" | "success" | "danger" {
  if (s === "approved") return "success";
  if (s === "blocked") return "danger";
  return "warning";
}
