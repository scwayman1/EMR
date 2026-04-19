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
