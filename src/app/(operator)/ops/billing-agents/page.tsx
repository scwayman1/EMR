import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eyebrow, EditorialRule, LeafSprig } from "@/components/ui/ornament";
import { Button } from "@/components/ui/button";
import { agentRegistry, BILLING_AGENT_NAMES } from "@/lib/agents";
import { formatRelative } from "@/lib/utils/format";

export const metadata = { title: "Billing Agent Fleet" };

// ---------------------------------------------------------------------------
// Billing Agents Oversight Console
// ---------------------------------------------------------------------------
// Per PRD §15.2: "Agent oversight console" is one of the critical screens.
// Shows every billing agent in the fleet, what it does, when it last ran,
// success rate, and recent activity.
// ---------------------------------------------------------------------------

const AGENT_ICONS: Record<string, string> = {
  chargeIntegrity: "🛡",
  denialTriage: "⚖",
  patientExplanation: "💬",
  patientCollections: "📨",
  reconciliation: "⚖",
  aging: "⏰",
  underpaymentDetection: "🔍",
};

const AGENT_PURPOSE: Record<string, string> = {
  chargeIntegrity:
    "Validates new claims against payer + coding rules. Holds dirty claims for biller review.",
  denialTriage:
    "Classifies denied claims into a category and creates a follow-up task with the suggested next action.",
  patientExplanation:
    "Translates statements into plain language so patients actually understand what they owe.",
  patientCollections:
    "Drafts dunning messages and payment-link nudges. Always approval-gated — no auto-send.",
  reconciliation:
    "Walks recent payments and verifies each has a matching ledger event. Daily-close foundation.",
  aging:
    "Daily A/R sweep. Identifies stale claims, ranks by recoverability, creates follow-up tasks.",
  underpaymentDetection:
    "Compares adjudicated allowed amounts against the fee schedule. Flags payer underpayments.",
};

