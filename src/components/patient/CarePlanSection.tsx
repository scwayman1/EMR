"use client";

import * as React from "react";
import Link from "next/link";
import { Collapsible } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatRelative } from "@/lib/utils/format";

// EMR-159 — Care plan, embedded in the chart instead of a sibling tab.
//
// Old design: a separate "Care plan" tab that duplicated treatment goals,
// recent visits, open tasks, and cannabis history — content the physician
// already has in front of them on the main chart. The tab was a habit
// holdover from the patient portal route, where carving "what comes next"
// out of "what happened" makes sense for self-service. On the clinician
// chart it just multiplied clicks.
//
// New design: a collapsible panel that lives in the demographics tab.
// Defaults open the first time the chart loads but remembers the
// physician's choice per patient via localStorage so heavy chart users
// can keep it tucked away once they have the gist.
//
// We keep the section at this granularity (not as a single page section)
// so it can be slotted into pediatric / dementia / titration overlays
// later without the goal/task/visit shape leaking back into page.tsx.

export interface CarePlanTask {
  id: string;
  title: string;
  description?: string | null;
  status: "open" | "in_progress" | "done" | "dismissed" | string;
  dueAt?: Date | string | null;
}

export interface CarePlanVisit {
  id: string;
  scheduledFor?: Date | string | null;
  status: string;
  modality: string;
  reason?: string | null;
}

export interface CarePlanSectionProps {
  patientId: string;
  treatmentGoals?: string | null;
  presentingConcerns?: string | null;
  upcomingVisits: CarePlanVisit[];
  openTasks: CarePlanTask[];
  cannabisHistory?: {
    priorUse?: boolean;
    formats?: string[];
    reportedBenefits?: string[];
    reportedSideEffects?: string[];
  } | null;
}

function modalityLabel(modality: string): string {
  if (modality === "video") return "Video visit";
  if (modality === "phone") return "Phone visit";
  return "In-person";
}

const STORAGE_KEY_PREFIX = "chart:care-plan-open:v1:";

export function CarePlanSection({
  patientId,
  treatmentGoals,
  presentingConcerns,
  upcomingVisits,
  openTasks,
  cannabisHistory,
}: CarePlanSectionProps) {
  // Per-patient open state — heavier patients (chronic-pain, complex Rx)
  // benefit from the panel open by default; routine well visits don't.
  // Letting the physician toggle and remember per chart strikes the
  // balance without a global preference page.
  const storageKey = `${STORAGE_KEY_PREFIX}${patientId}`;
  const [open, setOpen] = React.useState<boolean>(true);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw === "0") setOpen(false);
      if (raw === "1") setOpen(true);
    } catch {
      // ignore — Safari private mode etc.
    }
  }, [storageKey]);

  const handleToggle = (next: boolean) => {
    setOpen(next);
    try {
      window.localStorage.setItem(storageKey, next ? "1" : "0");
    } catch {
      // ignore
    }
  };

  const taskCount = openTasks.length;
  const visitCount = upcomingVisits.length;

  return (
    <Collapsible
      tone="raised"
      open={open}
      onOpenChange={handleToggle}
      title={
        <span className="flex items-center gap-3">
          <span className="font-display text-base text-text">Care plan</span>
          <span className="flex items-center gap-1.5">
            {visitCount > 0 && (
              <Badge tone="info">
                {visitCount} upcoming visit{visitCount === 1 ? "" : "s"}
              </Badge>
            )}
            {taskCount > 0 && (
              <Badge tone="highlight">
                {taskCount} open task{taskCount === 1 ? "" : "s"}
              </Badge>
            )}
          </span>
        </span>
      }
      meta={
        <Link
          href={`/clinic/patients/${patientId}/orders`}
          className="text-accent hover:underline text-[11px]"
          onClick={(e) => e.stopPropagation()}
        >
          Add order →
        </Link>
      }
    >
      <div className="grid gap-5 md:grid-cols-2 pt-3">
        <div className="space-y-4">
          <Field
            label="Working toward"
            empty="No treatment goals on file. Add during a visit."
            value={treatmentGoals}
          />
          <Field
            label="Presenting concerns"
            empty="Not yet documented."
            value={presentingConcerns}
          />
          {cannabisHistory?.priorUse && (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-1.5">
                Cannabis history
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(cannabisHistory.formats ?? []).map((f) => (
                  <Badge key={`fmt-${f}`} tone="accent">
                    {f}
                  </Badge>
                ))}
                {(cannabisHistory.reportedBenefits ?? []).map((b) => (
                  <Badge key={`b-${b}`} tone="success">
                    + {b}
                  </Badge>
                ))}
                {(cannabisHistory.reportedSideEffects ?? []).map((s) => (
                  <Badge key={`s-${s}`} tone="warning">
                    − {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                Upcoming visits
              </p>
              <Link
                href={`/clinic/patients/${patientId}/telehealth`}
                className="text-[11px] text-accent hover:underline"
              >
                Schedule →
              </Link>
            </div>
            {upcomingVisits.length === 0 ? (
              <p className="text-sm text-text-muted italic">No visits scheduled.</p>
            ) : (
              <ul className="space-y-1.5">
                {upcomingVisits.slice(0, 3).map((v) => (
                  <li
                    key={v.id}
                    className="flex items-baseline justify-between gap-3 text-sm"
                  >
                    <span className="text-text">
                      {v.scheduledFor ? formatDate(v.scheduledFor) : "TBD"}
                    </span>
                    <span className="text-[11px] text-text-subtle">
                      {modalityLabel(v.modality)}
                      {v.reason ? ` · ${v.reason}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                Open tasks
              </p>
              <Link
                href={`/clinic/patients/${patientId}/orders`}
                className="text-[11px] text-accent hover:underline"
              >
                See all →
              </Link>
            </div>
            {openTasks.length === 0 ? (
              <p className="text-sm text-text-muted italic">All caught up.</p>
            ) : (
              <ul className="space-y-1.5">
                {openTasks.slice(0, 4).map((t) => (
                  <li
                    key={t.id}
                    className="flex items-baseline gap-2 text-sm"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-highlight shrink-0 translate-y-1.5" />
                    <span className="text-text flex-1 truncate">{t.title}</span>
                    {t.dueAt && (
                      <span className="text-[11px] text-text-subtle shrink-0 tabular-nums">
                        due {formatRelative(t.dueAt)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="pt-1">
            <Link href={`/clinic/patients/${patientId}/recommend`}>
              <Button size="sm" variant="secondary" className="w-full">
                Update recommendations
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Collapsible>
  );
}

function Field({
  label,
  value,
  empty,
}: {
  label: string;
  value?: string | null;
  empty: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-1.5">
        {label}
      </p>
      {value ? (
        <p className="text-sm text-text leading-relaxed whitespace-pre-wrap">
          {value}
        </p>
      ) : (
        <p className="text-sm text-text-muted italic">{empty}</p>
      )}
    </div>
  );
}
