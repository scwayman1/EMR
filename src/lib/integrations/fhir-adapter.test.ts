import { describe, it, expect } from "vitest";
import {
  chartToFhirBundle,
  medicationsFromBundle,
  reconcileMedications,
  FhirAdapter,
  type PatientChart,
} from "./fhir-adapter";

const chart: PatientChart = {
  id: "p1",
  firstName: "Jane",
  lastName: "Doe",
  birthDate: "1980-05-01",
  conditions: [{ name: "Chronic pain", code: "G89.4" }],
  medications: [
    { name: "Lisinopril", dose: "10 mg", code: "29046" },
    { name: "CBD tincture", dose: "20 mg", isCannabis: true },
  ],
};

describe("chartToFhirBundle", () => {
  it("emits a Patient + Condition + MedicationStatement bundle", () => {
    const bundle = chartToFhirBundle(chart);
    expect(bundle.resourceType).toBe("Bundle");
    const types = bundle.entry.map((e) => e.resource.resourceType);
    expect(types).toContain("Patient");
    expect(types).toContain("Condition");
    expect(types.filter((t) => t === "MedicationStatement")).toHaveLength(2);
  });

  it("round-trips medications back out of the bundle", () => {
    const meds = medicationsFromBundle(chartToFhirBundle(chart));
    expect(meds.map((m) => m.name)).toEqual(["Lisinopril", "CBD tincture"]);
    expect(meds[0].dose).toBe("10 mg");
  });
});

describe("reconcileMedications", () => {
  it("adds new meds, flags dose conflicts, and de-dupes", () => {
    const existing = chart.medications;
    const incoming = [
      { name: "lisinopril", dose: "20 mg" }, // dose conflict (case-insensitive)
      { name: "Metformin", dose: "500 mg" }, // new
      { name: "CBD tincture", dose: "20 mg", isCannabis: true }, // same
    ];
    const { merged, added, conflicts } = reconcileMedications(existing, incoming);
    expect(added.map((m) => m.name)).toEqual(["Metformin"]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({ existingDose: "10 mg", incomingDose: "20 mg" });
    // 3 unique drugs after merge.
    expect(merged).toHaveLength(3);
  });
});

describe("FhirAdapter", () => {
  it("imports a bundle JSON and reconciles", async () => {
    const adapter = new FhirAdapter("https://emr.example/fhir", "/certs/x.pem");
    const bundleJson = JSON.stringify(chartToFhirBundle(chart));
    const result = await adapter.importAndReconcile(bundleJson, [
      { name: "Aspirin", dose: "81 mg" },
    ]);
    // Both chart meds are new relative to the local [Aspirin] list.
    expect(result.added).toHaveLength(2);
    expect(result.merged).toHaveLength(3);
  });
});
