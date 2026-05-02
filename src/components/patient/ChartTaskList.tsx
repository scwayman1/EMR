"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/utils/format";

// EMR-180 — Chart Task List / To-Do on Open
//
// Pre-EMR-180 the chart opened to a wall of tabs and the doctor had to
// remember what was outstanding for this patient. The eight-second-rule
// hallway pivot ("Wait, did I sign that note?") happened too often.
// This component surfaces a punch list the moment the chart loads:
//
//   - Pending orders awaiting refill or signature
//   - Unsigned notes (draft/in_progress)
//   - Overdue preventive screenings
//   - Missing required consents (cannabis, telehealth, etc.)
//   - Anything else passed in via items[]
//
// The list is dismissible per-patient (localStorage). Dismissal hides
// the panel for *this session/device*; it does not mark the underlying
// tasks done — that remains the job of the actual workflow each item
// links to. We intentionally avoid wiring "Complete task" buttons here
// to prevent the panel becoming a side-channel for state mutations.

export type ChartTaskCategory =
  | "order"
  | "note"
  | "screening"
  | "consent"
  | "task"
  | "result";

export interface ChartTask {
  id: string;
  category: ChartTaskCategory;
  title: string;
  /** Optional one-line context shown beneath the title. */
  detail?: string;
  /** Where the doctor should go to actually resolve this. */
  href: string;
  /** ISO date or Date — surfaces as "due 3d ago" relative time. */
  dueAt?: Date | string | null;
  /** Surface a danger tone for genuinely overdue / safety items. */
  severity?: "info" | "warning" | "danger";
}

interface ChartTaskListProps {
  patientId: string;
  items: ChartTask[];
  /** Header label override — defaults to "Open tasks". */
  title?: string;
  className?: string;
}

const CATEGORY_LABEL: Record<ChartTaskCategory, string> = {
  order: "Order",
  note: "Note",
  screening: "Screening",
  consent: "Consent",
  task: "Task",
  result: "Result",
};

const CATEGORY_DOT: Record<ChartTaskCategory, string> = {
  order: "bg-[color:var(--info)]",
  note: "bg-[color:var(--highlight)]",
  screening: "bg-[color:var(--success)]",
  consent: "bg-accent",
  task: "bg-[color:var(--highlight)]",
  result: "bg-[color:var(--info)]",
};

const STORAGE_KEY_PREFIX = "chart:task-list-dismissed:v1:";

export function ChartTaskList({
  patientId,
  items,
  title = "Open tasks",
  className,
}: ChartTaskListProps) {
  const storageKey = `${STORAGE_KEY_PREFIX}${patientId}`;
  const [dismissed, setDismissed] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);

  // Hash the items so dismissals re-appear when something genuinely
  // *new* lands on the chart. Without this, dismissing a list with
  // 3 items would also hide a later state with 5 items — masking
  // newly-arriving safety signals.
  const hash = React.useMemo(
    () => items.map((i) => `${i.category}:${i.id}`).sort().join("|"),
    [items],
  );

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw && raw === hash) setDismissed(true);
    } catch {
      // ignore — Safari private mode etc.
    }
    setHydrated(true);
  }, [storageKey, hash]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(storageKey, hash);
    } catch {
      // ignore
    }
  };

  if (items.length === 0) return null;
  // Until hydration completes the SSR render and the client both show
  // the panel; flipping it on/off mid-paint causes layout shift.
  if (hydrated && dismissed) return null;

  // Bucket by severity to surface the most urgent first.
  const sorted = items.slice().sort((a, b) => {
    const order = { danger: 0, warning: 1, info: 2 } as const;
    const sa = order[a.severity ?? "info"];
    const sb = order[b.severity ?? "info"];
    if (sa !== sb) return sa - sb;
    return a.title.localeCompare(b.title);
  });

  const dangerCount = items.filter((i) => i.severity === "danger").length;
  const accentBorder = dangerCount > 0 ? "border-l-danger" : "border-l-highlight";

  return (
    <div
      className={cn(
        "rounded-xl border border-border border-l-4 bg-surface shadow-sm",
        accentBorder,
        className,
      )}
      data-testid="chart-task-list"
    >
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle font-medium">
            {title} · {items.length}
          </p>
          {dangerCount > 0 && (
            <Badge tone="danger">
              {dangerCount} urgent
            </Badge>
          )}
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-[11px] text-text-subtle hover:text-text px-2 py-1 rounded-md hover:bg-surface-muted transition-colors"
        >
          Dismiss
        </button>
      </div>

      <ul className="divide-y divide-border/40">
        {sorted.map((item) => (
          <li key={`${item.category}-${item.id}`} className="hover:bg-surface-muted/40 transition-colors">
            <Link
              href={item.href}
              className="flex items-start gap-3 px-5 py-3"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "mt-1.5 h-2 w-2 rounded-full shrink-0",
                  CATEGORY_DOT[item.category],
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wider text-text-subtle font-medium">
                    {CATEGORY_LABEL[item.category]}
                  </span>
                  {item.severity === "danger" && <Badge tone="danger">Urgent</Badge>}
                  {item.severity === "warning" && <Badge tone="warning">Attention</Badge>}
                </div>
                <p className="text-sm text-text font-medium leading-snug">
                  {item.title}
                </p>
                {item.detail && (
                  <p className="text-xs text-text-muted mt-0.5">{item.detail}</p>
                )}
              </div>
              {item.dueAt && (
                <span className="text-[11px] text-text-subtle shrink-0 tabular-nums whitespace-nowrap">
                  due {formatRelative(item.dueAt)}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
