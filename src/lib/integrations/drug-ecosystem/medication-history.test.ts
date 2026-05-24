import { describe, expect, it } from "vitest";

import {
  createMockMedicationHistoryClient,
  reconcile,
  type EmrMedication,
  type ExternalDispense,
} from "./medication-history";

const dispense = (
  partial: Partial<ExternalDispense> & Pick<ExternalDispense, "externalRxId" | "drugDescription" | "quantity" | "filledOn">,
): ExternalDispense => ({
  source: "pbm",
  ...partial,
});

const emrMed = (
  partial: Partial<EmrMedication> & Pick<EmrMedication, "id" | "drugDescription" | "quantity" | "daysSupply">,
): EmrMedication => partial;

describe("MedicationHistoryClient", () => {
  it("returns parsed dispenses", async () => {
    const client = createMockMedicationHistoryClient({
      dispenses: [
        dispense({
          externalRxId: "ext-1",
          drugDescription: "Sertraline 50 MG Oral Tablet",
          quantity: 30,
          filledOn: "2026-04-01",
          rxcui: "312940",
          daysSupply: 30,
        }),
      ],
    });
    const result = await client.fetch({
      patient: {
        identifier: "p-1",
        firstName: "Sam",
        lastName: "Test",
        dateOfBirth: "1985-06-12",
        gender: "F",
      },
      prescriberNpi: "1234567890",
    });
    expect(result.dispenses).toHaveLength(1);
    expect(result.dispenses[0].rxcui).toBe("312940");
  });

  it("caps window at 730 days", async () => {
    let bodySeen: { windowDays?: number } = {};
    const inspecting = await import("./medication-history");
    const c = new inspecting.MedicationHistoryClient({
      endpoint: "https://mock.local",
      apiKey: null,
      accountId: null,
      fetchImpl: async (_url, init) => {
        bodySeen = JSON.parse(init.body) as { windowDays?: number };
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              requestId: "r",
              patientId: "p-1",
              retrievedAt: new Date().toISOString(),
              dispenses: [],
            }),
        };
      },
    });
    await c.fetch({
      patient: {
        identifier: "p-1",
        firstName: "S",
        lastName: "T",
        dateOfBirth: "1985-06-12",
        gender: "M",
      },
      prescriberNpi: "1234567890",
      windowDays: 5000,
    });
    expect(bodySeen.windowDays).toBe(730);
  });
});

describe("reconcile", () => {
  const now = new Date("2026-05-24T00:00:00Z");

  it("matches by rxcui and equal quantities", () => {
    const diff = reconcile(
      [emrMed({ id: "1", rxcui: "312940", drugDescription: "Sertraline 50mg", quantity: 30, daysSupply: 30 })],
      [
        dispense({
          externalRxId: "x",
          rxcui: "312940",
          drugDescription: "Sertraline 50 MG Oral Tablet",
          quantity: 30,
          daysSupply: 30,
          filledOn: "2026-05-01",
        }),
      ],
      now,
    );
    expect(diff.matched).toHaveLength(1);
    expect(diff.discrepant).toHaveLength(0);
    expect(diff.externalOnly).toHaveLength(0);
  });

  it("flags quantity discrepancies outside tolerance", () => {
    const diff = reconcile(
      [emrMed({ id: "1", rxcui: "312940", drugDescription: "Sertraline 50mg", quantity: 30, daysSupply: 30 })],
      [
        dispense({
          externalRxId: "x",
          rxcui: "312940",
          drugDescription: "Sertraline 50mg",
          quantity: 60,
          daysSupply: 30,
          filledOn: "2026-05-01",
        }),
      ],
      now,
    );
    expect(diff.discrepant).toHaveLength(1);
    expect(diff.discrepant[0].reasons[0]).toMatch(/quantity differs/);
  });

  it("flags days-supply discrepancies outside tolerance", () => {
    const diff = reconcile(
      [emrMed({ id: "1", rxcui: "312940", drugDescription: "Sertraline 50mg", quantity: 30, daysSupply: 30 })],
      [
        dispense({
          externalRxId: "x",
          rxcui: "312940",
          drugDescription: "Sertraline 50mg",
          quantity: 30,
          daysSupply: 90,
          filledOn: "2026-05-01",
        }),
      ],
      now,
    );
    expect(diff.discrepant[0].reasons.some((r) => /days supply/.test(r))).toBe(true);
  });

  it("buckets EMR-only meds when there is no matching dispense", () => {
    const diff = reconcile(
      [emrMed({ id: "1", drugDescription: "Aspirin 81mg", quantity: 30, daysSupply: 30 })],
      [],
      now,
    );
    expect(diff.emrOnly).toHaveLength(1);
    expect(diff.summary.emrOnlyCount).toBe(1);
  });

  it("buckets external-only fills and detects undocumented recent fills", () => {
    const diff = reconcile(
      [],
      [
        dispense({
          externalRxId: "x",
          drugDescription: "Oxycodone 5mg",
          quantity: 10,
          filledOn: "2026-05-10",
        }),
      ],
      now,
    );
    expect(diff.externalOnly).toHaveLength(1);
    expect(diff.summary.hasUndocumentedFills).toBe(true);
  });

  it("treats old external fills as documented (not flagging)", () => {
    const diff = reconcile(
      [],
      [
        dispense({
          externalRxId: "x",
          drugDescription: "Oxycodone 5mg",
          quantity: 10,
          filledOn: "2024-01-01",
        }),
      ],
      now,
    );
    expect(diff.summary.hasUndocumentedFills).toBe(false);
  });

  it("falls back to name matching when rxcui is absent on the EMR med", () => {
    const diff = reconcile(
      [emrMed({ id: "1", drugDescription: "Sertraline 50 mg tab", quantity: 30, daysSupply: 30 })],
      [
        dispense({
          externalRxId: "x",
          drugDescription: "Sertraline 50mg Tab",
          quantity: 30,
          daysSupply: 30,
          filledOn: "2026-05-01",
          rxcui: "312940",
        }),
      ],
      now,
    );
    expect(diff.matched).toHaveLength(1);
  });
});
