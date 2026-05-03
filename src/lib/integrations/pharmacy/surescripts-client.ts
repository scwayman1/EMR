// EMR-pharmacy — SureScripts e-prescribe transmission client.
//
// Translates a Leafjourney `Prescription` into an NCPDP SCRIPT 2017071
// message envelope and ships it over HTTPS to the SureScripts gateway.
// Covers the four flows clinicians actually drive from the e-Rx UI:
//
//   • NewRx               — outbound new prescription
//   • RxRenewalResponse   — provider response to a pharmacy renewal request
//   • RxChangeResponse    — provider response to a pharmacy change request
//   • CancelRx            — cancel a previously-transmitted prescription
//
// We model the SCRIPT message as a plain TS shape and serialize to either
// XML (canonical SureScripts wire format) or JSON (used by the SureScripts
// REST gateway and easier to mock in tests). The HTTP layer is injected
// via a `fetch`-shaped function so the unit tests can swap in a mock
// without touching the network. Acknowledgments are parsed back into a
// structured `TransmitResult` the caller can persist on the prescription.
//
// This file is deliberately framework-free: no Prisma, no Next, no
// runtime dependencies beyond zod. That keeps it easy to unit-test the
// envelope building and response parsing in isolation.

import { z } from "zod";

import type { Prescription } from "@/lib/domain/e-prescribe";
import { formatSig } from "@/lib/domain/e-prescribe";

// ---------------------------------------------------------------------------
// Configuration.
// ---------------------------------------------------------------------------

/**
 * Sandbox endpoint is what we hit during development and CI.
 * Production rotates through SureScripts' regional gateways; the
 * environment variable `SURESCRIPTS_ENDPOINT` overrides at runtime.
 */
export const SURESCRIPTS_SANDBOX_ENDPOINT =
  "https://sandbox.surescripts.net/script/v2017071";

export const SURESCRIPTS_PRODUCTION_ENDPOINT =
  "https://gateway.surescripts.net/script/v2017071";

/** SCRIPT standard version negotiated with SureScripts. */
export const SCRIPT_VERSION = "2017071";

export type Environment = "sandbox" | "production";

export interface SureScriptsCredentials {
  /** SPI (SureScripts Provider Identifier) registered for the prescriber. */
  prescriberSpi: string;
  /** Account ID issued by SureScripts for our EMR organization. */
  accountId: string;
  /** API key — Bearer token in the Authorization header. */
  apiKey: string;
  /** PEM-encoded private key used to sign messages. Optional in sandbox. */
  signingKey?: string;
}

export interface SureScriptsClientConfig {
  environment: Environment;
  credentials: SureScriptsCredentials;
  /** Override the default endpoint (useful for staging gateways). */
  endpointUrl?: string;
  /** Network timeout in milliseconds. */
  timeoutMs?: number;
  /** Inject a fetch implementation (defaults to global `fetch`). */
  fetchImpl?: FetchLike;
  /** Inject a clock — keeps tests deterministic. */
  now?: () => Date;
  /** Inject a UUID generator — same reason. */
  generateId?: () => string;
}

/** Minimal fetch-shaped function we depend on. Lets tests pass a mock. */
export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal },
) => Promise<FetchLikeResponse>;

export interface FetchLikeResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
  headers?: { get(name: string): string | null };
}

// ---------------------------------------------------------------------------
// NCPDP SCRIPT message shapes (subset).
//
// SCRIPT messages are normally XML; we keep an internal JSON model and
// serialize on the way out so the rest of the codebase never has to
// touch XML directly. The field names mirror the spec so a maintainer
// reading SureScripts docs can pattern-match.
// ---------------------------------------------------------------------------

export type ScriptMessageType =
  | "NewRx"
  | "RxRenewalResponse"
  | "RxChangeResponse"
  | "CancelRx";

export interface ScriptHeader {
  to: string;            // pharmacy NCPDP ID
  from: string;          // prescriber SPI
  messageId: string;     // UUID, must be unique per transmission
  sentTime: string;      // ISO-8601
  prescriberOrderNumber: string;
}

export interface ScriptPatient {
  identifier: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;   // YYYY-MM-DD
  gender: "M" | "F" | "U";
  address?: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
  };
  phone?: string;
}

