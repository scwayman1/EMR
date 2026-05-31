import { describe, expect, it } from "vitest";
import * as React from "react";
import util from "util";
import { buildVisitCompletionBundle } from "@/lib/domain/visit-completion";
import { VisitCompletionPanel } from "./visit-completion-panel";

function dump(node: React.ReactElement | null): string {
  return util.inspect(node, { depth: null });
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

    const str = dump(VisitCompletionPanel({ bundle }));

    expect(str).toContain("AI Visit Completion");
    expect(str).toContain("Suggested Next Best Actions");
    expect(str).toContain("Release Care Plan");
    expect(str).toContain("Suggested Orders");
    expect(str).toContain("Follow-Up Plan");
    expect(str).toContain("Patient Communication");
    expect(str).toContain("Practice Readiness");
    expect(str).toContain("Physician remains in control.");
    expect(str).toContain("Learns from approvals, edits, removals, and deferrals.");
  });
});
