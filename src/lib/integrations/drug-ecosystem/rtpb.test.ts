import { describe, expect, it } from "vitest";

import {
  RtpbError,
  cheapestOption,
  createMockRtpbClient,
  createMockRtpbTransport,
  requiresPriorAuth,
  RtpbClient,
} from "./rtpb";

const baseInput = {
  patient: {
    memberId: "M-1",
    firstName: "Jane",
    lastName: "Doe",
    dateOfBirth: "1980-01-01",
    gender: "F" as const,
  },
  prescriber: { npi: "1234567890", firstName: "Anna", lastName: "Wells" },
  pharmacyNcpdpId: "1234567",
  drug: {
    rxcui: "161",
    quantity: 30,
    quantityUnitOfMeasure: "tablet",
    daysSupply: 30,
  },
};

describe("RtpbClient.quote", () => {
  it("returns parsed pricing options and eligibility", async () => {
    const client = createMockRtpbClient({
      quote: {
        pricingOptions: [
          {
            pharmacyNcpdpId: "A",
            patientResponsibilityCents: 500,
            formularyStatus: "preferred",
            priorAuthRequired: false,
          },
          {
            pharmacyNcpdpId: "B",
            patientResponsibilityCents: 200,
            formularyStatus: "covered",
            priorAuthRequired: true,
          },
        ],
        alternatives: [
          {
            rxcui: "162",
            drugDescription: "generic equivalent",
            patientResponsibilityCents: 0,
            formularyStatus: "preferred",
            priorAuthRequired: false,
          },
        ],
        eligibility: { active: true, planName: "Aetna Choice POS" },
      },
    });

    const quote = await client.quote(baseInput);
    expect(quote.pricingOptions).toHaveLength(2);
    expect(quote.alternatives[0].drugDescription).toBe("generic equivalent");
    expect(quote.eligibility.planName).toBe("Aetna Choice POS");
  });

  it("rejects when neither rxcui nor freeText is provided", async () => {
    const client = createMockRtpbClient();
    await expect(
      client.quote({
        ...baseInput,
        drug: { ...baseInput.drug, rxcui: undefined, freeText: undefined },
      }),
    ).rejects.toBeInstanceOf(RtpbError);
  });

  it("captures HTTP errors", async () => {
    const client = createMockRtpbClient({ httpStatus: 502 });
    await expect(client.quote(baseInput)).rejects.toMatchObject({
      code: "gateway_error",
      retryable: true,
    });
  });

  it("forwards bearer token when configured", async () => {
    const seen: { auth?: string } = {};
    const client = new RtpbClient({
      endpoint: "https://example/rtpb",
      apiKey: "secret-token",
      fetchImpl: async (_url, init) => {
        seen.auth = init.headers.Authorization;
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              requestId: "r",
              pricingOptions: [
                {
                  pharmacyNcpdpId: "A",
                  patientResponsibilityCents: 0,
                  formularyStatus: "preferred",
                  priorAuthRequired: false,
                },
              ],
              alternatives: [],
              eligibility: { active: true },
            }),
        };
      },
    });
    await client.quote(baseInput);
    expect(seen.auth).toBe("Bearer secret-token");
  });
});

describe("helpers", () => {
  it("cheapestOption picks the lowest-cost covered pharmacy", async () => {
    const client = createMockRtpbClient({
      quote: {
        pricingOptions: [
          {
            pharmacyNcpdpId: "A",
            patientResponsibilityCents: 500,
            formularyStatus: "preferred",
            priorAuthRequired: false,
          },
          {
            pharmacyNcpdpId: "B",
            patientResponsibilityCents: 100,
            formularyStatus: "not_covered",
            priorAuthRequired: false,
          },
          {
            pharmacyNcpdpId: "C",
            patientResponsibilityCents: 300,
            formularyStatus: "covered",
            priorAuthRequired: false,
          },
        ],
      },
    });
    const quote = await client.quote(baseInput);
    expect(cheapestOption(quote).pharmacyNcpdpId).toBe("C");
  });

  it("requiresPriorAuth detects PA on any option", async () => {
    const transport = createMockRtpbTransport({
      quote: {
        pricingOptions: [
          {
            pharmacyNcpdpId: "A",
            patientResponsibilityCents: 0,
            formularyStatus: "preferred",
            priorAuthRequired: false,
          },
          {
            pharmacyNcpdpId: "B",
            patientResponsibilityCents: 0,
            formularyStatus: "covered",
            priorAuthRequired: true,
          },
        ],
      },
    });
    const client = new RtpbClient({
      endpoint: "x",
      apiKey: null,
      fetchImpl: transport,
    });
    const quote = await client.quote(baseInput);
    expect(requiresPriorAuth(quote)).toBe(true);
  });
});
