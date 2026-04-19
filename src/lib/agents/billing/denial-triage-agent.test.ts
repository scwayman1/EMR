import { describe, expect, it } from "vitest";
import {
  buildDenialTriagePlan,
  dueDaysForUrgency,
  isTriageEligible,
  TRIAGE_ELIGIBLE_STATUSES,
} from "./denial-triage-agent";
import { classifyDenial, NEXT_ACTION_LABEL } from "@/lib/billing/denials";

// ---------------------------------------------------------------------------
// Denial Triage Agent — pure helper tests
// ---------------------------------------------------------------------------
// The Prisma-heavy run() method is skipped; these tests cover the two
// extracted decision helpers (dueDaysForUrgency, isTriageEligible,
// buildDenialTriagePlan) plus the underlying classifyDenial rules
// the agent relies on.

describe("classifyDenial (CARC/denial reason mapping)", () => {
  it("classifies auth-flavored reasons into authorization / high urgency", () => {
    const entry = classifyDenial("Prior auth not on file for this service");
    expect(entry.category).toBe("authorization");
    expect(entry.urgency).toBe("high");
    expect(entry.suggestedAction).toBe("obtain_authorization");
  });

  it("classifies eligibility denials", () => {
    const entry = classifyDenial("Patient not eligible on date of service");
    expect(entry.category).toBe("eligibility");
    expect(entry.urgency).toBe("high");
  });

  it("classifies medical necessity denials into submit_appeal", () => {
    const entry = classifyDenial("Service does not meet medical necessity");
    expect(entry.category).toBe("medical_necessity");
    expect(entry.suggestedAction).toBe("submit_appeal");
  });

  it("classifies timely filing as low urgency", () => {
    const entry = classifyDenial("Past timely filing window");
    expect(entry.category).toBe("timely_filing");
    expect(entry.urgency).toBe("low");
  });

  it("classifies duplicate denials into contact_payer", () => {
    const entry = classifyDenial("Duplicate claim — already processed");
    expect(entry.category).toBe("duplicate");
    expect(entry.suggestedAction).toBe("contact_payer");
  });

  it("classifies non-covered services into transfer_to_patient", () => {
    const entry = classifyDenial("Service is a plan exclusion (not covered)");
    expect(entry.category).toBe("non_covered_service");
    expect(entry.suggestedAction).toBe("transfer_to_patient");
  });

  it("is case-insensitive on keywords", () => {
    const entry = classifyDenial("PRIOR AUTH not supplied");
    expect(entry.category).toBe("authorization");
  });

  it("falls back to 'other' for unrecognized messages", () => {
    const entry = classifyDenial("Some cryptic payer note");
    expect(entry.category).toBe("other");
    expect(entry.suggestedAction).toBe("contact_payer");
    expect(entry.urgency).toBe("medium");
  });

  it("falls back to 'other' for null/undefined/empty reasons", () => {
    expect(classifyDenial(null).category).toBe("other");
    expect(classifyDenial(undefined).category).toBe("other");
    expect(classifyDenial("").category).toBe("other");
  });

  it("exposes a human label for every NextAction", () => {
    // Sanity: the label map must cover all suggestedActions used by the taxonomy.
    const reasons = [
      "prior auth",
      "not eligible",
      "coding error",
      "modifier",
      "medical necessity",
      "timely filing",
      "cob",
      "duplicate",
      "bundled",
      "not covered",
      "not credentialed",
    ];
    for (const r of reasons) {
      const entry = classifyDenial(r);
      expect(NEXT_ACTION_LABEL[entry.suggestedAction]).toBeTruthy();
    }
  });
});

describe("dueDaysForUrgency", () => {
  it("maps high → 2, medium → 5, low → 10", () => {
    expect(dueDaysForUrgency("high")).toBe(2);
    expect(dueDaysForUrgency("medium")).toBe(5);
    expect(dueDaysForUrgency("low")).toBe(10);
  });
});

describe("isTriageEligible", () => {
  it("allows denied and appealed", () => {
    expect(isTriageEligible("denied")).toBe(true);
    expect(isTriageEligible("appealed")).toBe(true);
  });

  it("rejects everything else", () => {
    for (const status of ["draft", "submitted", "accepted", "paid", "voided", ""]) {
      expect(isTriageEligible(status)).toBe(false);
    }
  });

  it("exposes the authoritative eligible-status list", () => {
    expect(TRIAGE_ELIGIBLE_STATUSES).toEqual(["denied", "appealed"]);
  });
});

