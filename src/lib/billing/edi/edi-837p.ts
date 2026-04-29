// EMR-216 — Production 837P (Professional) generator
// ---------------------------------------------------
// Emits a complete ANSI X12 v5010 837P transaction set covering every
// loop the implementation guide marks as required for a primary or
// secondary professional claim:
//
//   ISA / GS / ST envelope
//   Loop 1000A — Submitter name
//   Loop 1000B — Receiver name
//   Loop 2000A — Billing provider HL
//     Loop 2010AA — Billing provider name + address + tax ID
//     Loop 2010AB — Pay-to address (when different)
//   Loop 2000B — Subscriber HL
//     Loop 2010BA — Subscriber name + demographics
//     Loop 2010BB — Payer name + ID
//   Loop 2000C — Patient HL (only when patient ≠ subscriber)
//     Loop 2010CA — Patient name + demographics
//   Loop 2300 — Claim
//     CLM, HI (diagnoses), DTP (dates), REF (prior auth, payer claim ctrl)
//     Loop 2310B — Rendering provider name
//     Loop 2320 — Other subscriber/payer (secondary claims)
//       AMT, CAS — primary payer adjudication amounts
//     Loop 2400 — Service line
//       SV1, DTP, REF
//       Loop 2430 — Line adjudication (when filing as secondary)
//
// The emitter is purely functional: feed it a `Claim837Input` and it
// returns a string. All data lookups happen upstream.

import {
  buildGe,
  buildGs,
  buildIea,
  buildIsa,
  buildSe,
  buildSt,
  DEFAULT_DELIMITERS,
  formatAmount,
  formatD8,
  joinSegments,
  segment,
  type X12Delimiters,
  type X12Element,
} from "./x12";
import type { BillingAddress } from "../identifiers";

// ---------------------------------------------------------------------------
// Input types — a normalized projection of Claim + Patient + Provider + Org
// ---------------------------------------------------------------------------

export interface Submitter {
  name: string;
  id: string;
  contactName: string;
  contactPhone: string; // digits only
}

export interface Receiver {
  name: string;
  id: string; // clearinghouse-assigned, NOT the payer id
}

export interface BillingProvider {
  organizationName: string;
  npi: string; // 10 digits
  taxId: string; // EIN, no hyphen — 9 digits
  taxonomyCode: string | null;
  address: BillingAddress;
  payToAddress: BillingAddress | null;
}

export interface Subscriber {
  memberId: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  dateOfBirth: Date;
  gender: "M" | "F" | "U";
  address: BillingAddress;
  /** "18" = self, "01" = spouse, "19" = child, "G8" = other */
  relationshipToPatient: "18" | "01" | "19" | "G8";
  /** "MB" Medicare-B, "MC" Medicaid, "CI" commercial, "BL" BlueCross,
   *  "16" HMO Medicare risk, "ZZ" mutually defined / other */
  insuranceType: "MB" | "MC" | "CI" | "BL" | "16" | "ZZ";
}

export interface PatientDemographics {
  firstName: string;
  lastName: string;
  middleName?: string | null;
  dateOfBirth: Date;
  gender: "M" | "F" | "U";
  address: BillingAddress;
}

export interface Payer {
  name: string;
  payerId: string;
}

export interface ServiceLine {
  /** 1-based line sequence number. */
  sequence: number;
  cptCode: string;
  modifiers: string[]; // up to 4
  units: number;
  chargeCents: number;
  /** ICD-10 pointer indices (1-based, max 4) into the claim's diagnosis list. */
  diagnosisPointers: number[];
  serviceDate: Date;
  /** "11" office, "02" telehealth (audio+video), "10" telehealth audio-only, etc. */
  placeOfService?: string;
  /** Filled when filing as secondary — primary payer's allowed/paid for this line. */
  primaryAdjudication?: {
    allowedCents: number;
    paidCents: number;
    cas: ClaimAdjustment[];
    /** Date the primary adjudication ERA was received. */
    eraDate: Date;
  };
}

