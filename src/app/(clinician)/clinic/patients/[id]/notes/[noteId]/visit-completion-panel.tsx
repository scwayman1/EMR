import * as React from "react";
import {
  Check,
  ClipboardCheck,
  Clock3,
  Eye,
  FileCheck2,
  FileText,
  MessageSquareText,
  Pencil,
  Printer,
  Send,
  ShieldCheck,
  UserRoundCheck,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type {
  VisitCompletionAction,
  VisitCompletionBundle,
  VisitCompletionCard,
  VisitCompletionCardId,
  VisitCompletionDataMode,
  VisitCompletionItem,
  VisitCompletionTone,
} from "@/lib/domain/visit-completion";

interface VisitCompletionPanelProps {
  bundle: VisitCompletionBundle;
}

const cardIcons: Record<VisitCompletionCardId, React.ComponentType<{ className?: string }>> = {
  orders: ClipboardCheck,
  follow_up: Clock3,
  patient_message: MessageSquareText,
  practice_readiness: ShieldCheck,
};

const actionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  review_orders: Eye,
  approve_item: Check,
  remove_item: X,
  edit_item: Pencil,
  defer_item: Clock3,
  send_to_front_desk: UserRoundCheck,
  text_scheduling_link: Send,
  edit_interval: Pencil,
  preview_message: Eye,
  edit_message: Pencil,
  send_to_portal: Send,
  print_summary: Printer,
  view_checks: FileCheck2,
  review_coding: FileText,
  create_staff_tasks: UserRoundCheck,
};

const toneDot: Record<VisitCompletionTone, string> = {
  neutral: "bg-accent/70",
  warning: "bg-highlight",
  alert: "bg-danger",
};

const toneBadge: Record<VisitCompletionTone, "neutral" | "warning" | "danger"> = {
  neutral: "neutral",
  warning: "warning",
  alert: "danger",
};

const dataModeLabel: Record<VisitCompletionDataMode, string> = {
  mvp_mock: "Draft",
  deterministic_heuristic: "Heuristic",
  agent_output: "Agent",
};

export function VisitCompletionPanel({ bundle }: VisitCompletionPanelProps) {
  return (
    <section
      aria-labelledby="ai-visit-completion-heading"
      className="mt-8 overflow-hidden rounded-lg border border-border bg-surface shadow-sm"
    >
      <div className="flex flex-col gap-5 border-b border-border/70 bg-surface-muted/60 px-5 py-5 lg:flex-row lg:items-start lg:justify-between lg:px-6">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              {bundle.sectionLabel}
            </p>
            <Badge tone="accent">{bundle.strategyLabel}</Badge>
          </div>
          <h2
            id="ai-visit-completion-heading"
            className="mt-2 font-display text-2xl font-semibold tracking-tight text-text md:text-3xl"
          >
            {bundle.heading}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">
            Based on the finalized note, active problems, patient history, and practice
            patterns. Review, approve, remove, edit, defer, or route the proposed work.
          </p>
          <p className="mt-2 text-sm font-medium leading-relaxed text-text">
            {bundle.safetyCopy}
          </p>
        </div>

        <ReleaseCarePlanButton bundle={bundle} />
      </div>

      <div className="border-b border-border/70 px-5 py-4 lg:px-6">
        <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-subtle">
              {bundle.selectionLabel}
            </p>
            <p className="mt-1 text-sm text-text-muted">{bundle.mockedDataNotice}</p>
          </div>
          <p className="text-sm font-medium text-text">{bundle.summary}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-4">
        {bundle.cards.map((card) => (
          <SuggestedActionCard key={card.id} card={card} />
        ))}
      </div>

      <div className="mx-5 mb-5 flex flex-col gap-3 rounded-lg border border-highlight/35 bg-highlight-soft px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-text">Physician remains in control.</p>
          <p className="mt-1 text-xs leading-relaxed text-text-muted">
            AI prepares the next actions; no clinical, billing, messaging, scheduling,
            staffing, or chart action happens from this MVP panel.
          </p>
          <p className="mt-1 text-xs leading-relaxed text-text-muted">
            Learns from approvals, edits, removals, and deferrals.
          </p>
        </div>
        <Badge tone="highlight" className="shrink-0">
          Review-only MVP
        </Badge>
      </div>
    </section>
  );
}

