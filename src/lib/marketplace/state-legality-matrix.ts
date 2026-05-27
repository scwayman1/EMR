/**
 * EMR-353 — State-by-state cannabis compliance matrix.
 *
 * Per-state record the storefront and shipping logic query at runtime.
 * Source-of-truth for decisions like:
 *  - "is this state in the buyer's drop-down?"
 *  - "does this state cap THC potency below the federal Farm Bill?"
 *  - "do we require an additional warning before checkout?"
 *
 * Citations: every column carries the statute or rule reference and
 * the effective date. Updated via PR — DO NOT mutate at runtime, the
 * compliance scan agent (EMR-351) hashes this file as part of its
 * provenance check.
 *
 * Status field is intentionally constrained: only `enacted` rows feed
 * the agent recommendation pipeline (see enacted-only filter,
 * EMR-349). Pending / appealed / overturned rows MUST NOT trigger
 * site-facing changes — they are kept here for visibility only.
 *
 * Last full review: 2026-05-02 (Draft v0 — pending outside-counsel
 * sign-off, EMR-357 handoff).
 */

export type LegalStatus = "permitted" | "restricted" | "prohibited" | "unclear";
export type RegulatoryStatus =
  | "enacted"
  | "settled"
  | "pending"
  | "in_review"
  | "appealed"
  | "overturned";

export interface CitationRef {
  /** Short label, e.g. "TX HSC §443.001" or "Senate Bill 264 (TX 2023)". */
  label: string;
  /** Source URL when available. */
  url?: string;
  /** Effective date in ISO YYYY-MM-DD when known. */
  effective?: string;
  /** Regulatory status; only `enacted` / `settled` are agent-actionable. */
  status: RegulatoryStatus;
}

export interface StateCannabisRules {
  stateCode: string; // USPS 2-letter code
  stateName: string;

  /** Hemp products legal under federal Farm Bill (<=0.3% delta-9 THC). */
  hempRetail: LegalStatus;
  /** Adult-use cannabis ("recreational") status. */
  adultUseCannabis: LegalStatus;
  /** Medical cannabis program. */
  medicalCannabis: LegalStatus;

  /**
   * Maximum total-THC mg per package the state allows for hemp products,
   * if a stricter cap than the federal Farm Bill is enacted. `null` = use
   * federal default.
   */
  hempPackageMgCap: number | null;

  /** True if state requires age 21+ to purchase any cannabinoid product. */
  requires21PlusForHemp: boolean;

  /** Special checkout warning copy if the state requires one. */
  checkoutWarning?: string;

  /** Citations powering the row — every column above must trace back here. */
  citations: CitationRef[];
}

/**
 * Compact seed list. Full 50-state coverage is a follow-up; this seed
 * captures the high-traffic / high-restriction jurisdictions that drive
 * checkout decisions today. States not in this map fall back to the
 * federal Farm Bill default (hempRetail=permitted, no extra cap).
 */
export const STATE_CANNABIS_RULES: ReadonlyArray<StateCannabisRules> = [
  {
    stateCode: "TX",
    stateName: "Texas",
    hempRetail: "permitted",
    adultUseCannabis: "prohibited",
    medicalCannabis: "restricted",
    hempPackageMgCap: null,
    requires21PlusForHemp: true,
    checkoutWarning:
      "Texas: licensed retailer compliance required; we ship hemp products only.",
    citations: [
      {
        label: "TX HSC §443 (Hemp Farming Act)",
        effective: "2019-09-01",
        status: "enacted",
      },
    ],
  },
  {
    stateCode: "CA",
    stateName: "California",
    hempRetail: "permitted",
    adultUseCannabis: "permitted",
    medicalCannabis: "permitted",
    hempPackageMgCap: null,
    requires21PlusForHemp: true,
    citations: [
      { label: "California AB-45 (Hemp Foods)", effective: "2021-10-06", status: "enacted" },
    ],
  },
  {
    stateCode: "NY",
    stateName: "New York",
    hempRetail: "permitted",
    adultUseCannabis: "permitted",
    medicalCannabis: "permitted",
    hempPackageMgCap: null,
    requires21PlusForHemp: true,
    citations: [
      { label: "NY MRTA (Marihuana Regulation & Taxation Act)", effective: "2021-03-31", status: "enacted" },
    ],
  },
  {
    stateCode: "ID",
    stateName: "Idaho",
    hempRetail: "restricted",
    adultUseCannabis: "prohibited",
    medicalCannabis: "prohibited",
    hempPackageMgCap: 0,
    requires21PlusForHemp: true,
    checkoutWarning:
      "Idaho: only true 0.0% THC hemp products are permitted. Most Leafmart inventory cannot ship here.",
    citations: [
      { label: "Idaho Code §37-2701 (Schedule I incl. THC)", status: "enacted" },
    ],
  },
  {
    stateCode: "KS",
    stateName: "Kansas",
    hempRetail: "restricted",
    adultUseCannabis: "prohibited",
    medicalCannabis: "prohibited",
    hempPackageMgCap: null,
    requires21PlusForHemp: true,
    citations: [
      { label: "Kansas SB-282 (Industrial Hemp Definition)", effective: "2018-04-21", status: "enacted" },
    ],
  },
  {
    stateCode: "FL",
    stateName: "Florida",
    hempRetail: "permitted",
    adultUseCannabis: "prohibited",
    medicalCannabis: "permitted",
    hempPackageMgCap: null,
    requires21PlusForHemp: true,
    citations: [
      { label: "FL SB-1020 (Hemp regulation)", effective: "2019-07-01", status: "enacted" },
    ],
  },
];

export const STATE_RULES_BY_CODE: ReadonlyMap<string, StateCannabisRules> = new Map(
  STATE_CANNABIS_RULES.map((r) => [r.stateCode, r]),
);

/**
 * Federal-default rules used when a state has no explicit row. Returns
 * a permissive Farm-Bill-aligned baseline so we don't accidentally
 * block hemp shipments to states we haven't yet researched.
 */
const FEDERAL_DEFAULT: Omit<StateCannabisRules, "stateCode" | "stateName"> = {
  hempRetail: "permitted",
  adultUseCannabis: "unclear",
  medicalCannabis: "unclear",
  hempPackageMgCap: null,
  requires21PlusForHemp: true,
  citations: [
    { label: "2018 Farm Bill (Public Law 115-334)", effective: "2018-12-20", status: "enacted" },
  ],
};

export function getStateRules(stateCode: string): StateCannabisRules {
  const code = stateCode.toUpperCase();
  const explicit = STATE_RULES_BY_CODE.get(code);
  if (explicit) return explicit;
  return { stateCode: code, stateName: code, ...FEDERAL_DEFAULT };
}
