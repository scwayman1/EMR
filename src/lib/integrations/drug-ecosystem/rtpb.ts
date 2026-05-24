// Real-Time Prescription Benefit (RTPB) — formulary, eligibility,
// and patient out-of-pocket cost lookup at the point of prescribing.
//
// Implements the NCPDP Formulary & Benefit / RTPB transaction set.
// In production this targets Surescripts' RTPB gateway or a payer
// direct connection. The wire format is JSON-over-HTTPS and the
// query/response shapes follow NCPDP RTPB v12.
//
// The EMR's prescribe UI calls `quote()` immediately after the
// provider picks a drug + pharmacy, then shows:
//
//   • whether the drug is on the patient's formulary
//   • the patient's expected copay
//   • prior-auth requirement (if any)
//   • therapeutic alternatives the payer prefers (cheaper / no PA)
//
// The provider can then switch to a preferred alternative before
// transmitting the NewRx, dramatically reducing pharmacy callbacks.

import { z } from "zod";

import type { FetchLike } from "../pharmacy/surescripts-client";

export interface RtpbClientConfig {
  endpoint: string;
  apiKey: string | null;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  now?: () => Date;
  generateId?: () => string;
}

const DEFAULT_TIMEOUT_MS = 8_000;

export interface RtpbPatient {
  /** Payer member ID printed on the patient's insurance card. */
  memberId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender: "M" | "F" | "U";
}

export interface RtpbPrescriber {
  npi: string;
  firstName: string;
  lastName: string;
}

export interface RtpbDrug {
  /** Either rxcui or freeText must be set. */
  rxcui?: string;
  freeText?: string;
  /** NDC if the drug is FDA-listed. */
  ndc?: string;
  quantity: number;
  quantityUnitOfMeasure: string;
  daysSupply: number;
}

export interface RtpbQuoteInput {
  patient: RtpbPatient;
  prescriber: RtpbPrescriber;
  /** Destination pharmacy NCPDP ID. */
  pharmacyNcpdpId: string;
  drug: RtpbDrug;
}

const alternativeSchema = z.object({
  rxcui: z.string().optional(),
  ndc: z.string().optional(),
  drugDescription: z.string(),
  quantity: z.number().optional(),
  daysSupply: z.number().optional(),
  patientResponsibilityCents: z.number().int().nonnegative().optional(),
  formularyStatus: z.string().optional(),
  priorAuthRequired: z.boolean().optional(),
});

const quoteResponseSchema = z.object({
  requestId: z.string(),
  /** Pricing options sorted by patient cost (cheapest first). */
  pricingOptions: z
    .array(
      z.object({
        pharmacyNcpdpId: z.string(),
        pharmacyName: z.string().optional(),
        patientResponsibilityCents: z.number().int().nonnegative(),
        coverageCents: z.number().int().nonnegative().optional(),
        formularyStatus: z.enum([
          "preferred",
          "non_preferred",
          "covered",
          "not_covered",
          "unknown",
        ]),
        priorAuthRequired: z.boolean(),
        stepTherapyRequired: z.boolean().optional(),
        quantityLimit: z
          .object({ amount: z.number(), period: z.string() })
          .optional(),
        message: z.string().optional(),
      }),
    )
    .min(1),
  /** Payer-preferred alternatives. */
  alternatives: z.array(alternativeSchema).default([]),
  /** Patient eligibility snapshot. */
  eligibility: z.object({
    active: z.boolean(),
    planName: z.string().optional(),
    pbmName: z.string().optional(),
    coverageType: z.string().optional(),
    effectiveDate: z.string().optional(),
    terminationDate: z.string().optional(),
  }),
});

export type RtpbQuote = z.infer<typeof quoteResponseSchema>;
export type RtpbAlternative = z.infer<typeof alternativeSchema>;

export class RtpbError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "RtpbError";
  }
}

export class RtpbClient {
  private readonly endpoint: string;
  private readonly apiKey: string | null;
  private readonly fetchImpl: FetchLike;
  private readonly timeoutMs: number;
  private readonly now: () => Date;
  private readonly generateId: () => string;

  constructor(config: RtpbClientConfig) {
    this.endpoint = config.endpoint;
    this.apiKey = config.apiKey;
    this.fetchImpl = config.fetchImpl ?? defaultFetch;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.now = config.now ?? (() => new Date());
    this.generateId = config.generateId ?? defaultGenerateId;
  }

