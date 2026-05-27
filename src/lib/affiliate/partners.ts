// EMR-039 — Affiliate partner registry.
//
// Until the AffiliatePartner model is fully exposed in admin tools,
// this file holds the canonical list of partners surfaced in
// /store. Mirrors the seed data so the public page renders identical
// content with or without a database connection (e.g. in static
// builds and previews).

export type AffiliatePartnerStatus = "active" | "paused" | "archived";

export interface AffiliatePartnerInfo {
  slug: string;
  name: string;
  domain: string;
  websiteUrl: string;
  description: string;
  category: string;
  status: AffiliatePartnerStatus;
  disclaimerText: string;
  jointDecisionNote: string;
  utmSource: string;
  sortOrder: number;
}

const DEFAULT_DISCLAIMER =
  "You are leaving Leafjourney to visit a partner website. Please consult your healthcare provider before considering these products. Cannabis products are not FDA-approved medications and individual results may vary. This is a joint decision between you and your care team.";

const JOINT_DECISION_NOTE =
  "Adding any product to your regimen is a joint decision between you and your care team. Bring this product up at your next visit so we can document it and watch for interactions.";

export const AFFILIATE_PARTNERS: AffiliatePartnerInfo[] = [
  {
    slug: "phytorx",
    name: "PhytoRx",
    domain: "phytorx.co",
    websiteUrl: "https://phytorx.co/products/cbd-cbg-beverage-concentrate",
    description:
      "Physician-formulated CBD + CBG beverage concentrates for pain and recovery. Fast-absorbing emulsion technology developed with clinical input.",
    category: "Beverages",
    status: "active",
    disclaimerText: DEFAULT_DISCLAIMER,
    jointDecisionNote: JOINT_DECISION_NOTE,
    utmSource: "leafjourney",
    sortOrder: 10,
  },
  {
    slug: "flower-powered-products",
    name: "Flower Powered Products",
    domain: "flowerpoweredproductsllc.com",
    websiteUrl: "https://flowerpoweredproductsllc.com/shop",
    description:
      "Full line of CBD-only wellness products. Topicals, balms, and creams. Third-party tested, physician-recommended.",
    category: "Topicals",
    status: "active",
    disclaimerText: DEFAULT_DISCLAIMER,
    jointDecisionNote: JOINT_DECISION_NOTE,
    utmSource: "leafjourney",
    sortOrder: 20,
  },
  {
    slug: "aulv",
    name: "AULV Wellness",
    domain: "aulv.org",
    websiteUrl: "https://aulv.org",
    description:
      "Wellness collective focused on plant-based therapies, education, and community-supported research. Curated alongside our care team.",
    category: "Wellness",
    status: "active",
    disclaimerText: DEFAULT_DISCLAIMER,
    jointDecisionNote: JOINT_DECISION_NOTE,
    utmSource: "leafjourney",
    sortOrder: 30,
  },
];

export function listAffiliatePartners(): AffiliatePartnerInfo[] {
  return AFFILIATE_PARTNERS.filter((p) => p.status === "active").sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
}

/**
 * Append a UTM source to the partner URL so the partner can attribute
 * traffic back to Leafjourney. Idempotent — repeated calls won't pile
 * up duplicate query strings.
 */
export function decorateAffiliateUrl(partner: AffiliatePartnerInfo): string {
  if (!partner.utmSource) return partner.websiteUrl;
  try {
    const url = new URL(partner.websiteUrl);
    if (!url.searchParams.has("utm_source")) {
      url.searchParams.set("utm_source", partner.utmSource);
    }
    if (!url.searchParams.has("utm_medium")) {
      url.searchParams.set("utm_medium", "affiliate");
    }
    return url.toString();
  } catch {
    return partner.websiteUrl;
  }
}