export interface ScriptPrescriber {
  spi: string;
  npi: string;
  deaNumber?: string;
  firstName: string;
  lastName: string;
  clinicName: string;
  phone: string;
  fax?: string;
  address: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
  };
}

export interface ScriptPharmacy {
  ncpdpId: string;
  name: string;
  phone: string;
  fax?: string;
  address: string;
}

export interface ScriptMedication {
  drugDescription: string;
  /** NDC code if the product is FDA-listed; cannabis products often lack one. */
  ndc?: string;
  /** RxNorm RXCUI when available — preferred over free text by pharmacies. */
  rxcui?: string;
  quantity: number;
  quantityUnitOfMeasure: string;
  daysSupply: number;
  refills: number;
  /** Free-text directions (Sig). */
  sig: string;
  substitutions: "0" | "1";   // 0=allowed, 1=not allowed (DAW)
  writtenDate: string;        // YYYY-MM-DD
  noteToPharmacist?: string;
  diagnosisCodes?: Array<{ code: string; codeQualifier: "ICD10" }>;
}

export interface ScriptMessage {
  messageType: ScriptMessageType;
  header: ScriptHeader;
  patient: ScriptPatient;
  prescriber: ScriptPrescriber;
  pharmacy: ScriptPharmacy;
  medication: ScriptMedication;
  /** Original prescriber order number for non-NewRx flows (cancel, change). */
  originalOrderNumber?: string;
  /** Renewal/change response code, e.g. "AP" approved, "DN" denied. */
  responseCode?: ScriptResponseCode;
  /** Free-text reason supplied for denials or partial approvals. */
  responseReason?: string;
}

export type ScriptResponseCode =
  | "AP"   // Approved
  | "AT"   // Approved with changes
  | "DN"   // Denied
  | "DR"   // Denied — request renewal
  | "DC";  // Denied — patient not under provider's care

// ---------------------------------------------------------------------------
// Acknowledgment / status response shapes (parsed from the gateway).
// ---------------------------------------------------------------------------

const ackSchema = z.object({
  messageId: z.string().min(1),
  relatesToMessageId: z.string().min(1).optional(),
  status: z.enum(["accepted", "rejected", "queued", "delivered"]),
  receivedAt: z.string().optional(),
  errorCode: z.string().optional(),
  errorDescription: z.string().optional(),
  /** SureScripts confirmation number — store on the prescription record. */
  confirmationNumber: z.string().optional(),
});

export type SureScriptsAck = z.infer<typeof ackSchema>;

export interface TransmitResult {
  ok: boolean;
  /** Message ID we sent — caller stores this on the prescription. */
  messageId: string;
  /** SureScripts confirmation number, present on accepted/delivered. */
  confirmationNumber?: string;
  /** "accepted" / "rejected" / "queued" / "delivered" — verbatim ack value. */
  status: SureScriptsAck["status"];
  /** Populated when status is "rejected". */
  error?: { code: string; description: string };
  /** Raw envelope sent — useful for audit logs and replay. */
  sentEnvelope: ScriptMessage;
  /** Raw acknowledgment, for downstream persistence. */
  ack: SureScriptsAck;
  /** Wall-clock duration of the round trip. */
  latencyMs: number;
}

// ---------------------------------------------------------------------------
// Errors.
// ---------------------------------------------------------------------------

export class SureScriptsError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "SureScriptsError";
  }
}

// ---------------------------------------------------------------------------
// Envelope builders.
//
// Each builder takes the strongly-typed Leafjourney inputs and produces a
// `ScriptMessage` ready to serialize. Validation happens here so callers
// get a useful zod error rather than a 400 from SureScripts after the
// network round trip.
// ---------------------------------------------------------------------------

const prescriberInputSchema = z.object({
  spi: z.string().min(1),
  npi: z.string().regex(/^\d{10}$/, "NPI must be 10 digits"),
  deaNumber: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  clinicName: z.string().min(1),
  phone: z.string().min(1),
  fax: z.string().optional(),
  address: z.object({
    line1: z.string().min(1),
    city: z.string().min(1),
    state: z.string().length(2),
    postalCode: z.string().min(5),
  }),
});

