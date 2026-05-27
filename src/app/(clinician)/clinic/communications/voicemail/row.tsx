"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelative } from "@/lib/utils/format";
import {
  markVoicemailListenedAction,
  archiveVoicemailAction,
  assignVoicemailAction,
} from "./actions";

export interface VoicemailViewModel {
  id: string;
  fromNumber: string;
  patientName: string | null;
  durationSeconds: number | null;
  audioStorageKey: string | null;
  pertinentSummary: string;
  clinicalBullets: string[];
  redactedCategories: string[];
  status: "new" | "listened" | "archived";
  assignedToName: string | null;
  listenedByName: string | null;
  createdAt: string;
}

interface Teammate {
  id: string;
  name: string;
}

export function VoicemailRow({
  voicemail,
  teammates,
}: {
  voicemail: VoicemailViewModel;
  teammates: Teammate[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  function run(action: (fd: FormData) => Promise<{ ok: boolean; error?: string }>, fd: FormData) {
    setError(null);
    startTransition(async () => {
      const r = await action(fd);
      if (!r.ok) setError(r.error ?? "Action failed.");
    });
  }

  return (
    <Card tone={voicemail.status === "new" ? "raised" : "default"}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-text truncate">
              {voicemail.patientName ?? voicemail.fromNumber}
              {voicemail.patientName && (
                <span className="text-text-subtle font-normal">
                  {" · "}
                  {voicemail.fromNumber}
                </span>
              )}
            </p>
            <p className="text-[11px] text-text-subtle">
              {voicemail.durationSeconds
                ? `${voicemail.durationSeconds}s`
                : "—"}{" "}
              · {formatRelative(voicemail.createdAt)}
              {voicemail.assignedToName && (
                <> · assigned to {voicemail.assignedToName}</>
              )}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {voicemail.status === "new" ? (
              <Badge tone="info">New</Badge>
            ) : (
              <Badge tone="neutral">Listened</Badge>
            )}
            {voicemail.redactedCategories.length > 0 && (
              <span className="text-[10px] text-text-subtle">
                {voicemail.redactedCategories.length} PHI categor
                {voicemail.redactedCategories.length === 1 ? "y" : "ies"}{" "}
                stripped
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-text-subtle mb-1">
            Pertinent summary
          </p>
          <p className="text-sm text-text leading-relaxed">
            {voicemail.pertinentSummary}
          </p>
        </div>

        {voicemail.clinicalBullets.length > 0 && (
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-text-subtle mb-1">
              Clinical bullets
            </p>
            <ul className="space-y-1 list-disc list-inside text-sm text-text">
              {voicemail.clinicalBullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
        )}

        {voicemail.redactedCategories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {voicemail.redactedCategories.map((c) => (
              <Badge key={c} tone="warning">
                {c} stripped
              </Badge>
            ))}
          </div>
        )}

        {voicemail.listenedByName && voicemail.status !== "new" && (
          <p className="text-[11px] text-text-subtle italic">
            Listened by {voicemail.listenedByName}
          </p>
        )}

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-border">
          {voicemail.audioStorageKey ? (
            <span className="text-[11px] text-text-subtle italic">
              Recording: {voicemail.audioStorageKey}
            </span>
          ) : (
            <span className="text-[11px] text-text-subtle italic">
              No recording on file
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            {voicemail.status === "new" && (
              <Button
                size="sm"
                variant="primary"
                disabled={pending}
                onClick={() => {
                  const fd = new FormData();
                  fd.set("voicemailId", voicemail.id);
                  run(markVoicemailListenedAction, fd);
                }}
              >
                Mark listened
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => setAssignOpen((s) => !s)}
            >
              {assignOpen ? "Cancel" : "Assign"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                const fd = new FormData();
                fd.set("voicemailId", voicemail.id);
                run(archiveVoicemailAction, fd);
              }}
            >
              Archive
            </Button>
          </div>
        </div>

        {assignOpen && (
          <form
            className="flex items-center gap-2 pt-2"
            action={(fd) => {
              fd.set("voicemailId", voicemail.id);
              run(assignVoicemailAction, fd);
              setAssignOpen(false);
            }}
          >
            <select
              name="assigneeUserId"
              required
              className="h-8 px-2 text-xs rounded-md border border-border-strong bg-surface flex-1"
            >
              <option value="">Pick a teammate…</option>
              {teammates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <Button size="sm" type="submit" disabled={pending}>
              Assign
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
