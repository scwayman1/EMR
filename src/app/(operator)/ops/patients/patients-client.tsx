"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelative } from "@/lib/utils/format";

type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger" | "info" | "highlight";

interface PatientRow {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  email: string | null;
  phone: string | null;
  chartReadiness: number | null;
  missingFields: string[];
  openTaskCount: number;
  updatedAt: string;
  createdAt: string;
  intakeProgress: number;
}

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "prospect", label: "Prospect" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

function statusTone(status: string): BadgeTone {
  if (status === "active") return "success";
  if (status === "prospect") return "warning";
  if (status === "inactive" || status === "archived") return "neutral";
  return "neutral";
}

export function PatientsClient({
  patients,
  activeFilter,
}: {
  patients: PatientRow[];
  activeFilter: string;
}) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function setFilter(status: string) {
    if (status === "all") {
      router.push("/ops/patients");
    } else {
      router.push(`/ops/patients?status=${status}`);
    }
  }

  function toggleExpanded(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <>
      {/* ---- Status filter tabs ---- */}
      <div className="flex items-center gap-1 mb-6 border-b border-border">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeFilter === tab.value
                ? "text-text after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-accent after:rounded-t-full"
                : "text-text-muted hover:text-text"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-4">
          {patients.length === 0 ? (
            <EmptyState
              title="No patients found"
              description="No patients match the current filter."
            />
          ) : (
            <ul className="divide-y divide-border -mx-6">
              {patients.map((p) => {
                const isExpanded = expandedId === p.id;
                return (
                  <li key={p.id}>
                    <div
                      onClick={() => toggleExpanded(p.id)}
                      className={`px-6 py-4 cursor-pointer transition-colors ${
                        isExpanded ? "bg-surface-muted/50" : "hover:bg-surface-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <Avatar firstName={p.firstName} lastName={p.lastName} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-text">
                              {p.firstName} {p.lastName}
                            </p>
                            <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                            {p.chartReadiness !== null && (
                              <Badge tone={p.chartReadiness >= 80 ? "success" : "accent"}>
                                Chart {p.chartReadiness}%
                              </Badge>
                            )}
                            {p.openTaskCount > 0 && (
                              <Badge tone="warning">
                                {p.openTaskCount} open task{p.openTaskCount === 1 ? "" : "s"}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-xs text-text-subtle">
                              Updated {formatRelative(p.updatedAt)}
                            </p>
                            {p.intakeProgress > 0 && (
                              <div className="flex items-center gap-1.5">
                                <div className="h-1.5 w-16 bg-surface-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-accent rounded-full transition-all"
                                    style={{ width: `${p.intakeProgress}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-text-subtle tabular-nums">
                                  {p.intakeProgress}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          className={`text-text-subtle shrink-0 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        >
                          <path
                            d="M4 6L8 10L12 6"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                          />
                        </svg>
                      </div>
                    </div>

                    {/* ---- Expanded detail ---- */}
                    {isExpanded && (
                      <div className="px-6 pb-5 pt-1 bg-surface-muted/30 border-t border-border/40">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-3">
                          <DetailField label="Email" value={p.email ?? "Not provided"} />
                          <DetailField label="Phone" value={p.phone ?? "Not provided"} />
                          <DetailField label="Created" value={formatRelative(p.createdAt)} />
                          <DetailField
                            label="Chart readiness"
                            value={
                              p.chartReadiness !== null ? `${p.chartReadiness}%` : "No chart yet"
                            }
                          />
                        </div>

                        {/* Missing fields */}
                        {p.missingFields.length > 0 && (
                          <div className="mt-3">
                            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-1.5">
                              Missing fields
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {p.missingFields.map((f) => (
                                <Badge key={f} tone="neutral" className="!text-[9px]">
                                  {f}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Intake progress bar (larger) */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                              Intake progress
                            </p>
                            <span className="text-xs text-text-muted tabular-nums">
                              {p.intakeProgress}%
                            </span>
                          </div>
                          <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-accent to-[#3A8560] rounded-full transition-all"
                              style={{ width: `${p.intakeProgress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-subtle">
        {label}
      </p>
      <p className="text-sm text-text mt-0.5">{value}</p>
    </div>
  );
}