const patientInputSchema = z.object({
  identifier: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "ISO date required"),
  gender: z.enum(["M", "F", "U"]),
  address: z
    .object({
      line1: z.string().min(1),
      city: z.string().min(1),
      state: z.string().length(2),
      postalCode: z.string().min(5),
    })
    .optional(),
  phone: z.string().optional(),
});

export type PrescriberInput = z.infer<typeof prescriberInputSchema>;
export type PatientInput = z.infer<typeof patientInputSchema>;

export interface BuildNewRxInput {
  prescription: Prescription;
  patient: PatientInput;
  prescriber: PrescriberInput;
  /** NCPDP ID for the destination pharmacy — required by SureScripts. */
  pharmacyNcpdpId: string;
  /** Disallow generic substitution. Defaults to allowed. */
  dispenseAsWritten?: boolean;
  /** RxNorm code if known — improves pharmacy auto-routing. */
  rxcui?: string;
  /** NDC code if the product is FDA-listed. */
  ndc?: string;
}

/**
 * Build a NewRx SCRIPT message from a draft `Prescription`.
 *
 * Throws if required pharmacy fields are missing — callers should
 * validate the prescription is in `signed` state before calling.
 */
export function buildNewRxMessage(
  input: BuildNewRxInput,
  ctx: { now: Date; messageId: string },
): ScriptMessage {
  const rx = input.prescription;
  if (!rx.pharmacyName || !rx.pharmacyAddress) {
    throw new SureScriptsError(
      "Prescription is missing pharmacy details",
      "missing_pharmacy",
    );
  }
  const patient = patientInputSchema.parse(input.patient);
  const prescriber = prescriberInputSchema.parse(input.prescriber);

  const sig = formatSig({
    doseAmount: rx.doseAmount,
    doseUnit: rx.doseUnit,
    frequency: rx.frequency,
    route: rx.route,
    timingInstructions: rx.timingInstructions,
  });

  return {
    messageType: "NewRx",
    header: {
      to: input.pharmacyNcpdpId,
      from: prescriber.spi,
      messageId: ctx.messageId,
      sentTime: ctx.now.toISOString(),
      prescriberOrderNumber: rx.id,
    },
    patient,
    prescriber,
    pharmacy: {
      ncpdpId: input.pharmacyNcpdpId,
      name: rx.pharmacyName,
      phone: rx.pharmacyPhone ?? "",
      fax: rx.pharmacyFax,
      address: rx.pharmacyAddress,
    },
    medication: {
      drugDescription: rx.productName,
      ndc: input.ndc,
      rxcui: input.rxcui,
      quantity: rx.quantity,
      quantityUnitOfMeasure: rx.quantityUnit,
      daysSupply: rx.daysSupply,
      refills: rx.refills,
      sig,
      substitutions: input.dispenseAsWritten ? "1" : "0",
      writtenDate: (rx.signedAt ? new Date(rx.signedAt) : ctx.now)
        .toISOString()
        .slice(0, 10),
      noteToPharmacist: rx.noteToPharmacy,
      diagnosisCodes: rx.diagnosisCodes.map((d) => ({
        code: d.code,
        codeQualifier: "ICD10",
      })),
    },
  };
}

export interface BuildCancelRxInput {
  prescription: Prescription;
  patient: PatientInput;
  prescriber: PrescriberInput;
  pharmacyNcpdpId: string;
  /** SureScripts confirmation number returned from the original NewRx. */
  originalConfirmationNumber: string;
}

export function buildCancelRxMessage(
  input: BuildCancelRxInput,
  ctx: { now: Date; messageId: string },
): ScriptMessage {
  const base = buildNewRxMessage(
    {
      prescription: input.prescription,
      patient: input.patient,
      prescriber: input.prescriber,
      pharmacyNcpdpId: input.pharmacyNcpdpId,
    },
    ctx,
  );
  return {
    ...base,
    messageType: "CancelRx",
    originalOrderNumber: input.originalConfirmationNumber,
  };
}

export interface BuildResponseInput {
  prescription: Prescription;
  patient: PatientInput;
  prescriber: PrescriberInput;
  pharmacyNcpdpId: string;
  /** Order number from the original pharmacy request being responded to. */
  originalOrderNumber: string;
  responseCode: ScriptResponseCode;
  responseReason?: string;
}

