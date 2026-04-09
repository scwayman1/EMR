"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MetricTile } from "@/components/ui/metric-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PatientRow {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  presentingConcerns: string | null;
  completenessScore: number | null;
  updatedAt: string;
  lastVisit: string | null;
  painTrend: number[];
}

interface StatusCounts {
  all: number;
  active: number;
  prospect: number;
  inactive: number;
}

interface Props {
  patients: PatientRow[];
  statusCounts: StatusCounts;
  avgReadiness: number;
  initialStatus: string;
}

/* ------------------------------------------------------------------ */
/*  Status filter config                                               */
/* ------------------------------------------------------------------ */

const STATUS_FILTERS: { key: string; label: string; countKey: keyof StatusCounts }[] = [
  { key: "all", label: "All", countKey: "all" },
  { key: "active", label: "Active", countKey: "active" },
  { key: "prospect", label: "In Intake", countKey: "prospect" },
  { key: "inactive", label: "Inactive", countKey: "inactive" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function statusTone(status: string): "success" | "warning" | "neutral" {
  switch (status) {
    case "active":
      return "success";
    case "prospect":
      return "warning";
    default:
      return "neutral";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Active";
    case "prospect":
      return "In Intake";
    case "inactive":
      return "Inactive";
    case "archived":
      return "Archived";
    default:
      return status;
  }
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Mini sparkline (SVG)                                               */
/* ------------------------------------------------------------------ */

function Sparkline({ data, className }: { data: number[]; className?: string }) {
  if (data.length < 2) return null;

  const width = 64;
  const height = 24;
  const padding = 2;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * innerW;
    const y = padding + innerH - ((v - min) / range) * innerH;
    return `${x},${y}`;
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p}`).join(" ");

  // Determine trend color: compare last vs first
  const trending = data[data.length - 1] <= data[0]; // lower pain = good
  const strokeColor = trending ? "var(--success)" : "var(--warning)";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d={pathD}
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Last point dot */}
      <circle
        cx={parseFloat(points[points.length - 1].split(",")[0])}
        cy={parseFloat(points[points.length - 1].split(",")[1])}
        r="2"
        fill={strokeColor}
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Search icon                                                        */
/* ------------------------------------------------------------------ */

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="text-text-subtle"
      aria-hidden="true"
    >
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M10.5 10.5L14 14"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Chevron icon                                                       */
/* ------------------------------------------------------------------ */

function ChevronRight() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="text-text-subtle"
      aria-hidden="true"
    >
      <path
        d="M6 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Main client component                                              */
/* ------------------------------------------------------------------ */

export function PatientListClient({
  patients,
  statusCounts,
  avgReadiness,
  initialStatus,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const activeStatus = searchParams.get("status") ?? initialStatus;

  /* Filter + search ------------------------------------------------ */
  const filtered = useMemo(() => {
    let list = patients;

    // Status filter
    if (activeStatus !== "all") {
      list = list.filter((p) => p.status === activeStatus);
    }

    // Name search
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (p) =>
          p.firstName.toLowerCase().includes(q) ||
          p.lastName.toLowerCase().includes(q) ||
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(q)
      );
    }

    return list;
  }, [patients, activeStatus, search]);

  /* Status pill navigation ----------------------------------------- */
  function setStatus(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "all") {
      params.delete("status");
    } else {
      params.set("status", key);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */
  return (
    <div className="space-y-6">
      {/* Summary metric tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricTile
          label="Total Patients"
          value={statusCounts.all}
          accent="none"
        />
        <MetricTile
          label="Active"
          value={statusCounts.active}
          accent="forest"
        />
        <MetricTile
          label="In Intake"
          value={statusCounts.prospect}
          accent="amber"
          hint="Prospects"
        />
        <MetricTile
          label="Avg Readiness"
          value={`${avgReadiness}%`}
          accent="forest"
          hint="Chart completeness"
        />
      </div>

      {/* Status filter strip */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_FILTERS.map((f) => {
          const isActive = activeStatus === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setStatus(f.key)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-full border transition-colors duration-200 ${
                isActive
                  ? "bg-accent text-accent-ink border-accent shadow-sm"
                  : "bg-surface-raised text-text-muted border-border hover:bg-surface-muted hover:border-border-strong"
              }`}
            >
              {f.label}
              <span
                className={`tabular-nums ${
                  isActive ? "text-accent-ink/70" : "text-text-subtle"
                }`}
              >
                {statusCounts[f.countKey]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Patient list card */}
      <Card tone="raised" className="overflow-hidden">
        {/* Search bar */}
        <div className="px-5 pt-5 pb-4">
          <div className="relative max-w-md">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <SearchIcon />
            </div>
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name..."
              className="pl-9"
            />
          </div>
        </div>

        {/* Patient rows */}
        <CardContent className="px-0 pb-0">
          {patients.length === 0 ? (
            <div className="px-5 pb-6">
              <EmptyState
                title="No patients in the system yet"
                description="Add your first patient to get started with chart management."
              />
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-5 pb-6">
              <EmptyState
                title="No patients match your search"
                description="Try adjusting your search terms or changing the status filter."
              />
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {filtered.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/clinic/patients/${p.id}`}
                    className="card-hover flex items-center gap-4 px-5 py-4 hover:bg-surface-muted/50 transition-colors duration-150 group"
                  >
                    {/* Avatar */}
                    <Avatar
                      firstName={p.firstName}
                      lastName={p.lastName}
                      size="md"
                    />

                    {/* Center info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-base font-medium text-text leading-tight">
                        {p.firstName} {p.lastName}
                      </p>
                      {p.presentingConcerns && (
                        <p className="text-xs text-text-muted mt-0.5 truncate max-w-md">
                          {p.presentingConcerns}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge tone={statusTone(p.status)}>
                          {statusLabel(p.status)}
                        </Badge>
                        {p.completenessScore !== null && (
                          <Badge tone="accent">
                            Chart {p.completenessScore}%
                          </Badge>
                        )}
                        {p.lastVisit && (
                          <Badge tone="neutral">
                            Last visit {formatShortDate(p.lastVisit)}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Sparkline + chevron */}
                    <div className="hidden md:flex items-center gap-3 shrink-0">
                      {p.painTrend.length >= 2 && (
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-text-subtle uppercase tracking-wider mb-0.5">
                            Pain
                          </span>
                          <Sparkline data={p.painTrend} />
                        </div>
                      )}
                      <ChevronRight />
                    </div>

                    {/* Mobile chevron */}
                    <div className="md:hidden shrink-0">
                      <ChevronRight />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
