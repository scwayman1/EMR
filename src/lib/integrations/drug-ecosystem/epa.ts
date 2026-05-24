// Electronic Prior Authorization (ePA).
//
// Implements NCPDP SCRIPT ePA messaging (PARequest / PAResponse /
// PAAppeal). In production this targets CoverMyMeds (the dominant
// ePA hub) or Surescripts CompletEPA. The wire format is JSON in
// both cases; the question/answer structure is the standardized
// SCRIPT 2017071 "PA question set" returned by the payer.
//
// Two phases:
//
//   1. `detect()`     — call the payer to ask "does this Rx need PA?".
//                       The response is either "no PA required" (we
//                       can transmit the NewRx immediately) or a
//                       question set the prescriber must answer.
//
//   2. `submit()`     — send the answered question set back. The payer
//                       may approve, deny, or come back with more
//                       questions (`questions_pending`). Subsequent
//                       rounds update the same `EpaRequest` row.

import { z } from "zod";

import type { FetchLike } from "../pharmacy/surescripts-client";

export interface EpaClientConfig {
  endpoint: string;
  apiKey: string | null;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  now?: () => Date;
  generateId?: () => string;
}

const DEFAULT_TIMEOUT_MS = 12_000;

// ---------------------------------------------------------------------------
// Wire shapes.
// ---------------------------------------------------------------------------

export interface EpaPatient {
  memberId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "M" | "F" | "U";
}

export interface EpaPrescriber {
  npi: string;
  firstName: string;
  lastName: string;
  deaNumber?: string;
}

export interface EpaDrug {
  rxcui?: string;
  ndc?: string;
  drugDescription: string;
  quantity: number;
  daysSupply: number;
  sig: string;
}

export interface EpaPayer {
  id: string;
  name: string;
  /** Surescripts payer identifier (PCN/BIN/group). */
  bin?: string;
  pcn?: string;
  groupId?: string;
}

export interface EpaClinicalContext {
  diagnosisCodes: { code: string; codeQualifier: "ICD10" }[];
  rationale: string;
  /** Optional structured clinical fields for common PA questions. */
  triedAlternatives?: string[];
  contraindications?: string[];
}

const questionSchema = z.object({
  id: z.string(),
  text: z.string(),
  /** Question type drives the input UI. */
  type: z.enum(["boolean", "text", "single_select", "multi_select", "date", "numeric"]),
  options: z.array(z.string()).optional(),
  required: z.boolean().default(true),
});

const detectResponseSchema = z.object({
  requestId: z.string(),
  paRequired: z.boolean(),
  payerResponse: z
    .object({
      payerAuthNumber: z.string().optional(),
      questionSetId: z.string().optional(),
      questions: z.array(questionSchema).default([]),
      message: z.string().optional(),
    })
    .optional(),
});

export type EpaQuestion = z.infer<typeof questionSchema>;
export type EpaDetectResponse = z.infer<typeof detectResponseSchema>;

export interface EpaAnswer {
  questionId: string;
  value: string | number | boolean | string[];
}

const submitResponseSchema = z.object({
  requestId: z.string(),
  status: z.enum([
    "approved",
    "denied",
    "questions_pending",
    "awaiting_response",
  ]),
  payerAuthNumber: z.string().optional(),
  approvedQuantity: z.number().int().nonnegative().optional(),
  approvedDays: z.number().int().nonnegative().optional(),
  effectiveFrom: z.string().optional(),
  effectiveUntil: z.string().optional(),
  denialReason: z.string().optional(),
  /** Returned when the payer wants another round of answers. */
  followUpQuestions: z.array(questionSchema).default([]),
  message: z.string().optional(),
});

export type EpaSubmitResponse = z.infer<typeof submitResponseSchema>;

// ---------------------------------------------------------------------------
// Errors.
// ---------------------------------------------------------------------------

export class EpaError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "EpaError";
  }
}

// ---------------------------------------------------------------------------
// Client.
// ---------------------------------------------------------------------------