export function buildRenewalResponse(
  input: BuildResponseInput,
  ctx: { now: Date; messageId: string },
): ScriptMessage {
  const base = buildNewRxMessage(
    {
      prescription: input.prescription,
      patient: input.patient,
      prescriber: input.prescriber,
      pharmacyNcpdpId: input.pharmacyNcpdpId,
    },
    ctx,
  );
  return {
    ...base,
    messageType: "RxRenewalResponse",
    originalOrderNumber: input.originalOrderNumber,
    responseCode: input.responseCode,
    responseReason: input.responseReason,
  };
}

export function buildChangeResponse(
  input: BuildResponseInput,
  ctx: { now: Date; messageId: string },
): ScriptMessage {
  const base = buildNewRxMessage(
    {
      prescription: input.prescription,
      patient: input.patient,
      prescriber: input.prescriber,
      pharmacyNcpdpId: input.pharmacyNcpdpId,
    },
    ctx,
  );
  return {
    ...base,
    messageType: "RxChangeResponse",
    originalOrderNumber: input.originalOrderNumber,
    responseCode: input.responseCode,
    responseReason: input.responseReason,
  };
}

// ---------------------------------------------------------------------------
// Wire serialization.
//
// SureScripts accepts JSON over their REST gateway and XML over their
// legacy SOAP endpoint. JSON is what we use everywhere except old
// SureScripts-side integrations; we keep the XML serializer narrow and
// only escape characters that matter for the elements we emit.
// ---------------------------------------------------------------------------

export function serializeToJson(msg: ScriptMessage): string {
  return JSON.stringify({ scriptVersion: SCRIPT_VERSION, ...msg });
}

const xmlEscape = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Minimal NCPDP SCRIPT XML serializer. Covers the elements we emit. */
export function serializeToXml(msg: ScriptMessage): string {
  const e = (tag: string, value: string | number | undefined) =>
    value === undefined || value === ""
      ? ""
      : `<${tag}>${xmlEscape(String(value))}</${tag}>`;

  const addr = (a: { line1: string; city: string; state: string; postalCode: string }) =>
    `<Address>${e("Line1", a.line1)}${e("City", a.city)}${e("State", a.state)}${e("PostalCode", a.postalCode)}</Address>`;

  const m = msg.medication;
  const diag = (m.diagnosisCodes ?? [])
    .map(
      (d) =>
        `<Diagnosis><Code>${xmlEscape(d.code)}</Code><Qualifier>${d.codeQualifier}</Qualifier></Diagnosis>`,
    )
    .join("");

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<Message version="${SCRIPT_VERSION}">`,
    `<Header>`,
    e("To", msg.header.to),
    e("From", msg.header.from),
    e("MessageID", msg.header.messageId),
    e("SentTime", msg.header.sentTime),
    e("PrescriberOrderNumber", msg.header.prescriberOrderNumber),
    msg.originalOrderNumber ? e("OriginalOrderNumber", msg.originalOrderNumber) : "",
    msg.responseCode ? e("ResponseCode", msg.responseCode) : "",
    msg.responseReason ? e("ResponseReason", msg.responseReason) : "",
    `</Header>`,
    `<Body><${msg.messageType}>`,
    `<Patient>`,
    e("Identifier", msg.patient.identifier),
    e("FirstName", msg.patient.firstName),
    e("LastName", msg.patient.lastName),
    e("DateOfBirth", msg.patient.dateOfBirth),
    e("Gender", msg.patient.gender),
    msg.patient.address ? addr(msg.patient.address) : "",
    e("Phone", msg.patient.phone),
    `</Patient>`,
    `<Prescriber>`,
    e("SPI", msg.prescriber.spi),
    e("NPI", msg.prescriber.npi),
    e("DEA", msg.prescriber.deaNumber),
    e("FirstName", msg.prescriber.firstName),
    e("LastName", msg.prescriber.lastName),
    e("ClinicName", msg.prescriber.clinicName),
    e("Phone", msg.prescriber.phone),
    e("Fax", msg.prescriber.fax),
    addr(msg.prescriber.address),
    `</Prescriber>`,
    `<Pharmacy>`,
    e("NCPDPID", msg.pharmacy.ncpdpId),
    e("Name", msg.pharmacy.name),
    e("Phone", msg.pharmacy.phone),
    e("Fax", msg.pharmacy.fax),
    e("Address", msg.pharmacy.address),
    `</Pharmacy>`,
    `<Medication>`,
    e("Description", m.drugDescription),
    e("NDC", m.ndc),
    e("RxCUI", m.rxcui),
    e("Quantity", m.quantity),
    e("QuantityUOM", m.quantityUnitOfMeasure),
    e("DaysSupply", m.daysSupply),
    e("Refills", m.refills),
    e("Sig", m.sig),
    e("Substitutions", m.substitutions),
    e("WrittenDate", m.writtenDate),
    e("NoteToPharmacist", m.noteToPharmacist),
    diag,
    `</Medication>`,
    `</${msg.messageType}></Body>`,
    `</Message>`,
  ].join("");
}

// ---------------------------------------------------------------------------
// Acknowledgment parsing.
// ---------------------------------------------------------------------------

export function parseAck(raw: string): SureScriptsAck {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new SureScriptsError(
      "Failed to parse SureScripts acknowledgment",
      "ack_unparseable",
    );
  }
  return ackSchema.parse(parsed);
}

// ---------------------------------------------------------------------------
// Client.
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 15_000;

function defaultEndpoint(env: Environment): string {
  return env === "production"
    ? SURESCRIPTS_PRODUCTION_ENDPOINT
    : SURESCRIPTS_SANDBOX_ENDPOINT;
}

function defaultGenerateId(): string {
  // Lightweight UUIDv4 — avoids pulling in `crypto.randomUUID` so the
  // client works in environments where that's missing (older Node, edge
  // runtimes lacking `globalThis.crypto`).
  const g = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (g?.randomUUID) return g.randomUUID();
  const hex = (n: number) =>
    Array.from({ length: n }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join("");
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${((Math.random() * 4) | 8).toString(16)}${hex(3)}-${hex(12)}`;
}

