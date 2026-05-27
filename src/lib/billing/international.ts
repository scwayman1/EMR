/**
 * International Multi-Country Billing Framework (EMR-116)
 * -------------------------------------------------------
 * The US-only billing primitives in this directory (CPT, CARC, NPI,
 * 837P) don't generalize. Every country has its own coding system,
 * filing rules, currency, and reimbursement nuances. This module is
 * the registry the rest of the billing pipeline routes through to ask
 * country-aware questions:
 *
 *   - "Which procedure code system applies for this country?"
 *   - "What's the reimbursement currency + locale formatting?"
 *   - "Who are the major insurance carriers I can submit to?"
 *   - "Is cannabis explicitly excluded by national policy?"
 *   - "What's the timely filing window?"
 *
 * Like `payer-rules.ts`, this is intentionally code-resident for v1
 * with launch coverage of US, UK, Canada, Germany, Australia per Dr.
 * Patel's spec.
 */

export type Iso3166Alpha2 = "US" | "GB" | "CA" | "DE" | "AU";

export type CodingSystem =
  | "CPT_HCPCS_ICD10CM"
  | "OPCS4_ICD10"
  | "CCI_ICD10CA"
  | "OPS_ICD10GM"
  | "MBS_ICD10AM";

export type CurrencyCode = "USD" | "GBP" | "CAD" | "EUR" | "AUD";

export interface CountryCarrier {
  id: string;
  displayName: string;
  kind: "national" | "private" | "regional";
  electronicSubmission: boolean;
}

export interface CannabisPolicy {
  legalNationally: boolean;
  reimbursableUnderPublic: boolean;
  citation: string;
}

export interface CountryBillingRule {
  countryCode: Iso3166Alpha2;
  countryName: string;
  codingSystem: CodingSystem;
  currency: CurrencyCode;
  /** BCP-47 locale used for currency + date formatting. */
  locale: string;
  timelyFilingDays: number;
  appealDeadlineDays: number;
  vatRate: number;
  medicalServicesTaxable: boolean;
  carriers: CountryCarrier[];
  cannabisPolicy: CannabisPolicy;
}