export interface EpaDetectInput {
  patient: EpaPatient;
  prescriber: EpaPrescriber;
  payer: EpaPayer;
  drug: EpaDrug;
}

export interface EpaSubmitInput {
  requestId: string;
  payerAuthNumber?: string;
  patient: EpaPatient;
  prescriber: EpaPrescriber;
  payer: EpaPayer;
  drug: EpaDrug;
  clinical: EpaClinicalContext;
  answers: EpaAnswer[];
}

export class EpaClient {
  private readonly endpoint: string;
  private readonly apiKey: string | null;
  private readonly fetchImpl: FetchLike;
  private readonly timeoutMs: number;
  private readonly now: () => Date;
  private readonly generateId: () => string;

  constructor(config: EpaClientConfig) {
    this.endpoint = config.endpoint;
    this.apiKey = config.apiKey;
    this.fetchImpl = config.fetchImpl ?? defaultFetch;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.now = config.now ?? (() => new Date());
    this.generateId = config.generateId ?? defaultGenerateId;
  }

  async detect(input: EpaDetectInput): Promise<EpaDetectResponse> {
    const body = JSON.stringify({
      requestId: this.generateId(),
      requestedAt: this.now().toISOString(),
      patient: input.patient,
      prescriber: input.prescriber,
      payer: input.payer,
      drug: input.drug,
    });
    const raw = await this.post("/detect", body);
    return detectResponseSchema.parse(raw);
  }

  async submit(input: EpaSubmitInput): Promise<EpaSubmitResponse> {
    const body = JSON.stringify({
      requestId: input.requestId,
      payerAuthNumber: input.payerAuthNumber,
      submittedAt: this.now().toISOString(),
      patient: input.patient,
      prescriber: input.prescriber,
      payer: input.payer,
      drug: input.drug,
      clinical: input.clinical,
      answers: input.answers,
    });
    const raw = await this.post("/submit", body);
    return submitResponseSchema.parse(raw);
  }