/** Claim Adjustment (CAS) — primary payer's contractual / patient-resp /
 *  other adjustments, used in Loop 2320 (claim level) and 2430 (line level)
 *  when filing a secondary claim. */
export interface ClaimAdjustment {
  /** "CO" contractual, "PR" patient resp, "OA" other, "PI" payer-initiated */
  groupCode: "CO" | "PR" | "OA" | "PI";
  /** CARC code (e.g. "45" = charge exceeds fee schedule). */
  reasonCode: string;
  amountCents: number;
  /** Optional units adjustment. */
  units?: number;
}

export interface Claim837Input {
  submitter: Submitter;
  receiver: Receiver;
  billingProvider: BillingProvider;
  subscriber: Subscriber;
  /** When subscriber === patient this is null and we skip Loop 2000C. */
  patient: PatientDemographics | null;
  payer: Payer;
  rendering: {
    npi: string;
    firstName: string;
    lastName: string;
    taxonomyCode: string | null;
  };
  claim: {
    /** Patient account number, alphanumeric, must be unique per claim. */
    patientControlNumber: string;
    totalChargeCents: number;
    placeOfService: string;
    /** "1" original, "7" replacement, "8" void. */
    frequencyCode: "1" | "7" | "8";
    /** ICD-10 diagnoses, in pointer order (1-based, max 12). */
    diagnoses: string[];
    serviceDate: Date;
    priorAuthNumber?: string | null;
    /** Required on a corrected claim: payer's claim control number from the
     *  original 277CA / 835. */
    originalClaimControlNumber?: string | null;
    /** Free-text notes (NTE — 80 chars max, dropped if longer). */
    notes?: string | null;
  };
  serviceLines: ServiceLine[];
  /** Filled when this is a secondary submission. */
  secondary?: {
    primaryPayer: Payer;
    primarySubscriber: Subscriber;
    primaryAllowedCents: number;
    primaryPaidCents: number;
    primaryEraDate: Date;
    primaryCas: ClaimAdjustment[];
    /** Primary payer claim control number from the 835 (REF*F8). */
    primaryClaimControlNumber: string;
  } | null;
}