const REGISTRY: Record<Iso3166Alpha2, CountryBillingRule> = {
  US: {
    countryCode: "US",
    countryName: "United States",
    codingSystem: "CPT_HCPCS_ICD10CM",
    currency: "USD",
    locale: "en-US",
    timelyFilingDays: 365,
    appealDeadlineDays: 180,
    vatRate: 0,
    medicalServicesTaxable: false,
    carriers: [
      { id: "medicare", displayName: "Medicare", kind: "national", electronicSubmission: true },
      { id: "medicaid", displayName: "Medicaid", kind: "regional", electronicSubmission: true },
      { id: "uhc", displayName: "UnitedHealthcare", kind: "private", electronicSubmission: true },
      { id: "anthem", displayName: "Anthem BCBS", kind: "private", electronicSubmission: true },
      { id: "aetna", displayName: "Aetna", kind: "private", electronicSubmission: true },
      { id: "cigna", displayName: "Cigna", kind: "private", electronicSubmission: true },
    ],
    cannabisPolicy: {
      legalNationally: false,
      reimbursableUnderPublic: false,
      citation:
        "Cannabis remains a Schedule I substance under the U.S. Controlled Substances Act; commercial coverage is at payer discretion.",
    },
  },
  GB: {
    countryCode: "GB",
    countryName: "United Kingdom",
    codingSystem: "OPCS4_ICD10",
    currency: "GBP",
    locale: "en-GB",
    timelyFilingDays: 180,
    appealDeadlineDays: 60,
    vatRate: 20,
    medicalServicesTaxable: false,
    carriers: [
      { id: "nhs", displayName: "NHS", kind: "national", electronicSubmission: true },
      { id: "bupa", displayName: "Bupa", kind: "private", electronicSubmission: true },
      { id: "axa-health", displayName: "AXA Health", kind: "private", electronicSubmission: true },
      { id: "vitality", displayName: "Vitality", kind: "private", electronicSubmission: true },
    ],
    cannabisPolicy: {
      legalNationally: true,
      reimbursableUnderPublic: false,
      citation:
        "Medical cannabis is legal in the UK under specialist prescription (since 2018); NHS reimbursement is rare and requires private route in most cases.",
    },
  },
  CA: {
    countryCode: "CA",
    countryName: "Canada",
    codingSystem: "CCI_ICD10CA",
    currency: "CAD",
    locale: "en-CA",
    timelyFilingDays: 365,
    appealDeadlineDays: 90,
    vatRate: 5,
    medicalServicesTaxable: false,
    carriers: [
      { id: "ohip", displayName: "OHIP (Ontario)", kind: "regional", electronicSubmission: true },
      { id: "msp-bc", displayName: "MSP (British Columbia)", kind: "regional", electronicSubmission: true },
      { id: "ramq", displayName: "RAMQ (Québec)", kind: "regional", electronicSubmission: true },
      { id: "manulife", displayName: "Manulife", kind: "private", electronicSubmission: true },
      { id: "sunlife", displayName: "Sun Life", kind: "private", electronicSubmission: true },
    ],
    cannabisPolicy: {
      legalNationally: true,
      reimbursableUnderPublic: false,
      citation:
        "Medical cannabis is federally legal under the Cannabis Act (2018); Veterans Affairs Canada and many private extended-health plans reimburse with documentation.",
    },
  },
  DE: {
    countryCode: "DE",
    countryName: "Germany",
    codingSystem: "OPS_ICD10GM",
    currency: "EUR",
    locale: "de-DE",
    timelyFilingDays: 90,
    appealDeadlineDays: 30,
    vatRate: 19,
    medicalServicesTaxable: false,
    carriers: [
      { id: "tk", displayName: "Techniker Krankenkasse", kind: "national", electronicSubmission: true },
      { id: "aok", displayName: "AOK", kind: "national", electronicSubmission: true },
      { id: "barmer", displayName: "BARMER", kind: "national", electronicSubmission: true },
      { id: "dak", displayName: "DAK-Gesundheit", kind: "national", electronicSubmission: true },
    ],
    cannabisPolicy: {
      legalNationally: true,
      reimbursableUnderPublic: true,
      citation:
        "Cannabis als Medizin Gesetz (March 2017) authorizes statutory health insurance reimbursement on prior approval (§ 31 Abs. 6 SGB V).",
    },
  },
  AU: {
    countryCode: "AU",
    countryName: "Australia",
    codingSystem: "MBS_ICD10AM",
    currency: "AUD",
    locale: "en-AU",
    timelyFilingDays: 730,
    appealDeadlineDays: 28,
    vatRate: 10,
    medicalServicesTaxable: false,
    carriers: [
      { id: "medicare-au", displayName: "Medicare (Australia)", kind: "national", electronicSubmission: true },
      { id: "bupa-au", displayName: "Bupa Australia", kind: "private", electronicSubmission: true },
      { id: "medibank", displayName: "Medibank", kind: "private", electronicSubmission: true },
      { id: "hcf", displayName: "HCF", kind: "private", electronicSubmission: true },
    ],
    cannabisPolicy: {
      legalNationally: true,
      reimbursableUnderPublic: false,
      citation:
        "Medical cannabis is accessible through TGA Special Access Scheme and Authorised Prescriber pathway; PBS subsidy is limited to specific products and indications.",
    },
  },
};

export const SUPPORTED_COUNTRIES: Iso3166Alpha2[] = ["US", "GB", "CA", "DE", "AU"];

export function getCountryRule(code: Iso3166Alpha2): CountryBillingRule {
  return REGISTRY[code];
}

export function listCountryRules(): CountryBillingRule[] {
  return SUPPORTED_COUNTRIES.map((c) => REGISTRY[c]);
}

export function formatCountryMoney(
  countryCode: Iso3166Alpha2,
  minorUnits: number,
): string {
  const rule = REGISTRY[countryCode];
  return new Intl.NumberFormat(rule.locale, {
    style: "currency",
    currency: rule.currency,
  }).format(minorUnits / 100);
}

