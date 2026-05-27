/**
 * Site-wide SEO helpers and structured-data builders for the Leafjourney
 * marketing site (homepage, /about, /pricing, /security, /education,
 * /developer).
 *
 * Leafmart-specific structured data (Product, BreadcrumbList, FAQ,
 * CollectionPage) lives in `@/lib/leafmart/seo` — keep these scoped so
 * the parent brand and the storefront sub-brand stay distinct in
 * crawler eyes.
 */

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://leafjourney.com";

export const ORG_NAME = "Leafjourney";
export const ORG_DESCRIPTION =
  "An AI-native care platform for modern cannabis medicine. Patient portal, clinician workspace, and practice operations in one unified system.";

export function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Render JSON-LD as a string suitable for dangerouslySetInnerHTML.
 * Escapes the closing `</script>` sequence so user copy can't break out.
 */
export function ldJson(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/* ── Structured-data builders ─────────────────────────────────── */

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: ORG_NAME,
    url: SITE_URL,
    description: ORG_DESCRIPTION,
    logo: absoluteUrl("/icon.svg"),
    sameAs: [],
  };
}

export function webSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: ORG_NAME,
    url: SITE_URL,
    description: ORG_DESCRIPTION,
  };
}