describe("buildDenialTriagePlan", () => {
  const NOW = new Date("2026-04-19T09:00:00Z");

  it("returns a full triage packet for a known denial reason", () => {
    const plan = buildDenialTriagePlan("no authorization on file", NOW);
    expect(plan.category).toBe("authorization");
    expect(plan.urgency).toBe("high");
    expect(plan.dueDays).toBe(2);
    expect(plan.dueAt.getTime()).toBe(NOW.getTime() + 2 * 86_400_000);
  });

  it("defaults to the 'other' category and medium/10-day window for unknown reasons", () => {
    const plan = buildDenialTriagePlan("???", NOW);
    expect(plan.category).toBe("other");
    expect(plan.urgency).toBe("medium");
    expect(plan.dueDays).toBe(5);
    expect(plan.dueAt.getTime()).toBe(NOW.getTime() + 5 * 86_400_000);
  });

  it("handles null reason gracefully", () => {
    const plan = buildDenialTriagePlan(null, NOW);
    expect(plan.category).toBe("other");
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Prisma mock
// ---------------------------------------------------------------------------
// The denial-triage agent reads a Claim and then writes a Task, updates the
// Claim, and emits a FinancialEvent. We stub all four so the org-scope guard
// can be exercised in isolation — no database, no network.
// ---------------------------------------------------------------------------

const findUnique = vi.fn();
const claimUpdate = vi.fn();
const taskCreate = vi.fn();
const financialEventCreate = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    claim: {
      findUnique: (...args: unknown[]) => findUnique(...args),
      update: (...args: unknown[]) => claimUpdate(...args),
    },
    task: {
      create: (...args: unknown[]) => taskCreate(...args),
    },
    financialEvent: {
      create: (...args: unknown[]) => financialEventCreate(...args),
    },
  },
}));

import { denialTriageAgent } from "./denial-triage-agent";
import type { AgentContext } from "@/lib/orchestration/types";

function makeCtx(organizationId: string | null): AgentContext {
  return {
    jobId: "job-1",
    organizationId,
    log: vi.fn(),
    emit: vi.fn(async () => {}),
    assertCan: vi.fn(),
    model: { complete: vi.fn(async () => "") },
    tools: {} as AgentContext["tools"],
    stepResults: new Map(),
  };
}

function makeClaim(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "claim-1",
    organizationId: "org-a",
    patientId: "patient-1",
    status: "denied",
    denialReason: "CO-16: missing info",
    claimNumber: "CN-001",
    payerName: "Aetna",
    patient: { firstName: "Ada", lastName: "Lovelace" },
    ...overrides,
  };
}

describe("denialTriageAgent — org-scope guard", () => {
  beforeEach(() => {
    findUnique.mockReset();
    claimUpdate.mockReset();
    taskCreate.mockReset();
    financialEventCreate.mockReset();

    claimUpdate.mockResolvedValue({});
    taskCreate.mockResolvedValue({ id: "task-1" });
    financialEventCreate.mockResolvedValue({});
  });

  it("returns { triaged: false, reason: 'claim_not_found' } when no claim exists", async () => {
    findUnique.mockResolvedValue(null);

    const result = await denialTriageAgent.run(
      { claimId: "missing" },
      makeCtx("org-a"),
    );

    expect(result).toEqual({ triaged: false, reason: "claim_not_found" });
    expect(taskCreate).not.toHaveBeenCalled();
    expect(claimUpdate).not.toHaveBeenCalled();
    expect(financialEventCreate).not.toHaveBeenCalled();
  });

  it("throws with 'Org scope violation' when the claim belongs to a different org", async () => {
    findUnique.mockResolvedValue(
      makeClaim({ organizationId: "org-b" /* mismatched */ }),
    );

    await expect(
      denialTriageAgent.run({ claimId: "claim-1" }, makeCtx("org-a")),
    ).rejects.toThrow(/Org scope violation/);

    expect(taskCreate).not.toHaveBeenCalled();
    expect(claimUpdate).not.toHaveBeenCalled();
    expect(financialEventCreate).not.toHaveBeenCalled();
  });

  it("throws 'Org scope violation' when the invoking context has no organizationId", async () => {
    findUnique.mockResolvedValue(makeClaim());

    await expect(
      denialTriageAgent.run({ claimId: "claim-1" }, makeCtx(null)),
    ).rejects.toThrow(/Org scope violation/);

    expect(taskCreate).not.toHaveBeenCalled();
    expect(claimUpdate).not.toHaveBeenCalled();
    expect(financialEventCreate).not.toHaveBeenCalled();
  });

  it("creates a task scoped to the claim's org when orgs match", async () => {
    findUnique.mockResolvedValue(makeClaim());

    const result = await denialTriageAgent.run(
      { claimId: "claim-1" },
      makeCtx("org-a"),
    );

    expect(taskCreate).toHaveBeenCalledTimes(1);
    const taskArgs = taskCreate.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(taskArgs.data.organizationId).toBe("org-a");
    expect(taskArgs.data.patientId).toBe("patient-1");

    expect(financialEventCreate).toHaveBeenCalledTimes(1);
    const feArgs = financialEventCreate.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(feArgs.data.organizationId).toBe("org-a");
    expect(feArgs.data.claimId).toBe("claim-1");

    // "skipped" shape would have category === "skipped"; assert a real triage ran.
    expect(result).toMatchObject({
      claimId: "claim-1",
      taskId: "task-1",
    });
    expect((result as { category: string }).category).not.toBe("skipped");
  });
});
