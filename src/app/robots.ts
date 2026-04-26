import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/leafmart/seo";

/**
 * Site-wide robots policy. Only the public Leafmart storefront and a few
 * marketing routes are crawlable; the patient/clinician/operator portals
 * stay private. The sitemap entry points crawlers at the Leafmart sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/leafmart", "/about", "/pricing", "/security"],
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
    sitemap: `${SITE_URL}/leafmart/sitemap.xml`,
  };
}
