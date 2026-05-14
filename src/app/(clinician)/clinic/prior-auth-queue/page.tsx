/**
 * EMR-076 — AI Prior Authorization queue
 *
 * Shows every active PA the AI agent is working with the decision
 * `reviewPriorAuth()` made for each one. The provider sees autonomous
 * submissions, in-progress auto-appeals, and escalations to their queue
 * side-by-side, so it's clear which ones need their attention.
 */

import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MetricTile } from "@/components/ui/metric-tile";
import { EmptyState } from "@/components/ui/empty-state";
import {
  reviewPriorAuth,
  summarizeCohort,
  type AiAction,
  type AiReviewInput,
  type PaCohortItem,
} from "@/lib/clinical/ai-prior-auth";

export const metadata = { title: "AI prior authorization" };

interface QueueRow {
  patientName: string;
  input: AiReviewInput;
}

const SAMPLE_QUEUE: QueueRow[] = [
  {
    patientName: "Rivera, M.",
    input: {
      serviceName: "Sertraline 100mg daily",
      icd10Codes: ["F32.2"],
      severityScores: [{ instrument: "PHQ-9", score: 18 }],
      priorTreatmentCount: 1,
      history: [],
    },
  },
  {
    patientName: "Nguyen, L.",
    input: {
      serviceName: "Adalimumab 40mg SC q2wk",
      icd10Codes: ["L40.0"],
      severityScores: [{ instrument: "PASI", score: 14 }],
      priorTreatmentCount: 3,
      history: [],
    },
  },
  {
    patientName: "Hassan, K.",
    input: {
      serviceName: "Semaglutide 0.5mg weekly",
      icd10Codes: ["E11.65"],
      severityScores: [{ instrument: "A1C", score: 8.4 }],
      priorTreatmentCount: 2,
      history: [
        {
          attempt: 1,
          submittedAt: "2026-04-12T10:00:00Z",
          denial: {
            code: "missing_documentation",
            deniedAt: "2026-04-14T10:00:00Z",
          },
        },
      ],
    },
  },
  {
    patientName: "Patel, A.",
    input: {
      serviceName: "Custom compounded analgesic",
      icd10Codes: ["G43.909"],
      severityScores: [{ instrument: "MIDAS", score: 22 }],
      priorTreatmentCount: 2,
      history: [
        {
          attempt: 1,
          submittedAt: "2026-04-10T10:00:00Z",
          denial: {
            code: "not_medically_necessary",
            deniedAt: "2026-04-12T10:00:00Z",
          },
        },
      ],
    },
  },
];

function actionTone(kind: AiAction["kind"]): "success" | "warning" | "danger" | "info" {
  switch (kind) {
    case "submit_autonomously":
      return "success";
    case "auto_appeal":
      return "info";
    case "submit_with_provider_review":
      return "warning";
    case "escalate_to_provider":
      return "danger";
    case "give_up":
      return "danger";
  }
}

const ACTION_LABEL: Record<AiAction["kind"], string> = {
  submit_autonomously: "AI submitting",
  submit_with_provider_review: "Provider review",
  auto_appeal: "AI appealing",
  escalate_to_provider: "Escalated",
  give_up: "Stopped",
};

export default async function PriorAuthQueuePage() {
  const user = await requireUser();
  if (!user.organizationId) {
    return (
      <PageShell>
        <div className="text-sm text-text-muted">No organization context.</div>
      </PageShell>
    );
  }

  const decided = SAMPLE_QUEUE.map((row) => ({
    ...row,
    action: reviewPriorAuth(row.input),
  }));

  const cohort: PaCohortItem[] = decided.map((r) => ({
    patientName: r.patientName,
    serviceName: r.input.serviceName,
    attempt: r.input.history.length + 1,
    lastDenial: r.input.history[r.input.history.length - 1]?.denial?.code,
    decidedAction: r.action.kind,
  }));
  const summary = summarizeCohort(cohort);

  return (
    <PageShell maxWidth="max-w-[1280px]">
      <PageHeader
        eyebrow="AI prior authorization"
        title="PA queue"
        description="The AI agent assembles, submits, and auto-appeals on documentation denials. Only second denials and clinical-judgement calls land in your queue."
        actions={
          <Link
            href="/clinic/clinical-workflows"
            className="text-[13px] text-accent hover:underline"
          >
            ← All workflows
          </Link>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
        <MetricTile label="Total" value={summary.total} accent="forest" />
        <MetricTile
          label="AI submitting"
          value={summary.autonomous}
          accent="forest"
          hint="Hands-off"
        />
        <MetricTile
          label="AI appealing"
          value={summary.appealing}
          accent="forest"
          hint="Auto-addendum"
        />
        <MetricTile
          label="Review first"
          value={summary.highRisk}
          accent={summary.highRisk > 0 ? "amber" : "none"}
          hint="High-risk gate"
        />
        <MetricTile
          label="Needs you"
          value={summary.needsProvider}
          accent={summary.needsProvider > 0 ? "amber" : "none"}
          hint="Escalated"
        />
      </div>

      <Card tone="raised">
        <CardHeader>
          <CardTitle className="text-base">Active prior authorizations</CardTitle>
          <CardDescription>
            Each row shows the AI's decision and the rule that fired.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {decided.length === 0 ? (
            <EmptyState
              title="No active PAs"
              description="New medication or service orders that need prior auth will land here automatically."
            />
          ) : (
            decided.map((row) => (
              <div
                key={`${row.patientName}-${row.input.serviceName}`}
                className="rounded-lg border border-border p-4 hover:bg-surface-muted"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge tone={actionTone(row.action.kind)}>
                        {ACTION_LABEL[row.action.kind]}
                      </Badge>
                      <span className="text-xs text-text-subtle">
                        Attempt {row.input.history.length + 1}
                      </span>
                    </div>
                    <p className="text-sm text-text font-medium">
                      {row.patientName} — {row.input.serviceName}
                    </p>
                    <p className="text-[13px] text-text-muted mt-1">
                      {row.action.kind === "submit_autonomously" ||
                      row.action.kind === "submit_with_provider_review" ||
                      row.action.kind === "auto_appeal" ||
                      row.action.kind === "escalate_to_provider" ||
                      row.action.kind === "give_up"
                        ? row.action.reason
                        : ""}
                    </p>
                    {row.action.kind === "auto_appeal" && row.action.addendum.length > 0 && (
                      <ul className="mt-2 space-y-1 text-[11px] text-text-subtle">
                        {row.action.addendum.map((a) => (
                          <li key={a}>· {a}</li>
                        ))}
                      </ul>
                    )}
                    {row.action.kind === "escalate_to_provider" && (
                      <p className="mt-2 text-[11px] text-text-subtle italic">
                        Message draft: "{row.action.messageTemplate}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
