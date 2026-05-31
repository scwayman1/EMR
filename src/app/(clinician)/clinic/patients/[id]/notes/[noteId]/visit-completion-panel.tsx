"use client";

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
import {
  applyVisitCompletionAction,
  buildVisitCompletionReview,
  initializeVisitCompletionSelection,
  type VisitCompletionCardSelectionStatus,
  type VisitCompletionReview,
  type VisitCompletionSelectionAction,
  type VisitCompletionSelectionState,
} from "@/lib/domain/visit-completion-selection";

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

const statusBadgeTone: Record<
  VisitCompletionCardSelectionStatus,
  "neutral" | "success" | "warning" | "danger" | "info"
> = {
  selected: "info",
  approved: "success",
  edited: "warning",
  removed: "danger",
  deferred: "neutral",
};

const statusLabel: Record<VisitCompletionCardSelectionStatus, string> = {
  selected: "Selected for release",
  approved: "Approved locally",
  edited: "Edited locally",
  removed: "Removed",
  deferred: "Deferred",
};

export function VisitCompletionPanel({ bundle }: VisitCompletionPanelProps) {
  const [selectionState, setSelectionState] = React.useState<VisitCompletionSelectionState>(() =>
    initializeVisitCompletionSelection(bundle),
  );
  const [releaseReviewOpen, setReleaseReviewOpen] = React.useState(true);
  const [activeCardId, setActiveCardId] = React.useState<VisitCompletionCardId>(
    bundle.cards[0]?.id ?? "orders",
  );
  const [editingCardId, setEditingCardId] = React.useState<VisitCompletionCardId | null>(null);
  const [editDraft, setEditDraft] = React.useState("");

  const review = React.useMemo(
    () => buildVisitCompletionReview(bundle, selectionState),
    [bundle, selectionState],
  );

  const activeCard = bundle.cards.find((card) => card.id === activeCardId) ?? bundle.cards[0];

  function applyLocalAction(action: VisitCompletionSelectionAction) {
    setSelectionState((current) => applyVisitCompletionAction(bundle, current, action));
  }

  function handleCardAction(card: VisitCompletionCard, action: VisitCompletionAction) {
    setActiveCardId(card.id);

    switch (action.proposedActionType) {
      case "approve":
      case "send_to_staff":
      case "send_to_patient":
      case "text_scheduling_link":
      case "print":
      case "create_staff_task":
        applyLocalAction({ type: "approve_card", cardId: card.id });
        setReleaseReviewOpen(true);
        return;
      case "remove":
        applyLocalAction({ type: "remove_card", cardId: card.id });
        setReleaseReviewOpen(true);
        return;
      case "defer":
        applyLocalAction({ type: "defer_card", cardId: card.id });
        setReleaseReviewOpen(true);
        return;
      case "edit":
        setEditingCardId(card.id);
        setEditDraft(selectionState.cardStates[card.id]?.editNote ?? "");
        return;
      case "order_review":
      case "coding_review":
      case "view_checks":
        setReleaseReviewOpen(true);
        return;
    }
  }

  function saveEdit(cardId: VisitCompletionCardId) {
    applyLocalAction({
      type: "edit_card",
      cardId,
      note: editDraft.trim() || "Edited locally before release.",
    });
    setEditingCardId(null);
    setEditDraft("");
    setReleaseReviewOpen(true);
  }

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

        <ReleaseCarePlanButton
          bundle={bundle}
          review={review}
          isOpen={releaseReviewOpen}
          onToggle={() => setReleaseReviewOpen((open) => !open)}
        />
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
          <SuggestedActionCard
            key={card.id}
            card={card}
            cardState={selectionState.cardStates[card.id] ?? { status: "selected" }}
            isEditing={editingCardId === card.id}
            editDraft={editDraft}
            onEditDraftChange={setEditDraft}
            onSaveEdit={() => saveEdit(card.id)}
            onCancelEdit={() => {
              setEditingCardId(null);
              setEditDraft("");
            }}
            onAction={(action) => handleCardAction(card, action)}
          />
        ))}
      </div>

      {releaseReviewOpen && (
        <VisitCompletionReviewPanel
          review={review}
          activeCard={activeCard}
          onSelectCard={(cardId) => setActiveCardId(cardId)}
        />
      )}

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

function ReleaseCarePlanButton({
  bundle,
  review,
  isOpen,
  onToggle,
}: {
  bundle: VisitCompletionBundle;
  review: VisitCompletionReview;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="w-full lg:w-[320px]">
      <Button
        size="md"
        className="w-full"
        aria-disabled={!bundle.releaseEnabled}
        aria-label="Open release review"
        onClick={onToggle}
        title="Open release review"
        leadingIcon={<Check className="h-4 w-4" />}
      >
        {bundle.primaryActionLabel}
      </Button>
      <div className="mt-3 rounded-lg border border-border bg-surface px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-text">No actions have been released.</p>
          <Badge tone={isOpen ? "accent" : "neutral"}>
            {isOpen ? "Review open" : "Review closed"}
          </Badge>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-text-muted">
          {review.selectedCount} selected for release, {review.deferredCount} deferred,{" "}
          {review.removedCount} removed.
        </p>
      </div>
    </div>
  );
}

