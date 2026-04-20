"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Eyebrow } from "@/components/ui/ornament";
import { AUDIT_ACTIONS } from "@/lib/domain/audit-trail-filters";

// ─── Types ──────────────────────────────────────────────

interface AuditLogEntry {
  id: string;
  actorUserId: string | null;
  actorAgent: string | null;
  actorName: string;
  action: string;
  subjectType: string | null;
  subjectId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface FilterState {
  actor: string | null;
  action: string | null;
  entity: string | null;
  from: string;
  to: string;
  q: string;
}

interface AuditTrailViewProps {
  logs: AuditLogEntry[];
  totalCount: number;
  pageSize: number;
  actorOptions: Array<{ id: string; label: string }>;
  entityOptions: string[];
  filters: FilterState;
  loadMoreHref: string | null;
  hasCursor: boolean;
}

// ─── Helpers ────────────────────────────────────────────

function getActionTone(action: string): "success" | "warning" | "danger" | "neutral" {
  if (action.includes("read") || action.includes("view") || action.includes("list")) {
    return "success";
  }
  if (action.includes("delete") || action.includes("remove") || action.includes("revoke")) {
    return "danger";
  }
  if (
    action.includes("create") ||
    action.includes("update") ||
    action.includes("write") ||
    action.includes("finalize") ||
    action.includes("sign")
  ) {
    return "warning";
  }
  return "neutral";
}

function getActionColor(action: string): string {
  const tone = getActionTone(action);
  switch (tone) {
    case "success":
      return "bg-emerald-500";
    case "warning":
      return "bg-amber-500";
    case "danger":
      return "bg-red-500";
    default:
      return "bg-gray-400";
  }
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function toCSV(logs: AuditLogEntry[]): string {
  const headers = ["Timestamp", "Actor", "Action", "Subject Type", "Subject ID", "Metadata"];
  const rows = logs.map((log) => [
    log.createdAt,
    log.actorName,
    log.action,
    log.subjectType ?? "",
    log.subjectId ?? "",
    log.metadata ? JSON.stringify(log.metadata) : "",
  ]);
  return [headers, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}

// ─── Filter bar ─────────────────────────────────────────

/**
 * URL-driven filter bar. Updates searchParams via `router.push` — the server
 * component then re-renders with the new filter set. Local state is kept only
 * for the freetext input so keystrokes don't spam the router; we commit on
 * Enter / blur.
 */
function FilterBar({
  filters,
  actorOptions,
  entityOptions,
}: {
  filters: FilterState;
  actorOptions: Array<{ id: string; label: string }>;
  entityOptions: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [qLocal, setQLocal] = useState(filters.q);

  const applyPatch = useCallback(
    (patch: Partial<FilterState>) => {
      const next: FilterState = { ...filters, ...patch };
      const params = new URLSearchParams();
      if (next.actor) params.set("actor", next.actor);
      if (next.action) params.set("action", next.action);
      if (next.entity) params.set("entity", next.entity);
      if (next.from) params.set("from", next.from);
      if (next.to) params.set("to", next.to);
      if (next.q) params.set("q", next.q);
      // Any filter change resets the cursor — "Load more" restarts from page 1.
      const qs = params.toString();
      startTransition(() => {
        router.push(`/clinic/audit-trail${qs ? `?${qs}` : ""}`);
      });
    },
    [filters, router],
  );

  const clearAll = () => {
    setQLocal("");
    startTransition(() => {
      router.push("/clinic/audit-trail");
    });
  };

  const anyActive =
    !!filters.actor ||
    !!filters.action ||
    !!filters.entity ||
    !!filters.from ||
    !!filters.to ||
    !!filters.q;

  return (
    <Card tone="raised" className="mb-6">
      <CardContent className="py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="text-[10px] text-text-subtle uppercase tracking-wider mb-1 block">
              Search
            </label>
            <Input
              placeholder="Action, subject, agent..."
              value={qLocal}
              onChange={(e) => setQLocal(e.target.value)}
              onBlur={() => {
                if ((qLocal || "") !== (filters.q || "")) {
                  applyPatch({ q: qLocal });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  applyPatch({ q: qLocal });
                }
              }}
            />
          </div>

          {/* Actor */}
          <div>
            <label className="text-[10px] text-text-subtle uppercase tracking-wider mb-1 block">
              Actor
            </label>
            <select
              value={filters.actor ?? ""}
              onChange={(e) =>
                applyPatch({ actor: e.target.value || null })
              }
              className="h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-text focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            >
              <option value="">All actors</option>
              {actorOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          {/* Action */}
          <div>
            <label className="text-[10px] text-text-subtle uppercase tracking-wider mb-1 block">
              Action
            </label>
            <select
              value={filters.action ?? ""}
              onChange={(e) =>
                applyPatch({ action: e.target.value || null })
              }
              className="h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-text focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            >
              <option value="">All actions</option>
              {AUDIT_ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Entity */}
          <div>
            <label className="text-[10px] text-text-subtle uppercase tracking-wider mb-1 block">
              Entity
            </label>
            <select
              value={filters.entity ?? ""}
              onChange={(e) =>
                applyPatch({ entity: e.target.value || null })
              }
              className="h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-text focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            >
              <option value="">All entities</option>
              {entityOptions.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>

          {/* From */}
          <div>
            <label className="text-[10px] text-text-subtle uppercase tracking-wider mb-1 block">
              From
            </label>
            <Input
              type="date"
              value={filters.from}
              onChange={(e) => applyPatch({ from: e.target.value })}
            />
          </div>

          {/* To */}
          <div>
            <label className="text-[10px] text-text-subtle uppercase tracking-wider mb-1 block">
              To
            </label>
            <Input
              type="date"
              value={filters.to}
              onChange={(e) => applyPatch({ to: e.target.value })}
            />
          </div>
        </div>

        {(anyActive || isPending) && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-text-muted">
              {isPending
                ? "Updating…"
                : "Filters applied — showing matching entries only."}
            </p>
            {anyActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                disabled={isPending}
              >
                Clear all
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ─────────────────────────────────────

export function AuditTrailView({
  logs,
  totalCount,
  pageSize,
  actorOptions,
  entityOptions,
  filters,
  loadMoreHref,
  hasCursor,
}: AuditTrailViewProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleExportCSV = useCallback(() => {
    const csv = toCSV(logs);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [logs]);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-10">
        <div className="max-w-2xl">
          <Eyebrow className="mb-3">Compliance</Eyebrow>
          <h1 className="font-display text-3xl md:text-4xl text-text tracking-tight leading-[1.1]">
            Audit trail
          </h1>
          <p className="text-[15px] text-text-muted mt-3 leading-relaxed">
            Complete log of all actions performed across the platform.{" "}
            <span className="tabular-nums font-medium text-text">
              {totalCount.toLocaleString()}
            </span>{" "}
            matching {totalCount === 1 ? "entry" : "entries"}.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" size="sm" onClick={handleExportCSV}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              className="mr-1"
            >
              <path
                d="M7 1v9M3 6l4 4 4-4M2 12h10"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <FilterBar
        filters={filters}
        actorOptions={actorOptions}
        entityOptions={entityOptions}
      />

      {/* Table */}
      <Card tone="raised">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-3 px-5 font-medium text-text-subtle text-[10px] uppercase tracking-wider w-8" />
                  <th className="py-3 px-5 font-medium text-text-subtle text-[10px] uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="py-3 px-5 font-medium text-text-subtle text-[10px] uppercase tracking-wider">
                    Actor
                  </th>
                  <th className="py-3 px-5 font-medium text-text-subtle text-[10px] uppercase tracking-wider">
                    Action
                  </th>
                  <th className="py-3 px-5 font-medium text-text-subtle text-[10px] uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="py-3 px-5 font-medium text-text-subtle text-[10px] uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {logs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-text-muted"
                    >
                      No audit log entries found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const isExpanded = expandedRows.has(log.id);
                    const actionTone = getActionTone(log.action);
                    const isAgent = !!log.actorAgent;

                    return (
                      <tr key={log.id} className="group">
                        <td className="py-3 px-5" colSpan={6}>
                          <div className="flex items-start gap-4">
                            {/* Expand button */}
                            <button
                              onClick={() => toggleExpand(log.id)}
                              className="mt-0.5 shrink-0 h-5 w-5 rounded flex items-center justify-center hover:bg-surface-muted transition-colors"
                            >
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 12 12"
                                fill="none"
                                className={cn(
                                  "text-text-subtle transition-transform duration-200",
                                  isExpanded && "rotate-90",
                                )}
                              >
                                <path
                                  d="M4 2l4 4-4 4"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>

                            {/* Color dot */}
                            <span
                              className={cn(
                                "mt-1.5 h-2 w-2 rounded-full shrink-0",
                                getActionColor(log.action),
                              )}
                            />

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center flex-wrap gap-x-6 gap-y-1">
                                {/* Timestamp */}
                                <span className="text-xs text-text-muted tabular-nums shrink-0">
                                  {formatTimestamp(log.createdAt)}
                                </span>

                                {/* Actor */}
                                <span className="text-sm text-text shrink-0">
                                  {isAgent ? (
                                    <span className="font-mono text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                                      {log.actorAgent}
                                    </span>
                                  ) : (
                                    <span className="font-medium">
                                      {log.actorName}
                                    </span>
                                  )}
                                </span>

                                {/* Action */}
                                <Badge
                                  tone={actionTone}
                                  className="text-[10px]"
                                >
                                  {log.action}
                                </Badge>

                                {/* Subject */}
                                {log.subjectType && (
                                  <span className="text-xs text-text-muted">
                                    <span className="font-medium text-text-subtle">
                                      {log.subjectType}
                                    </span>
                                    {log.subjectId && (
                                      <span className="font-mono text-[10px] ml-1">
                                        {log.subjectId.slice(0, 12)}
                                      </span>
                                    )}
                                  </span>
                                )}
                              </div>

                              {/* Expanded metadata */}
                              {isExpanded && log.metadata && (
                                <div className="mt-3 p-3 rounded-lg bg-surface-muted border border-border/60 overflow-x-auto">
                                  <p className="text-[10px] text-text-subtle uppercase tracking-wider mb-2">
                                    Metadata
                                  </p>
                                  <pre className="text-xs text-text-muted font-mono whitespace-pre-wrap break-all leading-relaxed">
                                    {JSON.stringify(log.metadata, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {isExpanded && !log.metadata && (
                                <div className="mt-3 p-3 rounded-lg bg-surface-muted border border-border/60">
                                  <p className="text-xs text-text-muted">
                                    No additional metadata.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>

        {/* Cursor pagination */}
        {(loadMoreHref || hasCursor) && (
          <div className="px-6 py-4 border-t border-border/60 flex items-center justify-between">
            <p className="text-xs text-text-muted">
              Showing up to {pageSize} entries per page.
            </p>
            <div className="flex items-center gap-2">
              {hasCursor && (
                <Link href="/clinic/audit-trail">
                  <Button variant="ghost" size="sm">
                    Back to start
                  </Button>
                </Link>
              )}
              {loadMoreHref && (
                <Link href={loadMoreHref}>
                  <Button variant="secondary" size="sm">
                    Load more
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Legend */}
      <div className="mt-6 flex items-center gap-6 text-xs text-text-muted">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Reads
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          Writes
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          Deletes
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-gray-400" />
          Other
        </div>
      </div>
    </div>
  );
}