export function withinTimelyFiling(
  countryCode: Iso3166Alpha2,
  serviceDate: Date,
  asOf: Date = new Date(),
): boolean {
  const rule = REGISTRY[countryCode];
  const ageDays = Math.floor((asOf.getTime() - serviceDate.getTime()) / 86_400_000);
  return ageDays <= rule.timelyFilingDays;
}

export function publicCoverageUnlikely(countryCode: Iso3166Alpha2): boolean {
  const policy = REGISTRY[countryCode].cannabisPolicy;
  return !policy.reimbursableUnderPublic;
}

// ---------------------------------------------------------------------------
// EMR-116 — Currency conversion (FX), tax math, claim-format adapter, and
// multi-currency ledger entry helpers. Everything below is pure: no DB, no
// I/O, no side effects. The caller wires the FX rates from whatever feed it
// trusts (in practice: a daily mid-market snapshot stored on the org row).
// ---------------------------------------------------------------------------

/**
 * FX rate quoted as `1 unit of base = rate units of quote`. For example,
 * EUR→USD on a day worth 1.08 means `{ base: "EUR", quote: "USD", rate: 1.08 }`.
 */
export interface FxRate {
  base: CurrencyCode;
  quote: CurrencyCode;
  rate: number;
  /** ISO date the rate was sourced. Stored on the ledger entry for audit. */
  asOf: string;
}

export interface FxConversion {
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  fromMinorUnits: number;
  toMinorUnits: number;
  rateApplied: number;
  asOf: string;
}

const ONE_BY_ZERO_FX: number = 1;

function findRate(
  rates: FxRate[],
  from: CurrencyCode,
  to: CurrencyCode,
): { rate: number; asOf: string } | null {
  if (from === to) {
    return { rate: ONE_BY_ZERO_FX, asOf: new Date().toISOString().slice(0, 10) };
  }
  const direct = rates.find((r) => r.base === from && r.quote === to);
  if (direct) return { rate: direct.rate, asOf: direct.asOf };
  const inverse = rates.find((r) => r.base === to && r.quote === from);
  if (inverse && inverse.rate !== 0) {
    return { rate: 1 / inverse.rate, asOf: inverse.asOf };
  }
  return null;
}

/**
 * Convert a minor-unit amount (cents/pence/cent) from one supported currency
 * to another using the supplied FX table. Rounds to the nearest minor unit.
 */
export function convertMoney(
  fromMinorUnits: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  rates: FxRate[],
): FxConversion {
  const found = findRate(rates, fromCurrency, toCurrency);
  if (!found) {
    throw new Error(
      `No FX rate available for ${fromCurrency} → ${toCurrency} in the supplied table.`,
    );
  }
  const converted = Math.round(fromMinorUnits * found.rate);
  return {
    fromCurrency,
    toCurrency,
    fromMinorUnits,
    toMinorUnits: converted,
    rateApplied: found.rate,
    asOf: found.asOf,
  };
}

export interface TaxComputation {
  countryCode: Iso3166Alpha2;
  taxLabel: "VAT" | "GST" | "HST" | "MwSt" | "None";
  /** VAT/GST/HST rate as percentage (e.g. 20 for 20%). */
  taxRatePct: number;
  /** Amount of tax, in minor units. Zero when medical services are exempt. */
  taxMinorUnits: number;
  /** Pre-tax amount, in minor units (echo of input for ledger writers). */
  netMinorUnits: number;
  /** Total billed including tax, in minor units. */
  grossMinorUnits: number;
}

const TAX_LABEL: Record<Iso3166Alpha2, TaxComputation["taxLabel"]> = {
  US: "None",
  GB: "VAT",
  CA: "HST",
  DE: "MwSt",
  AU: "GST",
};

/**
 * Compute the country-specific consumption tax on a medical service line.
 * Most jurisdictions exempt medical services from VAT/GST entirely, but the
 * registry carries the rate explicitly so a non-medical line (e.g. a wellness
 * product sold alongside) can opt in by passing `applyEvenIfMedical = true`.
 */
