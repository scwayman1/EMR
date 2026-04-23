"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

export interface ProviderRow {
  id: string;
  name: string;
  specialty: string;
  patientsThisMonth: number;
  notesOnTimePct: number;
  satisfactionNps: number;
  revenue: number;
  agentAcceptance: number;
}

type SortKey =
  | "patientsThisMonth"
  | "notesOnTimePct"
  | "satisfactionNps"
  | "revenue"
  | "agentAcceptance";

const COLUMNS: { key: SortKey; label: string; suffix?: string }[] = [
  { key: "patientsThisMonth", label: "Patients this month" },
  { key: "notesOnTimePct", label: "Notes <24h", suffix: "%" },
  { key: "satisfactionNps", label: "Satisfaction (NPS)" },
  { key: "revenue", label: "Revenue", suffix: "$" },
  { key: "agentAcceptance", label: "Agent acceptance", suffix: "%" },
];

const TROPHIES = ["🥇", "🥈", "🥉"];

function formatCell(key: SortKey, value: number): string {
  if (key === "revenue") return "$" + value.toLocaleString();
  if (key === "notesOnTimePct" || key === "agentAcceptance") return `${value}%`;
  return value.toString();
}

export function LeaderboardView({ rows }: { rows: ProviderRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("patientsThisMonth");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) =>
      dir === "desc" ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]
    );
    return copy;
  }, [rows, sortKey, dir]);

  // Top-3 per column (independent of current sort)
  const topByColumn = useMemo(() => {
    const result: Record<SortKey, string[]> = {
      patientsThisMonth: [],
      notesOnTimePct: [],
      satisfactionNps: [],
      revenue: [],
      agentAcceptance: [],
    };
    for (const col of COLUMNS) {
      const sorted = [...rows]
        .sort((a, b) => b[col.key] - a[col.key])
        .slice(0, 3)
        .map((r) => r.id);
      result[col.key] = sorted;
    }
    return result;
  }, [rows]);

  return (
    <Card tone="raised">
      <CardHeader>
        <CardTitle>All providers</CardTitle>
        <CardDescription>
          Click any column header to sort. 🥇🥈🥉 mark the top 3 in each column.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-6 py-3 text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                  Provider
                </th>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle text-right select-none"
                  >
                    <button
                      onClick={() => {
                        if (sortKey === col.key) {
                          setDir(dir === "desc" ? "asc" : "desc");
                        } else {
                          setSortKey(col.key);
                          setDir("desc");
                        }
                      }}
                      className={cn(
                        "inline-flex items-center gap-1 hover:text-text transition-colors",
                        sortKey === col.key && "text-accent"
                      )}
                    >
                      {col.label}
                      {sortKey === col.key && (
                        <span>{dir === "desc" ? "↓" : "↑"}</span>
                      )}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {sorted.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-surface-muted/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <p className="font-medium text-text">{row.name}</p>
                    <p className="text-xs text-text-subtle">{row.specialty}</p>
                  </td>
                  {COLUMNS.map((col) => {
                    const topIdx = topByColumn[col.key].indexOf(row.id);
                    return (
                      <td
                        key={col.key}
                        className="px-4 py-4 text-right tabular-nums"
                      >
                        <span
                          className={cn(
                            "font-medium",
                            topIdx === 0 && "text-emerald-600"
                          )}
                        >
                          {formatCell(col.key, row[col.key])}
                        </span>
                        {topIdx >= 0 && (
                          <span className="ml-1.5">{TROPHIES[topIdx]}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