export interface BuildOptions {
  delimiters?: X12Delimiters;
  lineWrap?: boolean;
  usageIndicator?: "T" | "P";
  isaControlNumber: number;
  gsControlNumber: number;
  stControlNumber: string; // 4-9 chars
  date?: Date;
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export interface Built837 {
  payload: string;
  /** Number of segments in the ST..SE transaction (used for SE counter). */
  transactionSegmentCount: number;
  controlNumbers: {
    isa: number;
    gs: number;
    st: string;
  };
}

export function build837P(input: Claim837Input, opts: BuildOptions): Built837 {
  const delims = opts.delimiters ?? DEFAULT_DELIMITERS;
  const date = opts.date ?? new Date();
  const segments: string[] = [];

  // ── Envelope: ISA / GS / ST ──────────────────────────────────────
  const isa = buildIsa({
    authQualifier: "00",
    senderId: input.submitter.id,
    receiverId: input.receiver.id,
    date,
    controlNumber: opts.isaControlNumber,
    usageIndicator: opts.usageIndicator ?? "P",
    delimiters: delims,
  });
  const gs = buildGs(
    {
      functionalId: "HC",
      senderCode: input.submitter.id,
      receiverCode: input.receiver.id,
      date,
      controlNumber: opts.gsControlNumber,
      versionCode: "005010X222A1",
    },
    delims,
  );
  const st = buildSt("837", opts.stControlNumber, "005010X222A1", delims);
  segments.push(st);

  // ── BHT (Beginning of Hierarchical Transaction) ──────────────────
  segments.push(
    segment(
      "BHT",
      [
        "0019", // structure code (claim hierarchy)
        "00", // purpose: original
        input.claim.patientControlNumber,
        formatD8(date),
        `${date.getUTCHours().toString().padStart(2, "0")}${date.getUTCMinutes().toString().padStart(2, "0")}`,
        "CH", // claim purpose: chargeable
      ],
      delims,
    ),
  );

  // ── Loop 1000A — Submitter ───────────────────────────────────────
  segments.push(segment("NM1", ["41", "2", input.submitter.name, null, null, null, null, "46", input.submitter.id], delims));
  segments.push(segment("PER", ["IC", input.submitter.contactName, "TE", input.submitter.contactPhone], delims));

  // ── Loop 1000B — Receiver ────────────────────────────────────────
  segments.push(segment("NM1", ["40", "2", input.receiver.name, null, null, null, null, "46", input.receiver.id], delims));

  // ── HL bookkeeping ──────────────────────────────────────────────
  let hlCounter = 0;

  // ── Loop 2000A — Billing provider HL ─────────────────────────────
  hlCounter++;
  const billingHl = hlCounter;
  segments.push(segment("HL", [String(billingHl), null, "20", "1"], delims)); // child code 1 = subscriber HL follows
  if (input.billingProvider.taxonomyCode) {
    segments.push(segment("PRV", ["BI", "PXC", input.billingProvider.taxonomyCode], delims));
  }

  // ── Loop 2010AA — Billing provider name + address + tax ID ───────
  segments.push(
    segment(
      "NM1",
      ["85", "2", input.billingProvider.organizationName, null, null, null, null, "XX", input.billingProvider.npi],
      delims,
    ),
  );
  pushAddress(segments, input.billingProvider.address, delims);
  segments.push(segment("REF", ["EI", input.billingProvider.taxId], delims));

  // ── Loop 2010AB — Pay-to address (only when different) ───────────
  if (input.billingProvider.payToAddress) {
    segments.push(segment("NM1", ["87", "2"], delims));
    pushAddress(segments, input.billingProvider.payToAddress, delims);
  }

  // ── Loop 2000B — Subscriber HL ───────────────────────────────────
  hlCounter++;
  const subscriberHl = hlCounter;
  const hasPatientHl = input.patient !== null && input.subscriber.relationshipToPatient !== "18";
  segments.push(segment("HL", [String(subscriberHl), String(billingHl), "22", hasPatientHl ? "1" : "0"], delims));
  segments.push(segment("SBR", [input.secondary ? "S" : "P", input.subscriber.relationshipToPatient, null, null, null, null, null, null, input.subscriber.insuranceType], delims));

  // ── Loop 2010BA — Subscriber ─────────────────────────────────────
  pushPersonNm1(segments, "IL", input.subscriber, delims);
  pushAddress(segments, input.subscriber.address, delims);
  segments.push(segment("DMG", ["D8", formatD8(input.subscriber.dateOfBirth), input.subscriber.gender], delims));

  // ── Loop 2010BB — Payer ──────────────────────────────────────────
  segments.push(segment("NM1", ["PR", "2", input.payer.name, null, null, null, null, "PI", input.payer.payerId], delims));

  // ── Loop 2000C — Patient HL (only when patient ≠ subscriber) ─────
  if (hasPatientHl && input.patient) {
    hlCounter++;
    segments.push(segment("HL", [String(hlCounter), String(subscriberHl), "23", "0"], delims));
    segments.push(segment("PAT", [input.subscriber.relationshipToPatient], delims));
    pushPersonNm1(segments, "QC", input.patient, delims);
    pushAddress(segments, input.patient.address, delims);
    segments.push(segment("DMG", ["D8", formatD8(input.patient.dateOfBirth), input.patient.gender], delims));
  }

  // ── Loop 2300 — Claim ────────────────────────────────────────────
  segments.push(
    segment(
      "CLM",
      [
        input.claim.patientControlNumber,
        formatAmount(input.claim.totalChargeCents),
        null,
        null,
        // CLM05 composite: place-of-service : facility-code-qualifier : claim-frequency
        { sub: [input.claim.placeOfService, "B", input.claim.frequencyCode] },
        "Y", // provider signature on file
        "A", // assignment of benefits accepted
        "Y", // benefits-assignment cert
        "Y", // release of info
      ],
      delims,
    ),
  );

  // DTP — service date (statement-from). Use earliest service-line date.
  segments.push(segment("DTP", ["472", "D8", formatD8(input.claim.serviceDate)], delims));

  // HI — diagnoses. ABK = principal, ABF = additional. Pad up to 12.
  if (input.claim.diagnoses.length > 0) {
    const diagElements: X12Element[] = input.claim.diagnoses.slice(0, 12).map((dx, idx) =>
      idx === 0 ? { sub: ["ABK", dx] } : { sub: ["ABF", dx] },
    );
    segments.push(segment("HI", diagElements, delims));
  }

  // REF — prior auth number
  if (input.claim.priorAuthNumber) {
    segments.push(segment("REF", ["G1", input.claim.priorAuthNumber], delims));
  }

  // REF*F8 — original claim control number (replacements/voids only)
  if (input.claim.frequencyCode !== "1" && input.claim.originalClaimControlNumber) {
    segments.push(segment("REF", ["F8", input.claim.originalClaimControlNumber], delims));
  }

  // NTE — claim notes
  if (input.claim.notes) {
    segments.push(segment("NTE", ["ADD", input.claim.notes.slice(0, 80)], delims));
  }

  // ── Loop 2310B — Rendering provider (when ≠ billing) ─────────────
  if (input.rendering.npi !== input.billingProvider.npi) {
    segments.push(
      segment(
        "NM1",
        ["82", "1", input.rendering.lastName, input.rendering.firstName, null, null, null, "XX", input.rendering.npi],
        delims,
      ),
    );
    if (input.rendering.taxonomyCode) {
      segments.push(segment("PRV", ["PE", "PXC", input.rendering.taxonomyCode], delims));
    }
  }

  // ── Loop 2320 — Other payer (secondary claims) ───────────────────
  if (input.secondary) {
    segments.push(
      segment(
        "SBR",
        ["P", input.secondary.primarySubscriber.relationshipToPatient, null, null, null, null, null, null, input.secondary.primarySubscriber.insuranceType],
        delims,
      ),
    );
    // CAS — claim-level adjustments from primary payer. One CAS per group.
    for (const group of groupCas(input.secondary.primaryCas)) {
      segments.push(segment("CAS", buildCasElements(group.groupCode, group.adjustments), delims));
    }
    segments.push(segment("AMT", ["D", formatAmount(input.secondary.primaryPaidCents)], delims)); // payer paid amount
    segments.push(segment("AMT", ["B6", formatAmount(input.secondary.primaryAllowedCents)], delims)); // allowed
    // OI — claim filing indicator
    segments.push(segment("OI", [null, null, "Y", null, null, "Y"], delims));
    // Loop 2330A — primary subscriber name
    pushPersonNm1(segments, "IL", input.secondary.primarySubscriber, delims);
    // Loop 2330B — primary payer
    segments.push(
      segment(
        "NM1",
        ["PR", "2", input.secondary.primaryPayer.name, null, null, null, null, "PI", input.secondary.primaryPayer.payerId],
        delims,
      ),
    );
    segments.push(segment("DTP", ["573", "D8", formatD8(input.secondary.primaryEraDate)], delims));
    segments.push(segment("REF", ["F8", input.secondary.primaryClaimControlNumber], delims));
  }

  // ── Loop 2400 — Service lines ────────────────────────────────────
  for (const line of input.serviceLines) {
    segments.push(segment("LX", [String(line.sequence)], delims));

    // SV1 — professional service. SV101 is composite: HC : CPT : modifiers
    const svComposite: Array<string | number | null | undefined> = ["HC", line.cptCode];
    for (let i = 0; i < 4; i++) svComposite.push(line.modifiers[i] ?? null);
    segments.push(
      segment(
        "SV1",
        [
          { sub: svComposite },
          formatAmount(line.chargeCents),
          "UN",
          String(line.units),
          line.placeOfService ?? null,
          null,
          line.diagnosisPointers.slice(0, 4).join(":"),
        ],
        delims,
      ),
    );
    segments.push(segment("DTP", ["472", "D8", formatD8(line.serviceDate)], delims));

    // ── Loop 2430 — Line adjudication (secondary submissions) ──────
    if (line.primaryAdjudication) {
      segments.push(
        segment(
          "SVD",
          [
            input.secondary?.primaryPayer.payerId ?? "",
            formatAmount(line.primaryAdjudication.paidCents),
            { sub: ["HC", line.cptCode] },
            null,
            String(line.units),
          ],
          delims,
        ),
      );
      for (const group of groupCas(line.primaryAdjudication.cas)) {
        segments.push(segment("CAS", buildCasElements(group.groupCode, group.adjustments), delims));
      }
      segments.push(segment("DTP", ["573", "D8", formatD8(line.primaryAdjudication.eraDate)], delims));
    }
  }

  // ── SE / GE / IEA ────────────────────────────────────────────────
  const transactionSegmentCount = segments.length + 1; // +1 for SE itself
  segments.push(buildSe(transactionSegmentCount, opts.stControlNumber, delims));

  const ge = buildGe(1, opts.gsControlNumber, delims);
  const iea = buildIea(opts.isaControlNumber, 1, delims);

  const all = [isa, gs, ...segments, ge, iea];
  return {
    payload: joinSegments(all, opts.lineWrap ?? true),
    transactionSegmentCount,
    controlNumbers: {
      isa: opts.isaControlNumber,
      gs: opts.gsControlNumber,
      st: opts.stControlNumber,
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pushAddress(out: string[], addr: BillingAddress, delims: X12Delimiters): void {
  const lines: X12Element[] = [addr.line1];
  if (addr.line2) lines.push(addr.line2);
  out.push(segment("N3", lines, delims));
  out.push(segment("N4", [addr.city, addr.state, addr.postalCode], delims));
}

interface PersonShape {
  firstName: string;
  lastName: string;
  middleName?: string | null;
  memberId?: string;
}

function pushPersonNm1(out: string[], entityCode: string, person: PersonShape, delims: X12Delimiters): void {
  out.push(
    segment(
      "NM1",
      [
        entityCode,
        "1", // person
        person.lastName,
        person.firstName,
        person.middleName ?? null,
        null,
        null,
        person.memberId ? "MI" : null,
        person.memberId ?? null,
      ],
      delims,
    ),
  );
}

interface CasGroup {
  groupCode: ClaimAdjustment["groupCode"];
  adjustments: ClaimAdjustment[];
}

/** Group adjustments by group code so we emit one CAS segment per group
 *  (X12 5010 packs up to 6 reason/amount/units triplets per CAS). */
export function groupCas(adjustments: ClaimAdjustment[]): CasGroup[] {
  const byGroup = new Map<ClaimAdjustment["groupCode"], ClaimAdjustment[]>();
  for (const a of adjustments) {
    const list = byGroup.get(a.groupCode) ?? [];
    list.push(a);
    byGroup.set(a.groupCode, list);
  }
  // Stable order: CO, PR, OA, PI
  const order: ClaimAdjustment["groupCode"][] = ["CO", "PR", "OA", "PI"];
  return order
    .filter((g) => byGroup.has(g))
    .map((g) => ({ groupCode: g, adjustments: byGroup.get(g)! }));
}

function buildCasElements(groupCode: string, adjustments: ClaimAdjustment[]): X12Element[] {
  // CAS01 = group code, then up to 6 (reason / amount / units) triplets
  const els: X12Element[] = [groupCode];
  for (let i = 0; i < 6; i++) {
    const a = adjustments[i];
    if (!a) {
      els.push(null, null, null);
      continue;
    }
    els.push(a.reasonCode, formatAmount(a.amountCents), a.units != null ? String(a.units) : null);
  }
  return els;
}
