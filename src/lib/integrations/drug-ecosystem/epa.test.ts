import { describe, expect, it } from "vitest";

import {
  createMockEpaClient,
  EpaError,
  prepopulateAnswers,
  type EpaPatient,
  type EpaPrescriber,
  type EpaPayer,
  type EpaDrug,
  type EpaQuestion,
} from "./epa";

const patient: EpaPatient = {
  memberId: "M-1",
  firstName: "Avery",
  lastName: "Stone",
  dateOfBirth: "1972-03-04",
  gender: "F",
};

const prescriber: EpaPrescriber = {
  npi: "1234567890",
  firstName: "Anna",
  lastName: "Wells",
};

const payer: EpaPayer = { id: "AETNA", name: "Aetna" };

const drug: EpaDrug = {
  rxcui: "1010600",
  drugDescription: "Humira 40mg/0.4mL pen",
  quantity: 2,
  daysSupply: 28,
  sig: "Inject 40mg subcutaneously every 14 days",
};

describe("EpaClient.detect", () => {
  it("returns paRequired=false when payer says so", async () => {
    const client = createMockEpaClient({
      detect: { paRequired: false },
    });
    const res = await client.detect({ patient, prescriber, payer, drug });
    expect(res.paRequired).toBe(false);
  });

  it("returns the question set when PA is required", async () => {
    const client = createMockEpaClient({
      detect: {
        paRequired: true,
        payerResponse: {
          questionSetId: "qs-1",
          questions: [
            { id: "q1", text: "Has patient tried metformin?", type: "boolean", required: true },
          ],
        },
      },
    });
    const res = await client.detect({ patient, prescriber, payer, drug });
    expect(res.paRequired).toBe(true);
    expect(res.payerResponse?.questions[0].id).toBe("q1");
  });

  it("surfaces gateway errors", async () => {
    const client = createMockEpaClient({ httpStatus: 503 });
    await expect(
      client.detect({ patient, prescriber, payer, drug }),
    ).rejects.toBeInstanceOf(EpaError);
  });
});

describe("EpaClient.submit", () => {
  it("returns approved status with auth number", async () => {
    const client = createMockEpaClient({
      submit: {
        status: "approved",
        payerAuthNumber: "PA-123",
        approvedQuantity: 2,
        approvedDays: 28,
      },
    });
    const res = await client.submit({
      requestId: "r1",
      patient,
      prescriber,
      payer,
      drug,
      clinical: {
        diagnosisCodes: [{ code: "L40.50", codeQualifier: "ICD10" }],
        rationale: "Severe plaque psoriasis after failure of methotrexate.",
      },
      answers: [{ questionId: "q1", value: true }],
    });
    expect(res.status).toBe("approved");
    expect(res.payerAuthNumber).toBe("PA-123");
  });

  it("returns follow-up questions when payer wants more info", async () => {
    const client = createMockEpaClient({
      submit: {
        status: "questions_pending",
        followUpQuestions: [
          { id: "q2", text: "Provide diagnosis date", type: "date", required: true },
        ],
      },
    });
    const res = await client.submit({
      requestId: "r1",
      patient,
      prescriber,
      payer,
      drug,
      clinical: {
        diagnosisCodes: [{ code: "L40.50", codeQualifier: "ICD10" }],
        rationale: "Severe plaque psoriasis.",
      },
      answers: [{ questionId: "q1", value: true }],
    });
    expect(res.status).toBe("questions_pending");
    expect(res.followUpQuestions[0].id).toBe("q2");
  });
});

describe("prepopulateAnswers", () => {
  it("answers boolean 'tried X' from past meds", () => {
    const questions: EpaQuestion[] = [
      { id: "q1", text: "Has patient tried metformin?", type: "boolean", required: true },
      { id: "q2", text: "Has patient tried Ozempic?", type: "boolean", required: true },
    ];
    const result = prepopulateAnswers(questions, {
      pastMedications: [{ drugDescription: "Metformin 500mg" }],
      diagnoses: [],
      recentLabs: {},
    });
    const m = result.prefilled.find((a) => a.questionId === "q1");
    const o = result.prefilled.find((a) => a.questionId === "q2");
    expect(m?.value).toBe(true);
    expect(o?.value).toBe(false);
  });

  it("answers A1c numeric questions from labs", () => {
    const questions: EpaQuestion[] = [
      { id: "q1", text: "Most recent A1c value", type: "numeric", required: true },
    ];
    const result = prepopulateAnswers(questions, {
      pastMedications: [],
      diagnoses: [],
      recentLabs: { A1c: "8.4" },
    });
    expect(result.prefilled[0].value).toBe(8.4);
    expect(result.remaining).toHaveLength(0);
  });

  it("uses the prescriber's rationale for free-text questions", () => {
    const questions: EpaQuestion[] = [
      { id: "q1", text: "Provide clinical rationale", type: "text", required: true },
    ];
    const result = prepopulateAnswers(questions, {
      pastMedications: [],
      diagnoses: [],
      recentLabs: {},
      rationale: "Patient failed first-line therapy.",
    });
    expect(result.prefilled[0].value).toMatch(/failed first-line/);
  });

  it("leaves unmatched questions in the remaining bucket", () => {
    const questions: EpaQuestion[] = [
      { id: "q1", text: "Has the patient had a TB test?", type: "boolean", required: true },
    ];
    const result = prepopulateAnswers(questions, {
      pastMedications: [],
      diagnoses: [],
      recentLabs: {},
    });
    expect(result.prefilled).toHaveLength(0);
    expect(result.remaining).toHaveLength(1);
  });
});
