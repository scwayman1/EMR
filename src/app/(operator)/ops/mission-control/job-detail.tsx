"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, formatRelative } from "@/lib/utils/format";
import { JobActions } from "./job-actions";

type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger" | "info" | "highlight";

interface LogEntry {
  at: string;
  level: "info" | "warn" | "error";
  message: string;
  data?: Record<string, unknown>;
}

interface JobData {
  id: string;
  workflowName: string;
  agentName: string;
  eventName: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  input: unknown;
  output: unknown;
  logs: unknown;
  lastError: string | null;
  requiresApproval: boolean;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  approvedAt: string | null;
  approvedById: string | null;
}

function jobTone(status: string): BadgeTone {
  if (status === "succeeded") return "success";
  if (status === "failed") return "danger";
  if (status === "needs_approval") return "warning";
  if (status === "running" || status === "claimed") return "info";
  return "neutral";
}

const LOG_LEVEL_COLORS: Record<string, { dot: string; text: string }> = {
  info: { dot: "bg-info", text: "text-info" },
  warn: { dot: "bg-warning", text: "text-[color:var(--highlight-hover)]" },
  error: { dot: "bg-danger", text: "text-danger" },
};

export function JobDetail({
  job,
  onClose,
}: {
  job: JobData;
  onClose: () => void;
}) {
  const logs = (Array.isArray(job.logs) ? job.logs : []) as LogEntry[];

  return (
    <Card tone="raised" className="overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <CardTitle className="!text-xl">{job.workflowName}</CardTitle>
            <Badge tone={jobTone(job.status)}>{job.status.replace("_", " ")}</Badge>
          </div>
          <p className="font-mono text-xs text-text-subtle mt-1.5 select-all">{job.id}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="shrink-0">
          Close
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ---- Metadata grid ---- */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <MetaField label="Agent" value={job.agentName} />
          <MetaField label="Event" value={job.eventName} mono />
          <MetaField label="Attempts" value={`${job.attempts} / ${job.maxAttempts}`} />
          <MetaField label="Created" value={formatDate(job.createdAt)} />
          <MetaField label="Started" value={job.startedAt ? formatDate(job.startedAt) : "Not started"} />
          <MetaField
            label="Completed"
            value={job.completedAt ? formatDate(job.completedAt) : "In progress"}
          />
        </div>

        {/* ---- Approval controls ---- */}
        {job.status === "needs_approval" && (
          <div className="rounded-xl border border-highlight/30 bg-highlight-soft/40 p-5">
            <p className="text-sm font-medium text-text mb-1">Approval required</p>
            <p className="text-xs text-text-muted mb-4">
              This job is waiting for human review before proceeding.
            </p>
            <JobActions jobId={job.id} />
          </div>
        )}

        {/* ---- Last error ---- */}
        {job.lastError && (
          <div className="rounded-xl border border-red-200 bg-red-50/60 p-5">
            <p className="text-sm font-medium text-danger mb-1">Last error</p>
            <pre className="text-xs font-mono text-danger/80 whitespace-pre-wrap break-words">
              {job.lastError}
            </pre>
          </div>
        )}

        {/* ---- Input payload ---- */}
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-subtle mb-2">
            Input payload
          </p>
          <pre className="bg-surface-muted rounded-lg p-4 text-xs font-mono text-text-muted overflow-x-auto max-h-48 overflow-y-auto">
            {JSON.stringify(job.input as Record<string, unknown>, null, 2)}
          </pre>
        </div>

        {/* ---- Output payload ---- */}
        {job.output !== null && job.output !== undefined && (
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-subtle mb-2">
              Output payload
            </p>
            <pre className="bg-surface-muted rounded-lg p-4 text-xs font-mono text-text-muted overflow-x-auto max-h-48 overflow-y-auto">
              {JSON.stringify(job.output, null, 2)}
            </pre>
          </div>
        )}

        {/* ---- Logs timeline ---- */}
        {logs.length > 0 && (
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-subtle mb-3">
              Logs ({logs.length})
            </p>
            <div className="relative pl-6">
              {/* Vertical timeline line */}
              <div className="absolute left-[7px] top-1 bottom-1 w-px bg-border-strong/40" />
              <ul className="space-y-3">
                {logs.map((entry, i) => {
                  const colors = LOG_LEVEL_COLORS[entry.level] ?? LOG_LEVEL_COLORS.info;
                  return (
                    <li key={i} className="relative">
                      {/* Dot on the timeline */}
                      <span
                        className={`absolute -left-6 top-1.5 h-[9px] w-[9px] rounded-full border-2 border-surface-raised ${colors.dot}`}
                      />
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${colors.text}`}>
                          {entry.level}
                        </span>
                        <span className="text-[10px] font-mono text-text-subtle">
                          {formatRelative(entry.at)}
                        </span>
                      </div>
                      <p className="text-sm text-text-muted mt-0.5 leading-relaxed">
                        {entry.message}
                      </p>
                      {entry.data && Object.keys(entry.data).length > 0 && (
                        <pre className="text-[10px] font-mono text-text-subtle mt-1 bg-surface-muted rounded px-2 py-1 overflow-x-auto">
                          {JSON.stringify(entry.data, null, 2)}
                        </pre>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetaField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-subtle">{label}</p>
      <p className={`text-sm text-text mt-0.5 ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
    </div>
  );
}
