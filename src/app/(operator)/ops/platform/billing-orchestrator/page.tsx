import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  fleetSnapshot,
  scoreClaim,
  type ClaimStage,
} from "@/lib/platform/billing-orchestrator";

export const metadata = { title: "Billing orchestrator" };

// Demo data — replace with prisma counts once the orchestrator's runtime
// view lands. The shape is the source of truth for production wiring.
const DEMO_INFLIGHT: Partial<Record<ClaimStage, { inflight: number; flagged: number }>> = {
  encounter_intelligence: { inflight: 12, flagged: 1 },
  coding_optimization: { inflight: 8, flagged: 2 },
  scrub: { inflight: 5, flagged: 0 },
  construction: { inflight: 3, flagged: 0 },
  submission: { inflight: 27, flagged: 0 },
  ack_pending: { inflight: 41, flagged: 4 },
  adjudication: { inflight: 18, flagged: 2 },
  appeals: { inflight: 6, flagged: 6 },
  secondary: { inflight: 2, flagged: 0 },
  patient_responsibility: { inflight: 24, flagged: 1 },
  closed: { inflight: 0, flagged: 0 },
};

// A representative example claim's doc signals — real surface is a per-claim drawer.
const DEMO_SIGNALS = {
  diagnosesSupportingComplexity: 1,
  emLevelSupportedByDocumentation: false,
  timeBasedDocumentationPresent: false,
  modifiersAttached: 1,
  modifiersRecommended: 2,
  socialDeterminantsCaptured: false,
  priorAuthValid: true,
  isSelfPay: false,
};

export default async function BillingOrchestratorPage() {
  await requireUser();
  const snapshot = fleetSnapshot(DEMO_INFLIGHT);
  const max = scoreClaim(DEMO_SIGNALS);

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow="Platform · EMR-045"
        title="Insurance billing AI orchestrator"
        description="The orchestrator above the 19-agent revenue-cycle fleet. Routes every claim, scores it, and recommends the next pass."
      />

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Fleet — claim flow</CardTitle>
          <CardDescription>
            Each stage has a primary agent and the events it consumes / produces.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {snapshot.stages.map((s) => (
              <li
                key={s.stage}
                className="flex items-start gap-3 border-t border-border/60 pt-3 first:border-t-0 first:pt-0"
              >
                <div className="w-32 shrink-0">
                  <Badge tone={s.flagged > 0 ? "warning" : "neutral"}>{s.label}</Badge>
                </div>
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{s.primaryAgent}</span>{" "}
                    <span className="text-text-muted">— {s.description}</span>
                  </p>
                  <p className="text-[11px] text-text-subtle font-mono mt-1">
                    consumes: {s.consumes.join(", ") || "—"} · produces: {s.produces.join(", ") || "—"}
                  </p>
                </div>
                <div className="text-right text-xs">
                  <p className="font-mono">
                    {s.inflight} inflight
                    {s.flagged > 0 && (
                      <span className="text-danger"> · {s.flagged} flagged</span>
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documentation maximization</CardTitle>
          <CardDescription>
            Sample claim score + recommendations. Live drill-down ships when the orchestrator's
            runtime view connects to Prisma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-3 mb-4">
            <span className="font-display text-4xl tabular-nums text-accent">
              {max.score}
            </span>
            <span className="text-text-muted">/ 100 documentation score</span>
            <span className="ml-auto text-sm text-text-muted">
              Estimated uplift: <span className="text-accent">{max.upliftPotentialPercent}%</span>
            </span>
          </div>
          <ul className="space-y-3">
            {max.recommendations.length === 0 ? (
              <li>
                <Badge tone="success">All clear — submit as-is</Badge>
              </li>
            ) : (
              max.recommendations.map((r) => (
                <li
                  key={r.code}
                  className="border-t border-border/60 pt-3 first:border-t-0 first:pt-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{r.title}</p>
                      <p className="text-sm text-text-muted mt-1">{r.detail}</p>
                    </div>
                    <Badge tone="highlight">{r.routeTo}</Badge>
                  </div>
                </li>
              ))
            )}
          </ul>
        </CardContent>
      </Card>
    </PageShell>
  );
}
