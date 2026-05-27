import { describe, expect, it } from "vitest";
import {
  buildHistoryText,
  filterNewContraindications,
} from "./diagnosis-safety-agent";
import {
  CANNABIS_CONTRAINDICATIONS,
  type CannabisContraindication,
} from "@/lib/domain/contraindications";

const bipolar = CANNABIS_CONTRAINDICATIONS.find(
  (c) => c.id === "bipolar_type_1",
) as CannabisContraindication;
const schizophrenia = CANNABIS_CONTRAINDICATIONS.find(
  (c) => c.id === "schizophrenia",
) as CannabisContraindication;

describe("buildHistoryText", () => {
  it("concatenates presenting concerns and contraindications lower-cased", () => {
    expect(
      buildHistoryText({
        presentingConcerns: "Chronic pain with Bipolar I Disorder",
        contraindications: ["Schizoaffective disorder"],
      }),
    ).toBe("chronic pain with bipolar i disorder schizoaffective disorder");
  });

  it("handles null fields without throwing", () => {
    expect(
      buildHistoryText({ presentingConcerns: null, contraindications: null }),
    ).toBe("");
    expect(buildHistoryText({})).toBe("");
  });

  it("handles empty contraindication arrays", () => {
    expect(
      buildHistoryText({
        presentingConcerns: "pain",
        contraindications: [],
      }),
    ).toBe("pain");
  });
});

describe("filterNewContraindications", () => {
  const regimenId = "regimen-A";
  const otherRegimenId = "regimen-B";

  it("returns every matched contraindication when no observations exist", () => {
    const result = filterNewContraindications(
      [bipolar, schizophrenia],
      regimenId,
      [],
    );
    expect(result.map((c) => c.id)).toEqual([bipolar.id, schizophrenia.id]);
  });

  it("drops a contraindication already covered by an unresolved observation on the same regimen", () => {
    const result = filterNewContraindications(
      [bipolar, schizophrenia],
      regimenId,
      [
        {
          metadata: { regimenId, contraindicationId: bipolar.id },
          resolvedAt: null,
        },
      ],
    );
    expect(result.map((c) => c.id)).toEqual([schizophrenia.id]);
  });

  it("does NOT drop when the existing observation is resolved", () => {
    const result = filterNewContraindications(
      [bipolar],
      regimenId,
      [
        {
          metadata: { regimenId, contraindicationId: bipolar.id },
          resolvedAt: new Date(),
        },
      ],
    );
    expect(result.map((c) => c.id)).toEqual([bipolar.id]);
  });

  it("does NOT drop when the existing observation is against a different regimen", () => {
    const result = filterNewContraindications(
      [bipolar],
      regimenId,
      [
        {
          metadata: {
            regimenId: otherRegimenId,
            contraindicationId: bipolar.id,
          },
          resolvedAt: null,
        },
      ],
    );
    expect(result.map((c) => c.id)).toEqual([bipolar.id]);
  });

  it("ignores observations whose metadata is null or malformed", () => {
    const result = filterNewContraindications(
      [bipolar],
      regimenId,
      [
        { metadata: null, resolvedAt: null },
        { metadata: "not-an-object", resolvedAt: null },
        { metadata: { regimenId }, resolvedAt: null }, // missing contraindicationId
        {
          metadata: { regimenId, contraindicationId: 42 }, // wrong type
          resolvedAt: null,
        },
      ],
    );
    expect(result.map((c) => c.id)).toEqual([bipolar.id]);
  });

  it("returns [] when every match is already covered", () => {
    const result = filterNewContraindications(
      [bipolar, schizophrenia],
      regimenId,
      [
        {
          metadata: { regimenId, contraindicationId: bipolar.id },
          resolvedAt: null,
        },
        {
          metadata: { regimenId, contraindicationId: schizophrenia.id },
          resolvedAt: null,
        },
      ],
    );
    expect(result).toEqual([]);
  });
});
