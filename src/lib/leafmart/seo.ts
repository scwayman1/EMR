import type { LeafmartProduct } from "@/components/leafmart/LeafmartProductCard";

/**
 * Structured-data (JSON-LD) builders and SEO helpers for Leafmart.
 * Output is consumed by <script type="application/ld+json"> tags rendered
 * server-side on product, category, and home pages.
 */

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://leafmart.com";

export const ORG_NAME = "Leafmart";
export const ORG_LEGAL_NAME = "Leafjourney Health";

export function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function breadcrumbList(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  };
}

export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: ORG_NAME,
    legalName: ORG_LEGAL_NAME,
    url: SITE_URL,
    logo: absoluteUrl("/icon.svg"),
    description:
      "Physician-curated cannabis wellness marketplace. Every product is reviewed by a clinician, lab-verified, and outcome-informed.",
    sameAs: [],
  };
}

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: ORG_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/leafmart/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function productLd(product: LeafmartProduct) {
  const url = absoluteUrl(`/leafmart/products/${product.slug}`);
  // Product images on the storefront are SVG silhouettes generated at runtime,
  // so we prefer the OG image (which always exists) for crawlers.
  const image = product.imageUrl
    ? absoluteUrl(product.imageUrl)
    : `${url}/opengraph-image`;

  // Convert the patient-reported improvement % (pct, e.g. 81) and sample
  // size (n) into a 1-5 aggregate rating that schema.org expects.
  const ratingValue = Math.max(1, Math.min(5, +(product.pct / 20).toFixed(1)));

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.support,
    sku: product.slug,
    image,
    brand: {
      "@type": "Brand",
      name: product.partner,
    },
    category: product.formatLabel,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "USD",
      price: product.price.toFixed(2),
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: ORG_NAME,
      },
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: ratingValue.toFixed(1),
      reviewCount: product.n,
      bestRating: "5",
      worstRating: "1",
    },
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "Reported improvement",
        value: `${product.pct}%`,
      },
      {
        "@type": "PropertyValue",
        name: "Dose",
        value: product.dose,
      },
    ],
  };
}

export interface FaqItem {
  q: string;
  a: string;
}

export function faqLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

export interface CategoryLdInput {
  name: string;
  slug: string;
  description: string;
  count: number;
  productSlugs: string[];
}

export function collectionPageLd(input: CategoryLdInput) {
  const url = absoluteUrl(`/leafmart/category/${input.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${input.name} — Leafmart`,
    description: input.description,
    url,
    isPartOf: {
      "@type": "WebSite",
      name: ORG_NAME,
      url: SITE_URL,
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: input.count,
      itemListElement: input.productSlugs.map((slug, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: absoluteUrl(`/leafmart/products/${slug}`),
      })),
    },
  };
}

/**
 * Render JSON-LD as a string suitable for dangerouslySetInnerHTML.
 * Escapes the closing `</script>` sequence to prevent XSS via product copy.
 */
export function ldJson(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