function SuggestedActionCard({
  card,
  cardState,
  isEditing,
  editDraft,
  onEditDraftChange,
  onSaveEdit,
  onCancelEdit,
  onAction,
}: {
  card: VisitCompletionCard;
  cardState: VisitCompletionSelectionState["cardStates"][VisitCompletionCardId];
  isEditing: boolean;
  editDraft: string;
  onEditDraftChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onAction: (action: VisitCompletionAction) => void;
}) {
  const Icon = cardIcons[card.id];
  const needsReview = card.items.some((item) => item.tone !== "neutral");

  return (
    <article
      className={cn(
        "flex min-h-[300px] flex-col overflow-hidden rounded-lg border bg-surface transition",
        cardState.status === "removed"
          ? "border-danger/30 bg-red-50/30"
          : cardState.status === "deferred"
            ? "border-border bg-surface-muted/40"
            : "border-border/80",
      )}
    >
      <div className="border-b border-border/60 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-soft text-accent">
              <Icon className="h-4 w-4" />
            </span>
            <h3 className="text-base font-semibold text-text">{card.title}</h3>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge tone={statusBadgeTone[cardState.status]}>{statusLabel[cardState.status]}</Badge>
            {needsReview && (
              <Badge
                tone={card.items.some((item) => item.tone === "alert") ? "danger" : "warning"}
              >
                Review
              </Badge>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-text-muted">{card.subtitle}</p>
      </div>

      <ul className="flex-1 space-y-3 px-4 py-4">
        {card.items.map((item) => (
          <VisitCompletionLine key={item.id} item={item} />
        ))}
      </ul>

      {cardState.editNote && (
        <p className="mx-4 mb-3 rounded-md border border-highlight/30 bg-highlight-soft px-3 py-2 text-xs leading-relaxed text-text-muted">
          Edit note: {cardState.editNote}
        </p>
      )}

      {isEditing && (
        <div className="mx-4 mb-3 rounded-md border border-accent/20 bg-accent-soft/50 px-3 py-3">
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
            Edit proposed action
          </label>
          <textarea
            className="mt-2 min-h-20 w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm text-text shadow-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            value={editDraft}
            onChange={(event) => onEditDraftChange(event.target.value)}
            placeholder="Add the physician-approved change before release."
          />
          <p className="mt-2 text-xs text-text-muted">Local review state only.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={onSaveEdit}>
              Save edit
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancelEdit}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <VisitCompletionActionList actions={card.actions} onAction={onAction} />
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

function VisitCompletionActionList({
  actions,
  onAction,
}: {
  actions: VisitCompletionAction[];
  onAction: (action: VisitCompletionAction) => void;
}) {
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
            title={action.placeholderCopy}
            onClick={() => onAction(action)}
            leadingIcon={<Icon className="h-3.5 w-3.5" />}
          >
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}

function VisitCompletionReviewPanel({
  review,
  activeCard,
  onSelectCard,
}: {
  review: VisitCompletionReview;
  activeCard?: VisitCompletionCard;
  onSelectCard: (cardId: VisitCompletionCardId) => void;
}) {
  return (
    <div className="mx-5 mb-5 rounded-lg border border-accent/20 bg-accent-soft/35 px-4 py-4 lg:px-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-text">Review selected actions</p>
          <p className="mt-1 text-xs leading-relaxed text-text-muted">
            Release is staged for review only in this MVP.
          </p>
          <p className="mt-1 text-xs leading-relaxed text-text-muted">
            Review-only; no order, message, billing, scheduling, staff task, or chart write is
            sent.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <ReviewMetric label="Selected" value={review.selectedCount} />
          <ReviewMetric label="Deferred" value={review.deferredCount} />
          <ReviewMetric label="Removed" value={review.removedCount} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-border bg-surface px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle">
              Selected for release
            </p>
            <Badge tone="accent">Local review state only</Badge>
          </div>
          <ReviewSectionList sections={review.selectedSections} onSelectCard={onSelectCard} />
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-surface px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle">
              Current focus
            </p>
            <p className="mt-2 text-sm font-semibold text-text">
              {activeCard?.title ?? "No action selected"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-text-muted">
              Use the card controls to approve, edit, remove, or defer before release.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle">
              Held out
            </p>
            <p className="mt-2 text-xs leading-relaxed text-text-muted">
              {review.deferredCount + review.removedCount === 0
                ? "Nothing has been removed or deferred."
                : `${review.deferredCount} deferred and ${review.removedCount} removed from this release review.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-20 rounded-md border border-border bg-surface px-3 py-2">
      <p className="text-lg font-semibold text-text">{value}</p>
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-subtle">
        {label}
      </p>
    </div>
  );
}

function ReviewSectionList({
  sections,
  onSelectCard,
}: {
  sections: VisitCompletionReview["selectedSections"];
  onSelectCard: (cardId: VisitCompletionCardId) => void;
}) {
  if (sections.length === 0) {
    return (
      <p className="mt-3 text-sm text-text-muted">
        No selected care actions. Approve or edit a card to include it in the release review.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {sections.map((section) => (
        <button
          key={section.cardId}
          type="button"
          className="w-full rounded-md border border-border/80 bg-surface-muted/45 px-3 py-2 text-left transition hover:border-accent/35 hover:bg-accent-soft/40"
          onClick={() => onSelectCard(section.cardId)}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-text">{section.title}</p>
            <Badge tone={statusBadgeTone[section.status]}>{statusLabel[section.status]}</Badge>
          </div>
          <ul className="mt-2 space-y-1">
            {section.labels.slice(0, 3).map((label) => (
              <li key={label} className="text-xs leading-relaxed text-text-muted">
                {label}
              </li>
            ))}
          </ul>
          {section.labels.length > 3 && (
            <p className="mt-1 text-xs font-medium text-accent">
              +{section.labels.length - 3} more
            </p>
          )}
          {section.editNote && (
            <p className="mt-2 text-xs leading-relaxed text-text-muted">
              Edit note: {section.editNote}
            </p>
          )}
        </button>
      ))}
    </div>
  );
}
