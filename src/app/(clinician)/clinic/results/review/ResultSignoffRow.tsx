"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import type { RankedSignoffItem, SignoffInput } from "@/lib/clinical/result-signoff";
import { signResultAction } from "./actions";

type Outcome = SignoffInput["outcome"];

const OUTCOME_LABEL: Record<Outcome, string> = {
  looks_good: "Looks good",
  needs_followup: "Needs follow-up",
  repeat: "Repeat test",
  routed_to_ma: "Route to MA",
};

export function ResultSignoffRow({ item }: { item: RankedSignoffItem }) {
  const [expanded, setExpanded] = useState(item.urgency === "stat");
  const [outcome, setOutcome] = useState<Outcome>(
    item.abnormalFlag ? "needs_followup" : "looks_good",
  );
  const [comment, setComment] = useState("");
  const [notifyPatient, setNotifyPatient] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);
  const [isPending, startTransition] = useTransition();

  const urgencyTone = item.urgency === "stat" ? "danger" : item.urgency === "high" ? "warning" : "neutral";
  const ageLabel = item.ageDays === 0 ? "today" : `${item.ageDays}d ago`;

  function sign() {
    setError(null);
    startTransition(async () => {
      const res = await signResultAction({
        resultId: item.id,
        comment,
        outcome,
        notifyPatient,
      });
      if (res.ok) {
        setSigned(true);
      } else {
        setError(res.error);
      }
    });
  }

  if (signed) {
    return (
      <Card tone="outlined" className="opacity-60">
        <CardContent className="px-5 py-3.5 flex items-center gap-3">
          <Badge tone="success">Signed</Badge>
          <span className="text-sm text-text-muted">
            {item.panelName} · {item.patientName}
          </span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={item.urgency === "stat" ? "border-l-4 border-l-danger" : ""}>
      <CardContent className="px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge tone={urgencyTone}>
                {item.urgency.toUpperCase()}
              </Badge>
              {item.abnormalFlag && <Badge tone="danger">Abnormal</Badge>}
              <span className="text-xs text-text-subtle">{ageLabel}</span>
            </div>
            <p className="text-sm font-medium text-text">
              {item.panelName}{" "}
              <span className="text-text-subtle font-normal">·</span>{" "}
              <Link
                href={`/clinic/patients/${item.patientId}`}
                className="text-text-muted hover:text-accent"
              >
                {item.patientName}
              </Link>
            </p>
            {item.aiSummary && (
              <p className="text-[12px] text-text-subtle mt-1 leading-relaxed">
                {item.aiSummary}
              </p>
            )}
          </div>
          <Button
            size="sm"
            variant={expanded ? "secondary" : "primary"}
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? "Cancel" : "Review"}
          </Button>
        </div>

        {expanded && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.12em] text-text-subtle mb-1.5">
                  Outcome
                </label>
                <select
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value as Outcome)}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                >
                  {(Object.keys(OUTCOME_LABEL) as Outcome[]).map((o) => (
                    <option
                      key={o}
                      value={o}
                      disabled={item.abnormalFlag && o === "looks_good"}
                    >
                      {OUTCOME_LABEL[o]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.12em] text-text-subtle mb-1.5">
                  Notify patient
                </label>
                <label className="flex items-center gap-2 mt-2.5 text-sm text-text">
                  <input
                    type="checkbox"
                    checked={notifyPatient}
                    onChange={(e) => setNotifyPatient(e.target.checked)}
                  />
                  Send a portal message after signing
                </label>
              </div>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.12em] text-text-subtle mb-1.5">
                Comment {item.abnormalFlag && <span className="text-danger">(required)</span>}
              </label>
              <Textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  item.abnormalFlag
                    ? "Document the follow-up plan or escalation."
                    : "Optional note that goes into the patient message."
                }
              />
            </div>
            {error && <p className="text-xs text-danger">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button onClick={sign} disabled={isPending}>
                {isPending ? "Signing…" : "Sign"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