  async quote(input: RtpbQuoteInput): Promise<RtpbQuote> {
    if (!input.drug.rxcui && !input.drug.freeText) {
      throw new RtpbError(
        "RTPB query requires either rxcui or freeText",
        "invalid_input",
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    const requestId = this.generateId();
    const body = JSON.stringify({
      requestId,
      requestedAt: this.now().toISOString(),
      patient: input.patient,
      prescriber: input.prescriber,
      pharmacy: { ncpdpId: input.pharmacyNcpdpId },
      drug: input.drug,
    });

    try {
      const res = await this.fetchImpl(`${this.endpoint}/quote`, {
        method: "POST",
        headers: this.headers(),
        body,
        signal: controller.signal,
      });
      const text = await res.text();
      if (!res.ok) {
        throw new RtpbError(
          `RTPB gateway returned ${res.status}`,
          res.status >= 500 ? "gateway_error" : "request_rejected",
          res.status,
          res.status >= 500,
        );
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new RtpbError("RTPB response was not JSON", "unparseable");
      }
      return quoteResponseSchema.parse(parsed);
    } catch (err) {
      if (err instanceof RtpbError) throw err;
      if ((err as { name?: string }).name === "AbortError") {
        throw new RtpbError(
          `RTPB request timed out after ${this.timeoutMs}ms`,
          "timeout",
          undefined,
          true,
        );
      }
      throw new RtpbError(
        `Network error: ${(err as Error).message}`,
        "network_error",
        undefined,
        true,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
    };
  }
}

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
  return `rtpb-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------------------------------------------------------------------------
// Pick the cheapest covered option from a quote.
// ---------------------------------------------------------------------------

export function cheapestOption(quote: RtpbQuote) {
  return [...quote.pricingOptions]
    .filter((o) => o.formularyStatus !== "not_covered")
    .sort(
      (a, b) =>
        a.patientResponsibilityCents - b.patientResponsibilityCents,
    )[0];
}

/** True when the drug requires a prior authorization at any pharmacy in the quote. */
export function requiresPriorAuth(quote: RtpbQuote): boolean {
  return quote.pricingOptions.some((o) => o.priorAuthRequired);
}

// ---------------------------------------------------------------------------
// Mock transport.
// ---------------------------------------------------------------------------

export interface RtpbMockOptions {
  quote?: Partial<RtpbQuote>;
  httpStatus?: number;
  onRequest?: (payload: { url: string; body: unknown }) => void;
}

export function createMockRtpbTransport(
  opts: RtpbMockOptions = {},
): FetchLike {
  return async (url, init) => {
    let body: unknown = null;
    try {
      body = JSON.parse(init.body);
    } catch {
      body = null;
    }
    opts.onRequest?.({ url, body });

    if (opts.httpStatus && opts.httpStatus >= 400) {
      return {
        ok: false,
        status: opts.httpStatus,
        text: async () => `HTTP ${opts.httpStatus}`,
      };
    }

    const defaults: RtpbQuote = {
      requestId: "mock-request",
      pricingOptions: [
        {
          pharmacyNcpdpId: "MOCK-NCPDP",
          pharmacyName: "Mock Pharmacy",
          patientResponsibilityCents: 1500,
          coverageCents: 4000,
          formularyStatus: "preferred",
          priorAuthRequired: false,
          stepTherapyRequired: false,
        },
      ],
      alternatives: [],
      eligibility: {
        active: true,
        planName: "Mock Plan",
        pbmName: "Mock PBM",
      },
    };

    const merged: RtpbQuote = {
      ...defaults,
      ...opts.quote,
      pricingOptions: opts.quote?.pricingOptions ?? defaults.pricingOptions,
      alternatives: opts.quote?.alternatives ?? defaults.alternatives,
      eligibility: opts.quote?.eligibility ?? defaults.eligibility,
    };

    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify(merged),
    };
  };
}

export function createMockRtpbClient(
  opts: RtpbMockOptions = {},
): RtpbClient {
  return new RtpbClient({
    endpoint: "https://mock.rtpb.local",
    apiKey: "mock-key",
    fetchImpl: createMockRtpbTransport(opts),
  });
}
