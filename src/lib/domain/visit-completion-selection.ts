import type {
  VisitCompletionBundle,
  VisitCompletionCard,
  VisitCompletionCardId,
  VisitCompletionLearningSignal,
} from "./visit-completion";

export type VisitCompletionCardSelectionStatus =
  | "selected"
  | "approved"
  | "confirmed"
  | "edited"
  | "removed"
  | "deferred";

export interface VisitCompletionCardSelectionState {
  status: VisitCompletionCardSelectionStatus;
  editNote?: string;
  confirmationNote?: string;
}

export interface VisitCompletionSelectionState {
  cardStates: Record<VisitCompletionCardId, VisitCompletionCardSelectionState>;
}

export type VisitCompletionSelectionAction =
  | { type: "approve_card"; cardId: VisitCompletionCardId }
  | { type: "confirm_card"; cardId: VisitCompletionCardId; confirmationNote?: string }
  | { type: "remove_card"; cardId: VisitCompletionCardId }
  | { type: "defer_card"; cardId: VisitCompletionCardId }
  | { type: "edit_card"; cardId: VisitCompletionCardId; note: string };

export interface VisitCompletionReviewSection {
  cardId: VisitCompletionCardId;
  title: string;
  status: VisitCompletionCardSelectionStatus;
  labels: string[];
  editNote?: string;
  confirmationNote?: string;
}

export interface VisitCompletionReviewSignal {
  cardId: VisitCompletionCardId;
  feedbackAction: VisitCompletionLearningSignal["feedbackAction"];
  meaning: string;
}

export interface VisitCompletionReview {
  selectedSections: VisitCompletionReviewSection[];
  confirmedSections: VisitCompletionReviewSection[];
  needsConfirmationSections: VisitCompletionReviewSection[];
  removedSections: VisitCompletionReviewSection[];
  deferredSections: VisitCompletionReviewSection[];
  selectedLabels: string[];
  removedLabels: string[];
  deferredLabels: string[];
  selectedCount: number;
  totalCardCount: number;
  resolvedCardCount: number;
  needsConfirmationCount: number;
  removedCount: number;
  deferredCount: number;
  isReadyForRelease: boolean;
  feedbackSignals: VisitCompletionReviewSignal[];
  hasClinicalSideEffects: false;
  hasBillingSideEffects: false;
  hasPatientCommunicationSideEffects: false;
  hasStaffAssignmentSideEffects: false;
  hasChartWriteSideEffects: false;
}

export function initializeVisitCompletionSelection(
  bundle: VisitCompletionBundle,
): VisitCompletionSelectionState {
  const cardStates = {} as VisitCompletionSelectionState["cardStates"];

  for (const card of bundle.cards) {
    cardStates[card.id] = { status: "selected" };
  }

  return { cardStates };
}

export function applyVisitCompletionAction(
  bundle: VisitCompletionBundle,
  state: VisitCompletionSelectionState,
  action: VisitCompletionSelectionAction,
): VisitCompletionSelectionState {
  if (!bundle.cards.some((card) => card.id === action.cardId)) {
    return state;
  }

  let nextCardState: VisitCompletionCardSelectionState;

  switch (action.type) {
    case "edit_card":
      nextCardState = { status: "edited", editNote: action.note.trim() };
      break;
    case "confirm_card":
      nextCardState = {
        status: "confirmed",
        confirmationNote: action.confirmationNote?.trim() || undefined,
      };
      break;
    case "approve_card":
    case "remove_card":
    case "defer_card":
      nextCardState = { status: statusForAction(action.type) };
      break;
  }

  return {
    cardStates: {
      ...state.cardStates,
      [action.cardId]: nextCardState,
    },
  };
}

export function buildVisitCompletionReview(
  bundle: VisitCompletionBundle,
  state: VisitCompletionSelectionState,
): VisitCompletionReview {
  const sections = bundle.cards.map((card) => sectionForCard(card, state));
  const selectedSections = sections.filter((section) =>
    isSelectedForReleaseStatus(section.status),
  );
  const confirmedSections = sections.filter((section) => section.status === "confirmed");
  const needsConfirmationSections = sections.filter((section) =>
    isNeedsConfirmationStatus(section.status),
  );
  const removedSections = sections.filter((section) => section.status === "removed");
  const deferredSections = sections.filter((section) => section.status === "deferred");
  const resolvedCardCount = sections.filter((section) =>
    isResolvedCardStatus(section.status),
  ).length;

  return {
    selectedSections,
    confirmedSections,
    needsConfirmationSections,
    removedSections,
    deferredSections,
    selectedLabels: selectedSections.flatMap((section) => section.labels),
    removedLabels: removedSections.flatMap((section) => section.labels),
    deferredLabels: deferredSections.flatMap((section) => section.labels),
    selectedCount: countLabels(selectedSections),
    totalCardCount: sections.length,
    resolvedCardCount,
    needsConfirmationCount: needsConfirmationSections.length,
    removedCount: countLabels(removedSections),
    deferredCount: countLabels(deferredSections),
    isReadyForRelease: resolvedCardCount === sections.length,
    feedbackSignals: sections.map((section) => feedbackSignalForSection(section)),
    hasClinicalSideEffects: false,
    hasBillingSideEffects: false,
    hasPatientCommunicationSideEffects: false,
    hasStaffAssignmentSideEffects: false,
    hasChartWriteSideEffects: false,
  };
}

function statusForAction(
  type: Exclude<VisitCompletionSelectionAction["type"], "edit_card" | "confirm_card">,
): VisitCompletionCardSelectionStatus {
  switch (type) {
    case "approve_card":
      return "approved";
    case "remove_card":
      return "removed";
    case "defer_card":
      return "deferred";
  }
}

function sectionForCard(
  card: VisitCompletionCard,
  state: VisitCompletionSelectionState,
): VisitCompletionReviewSection {
  const cardState = state.cardStates[card.id] ?? { status: "selected" };

  return {
    cardId: card.id,
    title: card.title,
    status: cardState.status,
    labels: card.items.map((item) => item.label),
    editNote: cardState.editNote,
    confirmationNote: cardState.confirmationNote,
  };
}

function isSelectedForReleaseStatus(status: VisitCompletionCardSelectionStatus): boolean {
  return ["selected", "approved", "confirmed", "edited"].includes(status);
}

function isNeedsConfirmationStatus(status: VisitCompletionCardSelectionStatus): boolean {
  return ["selected", "approved"].includes(status);
}

function isResolvedCardStatus(status: VisitCompletionCardSelectionStatus): boolean {
  return ["confirmed", "edited", "removed", "deferred"].includes(status);
}

function countLabels(sections: VisitCompletionReviewSection[]): number {
  return sections.reduce((sum, section) => sum + section.labels.length, 0);
}

function feedbackSignalForSection(
  section: VisitCompletionReviewSection,
): VisitCompletionReviewSignal {
  switch (section.status) {
    case "edited":
      return {
        cardId: section.cardId,
        feedbackAction: "approved_with_edits",
        meaning: "Physician kept the suggestion but changed details before release.",
      };
    case "removed":
      return {
        cardId: section.cardId,
        feedbackAction: "rejected",
        meaning: "Physician removed a suggested action as inappropriate for this visit.",
      };
    case "deferred":
      return {
        cardId: section.cardId,
        feedbackAction: "dismissed",
        meaning: "Physician deferred the suggestion without rejecting the concept.",
      };
    case "approved":
    case "confirmed":
    case "selected":
      return {
        cardId: section.cardId,
        feedbackAction: "approved",
        meaning: "Physician kept the suggested action in the release review.",
      };
  }
}
