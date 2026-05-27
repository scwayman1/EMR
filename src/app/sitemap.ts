import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * Root marketing sitemap. The Leafmart storefront has its own at
 * `app/leafmart/sitemap.ts` (covers product + category routes); this one
 * covers only the parent-brand marketing pages.
 *
 * Excluded:
 * - `/pricing` — redirects to `/`, would create a duplicate
 * - `/developer` — disallowed in robots.txt (private-by-default for V1)
 * - portal/clinician/operator routes — private, never indexed
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/security`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/education`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/advocacy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];
}
