import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * Site-wide robots policy. Only the public Leafmart storefront and a few
 * marketing routes are crawlable; the patient/clinician/operator portals
 * stay private. Two sitemaps are listed — one for marketing, one for the
 * Leafmart storefront — so crawlers can index each independently.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/leafmart",
          "/about",
          "/pricing",
          "/security",
          "/education",
        ],
        disallow: [
          "/api/",
          "/(auth)/",
          "/(clinician)/",
          "/(operator)/",
          "/(patient)/",
          "/developer/",
          "/store/",
        ],
      },
    ],
    sitemap: [
      `${SITE_URL}/sitemap.xml`,
      `${SITE_URL}/leafmart/sitemap.xml`,
    ],
  };
}