export class SureScriptsClient {
  private readonly endpoint: string;
  private readonly fetchImpl: FetchLike;
  private readonly timeoutMs: number;
  private readonly now: () => Date;
  private readonly generateId: () => string;

  constructor(private readonly config: SureScriptsClientConfig) {
    this.endpoint = config.endpointUrl ?? defaultEndpoint(config.environment);
    this.fetchImpl = config.fetchImpl ?? defaultFetch;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.now = config.now ?? (() => new Date());
    this.generateId = config.generateId ?? defaultGenerateId;
  }

  /** Transmit a prebuilt SCRIPT message. */
  async transmit(message: ScriptMessage): Promise<TransmitResult> {
    const start = Date.now();
    const body = serializeToJson(message);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: this.buildHeaders(message),
        body,
        signal: controller.signal,
      });

      const text = await response.text();

      if (!response.ok) {
        // SureScripts returns structured errors for some 4xx responses;
        // fall back to a generic error if the body isn't JSON.
        const code = response.status >= 500 ? "gateway_error" : "request_rejected";
        throw new SureScriptsError(
          `SureScripts gateway returned ${response.status}`,
          code,
          response.status,
          response.status >= 500,
        );
      }

      const ack = parseAck(text);
      return {
        ok: ack.status === "accepted" || ack.status === "delivered" || ack.status === "queued",
        messageId: message.header.messageId,
        confirmationNumber: ack.confirmationNumber,
        status: ack.status,
        error:
          ack.status === "rejected"
            ? {
                code: ack.errorCode ?? "unknown",
                description: ack.errorDescription ?? "Rejected without reason",
              }
            : undefined,
        sentEnvelope: message,
        ack,
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      if (err instanceof SureScriptsError) throw err;
      if ((err as { name?: string }).name === "AbortError") {
        throw new SureScriptsError(
          `Timed out after ${this.timeoutMs}ms`,
          "timeout",
          undefined,
          true,
        );
      }
      throw new SureScriptsError(
        `Network error: ${(err as Error).message}`,
        "network_error",
        undefined,
        true,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  // -- Convenience wrappers around the envelope builders ---------------------

  async sendNewRx(input: BuildNewRxInput): Promise<TransmitResult> {
    const message = buildNewRxMessage(input, {
      now: this.now(),
      messageId: this.generateId(),
    });
    return this.transmit(message);
  }

  async cancelRx(input: BuildCancelRxInput): Promise<TransmitResult> {
    const message = buildCancelRxMessage(input, {
      now: this.now(),
      messageId: this.generateId(),
    });
    return this.transmit(message);
  }

  async sendRenewalResponse(input: BuildResponseInput): Promise<TransmitResult> {
    const message = buildRenewalResponse(input, {
      now: this.now(),
      messageId: this.generateId(),
    });
    return this.transmit(message);
  }

  async sendChangeResponse(input: BuildResponseInput): Promise<TransmitResult> {
    const message = buildChangeResponse(input, {
      now: this.now(),
      messageId: this.generateId(),
    });
    return this.transmit(message);
  }

  private buildHeaders(message: ScriptMessage): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-SCRIPT-Version": SCRIPT_VERSION,
      "X-Message-Type": message.messageType,
      "X-Message-ID": message.header.messageId,
      "X-Account-ID": this.config.credentials.accountId,
      "X-Prescriber-SPI": this.config.credentials.prescriberSpi,
      Authorization: `Bearer ${this.config.credentials.apiKey}`,
    };
  }
}

