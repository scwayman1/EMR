import { describe, expect, it } from "vitest";
import { buildVisitCompletionBundle } from "./visit-completion";
import {
  applyVisitCompletionAction,
  buildVisitCompletionReview,
  initializeVisitCompletionSelection,
} from "./visit-completion-selection";

const bundle = buildVisitCompletionBundle({
  patientFirstName: "Miguel",
  hasFutureAppointment: false,
  blocks: [
    {
      heading: "Assessment",
      body: "Diabetes follow-up with worsening glycemic control.",
    },
    {
      heading: "Plan",
      body: "Repeat labs and return to clinic in 6 weeks to review A1C and medication response.",
    },
  ],
  codingSuggestion: {
    emLevel: "99214",
    rationale: "Chronic condition management with medication adjustment.",
    icd10: [{ code: "E11.9", label: "Diabetes mellitus", confidence: 0.91 }],
  },
});

describe("visit completion selection state", () => {
  it("starts every card selected for physician review without creating side effects", () => {
    const state = initializeVisitCompletionSelection(bundle);
    const review = buildVisitCompletionReview(bundle, state);

    expect(Object.values(state.cardStates).map((card) => card.status)).toEqual([
      "selected",
      "selected",
      "selected",
      "selected",
    ]);
    expect(review.selectedCount).toBe(
      bundle.cards.reduce((sum, card) => sum + card.items.length, 0),
    );
    expect(review.removedCount).toBe(0);
    expect(review.deferredCount).toBe(0);
    expect(review.hasClinicalSideEffects).toBe(false);
    expect(review.hasBillingSideEffects).toBe(false);
    expect(review.hasPatientCommunicationSideEffects).toBe(false);
    expect(review.hasStaffAssignmentSideEffects).toBe(false);
    expect(review.hasChartWriteSideEffects).toBe(false);
  });

  it("records approvals, removals, deferrals, and edits as learning feedback", () => {
    const initial = initializeVisitCompletionSelection(bundle);
    const approved = applyVisitCompletionAction(bundle, initial, {
      type: "approve_card",
      cardId: "orders",
    });
    const removed = applyVisitCompletionAction(bundle, approved, {
      type: "remove_card",
      cardId: "follow_up",
    });
    const deferred = applyVisitCompletionAction(bundle, removed, {
      type: "defer_card",
      cardId: "practice_readiness",
    });
    const edited = applyVisitCompletionAction(bundle, deferred, {
      type: "edit_card",
      cardId: "patient_message",
      note: "Use simpler language and include pharmacy confirmation.",
    });

    const review = buildVisitCompletionReview(bundle, edited);

    expect(edited.cardStates.orders.status).toBe("approved");
    expect(edited.cardStates.follow_up.status).toBe("removed");
    expect(edited.cardStates.practice_readiness.status).toBe("deferred");
    expect(edited.cardStates.patient_message).toMatchObject({
      status: "edited",
      editNote: "Use simpler language and include pharmacy confirmation.",
    });
    expect(review.removedCount).toBe(
      bundle.cards.find((card) => card.id === "follow_up")?.items.length,
    );
    expect(review.deferredCount).toBe(
      bundle.cards.find((card) => card.id === "practice_readiness")?.items.length,
    );
    expect(review.feedbackSignals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ cardId: "orders", feedbackAction: "approved" }),
        expect.objectContaining({ cardId: "follow_up", feedbackAction: "rejected" }),
        expect.objectContaining({ cardId: "practice_readiness", feedbackAction: "dismissed" }),
        expect.objectContaining({
          cardId: "patient_message",
          feedbackAction: "approved_with_edits",
        }),
      ]),
    );
  });

  it("builds a release review that separates selected, removed, and deferred work", () => {
    const initial = initializeVisitCompletionSelection(bundle);
    const removed = applyVisitCompletionAction(bundle, initial, {
      type: "remove_card",
      cardId: "orders",
    });
    const deferred = applyVisitCompletionAction(bundle, removed, {
      type: "defer_card",
      cardId: "follow_up",
    });

    const review = buildVisitCompletionReview(bundle, deferred);

    expect(review.selectedSections.map((section) => section.cardId)).toEqual([
      "patient_message",
      "practice_readiness",
    ]);
    expect(review.removedSections.map((section) => section.cardId)).toEqual(["orders"]);
    expect(review.deferredSections.map((section) => section.cardId)).toEqual(["follow_up"]);
    expect(review.selectedLabels).toEqual(
      expect.arrayContaining([
        "Portal summary drafted with lab instructions and follow-up timing.",
        "Suggested E/M: 99214",
      ]),
    );
    expect(review.removedLabels).toEqual(
      expect.arrayContaining(["A1C", "Urine albumin/creatinine", "CMP/eGFR"]),
    );
    expect(review.deferredLabels).toEqual(
      expect.arrayContaining(["RTC in 6 weeks recommended. No appointment currently scheduled."]),
    );
  });
});
