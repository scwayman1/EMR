"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  acceptLobbySubmission,
  rejectLobbySubmission,
  type PendingSubmission,
  type ReviewResult,
} from "./actions";

const KIND_LABEL: Record<string, string> = {
  intake: "Intake",
  consent: "Consent",
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function SubmissionsList({ initial }: { initial: PendingSubmission[] }) {
  const [items, setItems] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function run(id: string, fn: (id: string) => Promise<ReviewResult>) {
    setError(null);
    setBusyId(id);
    startTransition(async () => {
      const result = await fn(id);
      setBusyId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== id));
    });
  }

  if (items.length === 0) {
    return <p className="text-[15px] text-text-muted">No submissions waiting for review.</p>;
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-danger">{error}</p>}
      <ul className="space-y-2">
        {items.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-surface px-5 py-4"
          >
            <div className="min-w-0">
              <p className="text-[15px] font-medium text-text truncate">{s.patientName}</p>
              <p className="text-xs text-text-subtle">
                <span className="uppercase tracking-[0.1em] text-accent">
                  {KIND_LABEL[s.kind] ?? s.kind}
                </span>
                {" · "}
                {formatWhen(s.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => run(s.id, (id) => rejectLobbySubmission(id))}
                disabled={busyId === s.id}
              >
                Reject
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => run(s.id, acceptLobbySubmission)}
                disabled={busyId === s.id}
              >
                {busyId === s.id ? "Working…" : "Accept to chart"}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
