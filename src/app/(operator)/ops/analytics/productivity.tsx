"use client";

import { useState, useMemo } from "react";
import {
  generateProviderMetrics,
  generatePracticeMetrics,
  formatMoney,
} from "@/lib/domain/productivity-analytics";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

const DEMO_PROVIDERS = [
  { id: "prov-1", name: "Dr. Sarah Chen" },
  { id: "prov-2", name: "Dr. Marcus Rivera" },
  { id: "prov-3", name: "Dr. Amara Okafor" },
];

type SortKey =
  | "providerName"
  | "patientsSeenCount"
  | "notesFinalized"
  | "avgTimeToFinalizeMinutes"
  | "prescriptionsIssued"
  | "agentAcceptanceRate"
  | "revenueGeneratedCents";

export function ProductivityDashboard() {
  const practice = generatePracticeMetrics();
  const providers = generateProviderMetrics(DEMO_PROVIDERS);

  const [sortKey, setSortKey] = useState<SortKey>("patientsSeenCount");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sortedProviders = useMemo(() => {
    return [...providers].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortDir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [providers, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const maxReferralCount = Math.max(
    ...practice.topReferralSources.map((r) => r.count)
  );

  return (
    <div className="space-y-8">
      {/* ── Practice overview cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <OverviewCard
          label="Total encounters"
          value={String(practice.totalEncounters)}
        />
        <OverviewCard
          label="New patients"
          value={String(practice.newPatients)}
        />
        <OverviewCard
          label="Completion rate"
          value={`${practice.completionRate}%`}
        />
        <OverviewCard
          label="No-show rate"
          value={`${practice.noShowRate}%`}
          alert={practice.noShowRate > 10}
        />
        <OverviewCard
          label="Revenue (30d)"
          value={formatMoney(practice.totalRevenueCents)}
        />
        <OverviewCard
          label="Agent success rate"
          value={`${practice.agentSuccessRate}%`}
        />
      </div>

      {/* ── Provider comparison table ── */}
      <Card tone="raised">
        <CardHeader>
          <CardTitle>Provider Comparison</CardTitle>
          <CardDescription>
            Click any column header to sort. {practice.period}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <SortableHeader
                    label="Provider"
                    sortKey="providerName"
                    currentKey={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Patients"
                    sortKey="patientsSeenCount"
                    currentKey={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="Notes finalized"
                    sortKey="notesFinalized"
                    currentKey={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="Avg finalize (min)"
                    sortKey="avgTimeToFinalizeMinutes"
                    currentKey={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="Rx issued"
                    sortKey="prescriptionsIssued"
                    currentKey={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="Agent accept %"
                    sortKey="agentAcceptanceRate"
                    currentKey={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="Revenue"
                    sortKey="revenueGeneratedCents"
                    currentKey={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                    align="right"
                  />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {sortedProviders.map((p) => (
                  <tr key={p.providerId} className="hover:bg-surface-muted/50 transition-colors">
                    <td className="px-6 py-3 font-medium text-text">
                      {p.providerName}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-text-muted">
                      {p.patientsSeenCount}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-text-muted">
                      {p.notesFinalized}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-text-muted">
                      {p.avgTimeToFinalizeMinutes.toFixed(1)}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-text-muted">
                      {p.prescriptionsIssued}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums">
                      <Badge
                        tone={p.agentAcceptanceRate >= 90 ? "success" : "warning"}
                      >
                        {p.agentAcceptanceRate}%
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-text font-medium">
                      {formatMoney(p.revenueGeneratedCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Top referral sources ── */}
      <Card tone="raised">
        <CardHeader>
          <CardTitle>Top Referral Sources</CardTitle>
          <CardDescription>Where new patients are coming from</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {practice.topReferralSources.map((r) => (
              <div key={r.source} className="flex items-center gap-4">
                <span className="w-36 shrink-0 text-sm font-medium text-text truncate">
                  {r.source}
                </span>
                <div className="flex-1 h-6 bg-surface-muted rounded-md overflow-hidden">
                  <div
                    className="h-full bg-emerald-500/80 rounded-md transition-all duration-500"
                    style={{
                      width: `${(r.count / maxReferralCount) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-text tabular-nums w-10 text-right">
                  {r.count}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Agent performance ── */}
      <Card tone="raised">
        <CardHeader>
          <CardTitle>Agent Performance</CardTitle>
          <CardDescription>
            AI agent utilization and outcomes for the period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                Jobs run
              </p>
              <p className="font-display text-2xl text-text mt-1 tabular-nums">
                {practice.agentJobsRun.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                Success rate
              </p>
              <p className="font-display text-2xl text-text mt-1 tabular-nums">
                {practice.agentSuccessRate}%
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                Avg acceptance rate
              </p>
              <p className="font-display text-2xl text-text mt-1 tabular-nums">
                {providers.length > 0
                  ? (
                      providers.reduce((s, p) => s + p.agentAcceptanceRate, 0) /
                      providers.length
                    ).toFixed(1)
                  : "--"}
                %
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Helper components ── */

function OverviewCard({
  label,
  value,
  alert,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="pt-5 pb-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
          {label}
        </p>
        <p
          className={cn(
            "font-display text-2xl mt-2 tabular-nums",
            alert ? "text-danger" : "text-text"
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function SortableHeader({
  label,
  sortKey: key,
  currentKey,
  currentDir,
  onSort,
  align,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  align?: "right";
}) {
  const isActive = currentKey === key;
  return (
    <th
      className={cn(
        "px-6 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle cursor-pointer select-none hover:text-text transition-colors",
        align === "right" && "text-right"
      )}
      onClick={() => onSort(key)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive && (
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            className={cn(
              "transition-transform",
              currentDir === "asc" && "rotate-180"
            )}
            aria-hidden="true"
          >
            <path d="M5 2L9 7H1L5 2Z" fill="currentColor" />
          </svg>
        )}
      </span>
    </th>
  );
}