export function computeTax(
  countryCode: Iso3166Alpha2,
  netMinorUnits: number,
  options: { applyEvenIfMedical?: boolean } = {},
): TaxComputation {
  const rule = REGISTRY[countryCode];
  const exempt = !rule.medicalServicesTaxable && !options.applyEvenIfMedical;
  const ratePct = exempt ? 0 : rule.vatRate;
  const tax = Math.round((netMinorUnits * ratePct) / 100);
  return {
    countryCode,
    taxLabel: TAX_LABEL[countryCode],
    taxRatePct: ratePct,
    taxMinorUnits: tax,
    netMinorUnits,
    grossMinorUnits: netMinorUnits + tax,
  };
}

/**
 * Country-neutral claim payload. Each downstream country adapter renders
 * this into its native wire format (X12 837P for US, FHIR Claim for GB/CA,
 * § 295 SGB V for DE, MBS-online for AU). The adapter shape is what the
 * clearinghouse worker dispatches on.
 */
export interface NormalizedClaim {
  countryCode: Iso3166Alpha2;
  carrierId: string;
  /** Patient's coverage ID with the carrier (member-id, NHS number, etc.). */
  memberId: string;
  serviceDate: string;
  procedureCodes: string[];
  diagnosisCodes: string[];
  netMinorUnits: number;
  taxMinorUnits: number;
  currency: CurrencyCode;
}

export interface AdaptedClaim {
  format: "X12_837P" | "FHIR_CLAIM" | "ABDA_KV" | "MBS_ONLINE";
  filingDeadline: string;
  payload: Record<string, unknown>;
}

function isoDatePlusDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Build a country-appropriate claim payload from the normalized form. This is
 * the "international claim format adapter" — a thin marshalling layer; the
 * clearinghouse worker is what actually serializes and ships it.
 */
export function adaptClaimForCountry(claim: NormalizedClaim): AdaptedClaim {
  const rule = REGISTRY[claim.countryCode];
  const filingDeadline = isoDatePlusDays(claim.serviceDate, rule.timelyFilingDays);

  switch (claim.countryCode) {
    case "US":
      return {
        format: "X12_837P",
        filingDeadline,
        payload: {
          codingSystem: rule.codingSystem,
          carrierId: claim.carrierId,
          subscriberId: claim.memberId,
          serviceDate: claim.serviceDate,
          cptCodes: claim.procedureCodes,
          icd10cmCodes: claim.diagnosisCodes,
          billedAmountCents: claim.netMinorUnits + claim.taxMinorUnits,
          currency: claim.currency,
        },
      };
    case "GB":
    case "CA":
      return {
        format: "FHIR_CLAIM",
        filingDeadline,
        payload: {
          resourceType: "Claim",
          status: "active",
          insurer: { identifier: { value: claim.carrierId } },
          patient: { identifier: { value: claim.memberId } },
          billablePeriod: { start: claim.serviceDate, end: claim.serviceDate },
          item: claim.procedureCodes.map((code, idx) => ({
            sequence: idx + 1,
            productOrService: { coding: [{ system: rule.codingSystem, code }] },
          })),
          diagnosis: claim.diagnosisCodes.map((code, idx) => ({
            sequence: idx + 1,
            diagnosisCodeableConcept: {
              coding: [{ system: rule.codingSystem, code }],
            },
          })),
          total: {
            value: (claim.netMinorUnits + claim.taxMinorUnits) / 100,
            currency: claim.currency,
          },
        },
      };
    case "DE":
      return {
        format: "ABDA_KV",
        filingDeadline,
        payload: {
          krankenkasseId: claim.carrierId,
          versichertenNummer: claim.memberId,
          leistungsdatum: claim.serviceDate,
          opsCodes: claim.procedureCodes,
          icd10gmCodes: claim.diagnosisCodes,
          bruttoBetragCent: claim.netMinorUnits + claim.taxMinorUnits,
          waehrung: claim.currency,
        },
      };
    case "AU":
      return {
        format: "MBS_ONLINE",
        filingDeadline,
        payload: {
          medicareProviderNumber: claim.carrierId,
          medicareCardNumber: claim.memberId,
          dateOfService: claim.serviceDate,
          mbsItemNumbers: claim.procedureCodes,
          icd10amCodes: claim.diagnosisCodes,
          chargeAmountCents: claim.netMinorUnits + claim.taxMinorUnits,
          currency: claim.currency,
        },
      };
  }
}

