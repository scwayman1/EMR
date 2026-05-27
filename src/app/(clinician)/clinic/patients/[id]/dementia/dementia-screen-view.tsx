"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ClaudeProcessing } from "@/components/ui/claude-processing";
import { Collapsible } from "@/components/ui/collapsible";
import {
  DEMENTIA_SCREEN_SCHEMA,
  COGNITIVE_LIFESTYLE_PLAN,
  scoreDementiaScreen,
  type DementiaScreenAnswers,
} from "@/lib/domain/dementia-screen";
import { recordDementiaScreenAction } from "./actions";

type PriorRun = {
  id: string;
  submittedAt: string;
  score: number | null;
  interpretation: string | null;
};

type Props = {
  patientId: string;
  priorRuns: PriorRun[];
};

export function DementiaScreenView({ patientId, priorRuns }: Props) {
  const [answers, setAnswers] = React.useState<DementiaScreenAnswers>({});
  const [pending, setPending] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [savedBand, setSavedBand] = React.useState<string | null>(null);

  const live = React.useMemo(() => {
    if (Object.keys(answers).length === 0) return null;
    return scoreDementiaScreen(answers);
  }, [answers]);

  const allAnswered =
    Object.keys(answers).length === DEMENTIA_SCREEN_SCHEMA.questions.length;

  const setAnswer = (id: string, value: "yes" | "no") =>
    setAnswers((prev) => ({ ...prev, [id]: value }));

  const onSubmit = async () => {
    if (!allAnswered) return;
    setPending(true);
    setServerError(null);
    try {
      const r = await recordDementiaScreenAction({ patientId, answers });
      if (!r.ok) setServerError(r.error);
      else {
        setSavedBand(r.band);
        setAnswers({});
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-6">
      {priorRuns.length > 0 && (
        <Collapsible
          title={`Prior screens · ${priorRuns.length}`}
          meta={
            priorRuns[0].submittedAt
              ? `last on ${formatDate(priorRuns[0].submittedAt)}`
              : undefined
          }
          defaultOpen={false}
        >
          <ul className="divide-y divide-border/60">
            {priorRuns.map((run) => (
              <li
                key={run.id}
                className="py-2 flex items-center gap-3 text-sm"
              >
                <span className="text-[11px] font-mono tabular-nums text-text-subtle w-24 shrink-0">
                  {formatDate(run.submittedAt)}
                </span>
                <span className="font-medium text-text">
                  {run.score ?? "—"} / 10
                </span>
                <span className="text-text-muted truncate">
                  {run.interpretation ?? "no interpretation"}
                </span>
              </li>
            ))}
          </ul>
        </Collapsible>
      )}

      {savedBand && (
        <Card tone="ambient">
          <CardContent className="pt-4">
            <p className="text-sm text-text">
              Screen saved · band <strong>{savedBand}</strong>. The result is
              now in this patient's assessment timeline.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-5">
          <p className="text-[11px] uppercase tracking-[0.12em] text-text-subtle font-medium mb-1">
            Mindspan short-form · 10 items
          </p>
          <p className="text-sm text-text-muted mb-5">
            Score 1 point for every "yes". 0–1 low · 2 borderline · 3+ positive.
          </p>
          <ol className="space-y-4">
            {DEMENTIA_SCREEN_SCHEMA.questions.map((q, idx) => (
              <li key={q.id} className="border-b border-border/40 pb-4 last:border-b-0 last:pb-0">
                <div className="flex items-start gap-3">
                  <span className="text-[11px] font-mono tabular-nums text-text-subtle w-6 shrink-0 pt-1">
                    {idx + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text">{q.prompt}</p>
                    {q.helper && (
                      <p className="text-[12px] text-text-subtle mt-0.5">{q.helper}</p>
                    )}
                    <div className="mt-2 inline-flex rounded-md border border-border bg-surface text-[12px] overflow-hidden">
                      {(["yes", "no"] as const).map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setAnswer(q.id, val)}
                          className={
                            answers[q.id] === val
                              ? val === "yes"
                                ? "px-3 py-1.5 bg-warning text-white capitalize"
                                : "px-3 py-1.5 bg-accent text-accent-ink capitalize"
                              : "px-3 py-1.5 text-text-muted hover:text-text capitalize"
                          }
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Live score preview */}
      {live && (
        <Card
          tone={live.band === "positive" ? "ambient" : live.band === "borderline" ? "raised" : "default"}
          className={live.band === "positive" ? "border-danger/40" : undefined}
        >
          <CardContent className="pt-5">
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                <p className="text-[11px] uppercase tracking-wider text-text-subtle font-medium">
                  Live score
                </p>
                <p className="font-display text-4xl tabular-nums text-text">
                  {live.score}
                  <span className="text-[16px] text-text-subtle">/10</span>
                </p>
                <Badge
                  tone={
                    live.band === "low"
                      ? "success"
                      : live.band === "borderline"
                      ? "warning"
                      : "danger"
                  }
                  className="mt-1 capitalize"
                >
                  {live.band}
                </Badge>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text">{live.interpretation}</p>
                <p className="text-[13px] text-text-muted mt-2">{live.followUp}</p>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <Button onClick={onSubmit} disabled={!allAnswered || pending}>
                {pending ? "Saving…" : "Save screen to chart"}
              </Button>
              {pending && <ClaudeProcessing label="Persisting" inline />}
              {!allAnswered && (
                <span className="text-[11px] text-text-subtle">
                  Answer all 10 to save.
                </span>
              )}
              {serverError && (
                <span className="text-[12px] text-danger">{serverError}</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lifestyle plan — surfaced once any answers are present so the
          clinician can talk through it during the visit even when the
          score is low. */}
      <Collapsible
        title="Cognitive lifestyle plan"
        meta="evidence-based, modifiable factors"
        defaultOpen={live?.band !== "low"}
      >
        <ul className="divide-y divide-border/60">
          {COGNITIVE_LIFESTYLE_PLAN.map((item) => (
            <li key={item.area} className="py-3 flex items-start gap-3">
              <span className="text-[11px] uppercase tracking-wider text-text-subtle w-32 shrink-0 pt-0.5">
                {item.area}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text">{item.recommendation}</p>
                <p className="text-[11px] text-text-subtle mt-0.5">{item.cadence}</p>
              </div>
            </li>
          ))}
        </ul>
      </Collapsible>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
