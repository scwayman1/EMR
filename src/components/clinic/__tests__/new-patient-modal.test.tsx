import { describe, it, expect, vi } from "vitest";
import util from "util";
import React from "react";

/**
 * EMR-655 — NewPatientModal structural tests.
 *
 * Vitest runs in node (no DOM), so we render the component element tree and
 * inspect it with `util.inspect`. We check:
 *   1. The three section labels (Personal, Emergency contacts, Insurance)
 *      are all present in the tree.
 *   2. Three emergency contact slots are rendered.
 *   3. The submit handler ultimately dispatches the createPatient server
 *      action (we mock it and assert it's wired through).
 */

vi.mock("../../../app/(clinician)/clinic/patients/actions", () => ({
  createPatient: vi.fn(async () => ({ ok: true, patientId: "patient_new" })),
}));

import { NewPatientModal, __test__ } from "../new-patient-modal";

describe("NewPatientModal", () => {
  it("exports a React component", () => {
    expect(typeof NewPatientModal).toBe("function");
  });

  it("renders the three section headers in its open shell", () => {
    const tree = __test__.renderShellOpen();
    const dump = util.inspect(tree, { depth: null });
    expect(dump).toContain("Personal information");
    expect(dump).toContain("Emergency contacts");
    expect(dump).toContain("Insurance");
  });

  it("renders exactly three emergency contact slots", () => {
    const tree = __test__.renderShellOpen();
    const dump = util.inspect(tree, { depth: null });
    // Each slot is labelled "Contact 1", "Contact 2", "Contact 3".
    expect(dump).toContain("Contact 1");
    expect(dump).toContain("Contact 2");
    expect(dump).toContain("Contact 3");
  });

  it("validate() blocks submit when required personal fields are empty", () => {
    const result = __test__.validate(__test__.emptyDraft());
    expect(result.ok).toBe(false);
  });

  it("validate() passes when all required fields are filled", () => {
    const draft = __test__.emptyDraft();
    draft.personal.firstName = "Alex";
    draft.personal.lastName = "Jones";
    draft.emergencyContacts.forEach((c, i) => {
      c.name = `Contact ${i + 1}`;
      c.phone = "555-0000";
      c.relationship = "Friend";
    });
    draft.insurance.payerName = "Blue Cross";
    draft.insurance.memberId = "ABC";

    const result = __test__.validate(draft);
    expect(result.ok).toBe(true);
  });

  it("validate() requires three emergency contacts with names", () => {
    const draft = __test__.emptyDraft();
    draft.personal.firstName = "A";
    draft.personal.lastName = "B";
    draft.insurance.payerName = "BC";
    draft.insurance.memberId = "X";
    // Leave emergency contacts blank → should fail.
    const result = __test__.validate(draft);
    expect(result.ok).toBe(false);
  });

  it("submit() forwards the draft to the createPatient action", async () => {
    const { createPatient } = await import(
      "../../../app/(clinician)/clinic/patients/actions"
    );
    const draft = __test__.emptyDraft();
    draft.personal.firstName = "Alex";
    draft.personal.lastName = "Jones";
    draft.emergencyContacts.forEach((c, i) => {
      c.name = `EC${i + 1}`;
      c.phone = "555";
      c.relationship = "Friend";
    });
    draft.insurance.payerName = "Blue Cross";
    draft.insurance.memberId = "ABC";

    const out = await __test__.submit(draft);
    expect(out.ok).toBe(true);
    expect(createPatient).toHaveBeenCalledTimes(1);
  });
});
