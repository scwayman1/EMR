// Medication history (Surescripts RxHistory) + reconciliation.
//
// Pulls dispense history from Surescripts' Medication History service —
// every fill at any U.S. pharmacy for the past 24 months — and produces
// a structured reconciliation diff against the EMR's current
// medication list.
//
// Reconciliation outputs three buckets:
//   • matched      — drug present in both lists, doses agree
//   • discrepant   — drug present in both, but dose/quantity differ
//   • externalOnly — drug filled outside the EMR (often a sign the
//                    patient has another prescriber or filled a sample)
//   • emrOnly      — drug in the EMR's list but no recent dispense
//                    (sign of non-adherence)
//
// The dashboard surfaces the totals; the prescribe UI uses
// `externalOnly` to flag potential drug-drug interactions the EMR
// would otherwise miss.

import { z } from "zod";

import type { FetchLike } from "../pharmacy/surescripts-client";

export interface MedicationHistoryClientConfig {
  endpoint: string;
  apiKey: string | null;
  accountId: string | null;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  now?: () => Date;
  generateId?: () => string;
}

const DEFAULT_TIMEOUT_MS = 12_000;

const dispenseSchema = z.object({
  externalRxId: z.string(),
  rxcui: z.string().optional(),
  ndc: z.string().optional(),
  drugDescription: z.string(),
  quantity: z.number(),
  quantityUnitOfMeasure: z.string().optional(),
  daysSupply: z.number().optional(),
  refillsRemaining: z.number().int().optional(),
  sig: z.string().optional(),
  prescriberNpi: z.string().optional(),
  prescriberName: z.string().optional(),
  pharmacyNcpdpId: z.string().optional(),
  pharmacyName: z.string().optional(),
  filledOn: z.string(), // YYYY-MM-DD
  source: z.enum(["pbm", "pharmacy", "claim"]).default("pbm"),
});

const historyResponseSchema = z.object({
  requestId: z.string(),
  patientId: z.string(),
  retrievedAt: z.string(),
  dispenses: z.array(dispenseSchema),
});

export type ExternalDispense = z.infer<typeof dispenseSchema>;
export type MedicationHistoryResponse = z.infer<
  typeof historyResponseSchema
>;

export interface MedicationHistoryQuery {
  patient: {
    identifier: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: "M" | "F" | "U";
  };
  prescriberNpi: string;
  /** Window in days. Surescripts caps at 730 (24 months). */
  windowDays?: number;
}

export class MedicationHistoryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "MedicationHistoryError";
  }
}

export class MedicationHistoryClient {
  private readonly endpoint: string;
  private readonly apiKey: string | null;
  private readonly accountId: string | null;
  private readonly fetchImpl: FetchLike;
  private readonly timeoutMs: number;
  private readonly now: () => Date;
  private readonly generateId: () => string;

  constructor(config: MedicationHistoryClientConfig) {
    this.endpoint = config.endpoint;
    this.apiKey = config.apiKey;
    this.accountId = config.accountId;
    this.fetchImpl = config.fetchImpl ?? defaultFetch;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.now = config.now ?? (() => new Date());
    this.generateId = config.generateId ?? defaultGenerateId;
  }

  async fetch(query: MedicationHistoryQuery): Promise<MedicationHistoryResponse> {
    const windowDays = Math.min(query.windowDays ?? 365, 730);
    const requestId = this.generateId();
    const body = JSON.stringify({
      requestId,
      requestedAt: this.now().toISOString(),
      windowDays,
      patient: query.patient,
      prescriberNpi: query.prescriberNpi,
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await this.fetchImpl(`${this.endpoint}/rx-history`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
          ...(this.accountId ? { "X-Account-ID": this.accountId } : {}),
        },
        body,
        signal: controller.signal,
      });
      const text = await res.text();
      if (!res.ok) {
        throw new MedicationHistoryError(
          `RxHistory gateway returned ${res.status}`,
          res.status >= 500 ? "gateway_error" : "client_error",
          res.status,
        );
      }
      try {
        return historyResponseSchema.parse(JSON.parse(text));
      } catch {
        throw new MedicationHistoryError(
          "RxHistory response failed to parse",
          "unparseable",
        );
      }
    } catch (err) {
      if (err instanceof MedicationHistoryError) throw err;
      if ((err as { name?: string }).name === "AbortError") {
        throw new MedicationHistoryError(
          "RxHistory timed out",
          "timeout",
        );
      }
      throw new MedicationHistoryError(
        `Network error: ${(err as Error).message}`,
        "network_error",
      );
    } finally {
      clearTimeout(timer);
    }
  }
}

// ---------------------------------------------------------------------------
// Reconciliation.
//
// `reconcile` is pure — no network, no I/O — so it lives next to the
// client and gets full unit-test coverage.
// ---------------------------------------------------------------------------

export interface EmrMedication {
  id: string;
  rxcui?: string;
  drugDescription: string;
  quantity: number;
  daysSupply: number;
  lastFilledOn?: string;
}

export interface ReconciliationDiff {
  matched: { emr: EmrMedication; external: ExternalDispense }[];
  discrepant: {
    emr: EmrMedication;
    external: ExternalDispense;
    reasons: string[];
  }[];
  externalOnly: ExternalDispense[];
  emrOnly: EmrMedication[];
  summary: {
    totalEmr: number;
    totalExternal: number;
    matchedCount: number;
    discrepantCount: number;
    externalOnlyCount: number;
    emrOnlyCount: number;
    /** True when the patient has a recent external fill the EMR didn't know about. */
    hasUndocumentedFills: boolean;
  };
}