/**
 * A single side of a journal entry, denominated in the foreign currency it
 * originated in but always carrying its USD-translated equivalent so the
 * group-wide P&L can roll up without needing to re-quote FX at report time.
 */
export interface MultiCurrencyLedgerEntry {
  /** Stable ID the caller assigns when persisting. Pure helpers don't care. */
  id?: string;
  occurredAt: string;
  countryCode: Iso3166Alpha2;
  account: "AR" | "Revenue" | "TaxPayable" | "FxGainLoss" | "Cash";
  direction: "debit" | "credit";
  /** Native amount in minor units (the currency the transaction happened in). */
  nativeMinorUnits: number;
  nativeCurrency: CurrencyCode;
  /** Reporting amount in USD minor units — the org's functional currency. */
  reportingMinorUnitsUsd: number;
  fxRateApplied: number;
  fxAsOf: string;
  memo?: string;
}

/**
 * Build the full journal for a single billed encounter in the country's
 * native currency, then translate to USD for the reporting ledger. Returns
 * a balanced (debits = credits) set of entries: AR debit, Revenue credit,
 * TaxPayable credit when applicable.
 */
export function buildBilledEncounterLedger(args: {
  countryCode: Iso3166Alpha2;
  occurredAt: string;
  netMinorUnits: number;
  taxMinorUnits: number;
  rates: FxRate[];
  memo?: string;
}): MultiCurrencyLedgerEntry[] {
  const rule = REGISTRY[args.countryCode];
  const native = rule.currency;
  const entries: MultiCurrencyLedgerEntry[] = [];
  const total = args.netMinorUnits + args.taxMinorUnits;

  const arUsd = convertMoney(total, native, "USD", args.rates);
  entries.push({
    occurredAt: args.occurredAt,
    countryCode: args.countryCode,
    account: "AR",
    direction: "debit",
    nativeMinorUnits: total,
    nativeCurrency: native,
    reportingMinorUnitsUsd: arUsd.toMinorUnits,
    fxRateApplied: arUsd.rateApplied,
    fxAsOf: arUsd.asOf,
    memo: args.memo,
  });

  const revUsd = convertMoney(args.netMinorUnits, native, "USD", args.rates);
  entries.push({
    occurredAt: args.occurredAt,
    countryCode: args.countryCode,
    account: "Revenue",
    direction: "credit",
    nativeMinorUnits: args.netMinorUnits,
    nativeCurrency: native,
    reportingMinorUnitsUsd: revUsd.toMinorUnits,
    fxRateApplied: revUsd.rateApplied,
    fxAsOf: revUsd.asOf,
    memo: args.memo,
  });

  if (args.taxMinorUnits > 0) {
    const taxUsd = convertMoney(args.taxMinorUnits, native, "USD", args.rates);
    entries.push({
      occurredAt: args.occurredAt,
      countryCode: args.countryCode,
      account: "TaxPayable",
      direction: "credit",
      nativeMinorUnits: args.taxMinorUnits,
      nativeCurrency: native,
      reportingMinorUnitsUsd: taxUsd.toMinorUnits,
      fxRateApplied: taxUsd.rateApplied,
      fxAsOf: taxUsd.asOf,
      memo: args.memo,
    });
  }

  return entries;
}

/**
 * Sum the USD reporting side of a ledger run; useful for asserting the run
 * is balanced before persisting and for surfacing a "translated to USD"
 * total on the international billing dashboard.
 */
export function ledgerBalanceUsd(
  entries: MultiCurrencyLedgerEntry[],
): { debitsUsd: number; creditsUsd: number; isBalanced: boolean } {
  const debitsUsd = entries
    .filter((e) => e.direction === "debit")
    .reduce((sum, e) => sum + e.reportingMinorUnitsUsd, 0);
  const creditsUsd = entries
    .filter((e) => e.direction === "credit")
    .reduce((sum, e) => sum + e.reportingMinorUnitsUsd, 0);
  return {
    debitsUsd,
    creditsUsd,
    isBalanced: debitsUsd === creditsUsd,
  };
}
