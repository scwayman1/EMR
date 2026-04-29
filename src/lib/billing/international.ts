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