const QTY_TOLERANCE = 0.1; // 10%
const DAYS_TOLERANCE_PCT = 0.2; // 20%
const STALE_DAYS = 90;

export function reconcile(
  emrList: EmrMedication[],
  external: ExternalDispense[],
  now: Date = new Date(),
): ReconciliationDiff {
  const externalByRxcui = new Map<string, ExternalDispense[]>();
  const externalByName = new Map<string, ExternalDispense[]>();
  for (const dispense of external) {
    if (dispense.rxcui) {
      const arr = externalByRxcui.get(dispense.rxcui) ?? [];
      arr.push(dispense);
      externalByRxcui.set(dispense.rxcui, arr);
    }
    const key = normalizeName(dispense.drugDescription);
    const arr = externalByName.get(key) ?? [];
    arr.push(dispense);
    externalByName.set(key, arr);
  }

  const matchedExternalIds = new Set<string>();
  const matched: ReconciliationDiff["matched"] = [];
  const discrepant: ReconciliationDiff["discrepant"] = [];
  const emrOnly: EmrMedication[] = [];

  for (const med of emrList) {
    const candidates = pickCandidates(med, externalByRxcui, externalByName);
    const mostRecent = candidates
      .filter((c) => !matchedExternalIds.has(c.externalRxId))
      .sort((a, b) => (a.filledOn < b.filledOn ? 1 : -1))[0];

    if (!mostRecent) {
      emrOnly.push(med);
      continue;
    }
    matchedExternalIds.add(mostRecent.externalRxId);
    const reasons = diffReasons(med, mostRecent);
    if (reasons.length === 0) {
      matched.push({ emr: med, external: mostRecent });
    } else {
      discrepant.push({ emr: med, external: mostRecent, reasons });
    }
  }

  const externalOnly = external.filter(
    (d) => !matchedExternalIds.has(d.externalRxId),
  );

  const recentCutoff = new Date(now);
  recentCutoff.setDate(recentCutoff.getDate() - STALE_DAYS);
  const hasUndocumentedFills = externalOnly.some(
    (d) => new Date(d.filledOn) >= recentCutoff,
  );

  return {
    matched,
    discrepant,
    externalOnly,
    emrOnly,
    summary: {
      totalEmr: emrList.length,
      totalExternal: external.length,
      matchedCount: matched.length,
      discrepantCount: discrepant.length,
      externalOnlyCount: externalOnly.length,
      emrOnlyCount: emrOnly.length,
      hasUndocumentedFills,
    },
  };
}

function pickCandidates(
  med: EmrMedication,
  byRxcui: Map<string, ExternalDispense[]>,
  byName: Map<string, ExternalDispense[]>,
): ExternalDispense[] {
  if (med.rxcui) {
    const exact = byRxcui.get(med.rxcui);
    if (exact && exact.length > 0) return exact;
  }
  return byName.get(normalizeName(med.drugDescription)) ?? [];
}

function diffReasons(emr: EmrMedication, external: ExternalDispense): string[] {
  const reasons: string[] = [];
  const qtyDiff = Math.abs(external.quantity - emr.quantity);
  if (qtyDiff / Math.max(emr.quantity, 1) > QTY_TOLERANCE) {
    reasons.push(
      `quantity differs (${emr.quantity} vs ${external.quantity})`,
    );
  }
  if (external.daysSupply && emr.daysSupply) {
    const daysDiff = Math.abs(external.daysSupply - emr.daysSupply);
    if (daysDiff / Math.max(emr.daysSupply, 1) > DAYS_TOLERANCE_PCT) {
      reasons.push(
        `days supply differs (${emr.daysSupply} vs ${external.daysSupply})`,
      );
    }
  }
  if (
    emr.rxcui &&
    external.rxcui &&
    emr.rxcui !== external.rxcui &&
    normalizeName(emr.drugDescription) !==
      normalizeName(external.drugDescription)
  ) {
    reasons.push(
      `drug identity differs (${emr.drugDescription} vs ${external.drugDescription})`,
    );
  }
  return reasons;
}

function normalizeName(s: string): string {
  // Lowercase, strip everything except letters/digits so that variations
  // like "Sertraline 50 mg tab" and "Sertraline 50mg Tab" match.
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
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
  return `rxh-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------------------------------------------------------------------------
// Mock transport.
// ---------------------------------------------------------------------------

export interface MedicationHistoryMockOptions {
  dispenses?: ExternalDispense[];
  httpStatus?: number;
}

export function createMockMedicationHistoryTransport(
  opts: MedicationHistoryMockOptions = {},
): FetchLike {
  return async (_url, init) => {
    if (opts.httpStatus && opts.httpStatus >= 400) {
      return {
        ok: false,
        status: opts.httpStatus,
        text: async () => `HTTP ${opts.httpStatus}`,
      };
    }
    const body = JSON.parse(init.body);
    return {
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          requestId: body.requestId,
          patientId: body.patient?.identifier ?? "unknown",
          retrievedAt: new Date().toISOString(),
          dispenses: opts.dispenses ?? [],
        }),
    };
  };
}

export function createMockMedicationHistoryClient(
  opts: MedicationHistoryMockOptions = {},
): MedicationHistoryClient {
  return new MedicationHistoryClient({
    endpoint: "https://mock.rxhistory.local",
    apiKey: "mock-key",
    accountId: "MOCK",
    fetchImpl: createMockMedicationHistoryTransport(opts),
  });
}