export default async function BillingAgentsPage() {
  const user = await requireUser();
  const organizationId = user.organizationId!;

  // Pull recent jobs for billing agents
  const recentJobs = await prisma.agentJob.findMany({
    where: {
      organizationId,
      agentName: { in: BILLING_AGENT_NAMES as string[] },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Per-agent stats
  const statsByAgent: Record<
    string,
    {
      totalRuns: number;
      successCount: number;
      failureCount: number;
      pendingCount: number;
      lastRun: Date | null;
      lastStatus: string | null;
    }
  > = {};

  for (const name of BILLING_AGENT_NAMES) {
    statsByAgent[name] = {
      totalRuns: 0,
      successCount: 0,
      failureCount: 0,
      pendingCount: 0,
      lastRun: null,
      lastStatus: null,
    };
  }

  for (const job of recentJobs) {
    const stats = statsByAgent[job.agentName];
    if (!stats) continue;
    stats.totalRuns++;
    if (job.status === "succeeded") stats.successCount++;
    if (job.status === "failed") stats.failureCount++;
    if (job.status === "pending" || job.status === "running" || job.status === "claimed") stats.pendingCount++;
    if (!stats.lastRun || job.createdAt > stats.lastRun) {
      stats.lastRun = job.createdAt;
      stats.lastStatus = job.status;
    }
  }

  // Recent financial events created by billing agents (audit trail)
  const recentAgentActivity = await prisma.financialEvent.findMany({
    where: {
      organizationId,
      createdByAgent: { not: null },
    },
    orderBy: { occurredAt: "desc" },
    take: 15,
    include: {
      patient: { select: { firstName: true, lastName: true } },
    },
  });

  // Total stats
  const totalRuns = Object.values(statsByAgent).reduce(
    (acc, s) => acc + s.totalRuns,
    0,
  );
  const totalSuccess = Object.values(statsByAgent).reduce(
    (acc, s) => acc + s.successCount,
    0,
  );
  const totalFailure = Object.values(statsByAgent).reduce(
    (acc, s) => acc + s.failureCount,
    0,
  );
  const successRate = totalRuns > 0 ? Math.round((totalSuccess / totalRuns) * 100) : 0;

  return (
    <PageShell maxWidth="max-w-[1280px]">
      <PageHeader
        eyebrow="Practice management"
        title="Billing agent fleet"
        description="Seven specialized agents that automate the revenue cycle. Each one has a narrow scope, clear permissions, and an audit trail."
      />

      {/* Hero stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Agents in fleet"
          value={BILLING_AGENT_NAMES.length.toString()}
          tone="accent"
        />
        <StatCard label="Total runs" value={totalRuns.toString()} />
        <StatCard
          label="Success rate"
          value={`${successRate}%`}
          tone={successRate >= 95 ? "success" : successRate >= 80 ? "warning" : "danger"}
        />
        <StatCard
          label="Failures"
          value={totalFailure.toString()}
          tone={totalFailure === 0 ? "success" : "danger"}
        />
      </div>

      {/* Agent cards */}
      <div className="mb-4">
        <Eyebrow>The fleet</Eyebrow>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
        {BILLING_AGENT_NAMES.map((name) => {
          const agent = agentRegistry[name];
          const stats = statsByAgent[name];
          return (
            <Card key={name} tone="raised" className="card-hover">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-lg shrink-0">
                      {AGENT_ICONS[name] ?? "🤖"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base">{agent.name}</CardTitle>
                      <CardDescription className="text-[11px] font-mono mt-0.5">
                        v{agent.version}
                        {agent.requiresApproval && " · approval-gated"}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    tone={
                      stats.lastStatus === "succeeded"
                        ? "success"
                        : stats.lastStatus === "failed"
                          ? "danger"
                          : stats.lastStatus === "running"
                            ? "warning"
                            : "neutral"
                    }
                    className="text-[9px]"
                  >
                    {stats.lastStatus ?? "idle"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-muted leading-relaxed mb-4">
                  {AGENT_PURPOSE[name] ?? agent.description}
                </p>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/60">
                  <div>
                    <p className="text-[10px] text-text-subtle uppercase tracking-wider">
                      Runs
                    </p>
                    <p className="font-display text-lg text-text tabular-nums">
                      {stats.totalRuns}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-subtle uppercase tracking-wider">
                      Success
                    </p>
                    <p className="font-display text-lg text-success tabular-nums">
                      {stats.successCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-subtle uppercase tracking-wider">
                      Last run
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {stats.lastRun ? formatRelative(stats.lastRun) : "never"}
                    </p>
                  </div>
                </div>

                {/* Permissions */}
                <div className="mt-4 pt-3 border-t border-border/60">
                  <p className="text-[10px] text-text-subtle uppercase tracking-wider mb-1.5">
                    Permissions
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {agent.allowedActions.map((action) => (
                      <span
                        key={action}
                        className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-surface-muted text-text-subtle"
                      >
                        {action}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <EditorialRule className="my-8" />

      {/* Recent activity feed */}
      <div className="mb-4">
        <Eyebrow>Recent agent activity</Eyebrow>
      </div>

      {recentAgentActivity.length === 0 ? (
        <Card tone="raised">
          <CardContent className="py-10 text-center text-text-muted text-sm">
            No agent activity yet. Trigger a workflow to see agents come alive.
          </CardContent>
        </Card>
      ) : (
        <Card tone="raised">
          <CardContent className="pt-6 pb-6">
            <ul className="space-y-3">
              {recentAgentActivity.map((event) => (
                <li key={event.id} className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-accent shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text">{event.description}</p>
                    <p className="text-[11px] text-text-subtle mt-0.5">
                      <span className="font-mono">{event.createdByAgent}</span>
                      {" · "}
                      {event.patient.firstName} {event.patient.lastName}
                      {" · "}
                      {formatRelative(event.occurredAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* PRD design principles callout */}
      <Card tone="ambient" className="mt-10">
        <CardContent className="py-6">
          <div className="flex items-start gap-3">
            <LeafSprig size={20} className="text-accent mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-text mb-2">
                Agent design principles
              </p>
              <ul className="space-y-1.5 text-xs text-text-muted leading-relaxed">
                <li>
                  ✓ Narrow scope beats vague brilliance
                </li>
                <li>
                  ✓ Every action is logged to the financial event ledger
                </li>
                <li>
                  ✓ Irreversible actions require human approval
                </li>
                <li>
                  ✓ Agents work from the same ledger truth — no parallel state
                </li>
                <li>
                  ✓ Every action is reversible where appropriate
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}

function StatCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "accent";
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
        <p className={`font-display text-3xl tabular-nums ${colors[tone]}`}>
          {value}
        </p>
        <p className="text-xs text-text-muted mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}