// ---------------------------------------------------------------------------
// Default fetch wrapper — narrows the global Response to FetchLikeResponse.
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

// ---------------------------------------------------------------------------
// Mock transport.
//
// Used in dev, integration tests, and demo flows where we do not want to
// hit SureScripts. Returns a deterministic acknowledgment that mirrors
// what the real gateway emits, with optional injected behavior so tests
// can assert against rejections, timeouts, and queued statuses.
// ---------------------------------------------------------------------------

export interface MockTransportOptions {
  /** Default ack status. Defaults to "accepted". */
  status?: SureScriptsAck["status"];
  /** Force an HTTP error response. */
  httpStatus?: number;
  /** Reject with these details when status="rejected". */
  rejection?: { code: string; description: string };
  /** Delay before responding, in ms. */
  latencyMs?: number;
  /** Override the generated confirmation number. */
  confirmationNumber?: string;
  /** Capture sent payloads for inspection in tests. */
  onRequest?: (payload: { url: string; body: ScriptMessage; headers: Record<string, string> }) => void;
}

export function createMockTransport(opts: MockTransportOptions = {}): FetchLike {
  return async (url, init) => {
    const message = JSON.parse(init.body) as ScriptMessage & { scriptVersion?: string };
    opts.onRequest?.({ url, body: message, headers: init.headers });

    if (opts.latencyMs) {
      await new Promise((resolve) => setTimeout(resolve, opts.latencyMs));
    }

    if (opts.httpStatus && opts.httpStatus >= 400) {
      return {
        ok: false,
        status: opts.httpStatus,
        text: async () => `HTTP ${opts.httpStatus}`,
      };
    }

    const status = opts.status ?? "accepted";
    const ack: SureScriptsAck = {
      messageId: `ack-${message.header?.messageId ?? "unknown"}`,
      relatesToMessageId: message.header?.messageId,
      status,
      receivedAt: new Date().toISOString(),
      confirmationNumber:
        status === "rejected"
          ? undefined
          : opts.confirmationNumber ?? `SS-${message.header?.messageId?.slice(0, 8) ?? "MOCK"}`,
      errorCode: status === "rejected" ? opts.rejection?.code ?? "MOCK_REJECT" : undefined,
      errorDescription:
        status === "rejected" ? opts.rejection?.description ?? "Mocked rejection" : undefined,
    };

    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify(ack),
    };
  };
}

/** Convenience: a client preconfigured against the mock transport. */
export function createMockClient(
  partial: Partial<SureScriptsClientConfig> & { mock?: MockTransportOptions } = {},
): SureScriptsClient {
  const { mock, ...rest } = partial;
  return new SureScriptsClient({
    environment: "sandbox",
    credentials: {
      prescriberSpi: "SPI-MOCK-1",
      accountId: "ACCT-MOCK-1",
      apiKey: "test-key",
    },
    fetchImpl: createMockTransport(mock),
    ...rest,
  });
}