function ReleaseCarePlanButton({ bundle }: { bundle: VisitCompletionBundle }) {
  return (
    <details className="group w-full lg:w-[300px]">
      <summary
        aria-disabled={!bundle.releaseEnabled}
        className={cn(
          "flex min-h-10 cursor-pointer list-none items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink shadow-seal transition hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
          !bundle.releaseEnabled && "pointer-events-none opacity-50",
        )}
      >
        <span>{bundle.primaryActionLabel}</span>
      </summary>
      <div className="mt-3 rounded-lg border border-border bg-surface px-4 py-3 shadow-sm">
        <p className="text-sm font-semibold text-text">Review selected actions</p>
        <p className="mt-1 text-xs leading-relaxed text-text-muted">
          Release is staged for review only in this MVP.
        </p>
        <p className="mt-1 text-xs leading-relaxed text-text-muted">
          This confirmation surface will eventually show selected orders, messages,
          scheduling tasks, staff tasks, and practice-readiness checks before anything
          is released.
        </p>
      </div>
    </details>
  );
}

function SuggestedActionCard({ card }: { card: VisitCompletionCard }) {
  const Icon = cardIcons[card.id];
  const needsReview = card.items.some((item) => item.tone !== "neutral");

  return (
    <article className="flex min-h-[268px] flex-col overflow-hidden rounded-lg border border-border/80 bg-surface">
      <div className="border-b border-border/60 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-soft text-accent">
              <Icon className="h-4 w-4" />
            </span>
            <h3 className="text-base font-semibold text-text">{card.title}</h3>
          </div>
          {needsReview && (
            <Badge tone={card.items.some((item) => item.tone === "alert") ? "danger" : "warning"}>
              Review
            </Badge>
          )}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-text-muted">{card.subtitle}</p>
      </div>

      <ul className="flex-1 space-y-3 px-4 py-4">
        {card.items.map((item) => (
          <VisitCompletionLine key={item.id} item={item} />
        ))}
      </ul>

      <VisitCompletionActionList actions={card.actions} />
    </article>
  );
}

function VisitCompletionLine({ item }: { item: VisitCompletionItem }) {
  return (
    <li className="grid grid-cols-[14px_1fr] gap-2 text-sm leading-relaxed text-text">
      <span
        className={cn("mt-2 h-2 w-2 rounded-full", toneDot[item.tone])}
        aria-hidden="true"
      />
      <span>
        <span>{item.label}</span>
        <span className="ml-2 inline-flex items-center gap-1 align-middle">
          {item.dataMode !== "deterministic_heuristic" && (
            <Badge tone="neutral">{dataModeLabel[item.dataMode]}</Badge>
          )}
          {item.reason && item.tone !== "neutral" && (
            <Badge tone={toneBadge[item.tone]}>Source</Badge>
          )}
        </span>
      </span>
    </li>
  );
}

function VisitCompletionActionList({ actions }: { actions: VisitCompletionAction[] }) {
  return (
    <div className="flex flex-wrap gap-2 px-4 pb-4">
      {actions.map((action) => {
        const Icon = actionIcons[action.id] ?? FileText;

        return (
          <Button
            key={action.id}
            size="sm"
            variant={action.variant === "primary" ? "secondary" : "ghost"}
            className={cn(
              "h-8 rounded-md px-2.5 text-xs",
              action.variant === "primary" &&
                "border-accent/25 bg-accent-soft text-accent hover:bg-accent-soft",
            )}
            disabled
            title={action.placeholderCopy}
            leadingIcon={<Icon className="h-3.5 w-3.5" />}
          >
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}
