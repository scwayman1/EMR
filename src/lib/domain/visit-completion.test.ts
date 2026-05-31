import { describe, expect, it } from "vitest";
import { buildVisitCompletionBundle } from "./visit-completion";

const followUpBlocks = [
  {
    heading: "Assessment",
    body: "Diabetes follow-up with worsening glycemic control.",
  },
  {
    heading: "Plan",
    body: "Repeat labs and return to clinic in 6 weeks to review A1C and medication response.",
  },
];

describe("buildVisitCompletionBundle", () => {
  it("returns the four visit completion cards in stable order", () => {
    const bundle = buildVisitCompletionBundle({
      patientFirstName: "Miguel",
      blocks: followUpBlocks,
      codingSuggestion: null,
      hasFutureAppointment: true,
    });

    expect(bundle.sectionLabel).toBe("AI Visit Completion");
    expect(bundle.heading).toBe("Suggested Next Best Actions");
    expect(bundle.primaryActionLabel).toBe("Release Care Plan");
    expect(bundle.supportActionLabel).toBe("Approve all suggested actions");
    expect(bundle.cards.map((card) => card.id)).toEqual([
      "orders",
      "follow_up",
      "patient_message",
      "practice_readiness",
    ]);
  });

  it("exposes learning-loop metadata for physician action feedback", () => {
    const bundle = buildVisitCompletionBundle({
      patientFirstName: "Miguel",
      blocks: followUpBlocks,
      codingSuggestion: null,
      hasFutureAppointment: true,
    });

    expect(bundle.learningLoop.agentName).toBe("visitCompletion");
    expect(bundle.learningLoop.agentVersion).toBe("1.0.0");
    expect(bundle.learningLoop.signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actionId: "release_care_plan",
          feedbackAction: "approved",
        }),
        expect.objectContaining({
          actionId: "edit_item",
          feedbackAction: "approved_with_edits",
        }),
        expect.objectContaining({
          actionId: "remove_item",
          feedbackAction: "rejected",
        }),
        expect.objectContaining({
          actionId: "defer_item",
          feedbackAction: "dismissed",
        }),
      ]),
    );
  });

  it("flags follow-up language when no future appointment exists", () => {
    const bundle = buildVisitCompletionBundle({
      patientFirstName: "Miguel",
      blocks: followUpBlocks,
      codingSuggestion: null,
      hasFutureAppointment: false,
    });

    expect(bundle.cards.find((card) => card.id === "follow_up")?.items[0]).toMatchObject({
      tone: "alert",
      label: "Plan implies follow-up; no appointment scheduled",
    });
  });

  it("uses coding suggestions for practice readiness", () => {
    const bundle = buildVisitCompletionBundle({
      patientFirstName: "Miguel",
      blocks: followUpBlocks,
      hasFutureAppointment: true,
      codingSuggestion: {
        emLevel: "99214",
        rationale: "Chronic condition management with medication adjustment.",
        icd10: [
          { code: "E11.9", label: "Diabetes mellitus", confidence: 0.91 },
          { code: "I10", label: "Essential hypertension", confidence: 0.82 },
        ],
      },
    });

    expect(bundle.cards.find((card) => card.id === "practice_readiness")?.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Suggested E/M: 99214" }),
        expect.objectContaining({ label: "ICD-10 candidate: E11.9 Diabetes mellitus" }),
      ]),
    );
  });

  it("degrades practice readiness when coding is not available yet", () => {
    const bundle = buildVisitCompletionBundle({
      patientFirstName: "Miguel",
      blocks: followUpBlocks,
      codingSuggestion: null,
      hasFutureAppointment: true,
    });

    expect(bundle.cards.find((card) => card.id === "practice_readiness")?.items[0]).toMatchObject({
      label: "No coding suggestion yet",
      tone: "warning",
    });
    expect(bundle.summary).toContain("billing readiness check");
  });
});
