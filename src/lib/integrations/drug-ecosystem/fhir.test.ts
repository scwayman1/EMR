import { describe, expect, it } from "vitest";

import type { Prescription } from "@/lib/domain/e-prescribe";
import { translateToFhir } from "./fhir";

const basePrescription: Prescription = {
  id: "rx-1",
  encounterId: "enc-1",
  patientId: "pt-1",
  providerId: "pr-1",
  organizationId: "org-1",
  status: "signed",
  productName: "Indica Tincture 10mg/mL",
  productType: "tincture",
  route: "sublingual",
  thcMg: 10,
  doseAmount: 1,
  doseUnit: "mL",
  frequency: "QHS",
  frequencyPerDay: 1,
  timingInstructions: "Hold under tongue for 60 seconds",
  daysSupply: 30,
  quantity: 30,
  quantityUnit: "mL",
  refills: 2,
  diagnosisCodes: [{ code: "G47.00", label: "Insomnia, unspecified" }],
  noteToPatient: "Start low, go slow.",
  noteToPharmacy: "Patient prefers berry flavor.",
  pharmacyId: "pharm-1",
  pharmacyName: "Green Leaf Dispensary",
  pharmacyAddress: "123 Main St",
  pharmacyPhone: "555",
  interactionsReviewed: true,
  contraindicationsReviewed: true,
  signedAt: "2026-05-01T12:00:00Z",
  createdAt: "2026-05-01T11:55:00Z",
  updatedAt: "2026-05-01T12:00:00Z",
};

describe("translateToFhir", () => {
  it("produces a valid R4 MedicationRequest with RxNorm coding when rxcui is provided", () => {
    const fhir = translateToFhir({
      prescription: basePrescription,
      ctx: { patientId: "pt-1", practitionerId: "pr-1", encounterId: "enc-1" },
      rxcui: "999999",
    });

    expect(fhir.resourceType).toBe("MedicationRequest");
    expect(fhir.id).toBe("rx-1");
    expect(fhir.status).toBe("active");
    expect(fhir.intent).toBe("order");
    expect(fhir.subject.reference).toBe("Patient/pt-1");
    expect(fhir.requester.reference).toBe("Practitioner/pr-1");
    expect(fhir.encounter?.reference).toBe("Encounter/enc-1");
    expect(fhir.medicationCodeableConcept.coding[0]).toMatchObject({
      system: "http://www.nlm.nih.gov/research/umls/rxnorm",
      code: "999999",
    });
  });

  it("falls back to a cannabis-product coding when no rxcui or ndc is present", () => {
    const fhir = translateToFhir({
      prescription: basePrescription,
      ctx: { patientId: "pt-1", practitionerId: "pr-1" },
    });
    expect(fhir.medicationCodeableConcept.coding[0].system).toMatch(
      /leafjourney/,
    );
    expect(fhir.medicationCodeableConcept.coding[0].code).toBe("tincture");
  });

  it("translates dose, frequency, and route into the dosage instruction", () => {
    const fhir = translateToFhir({
      prescription: basePrescription,
      ctx: { patientId: "pt-1", practitionerId: "pr-1" },
    });
    const dosage = fhir.dosageInstruction[0];
    expect(dosage.text).toMatch(/1 mL/);
    expect(dosage.timing?.repeat?.frequency).toBe(1);
    expect(dosage.timing?.repeat?.periodUnit).toBe("d");
    expect(dosage.route?.coding[0].system).toBe("http://snomed.info/sct");
    expect(dosage.doseAndRate?.[0].doseQuantity?.value).toBe(1);
  });

  it("emits dispenseRequest with quantity, days supply, and refills", () => {
    const fhir = translateToFhir({
      prescription: basePrescription,
      ctx: {
        patientId: "pt-1",
        practitionerId: "pr-1",
        pharmacyOrganizationId: "pharm-1",
      },
    });
    expect(fhir.dispenseRequest?.quantity?.value).toBe(30);
    expect(fhir.dispenseRequest?.expectedSupplyDuration?.value).toBe(30);
    expect(fhir.dispenseRequest?.numberOfRepeatsAllowed).toBe(2);
    expect(fhir.dispenseRequest?.performer?.reference).toBe(
      "Organization/pharm-1",
    );
  });

  it("maps status correctly across prescription lifecycle", () => {
    const cases: Array<[Prescription["status"], string]> = [
      ["draft", "draft"],
      ["pending_review", "draft"],
      ["signed", "active"],
      ["sent", "active"],
      ["dispensed", "completed"],
      ["cancelled", "cancelled"],
      ["expired", "stopped"],
    ];
    for (const [rxStatus, fhirStatus] of cases) {
      const fhir = translateToFhir({
        prescription: { ...basePrescription, status: rxStatus },
        ctx: { patientId: "pt-1", practitionerId: "pr-1" },
      });
      expect(fhir.status).toBe(fhirStatus);
    }
  });

  it("emits ICD-10 reasonCode and pharmacy note when present", () => {
    const fhir = translateToFhir({
      prescription: basePrescription,
      ctx: { patientId: "pt-1", practitionerId: "pr-1" },
    });
    expect(fhir.reasonCode?.[0].coding[0].code).toBe("G47.00");
    expect(fhir.note?.[0].text).toMatch(/berry flavor/);
  });

  it("omits encounter and pharmacy refs when not provided", () => {
    const fhir = translateToFhir({
      prescription: { ...basePrescription, encounterId: undefined },
      ctx: { patientId: "pt-1", practitionerId: "pr-1" },
    });
    expect(fhir.encounter).toBeUndefined();
    expect(fhir.dispenseRequest?.performer).toBeUndefined();
  });
});
