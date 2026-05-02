/**
 * EMR-344 — Authoritative cannabis legal corpus (versioned).
 *
 * This module defines the shape of records the compliance agents read
 * from. Persistence (Postgres / object storage / git) is out of scope
 * for this scaffold — the in-memory `LEGAL_CORPUS_SEED` array is the
 * checked-in single source of truth until the ingestion pipeline
 * lands. Once a `LegalCorpusDocument` table ships, this module will
 * read from Prisma and the seed will move into a fixture file.
 *
 * Every document carries:
 *  - `sourceUrl` — where it was retrieved from
 *  - `jurisdiction` — federal, US-XX, or country code
 *  - `effectiveDate` — when the law took effect (ISO YYYY-MM-DD)
 *  - `status` — enacted / settled / pending / in_review / appealed / overturned
 *  - `retrievedAt` — when the ingester last pulled it
 *  - `contentHash` — sha256 of the body, so re-ingestion can detect a
 *    silent upstream rewrite without diffing the body itself
 */

import type { CitationRef, RegulatoryStatus } from "@/lib/marketplace/state-legality-matrix";

export type CorpusJurisdiction =
  | "federal-us"
  | `state-${string}` // e.g. "state-TX"
  | "country-CA"
  | "international";

export type CorpusDocumentKind =
  | "statute"
  | "regulation"
  | "case_decision"
  | "guidance" // FDA / FTC / DEA guidance letter
  | "industry_standard";

export interface LegalCorpusDocument {
  id: string;
  title: string;
  kind: CorpusDocumentKind;
  jurisdiction: CorpusJurisdiction;
  status: RegulatoryStatus;
  effectiveDate?: string;
  sourceUrl: string;
  retrievedAt: string;
  contentHash: string;
  /** Long-form body in markdown. Empty in the seed; populated by ingester. */
  body: string;
  /** Citations the document itself references — used for cross-linking. */
  references: CitationRef[];
}

/**
 * Seed corpus — a small set of high-impact source documents the
 * compliance agents read from at runtime today. Production records
 * land via the (forthcoming) ingester from the source list below.
 */
export const LEGAL_CORPUS_SEED: ReadonlyArray<LegalCorpusDocument> = [
  {
    id: "us-farm-bill-2018",
    title: "Agriculture Improvement Act of 2018 (Farm Bill) — hemp definition",
    kind: "statute",
    jurisdiction: "federal-us",
    status: "enacted",
    effectiveDate: "2018-12-20",
    sourceUrl: "https://www.congress.gov/bill/115th-congress/house-bill/2",
    retrievedAt: "2026-05-02",
    contentHash: "stub-sha256-farm-bill-2018",
    body: "",
    references: [],
  },
  {
    id: "fda-cbd-warning-letters-2024",
    title: "FDA — warning letters re: unapproved drug claims for CBD products",
    kind: "guidance",
    jurisdiction: "federal-us",
    status: "enacted",
    effectiveDate: "2024-01-01",
    sourceUrl:
      "https://www.fda.gov/news-events/public-health-focus/fda-regulation-cannabis-and-cannabis-derived-products-including-cannabidiol-cbd",
    retrievedAt: "2026-05-02",
    contentHash: "stub-sha256-fda-cbd-2024",
    body: "",
    references: [],
  },
  {
    id: "tx-hsc-443",
    title: "Texas Health & Safety Code Chapter 443 (Hemp)",
    kind: "statute",
    jurisdiction: "state-TX",
    status: "enacted",
    effectiveDate: "2019-09-01",
    sourceUrl: "https://statutes.capitol.texas.gov/Docs/HS/htm/HS.443.htm",
    retrievedAt: "2026-05-02",
    contentHash: "stub-sha256-tx-hsc-443",
    body: "",
    references: [],
  },
  {
    id: "id-code-37-2701",
    title: "Idaho Code §37-2701 (Schedule I, includes THC)",
    kind: "statute",
    jurisdiction: "state-ID",
    status: "enacted",
    sourceUrl: "https://legislature.idaho.gov/statutesrules/idstat/Title37/T37CH27/SECT37-2701/",
    retrievedAt: "2026-05-02",
    contentHash: "stub-sha256-id-37-2701",
    body: "",
    references: [],
  },
];

/**
 * Source registry — the URLs the ingestion pipeline (forthcoming) will
 * pull from. Held here so the ingester and compliance agents agree on
 * what is in scope.
 */
export const LEGAL_CORPUS_SOURCES = [
  {
    id: "ncsl-state-cannabis-legislation",
    label: "NCSL state cannabis legislation database",
    url: "https://www.ncsl.org/health/state-cannabis-legislation-database",
  },
  {
    id: "pdaps-medical-marijuana",
    label: "PDAPS medical-marijuana state-data set",
    url: "https://pdaps.org/datasets/medical-marijuana-program-laws",
  },
  {
    id: "pdaps-recreational-marijuana",
    label: "PDAPS recreational-marijuana state-data set",
    url: "https://pdaps.org/datasets/recreational-marijuana-laws",
  },
  {
    id: "fda-cannabis",
    label: "FDA cannabis regulatory updates",
    url: "https://www.fda.gov/news-events/public-health-focus/fda-regulation-cannabis-and-cannabis-derived-products-including-cannabidiol-cbd",
  },
  {
    id: "ftc-claims-guidance",
    label: "FTC — guidance on health & wellness claims",
    url: "https://www.ftc.gov/business-guidance/resources/health-wellness-claims",
  },
] as const;

/**
 * Compute a stable identifier for a corpus document given its source
 * URL and effective date. Used so re-ingestion can find the existing
 * row without depending on a database-generated id.
 */
export function corpusDocumentKey(sourceUrl: string, effectiveDate: string): string {
  const normalizedUrl = sourceUrl.replace(/\?.*$/, "").toLowerCase();
  return `${normalizedUrl}@${effectiveDate}`;
}
