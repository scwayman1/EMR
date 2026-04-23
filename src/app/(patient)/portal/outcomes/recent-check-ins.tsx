"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";

interface LogEntry {
  id: string;
  loggedAt: string;
  metric: string;
  value: number;
  note: string | null;
}

const DEFAULT_VISIBLE = 3;

export function RecentCheckIns({ logs }: { logs: LogEntry[] }) {
  const [expanded, setExpanded] = useState(false);

  const visibleLogs = expanded ? logs : logs.slice(0, DEFAULT_VISIBLE);
  const hasMore = logs.length > DEFAULT_VISIBLE;

  return (
    <>
      <div className="overflow-x-auto -mx-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60">
              <th className="text-left text-xs font-medium text-text-subtle uppercase tracking-wider px-6 py-3">
                Date
              </th>
              <th className="text-left text-xs font-medium text-text-subtle uppercase tracking-wider px-6 py-3">
                Metric
              </th>
              <th className="text-left text-xs font-medium text-text-subtle uppercase tracking-wider px-6 py-3">
                Value
              </th>
              <th className="text-left text-xs font-medium text-text-subtle uppercase tracking-wider px-6 py-3">
                Note
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {visibleLogs.map((log) => (
              <tr
                key={log.id}
                className="hover:bg-surface-muted/40 transition-colors"
              >
                <td className="px-6 py-3 text-text-muted whitespace-nowrap">
                  {formatDate(new Date(log.loggedAt))}
                </td>
                <td className="px-6 py-3 capitalize text-text font-medium">
                  {log.metric.replace("_", " ")}
                </td>
                <td className="px-6 py-3">
                  <span className="font-display text-base text-accent">
                    {log.value.toFixed(1)}
                  </span>
                  <span className="text-text-subtle text-xs ml-1">/ 10</span>
                </td>
                <td className="px-6 py-3 text-text-muted max-w-xs truncate">
                  {log.note || "--"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <div className="mt-4 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded
              ? "Hide check-ins"
              : `Show all check-ins (${logs.length})`}
          </Button>
        </div>
      )}
    </>
  );
}
