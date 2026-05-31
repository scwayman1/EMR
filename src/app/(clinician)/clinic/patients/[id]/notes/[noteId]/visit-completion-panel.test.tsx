import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildVisitCompletionBundle } from "@/lib/domain/visit-completion";
import { VisitCompletionPanel } from "./visit-completion-panel";

function dump(node: React.ReactElement | null): string {
  return renderToStaticMarkup(node);
}

describe("VisitCompletionPanel", () => {
  it("renders the physician co-pilot language and four action cards", () => {
    const bundle = buildVisitCompletionBundle({
      patientFirstName: "Miguel",
      hasFutureAppointment: false,
      blocks: [
        {
          heading: "Plan",
          body: "Return to clinic in 6 weeks after medication adjustment.",
        },
      ],
      codingSuggestion: {
        emLevel: "99214",
        rationale: "Chronic condition management with medication adjustment.",
        icd10: [{ code: "G89.29", label: "Chronic pain", confidence: 0.88 }],
      },
    });

    const str = dump(<VisitCompletionPanel bundle={bundle} />);

    expect(str).toContain("AI Visit Completion");
    expect(str).toContain("Suggested Next Best Actions");
    expect(str).toContain("Suggested next actions before sign-off");
    expect(str).toContain("Release Care Plan");
    expect(str).toContain("Select Care Actions");
    expect(str).toContain("Suggested Orders");
    expect(str).toContain("Follow-Up Plan");
    expect(str).toContain("Patient Communication");
    expect(str).toContain("Practice Readiness");
    expect(str).toContain(
      "Nothing is ordered, sent, billed, scheduled, or assigned until the physician releases the care plan.",
    );
    expect(str).toContain("Review orders");
    expect(str).toContain("Send to front desk");
    expect(str).toContain("Preview message");
    expect(str).toContain("Create staff tasks");
    expect(str).toContain("Review selected actions");
    expect(str).toContain("Release is staged for review only in this MVP.");
    expect(str).toContain("No actions have been released.");
    expect(str).toContain("Selected for release");
    expect(str).toContain("Open release review");
    expect(str).toContain("Release readiness");
    expect(str).toContain("0 of 4 cards resolved");
    expect(str).toContain("Confirmation required before release.");
    expect(str).toContain("Click in to confirm");
    expect(str).toContain("Confirm this card");
    expect(str).toContain("Open details");
    expect(str).toContain("Final release review");
    expect(str).toContain("Structured release payload");
    expect(str).toContain("Preview release payload");
    expect(str).toContain(
      "Release Care Plan is blocked until every card has an explicit physician disposition.",
    );
    expect(str).toContain(
      "Payload is review-only and creates no clinical, billing, messaging, scheduling, staff, or chart side effects.",
    );
    expect(str).toContain(
      "Review-only; no order, message, billing, scheduling, staff task, or chart write is sent.",
    );
    expect(str).toContain("Physician remains in control.");
    expect(str).toContain("Learns from approvals, edits, removals, and deferrals.");
    expect(str).not.toContain("disabled=\"\"");
  });
});