  private async post(path: string, body: string): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await this.fetchImpl(`${this.endpoint}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body,
        signal: controller.signal,
      });
      const text = await res.text();
      if (!res.ok) {
        throw new EpaError(
          `ePA gateway returned ${res.status}`,
          res.status >= 500 ? "gateway_error" : "client_error",
          res.status,
          res.status >= 500,
        );
      }
      try {
        return JSON.parse(text);
      } catch {
        throw new EpaError("ePA response was not JSON", "unparseable");
      }
    } catch (err) {
      if (err instanceof EpaError) throw err;
      if ((err as { name?: string }).name === "AbortError") {
        throw new EpaError("ePA request timed out", "timeout", undefined, true);
      }
      throw new EpaError(
        `Network error: ${(err as Error).message}`,
        "network_error",
        undefined,
        true,
      );
    } finally {
      clearTimeout(timer);
    }
  }
}

// ---------------------------------------------------------------------------
// Pre-population from EMR data.
//
// Many PA question sets ask the same questions across payers:
// "Have you tried metformin?", "What is the patient's A1c?", etc.
// Given the clinical context the EMR already has, `prepopulateAnswers`
// fills in best-effort answers so the prescriber only sees the
// questions we *can't* answer automatically.
// ---------------------------------------------------------------------------

export interface PrepopulationContext {
  pastMedications: { rxcui?: string; drugDescription: string }[];
  diagnoses: string[];
  /** Map of lab loinc/name → most-recent value. */
  recentLabs: Record<string, string>;
  /** Free-text rationale provided by the prescriber. */
  rationale?: string;
}

export interface PrepopulationResult {
  prefilled: EpaAnswer[];
  remaining: EpaQuestion[];
}

const HEURISTICS: Array<{
  match: RegExp;
  resolve: (q: EpaQuestion, ctx: PrepopulationContext) => EpaAnswer | null;
}> = [
  {
    match: /tried (.+?)(?:\?| before)/i,
    resolve: (q, ctx) => {
      const m = q.text.match(/tried (.+?)(?:\?| before)/i);
      if (!m) return null;
      const candidate = m[1].toLowerCase();
      const tried = ctx.pastMedications.some((p) =>
        p.drugDescription.toLowerCase().includes(candidate),
      );
      if (q.type !== "boolean") return null;
      return { questionId: q.id, value: tried };
    },
  },
  {
    match: /diagnos(?:is|ed)/i,
    resolve: (q, ctx) => {
      if (q.type === "text") {
        return { questionId: q.id, value: ctx.diagnoses.join(", ") };
      }
      if (q.type === "single_select" && q.options) {
        const hit = q.options.find((o) =>
          ctx.diagnoses.some((d) => d.toLowerCase().includes(o.toLowerCase())),
        );
        if (hit) return { questionId: q.id, value: hit };
      }
      return null;
    },
  },
  {
    match: /a1c|hba1c/i,
    resolve: (q, ctx) => {
      const a1c = ctx.recentLabs["A1c"] ?? ctx.recentLabs["HbA1c"];
      if (!a1c) return null;
      if (q.type === "numeric") {
        const num = Number(a1c);
        if (Number.isFinite(num)) return { questionId: q.id, value: num };
      }
      if (q.type === "text") return { questionId: q.id, value: a1c };
      return null;
    },
  },
  {
    match: /rationale|justification|why/i,
    resolve: (q, ctx) => {
      if (q.type === "text" && ctx.rationale) {
        return { questionId: q.id, value: ctx.rationale };
      }
      return null;
    },
  },
];

export function prepopulateAnswers(
  questions: EpaQuestion[],
  context: PrepopulationContext,
): PrepopulationResult {
  const prefilled: EpaAnswer[] = [];
  const remaining: EpaQuestion[] = [];

  for (const question of questions) {
    let answered: EpaAnswer | null = null;
    for (const h of HEURISTICS) {
      if (h.match.test(question.text)) {
        answered = h.resolve(question, context);
        if (answered) break;
      }
    }
    if (answered) prefilled.push(answered);
    else remaining.push(question);
  }

  return { prefilled, remaining };
}

// ---------------------------------------------------------------------------
// Helpers.
// ---------------------------------------------------------------------------

const defaultFetch: FetchLike = async (url, init) => {
  const res = await fetch(url, init);
  return {
    ok: res.ok,
    status: res.status,
    text: () => res.text(),
    headers: res.headers,
  };
};

function defaultGenerateId(): string {
  const g = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (g?.randomUUID) return g.randomUUID();
  return `epa-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------------------------------------------------------------------------
// Mock transport.
// ---------------------------------------------------------------------------

export interface EpaMockOptions {
  detect?: Partial<EpaDetectResponse>;
  submit?: Partial<EpaSubmitResponse>;
  httpStatus?: number;
}

export function createMockEpaTransport(opts: EpaMockOptions = {}): FetchLike {
  return async (url, init) => {
    if (opts.httpStatus && opts.httpStatus >= 400) {
      return {
        ok: false,
        status: opts.httpStatus,
        text: async () => `HTTP ${opts.httpStatus}`,
      };
    }
    const body = JSON.parse(init.body);
    if (url.endsWith("/detect")) {
      const merged: EpaDetectResponse = {
        requestId: body.requestId,
        paRequired: false,
        ...opts.detect,
      };
      return { ok: true, status: 200, text: async () => JSON.stringify(merged) };
    }
    if (url.endsWith("/submit")) {
      const merged: EpaSubmitResponse = {
        requestId: body.requestId,
        status: "approved",
        followUpQuestions: [],
        ...opts.submit,
      };
      return { ok: true, status: 200, text: async () => JSON.stringify(merged) };
    }
    return { ok: true, status: 200, text: async () => "{}" };
  };
}

export function createMockEpaClient(opts: EpaMockOptions = {}): EpaClient {
  return new EpaClient({
    endpoint: "https://mock.epa.local",
    apiKey: "mock-key",
    fetchImpl: createMockEpaTransport(opts),
  });
}
